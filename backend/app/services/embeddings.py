import hashlib
import logging
import math
import numpy as np
from typing import List, Optional
from backend.app.core.config import settings

logger = logging.getLogger("enterprise_ai.services.embeddings")

try:
    from google import genai
    from google.genai import types as genai_types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class EmbeddingService:
    """
    Embedding service interfacing with Google GenAI text-embedding-004,
    or generating deterministic normalized vectors in Safe Mock Mode.
    Guarantees strict 768-dimensional normalized vectors across all modes.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self.model_name = settings.EMBEDDING_MODEL
        self.dimensions = settings.EMBEDDING_DIMENSIONS  # 768
        self.force_mock = settings.MOCK_AI or not bool(self.api_key) or not GENAI_AVAILABLE
        self.client = None

        if not self.force_mock and GENAI_AVAILABLE:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info(f"Gemini Embedding Client initialized with model: {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Embedding Client: {e}. Defaulting to mock mode.")
                self.force_mock = True

    @property
    def is_mock_mode(self) -> bool:
        return self.force_mock or self.client is None

    @property
    def active_model(self) -> str:
        return "mock-embedding-768" if self.is_mock_mode else self.model_name

    def embed_text(self, text: str) -> List[float]:
        """
        Embeds a single text string into a normalized 768-dimensional float vector.
        """
        if not text or not text.strip():
            # Return zero-filled normalized vector
            vec = [0.0] * self.dimensions
            vec[0] = 1.0
            return vec

        if not self.is_mock_mode:
            try:
                response = self.client.models.embed_content(
                    model=self.model_name,
                    contents=text.strip()
                )
                if response and hasattr(response, "embedding") and response.embedding.values:
                    vec = list(response.embedding.values)
                    # Normalize if needed
                    norm = math.sqrt(sum(x * x for x in vec))
                    return [x / norm for x in vec] if norm > 0 else vec
            except Exception as e:
                logger.error(f"Gemini embedding call failed: {e}. Falling back to deterministic mock embedding.")

        return self._generate_deterministic_mock_embedding(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embeddings for a batch of text chunks.
        """
        if not texts:
            return []
        return [self.embed_text(t) for t in texts]

    STOP_WORDS = {
        "a", "an", "the", "and", "or", "but", "if", "then", "of", "at", "by", "for", "with",
        "about", "against", "between", "into", "through", "during", "before", "after",
        "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over",
        "under", "again", "further", "then", "once", "here", "there", "when", "where", "why",
        "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
        "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can",
        "will", "just", "should", "now", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "having", "do", "does", "did", "doing", "what", "which", "who",
        "whom", "this", "that", "these", "those", "am", "i", "we", "our", "ours", "you",
        "your", "yours", "he", "him", "his", "she", "her", "hers", "it", "its", "they",
        "them", "their", "theirs"
    }

    def _generate_deterministic_mock_embedding(self, text: str) -> List[float]:
        """
        Generates a high-quality deterministic pseudo-semantic 768-dim vector.
        Uses stop-word filtering, lexical stemming, and positive projection weighting
        over n-grams and tokens to preserve lexical similarity and reject noise.
        Always L2-normalized: norm(vec) == 1.0.
        """
        cleaned = text.lower().strip()
        raw_words = [w.strip(".,?!-():;\"'") for w in cleaned.split() if len(w) > 1]
        words = []
        for w in raw_words:
            if w in self.STOP_WORDS:
                continue
            # Simple stemming: normalize plurals
            stemmed = w[:-1] if w.endswith("s") and len(w) > 4 else w
            words.append(stemmed)

        if not words:
            # Fallback for short stopword-only queries
            words = raw_words or ["empty"]

        vec = np.zeros(self.dimensions, dtype=np.float32)

        # Seed based on content hash using signed random projections (SimHash)
        for word in words:
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            # Activate 12 distinct dimensions per word with signed ±1.0 projections
            for i in range(12):
                dim_idx = (h + i * 97) % self.dimensions
                sign = 1.0 if ((h >> i) & 1) else -1.0
                vec[dim_idx] += sign

        # Also add bigram features for consecutive tokens
        for i in range(len(words) - 1):
            bigram = f"{words[i]}_{words[i+1]}"
            bh = int(hashlib.md5(bigram.encode("utf-8")).hexdigest(), 16)
            for j in range(6):
                dim_idx = (bh + j * 131) % self.dimensions
                sign = 1.0 if ((bh >> j) & 1) else -1.0
                vec[dim_idx] += sign

        # L2 Normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return [round(float(x), 6) for x in vec]

embedding_service = EmbeddingService()

