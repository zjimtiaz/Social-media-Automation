"""
Claude-based community response generator.

Generates contextual, on-brand replies to social-media mentions
and comments. Supports multiple tones, platform-specific formatting,
and alternative response generation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.services.ai.claude_service import ClaudeService, GenerationResult
from app.services.community.sentiment_analyzer import SentimentAnalyzer, SentimentResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration / result types
# ---------------------------------------------------------------------------

@dataclass
class ResponseConfig:
    """Configuration for generating a response."""

    mention_id: str
    mention_text: str
    platform: str
    tone: str = "professional"        # professional | friendly | casual | empathetic | witty
    brand_guidelines: str = ""
    brand_name: str = ""
    max_length: Optional[int] = None
    avoid_topics: List[str] = field(default_factory=list)
    include_cta: bool = False
    cta_text: str = ""
    sentiment: Optional[str] = None   # pre-classified sentiment
    subreddit: str = ""               # only for Reddit


@dataclass
class GeneratedResponse:
    """A single generated response with metadata."""

    text: str
    tone: str
    confidence: float = 0.85
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class ResponseResult:
    """Full result including primary and alternative responses."""

    mention_id: str
    platform: str
    primary_response: GeneratedResponse
    alternatives: List[GeneratedResponse] = field(default_factory=list)
    sentiment: Optional[SentimentResult] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ResponseGenerator:
    """Generates AI-driven responses to social-media mentions."""

    # Tones to offer as alternatives (excluding the primary tone)
    ALTERNATIVE_TONES = ["friendly", "professional", "concise", "empathetic"]

    def __init__(
        self,
        claude_service: Optional[ClaudeService] = None,
        sentiment_analyzer: Optional[SentimentAnalyzer] = None,
    ) -> None:
        self._claude = claude_service or ClaudeService()
        self._sentiment = sentiment_analyzer or SentimentAnalyzer(self._claude)

    # ------------------------------------------------------------------
    # Main generation
    # ------------------------------------------------------------------

    async def generate(
        self,
        config: ResponseConfig,
        include_alternatives: bool = True,
        num_alternatives: int = 2,
        analyze_sentiment: bool = True,
    ) -> ResponseResult:
        """Generate a response with optional alternatives and sentiment.

        Parameters
        ----------
        config:
            All parameters for the response generation.
        include_alternatives:
            Whether to generate alternative responses in different tones.
        num_alternatives:
            How many alternative responses to generate.
        analyze_sentiment:
            Whether to run sentiment analysis on the mention first.
        """
        # Optionally analyse sentiment first
        sentiment_result: Optional[SentimentResult] = None
        detected_sentiment = config.sentiment or "neutral"

        if analyze_sentiment:
            sentiment_result = await self._sentiment.analyze(
                mention_id=config.mention_id,
                text=config.mention_text,
                platform=config.platform,
            )
            detected_sentiment = sentiment_result.sentiment

        # Generate primary response
        primary = await self._generate_single(config, detected_sentiment)

        # Enforce max_length
        if config.max_length and len(primary.text) > config.max_length:
            primary.text = self._truncate(primary.text, config.max_length)

        # Generate alternatives
        alternatives: List[GeneratedResponse] = []
        if include_alternatives:
            alt_tones = [
                t for t in self.ALTERNATIVE_TONES
                if t != config.tone
            ][:num_alternatives]

            for alt_tone in alt_tones:
                alt_config = ResponseConfig(
                    mention_id=config.mention_id,
                    mention_text=config.mention_text,
                    platform=config.platform,
                    tone=alt_tone,
                    brand_guidelines=config.brand_guidelines,
                    brand_name=config.brand_name,
                    max_length=config.max_length,
                    avoid_topics=config.avoid_topics,
                    include_cta=config.include_cta,
                    cta_text=config.cta_text,
                    sentiment=detected_sentiment,
                    subreddit=config.subreddit,
                )
                alt_response = await self._generate_single(alt_config, detected_sentiment)
                if config.max_length and len(alt_response.text) > config.max_length:
                    alt_response.text = self._truncate(alt_response.text, config.max_length)
                alternatives.append(alt_response)

        return ResponseResult(
            mention_id=config.mention_id,
            platform=config.platform,
            primary_response=primary,
            alternatives=alternatives,
            sentiment=sentiment_result,
        )

    # ------------------------------------------------------------------
    # Simple generation (no alternatives, no sentiment)
    # ------------------------------------------------------------------

    async def generate_simple(
        self,
        mention_text: str,
        platform: str,
        tone: str = "professional",
        guidelines: str = "",
    ) -> str:
        """Generate a single response. Returns just the text."""
        result = await self._claude.generate_response(
            mention_text=mention_text,
            tone=tone,
            guidelines=guidelines,
            platform=platform,
        )
        return result.text

    # ------------------------------------------------------------------
    # Batch generation
    # ------------------------------------------------------------------

    async def generate_batch(
        self,
        configs: List[ResponseConfig],
        include_alternatives: bool = False,
    ) -> List[ResponseResult]:
        """Generate responses for multiple mentions."""
        results: List[ResponseResult] = []
        for config in configs:
            try:
                result = await self.generate(
                    config,
                    include_alternatives=include_alternatives,
                    analyze_sentiment=True,
                )
                results.append(result)
            except Exception as exc:
                logger.exception(
                    "Response generation failed  mention=%s",
                    config.mention_id,
                )
                # Return a fallback response
                results.append(
                    ResponseResult(
                        mention_id=config.mention_id,
                        platform=config.platform,
                        primary_response=GeneratedResponse(
                            text="",
                            tone=config.tone,
                            confidence=0.0,
                        ),
                        metadata={"error": str(exc)},
                    )
                )
        return results

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _generate_single(
        self,
        config: ResponseConfig,
        sentiment: str,
    ) -> GeneratedResponse:
        """Generate a single response using the Claude service."""
        # Build enhanced guidelines
        guidelines = self._build_guidelines(config)

        result: GenerationResult = await self._claude.generate_response(
            mention_text=config.mention_text,
            tone=config.tone,
            guidelines=guidelines,
            platform=config.platform,
            sentiment=sentiment,
            subreddit=config.subreddit,
        )

        # Estimate confidence based on stop reason and token counts
        confidence = 0.85
        if result.stop_reason == "end_turn":
            confidence = 0.9
        if result.output_tokens < 10:
            confidence = 0.5

        return GeneratedResponse(
            text=result.text,
            tone=config.tone,
            confidence=confidence,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
        )

    @staticmethod
    def _build_guidelines(config: ResponseConfig) -> str:
        """Build a comprehensive guidelines string from the config."""
        parts: List[str] = []

        if config.brand_guidelines:
            parts.append(f"Brand guidelines: {config.brand_guidelines}")

        if config.brand_name:
            parts.append(f"Brand name: {config.brand_name}")

        if config.avoid_topics:
            parts.append(f"Avoid mentioning: {', '.join(config.avoid_topics)}")

        if config.include_cta and config.cta_text:
            parts.append(
                f"Include a call-to-action: {config.cta_text}"
            )

        return "\n".join(parts)

    @staticmethod
    def _truncate(text: str, max_length: int) -> str:
        """Truncate text to max_length, breaking at the last word boundary."""
        if len(text) <= max_length:
            return text
        truncated = text[:max_length].rsplit(" ", 1)[0]
        if not truncated:
            truncated = text[:max_length]
        return truncated.rstrip(".,;:!? ") + "..."

    async def close(self) -> None:
        """Close underlying services."""
        await self._claude.close()
