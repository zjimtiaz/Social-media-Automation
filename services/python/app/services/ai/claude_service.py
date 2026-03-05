"""
Claude AI service for generating social-media content.

Uses the Anthropic Python SDK async client to produce:
- short-form text (tweets, captions, posts)
- long-form articles
- community responses (replies to mentions / comments)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import anthropic

from app.config import get_settings
from app.services.ai.prompt_templates import (
    format_template,
    get_article_template,
    get_response_template,
    get_short_text_template,
)

logger = logging.getLogger(__name__)


@dataclass
class GenerationResult:
    """Wrapper for a Claude generation result."""

    text: str
    model: str
    input_tokens: int
    output_tokens: int
    stop_reason: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class ClaudeService:
    """Async wrapper around the Anthropic Messages API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.claude_model
        self._default_max_tokens = settings.claude_max_tokens

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    async def generate_short_text(
        self,
        prompt_data: Dict[str, str],
        platform: str,
        tone: str = "professional",
    ) -> GenerationResult:
        """Generate short-form text (tweet, caption, post, etc.).

        Parameters
        ----------
        prompt_data:
            Must include at least ``topic``.  Optionally ``key_points``,
            ``hashtags``, ``subreddit``.
        platform:
            Target platform key (x, instagram, facebook, linkedin, reddit,
            youtube, quora).
        tone:
            Desired tone of voice (e.g. professional, casual, witty).
        """
        template = get_short_text_template(platform)
        user_message = format_template(
            template,
            topic=prompt_data.get("topic", ""),
            tone=tone,
            key_points=prompt_data.get("key_points", ""),
            hashtags=prompt_data.get("hashtags", ""),
            subreddit=prompt_data.get("subreddit", ""),
        )
        return await self._call(
            system_prompt=template.system_prompt,
            user_message=user_message,
            max_tokens=template.max_output_tokens,
            metadata={"platform": platform, "content_type": "short_text"},
        )

    async def generate_article(
        self,
        prompt_data: Dict[str, str],
        platform: str,
    ) -> GenerationResult:
        """Generate a long-form article.

        Parameters
        ----------
        prompt_data:
            Must include ``topic``.  Optionally ``title``, ``key_points``,
            ``audience``, ``subreddit``, ``tone``.
        platform:
            Target platform key.
        """
        template = get_article_template(platform)
        user_message = format_template(
            template,
            title=prompt_data.get("title", prompt_data.get("topic", "")),
            topic=prompt_data.get("topic", ""),
            tone=prompt_data.get("tone", "professional"),
            key_points=prompt_data.get("key_points", ""),
            audience=prompt_data.get("audience", "general professional audience"),
            subreddit=prompt_data.get("subreddit", ""),
        )
        return await self._call(
            system_prompt=template.system_prompt,
            user_message=user_message,
            max_tokens=template.max_output_tokens,
            metadata={"platform": platform, "content_type": "article"},
        )

    async def generate_response(
        self,
        mention_text: str,
        tone: str = "professional",
        guidelines: str = "",
        platform: str = "x",
        sentiment: str = "neutral",
        subreddit: str = "",
    ) -> GenerationResult:
        """Generate a community response to a mention / comment.

        Parameters
        ----------
        mention_text:
            The original user comment or mention to reply to.
        tone:
            Desired tone (professional, friendly, casual ...).
        guidelines:
            Brand voice / content guidelines.
        platform:
            Platform where the mention was found.
        sentiment:
            Pre-classified sentiment (positive, negative, neutral).
        subreddit:
            Subreddit name, only relevant for Reddit.
        """
        template = get_response_template(platform)
        user_message = format_template(
            template,
            mention_text=mention_text,
            sentiment=sentiment,
            tone=tone,
            guidelines=guidelines,
            subreddit=subreddit,
        )
        return await self._call(
            system_prompt=template.system_prompt,
            user_message=user_message,
            max_tokens=template.max_output_tokens,
            metadata={
                "platform": platform,
                "content_type": "community_response",
                "sentiment": sentiment,
            },
        )

    # ------------------------------------------------------------------
    # Generic call (useful for ad-hoc prompts outside templates)
    # ------------------------------------------------------------------

    async def generate_raw(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int | None = None,
    ) -> GenerationResult:
        """Low-level call with arbitrary prompts."""
        return await self._call(
            system_prompt=system_prompt,
            user_message=user_message,
            max_tokens=max_tokens or self._default_max_tokens,
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _call(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int,
        metadata: Dict[str, Any] | None = None,
    ) -> GenerationResult:
        """Execute a single Messages API call."""
        logger.info(
            "Claude request  model=%s  max_tokens=%d  prompt_len=%d",
            self._model,
            max_tokens,
            len(user_message),
        )
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
        except anthropic.APIError as exc:
            logger.error("Claude API error: %s", exc)
            raise

        text = response.content[0].text if response.content else ""
        result = GenerationResult(
            text=text,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            stop_reason=response.stop_reason or "unknown",
            metadata=metadata or {},
        )
        logger.info(
            "Claude response  in=%d  out=%d  stop=%s",
            result.input_tokens,
            result.output_tokens,
            result.stop_reason,
        )
        return result

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def close(self) -> None:
        """Close the underlying HTTP transport."""
        await self._client.close()
