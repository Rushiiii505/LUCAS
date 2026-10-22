import json
import httpx
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.config import settings
from app.utils.logger import logger

class OllamaService:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")
        self.timeout = httpx.Timeout(timeout=float(settings.request_timeout_seconds), connect=5.0)

    async def get_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and responsive."""
        url = f"{self.base_url}/api/version"
        tags_url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                version_info = res.json() if res.status_code == 200 else {}
                
                tags_res = await client.get(tags_url)
                models_count = len(tags_res.json().get("models", [])) if tags_res.status_code == 200 else 0
                
                return {
                    "online": True,
                    "version": version_info.get("version", "unknown"),
                    "base_url": self.base_url,
                    "models_count": models_count,
                    "error": None
                }
        except httpx.ConnectError:
            return {
                "online": False,
                "version": None,
                "base_url": self.base_url,
                "models_count": 0,
                "error": f"Cannot reach Ollama at {self.base_url}. Ensure the service is running."
            }
        except Exception as e:
            return {
                "online": False,
                "version": None,
                "base_url": self.base_url,
                "models_count": 0,
                "error": str(e)
            }

    async def list_models(self) -> List[Dict[str, Any]]:
        """List all models installed locally in Ollama."""
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url)
                if res.status_code != 200:
                    logger.warning(f"Ollama tags returned status {res.status_code}")
                    return []
                data = res.json()
                models = data.get("models", [])
                formatted = []
                for m in models:
                    details = m.get("details", {})
                    formatted.append({
                        "name": m.get("name"),
                        "model": m.get("model", m.get("name")),
                        "size": m.get("size", 0),
                        "parameter_size": details.get("parameter_size", "unknown"),
                        "quantization_level": details.get("quantization_level", "unknown"),
                        "family": details.get("family", "unknown"),
                        "modified_at": m.get("modified_at", "")
                    })
                return formatted
        except Exception as e:
            logger.error(f"Error fetching Ollama models: {e}")
            return []

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream chat tokens from Ollama /api/chat via SSE-compatible generator.
        """
        url = f"{self.base_url}/api/chat"
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        payload_messages.extend(messages)

        payload = {
            "model": model,
            "messages": payload_messages,
            "stream": True,
            "options": {
                "temperature": temperature
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        error_msg = f"Ollama error ({response.status_code}): {error_text.decode('utf-8', errors='ignore')}"
                        logger.error(error_msg)
                        yield {"error": error_msg, "done": True}
                        return

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            message = chunk.get("message", {})
                            content = message.get("content", "")
                            done = chunk.get("done", False)
                            yield {
                                "content": content,
                                "done": done,
                                "total_duration": chunk.get("total_duration"),
                                "eval_count": chunk.get("eval_count"),
                            }
                            if done:
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            err = f"Failed to connect to Ollama at {self.base_url}. Verify Ollama is running."
            logger.error(err)
            yield {"error": err, "done": True}
        except Exception as e:
            err = f"Ollama streaming generation error: {str(e)}"
            logger.error(err)
            yield {"error": err, "done": True}

    async def get_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        Fetch embedding vector from Ollama.
        First tries POST /api/embed (modern Ollama), then falls back to POST /api/embeddings.
        """
        # Pick model: requested model, or setting default, or fallback
        embedding_model = model or settings.default_embedding_model or settings.default_model
        if not embedding_model:
            models = await self.list_models()
            if models:
                embedding_model = models[0]["name"]
            else:
                embedding_model = "llama2-uncensored:latest"

        # Try /api/embed first
        embed_url = f"{self.base_url}/api/embed"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                res = await client.post(embed_url, json={"model": embedding_model, "input": text})
                if res.status_code == 200:
                    data = res.json()
                    embeddings = data.get("embeddings", [])
                    if embeddings and len(embeddings) > 0:
                        return embeddings[0]
            except Exception:
                pass

            # Fallback to /api/embeddings
            embeddings_url = f"{self.base_url}/api/embeddings"
            res = await client.post(embeddings_url, json={"model": embedding_model, "prompt": text})
            if res.status_code == 200:
                data = res.json()
                embedding = data.get("embedding", [])
                if embedding:
                    return embedding

            raise RuntimeError(f"Ollama embedding failed for model '{embedding_model}': {res.text if 'res' in locals() else 'Connection error'}")

ollama_service = OllamaService()
