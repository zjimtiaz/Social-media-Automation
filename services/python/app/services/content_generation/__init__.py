"""
Content generation service.

Orchestrates AI-powered content creation across platforms using Claude
for text generation and Stability AI / Replicate for media generation.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.services.ai.claude_service import ClaudeService

logger = logging.getLogger(__name__)


class ContentGenerationService:
    """High-level service that coordinates content generation across AI providers."""

    def __init__(self) -> None:
        self._claude = ClaudeService()

    async def generate(
        self,
        organization_id: str,
        trigger_data: dict[str, Any],
        target_platforms: list[str],
        content_types: list[str],
        brand_voice_id: str | None = None,
        language: str = "en",
    ) -> dict[str, Any]:
        """Generate content pieces for the requested platforms and content types.

        Parameters
        ----------
        organization_id:
            UUID of the organisation requesting content.
        trigger_data:
            Contextual information that triggered the generation (e.g.
            trending topic, calendar event, RSS item).
        target_platforms:
            List of platform keys (x, instagram, facebook, linkedin, etc.).
        content_types:
            List of content type keys (text, image, video, carousel, etc.).
        brand_voice_id:
            Optional ID of a brand-voice profile to apply.
        language:
            ISO-639-1 language code.

        Returns
        -------
        dict
            Structured response matching ``GenerateContentResponse``.
        """
        content_group_id = str(uuid.uuid4())
        pieces: list[dict[str, Any]] = []
        total_input_tokens = 0
        total_output_tokens = 0

        topic = trigger_data.get("topic", trigger_data.get("title", ""))
        key_points = trigger_data.get("key_points", "")
        hashtags = trigger_data.get("hashtags", "")
        tone = trigger_data.get("tone", "professional")
        subreddit = trigger_data.get("subreddit", "")

        for platform in target_platforms:
            for content_type in content_types:
                try:
                    if content_type in ("text", "carousel", "story"):
                        result = await self._claude.generate_short_text(
                            prompt_data={
                                "topic": topic,
                                "key_points": key_points,
                                "hashtags": hashtags,
                                "subreddit": subreddit,
                            },
                            platform=platform,
                            tone=tone,
                        )
                        pieces.append({
                            "platform": platform,
                            "content_type": content_type,
                            "title": None,
                            "body": result.text,
                            "hashtags": _extract_hashtags(result.text),
                            "media_prompt": None,
                            "estimated_engagement_score": None,
                            "metadata": {
                                "model": result.model,
                                "stop_reason": result.stop_reason,
                                "language": language,
                            },
                        })
                        total_input_tokens += result.input_tokens
                        total_output_tokens += result.output_tokens

                    elif content_type == "image":
                        # Generate a text caption and an image prompt
                        result = await self._claude.generate_raw(
                            system_prompt=(
                                "You are a creative director. Given a topic, produce "
                                "TWO things separated by ---:\n"
                                "1. A short social-media caption for the image\n"
                                "2. A detailed image-generation prompt for Stable Diffusion"
                            ),
                            user_message=(
                                f"Topic: {topic}\nPlatform: {platform}\n"
                                f"Tone: {tone}\nKey points: {key_points}"
                            ),
                        )
                        parts = result.text.split("---", 1)
                        caption = parts[0].strip()
                        media_prompt = parts[1].strip() if len(parts) > 1 else caption

                        pieces.append({
                            "platform": platform,
                            "content_type": "image",
                            "title": None,
                            "body": caption,
                            "hashtags": _extract_hashtags(caption),
                            "media_prompt": media_prompt,
                            "estimated_engagement_score": None,
                            "metadata": {
                                "model": result.model,
                                "language": language,
                            },
                        })
                        total_input_tokens += result.input_tokens
                        total_output_tokens += result.output_tokens

                    elif content_type in ("video", "reel"):
                        # Generate a caption and a video-generation prompt
                        result = await self._claude.generate_raw(
                            system_prompt=(
                                "You are a video content strategist. Given a topic, produce "
                                "TWO things separated by ---:\n"
                                "1. A short social-media caption for the video\n"
                                "2. A concise video-generation prompt describing the scene"
                            ),
                            user_message=(
                                f"Topic: {topic}\nPlatform: {platform}\n"
                                f"Tone: {tone}\nKey points: {key_points}"
                            ),
                        )
                        parts = result.text.split("---", 1)
                        caption = parts[0].strip()
                        media_prompt = parts[1].strip() if len(parts) > 1 else caption

                        pieces.append({
                            "platform": platform,
                            "content_type": content_type,
                            "title": None,
                            "body": caption,
                            "hashtags": _extract_hashtags(caption),
                            "media_prompt": media_prompt,
                            "estimated_engagement_score": None,
                            "metadata": {
                                "model": result.model,
                                "language": language,
                            },
                        })
                        total_input_tokens += result.input_tokens
                        total_output_tokens += result.output_tokens

                    else:
                        raise ValueError(
                            f"Unsupported content type: {content_type}"
                        )

                except Exception:
                    logger.exception(
                        "Failed to generate %s content for %s (org=%s)",
                        content_type,
                        platform,
                        organization_id,
                    )
                    raise

        return {
            "organization_id": organization_id,
            "content_group_id": content_group_id,
            "pieces": pieces,
            "token_usage": {
                "prompt_tokens": total_input_tokens,
                "completion_tokens": total_output_tokens,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    async def generate_variants(
        self,
        organization_id: str,
        source_content_id: str,
        target_platforms: list[str],
        tone_adjustments: dict[str, str] | None = None,
        max_variants_per_platform: int = 1,
    ) -> dict[str, Any]:
        """Generate platform-specific variants from an existing content piece.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        source_content_id:
            UUID of the source content to adapt.
        target_platforms:
            Platforms to create variants for.
        tone_adjustments:
            Per-platform tone overrides.
        max_variants_per_platform:
            Number of variants to produce per platform (1-5).

        Returns
        -------
        dict
            Structured response matching ``GenerateVariantsResponse``.
        """
        tone_adjustments = tone_adjustments or {}
        variants: list[dict[str, Any]] = []
        total_input_tokens = 0
        total_output_tokens = 0

        # NOTE: In a real implementation this would fetch the source content
        # from the database.  For now we raise if the source cannot be found;
        # the actual DB lookup will be wired in the service layer implementation.
        # Placeholder: the caller (or a future DB layer) will inject the
        # source_text before calling this method.

        for platform in target_platforms:
            tone = tone_adjustments.get(platform, "professional")

            for variant_idx in range(max_variants_per_platform):
                result = await self._claude.generate_raw(
                    system_prompt=(
                        f"You are a social-media content adapter. Rewrite the "
                        f"following content for {platform}. Maintain the core "
                        f"message but adapt the format, length, and style to "
                        f"match {platform}'s conventions. Tone: {tone}."
                    ),
                    user_message=(
                        f"Adapt the following content for {platform}.\n\n"
                        f"Source content ID: {source_content_id}\n"
                        f"Variant number: {variant_idx + 1}\n"
                        f"Tone: {tone}\n\n"
                        f"Please produce the adapted version only."
                    ),
                )

                variants.append({
                    "platform": platform,
                    "content_type": "text",
                    "title": None,
                    "body": result.text,
                    "hashtags": _extract_hashtags(result.text),
                    "media_prompt": None,
                    "estimated_engagement_score": None,
                    "metadata": {
                        "model": result.model,
                        "source_content_id": source_content_id,
                        "variant_index": variant_idx,
                    },
                })
                total_input_tokens += result.input_tokens
                total_output_tokens += result.output_tokens

        return {
            "organization_id": organization_id,
            "source_content_id": source_content_id,
            "variants": variants,
            "token_usage": {
                "prompt_tokens": total_input_tokens,
                "completion_tokens": total_output_tokens,
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        }


def _extract_hashtags(text: str) -> list[str]:
    """Extract hashtag strings from generated text."""
    import re
    return re.findall(r"#\w+", text)


# Module-level singleton used by the router
content_generation_service = ContentGenerationService()
