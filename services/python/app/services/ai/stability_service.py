"""
Stability AI image generation service.

Calls the Stability AI REST API (SD3.5) via httpx to produce images
from text prompts. Returns raw image bytes along with generation metadata.
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.stability.ai"
GENERATE_ENDPOINT = f"{API_BASE}/v2beta/stable-image/generate/sd3.5"


class AspectRatio(str, Enum):
    """Supported aspect ratios for SD3.5."""

    SQUARE = "1:1"
    LANDSCAPE_4_3 = "4:3"
    LANDSCAPE_16_9 = "16:9"
    PORTRAIT_3_4 = "3:4"
    PORTRAIT_9_16 = "9:16"
    WIDE_21_9 = "21:9"
    TALL_9_21 = "9:21"


class ImageStyle(str, Enum):
    """Optional style presets."""

    PHOTOGRAPHIC = "photographic"
    DIGITAL_ART = "digital-art"
    ANIME = "anime"
    CINEMATIC = "cinematic"
    COMIC_BOOK = "comic-book"
    FANTASY_ART = "fantasy-art"
    NEON_PUNK = "neon-punk"
    ISOMETRIC = "isometric"
    ORIGAMI = "origami"
    THREE_D_MODEL = "3d-model"
    PIXEL_ART = "pixel-art"
    NONE = "none"


@dataclass
class ImageResult:
    """Container for a generated image."""

    image_bytes: bytes
    content_type: str          # e.g. "image/png"
    seed: int
    finish_reason: str         # e.g. "SUCCESS", "CONTENT_FILTERED"
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def base64(self) -> str:
        return base64.b64encode(self.image_bytes).decode()


class StabilityService:
    """Async client for the Stability AI image generation API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.stability_api_key
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
        )

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str = "none",
        negative_prompt: str = "",
        seed: int = 0,
        output_format: str = "png",
    ) -> ImageResult:
        """Generate an image from a text prompt.

        Parameters
        ----------
        prompt:
            The text description of the desired image.
        aspect_ratio:
            Aspect ratio string (e.g. ``"16:9"``).  Must be one of the
            ratios accepted by the API.
        style:
            Style preset name (see ``ImageStyle``).
        negative_prompt:
            Things to avoid in the generated image.
        seed:
            Random seed for reproducibility (0 = random).
        output_format:
            ``"png"`` or ``"jpeg"``.

        Returns
        -------
        ImageResult
            Contains the raw bytes and metadata.
        """
        # Build multipart form payload (Stability v2beta uses form data)
        form_data: Dict[str, Any] = {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "output_format": output_format,
        }
        if negative_prompt:
            form_data["negative_prompt"] = negative_prompt
        if seed:
            form_data["seed"] = str(seed)
        if style and style != "none":
            form_data["style_preset"] = style

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
        }

        logger.info(
            "Stability request  prompt_len=%d  ratio=%s  style=%s",
            len(prompt),
            aspect_ratio,
            style,
        )

        response = await self._client.post(
            GENERATE_ENDPOINT,
            headers=headers,
            data=form_data,
        )

        if response.status_code != 200:
            body = response.text
            logger.error(
                "Stability API error  status=%d  body=%s",
                response.status_code,
                body[:500],
            )
            response.raise_for_status()

        payload = response.json()

        # v2beta returns base64-encoded image in the JSON body
        image_b64: str = payload.get("image", "")
        image_bytes = base64.b64decode(image_b64)
        finish_reason = payload.get("finish_reason", "SUCCESS")
        returned_seed = payload.get("seed", seed)

        content_type = f"image/{output_format}"

        result = ImageResult(
            image_bytes=image_bytes,
            content_type=content_type,
            seed=returned_seed,
            finish_reason=finish_reason,
            metadata={
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "style": style,
                "output_format": output_format,
            },
        )

        logger.info(
            "Stability response  size=%d bytes  seed=%d  finish=%s",
            len(image_bytes),
            returned_seed,
            finish_reason,
        )
        return result

    async def close(self) -> None:
        """Close the underlying HTTP transport."""
        await self._client.aclose()
