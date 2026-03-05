"""
Replicate video generation service.

Uses the ``replicate`` Python SDK to run video generation models.
Since video generation is asynchronous on Replicate's side, the service
provides helpers to create a prediction, poll its status, and retrieve
the final video URL.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import replicate
from replicate.prediction import Prediction

from app.config import get_settings

logger = logging.getLogger(__name__)

# Default video model (Minimax video-01-live for fast generation)
DEFAULT_VIDEO_MODEL = "minimax/video-01-live"


@dataclass
class VideoResult:
    """Holds the output of a completed video prediction."""

    prediction_id: str
    status: str                    # "succeeded", "failed", "canceled"
    video_url: Optional[str]       # direct URL when succeeded
    logs: str = ""
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class ReplicateService:
    """Async wrapper around the Replicate SDK for video generation."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = replicate.Client(api_token=settings.replicate_api_token)
        self._async_client = replicate.AsyncClient(
            api_token=settings.replicate_api_token,
        )

    # ------------------------------------------------------------------
    # High-level: fire-and-forget or wait
    # ------------------------------------------------------------------

    async def generate_video(
        self,
        prompt: str,
        duration: int = 5,
        resolution: str = "720p",
        model: str | None = None,
        extra_params: Dict[str, Any] | None = None,
    ) -> VideoResult:
        """Start a video-generation prediction and wait for it to finish.

        Parameters
        ----------
        prompt:
            Text description of the desired video.
        duration:
            Desired duration in seconds (model-dependent).
        resolution:
            Target resolution string ("720p", "1080p").
        model:
            Replicate model identifier.  Falls back to ``DEFAULT_VIDEO_MODEL``.
        extra_params:
            Any additional model-specific input parameters.

        Returns
        -------
        VideoResult
            Contains the final video URL or error information.
        """
        model = model or DEFAULT_VIDEO_MODEL
        inputs: Dict[str, Any] = {
            "prompt": prompt,
        }
        # Add optional params if supported by the model
        if duration:
            inputs["duration"] = duration
        if resolution:
            inputs["resolution"] = resolution
        if extra_params:
            inputs.update(extra_params)

        logger.info(
            "Replicate create  model=%s  prompt_len=%d  duration=%ds",
            model,
            len(prompt),
            duration,
        )

        prediction = await self._async_client.predictions.create(
            model=model,
            input=inputs,
        )

        logger.info("Replicate prediction created  id=%s", prediction.id)

        # Poll until terminal state
        result = await self._wait_for_prediction(prediction.id)
        return result

    async def generate_video_async(
        self,
        prompt: str,
        duration: int = 5,
        resolution: str = "720p",
        model: str | None = None,
        extra_params: Dict[str, Any] | None = None,
    ) -> str:
        """Start a prediction and return the prediction ID immediately.

        Callers should use ``check_prediction`` / ``get_video_url`` to
        retrieve the result later (e.g. from a Celery task).
        """
        model = model or DEFAULT_VIDEO_MODEL
        inputs: Dict[str, Any] = {"prompt": prompt}
        if duration:
            inputs["duration"] = duration
        if resolution:
            inputs["resolution"] = resolution
        if extra_params:
            inputs.update(extra_params)

        prediction = await self._async_client.predictions.create(
            model=model,
            input=inputs,
        )
        logger.info("Replicate async prediction  id=%s", prediction.id)
        return prediction.id

    # ------------------------------------------------------------------
    # Status helpers
    # ------------------------------------------------------------------

    async def check_prediction(self, prediction_id: str) -> VideoResult:
        """Fetch current status of a prediction without blocking."""
        prediction = await self._async_client.predictions.get(prediction_id)
        return self._prediction_to_result(prediction)

    async def get_video_url(self, prediction_id: str) -> Optional[str]:
        """Return the video URL if the prediction succeeded, else None."""
        prediction = await self._async_client.predictions.get(prediction_id)
        if prediction.status == "succeeded" and prediction.output:
            return self._extract_url(prediction.output)
        return None

    async def cancel_prediction(self, prediction_id: str) -> None:
        """Cancel a running prediction."""
        await self._async_client.predictions.cancel(prediction_id)
        logger.info("Replicate prediction canceled  id=%s", prediction_id)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _wait_for_prediction(
        self,
        prediction_id: str,
        poll_interval: float = 2.0,
        timeout: float = 600.0,
    ) -> VideoResult:
        """Poll a prediction until it reaches a terminal state."""
        elapsed = 0.0
        while elapsed < timeout:
            prediction = await self._async_client.predictions.get(prediction_id)
            if prediction.status in ("succeeded", "failed", "canceled"):
                return self._prediction_to_result(prediction)
            logger.debug(
                "Replicate polling  id=%s  status=%s  elapsed=%.1fs",
                prediction_id,
                prediction.status,
                elapsed,
            )
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        # Timed out
        logger.warning("Replicate prediction timed out  id=%s", prediction_id)
        return VideoResult(
            prediction_id=prediction_id,
            status="timeout",
            video_url=None,
            error=f"Prediction timed out after {timeout}s",
        )

    def _prediction_to_result(self, prediction: Any) -> VideoResult:
        """Convert a Replicate Prediction object to our VideoResult."""
        video_url = None
        if prediction.status == "succeeded" and prediction.output:
            video_url = self._extract_url(prediction.output)

        return VideoResult(
            prediction_id=prediction.id,
            status=prediction.status,
            video_url=video_url,
            logs=prediction.logs or "",
            error=prediction.error if prediction.status == "failed" else None,
            metadata={
                "model": prediction.model,
                "created_at": str(prediction.created_at) if prediction.created_at else None,
            },
        )

    @staticmethod
    def _extract_url(output: Any) -> Optional[str]:
        """Extract a URL from the prediction output.

        Replicate models may return a string URL, a list of URLs,
        or a dict with a ``url`` field.
        """
        if isinstance(output, str):
            return output
        if isinstance(output, list) and output:
            return str(output[0])
        if isinstance(output, dict):
            return output.get("url") or output.get("video")
        return None

    async def close(self) -> None:
        """Cleanup (no persistent connection by default)."""
        pass
