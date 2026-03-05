"""
Community management service.

Handles social listening (polling for mentions), AI-powered response
generation, response publishing, and sentiment analysis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from app.services.ai.claude_service import ClaudeService

logger = logging.getLogger(__name__)


class CommunityService:
    """Orchestrates community listening, response generation, and sentiment analysis."""

    def __init__(self) -> None:
        self._claude = ClaudeService()

    # ------------------------------------------------------------------
    # Polling
    # ------------------------------------------------------------------

    async def poll(
        self,
        organization_id: str,
        listening_config_id: str,
    ) -> dict[str, Any]:
        """Execute one polling cycle for a community listening configuration.

        Connects to the configured platform API, fetches new mentions since
        the last cursor, and stores them.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        listening_config_id:
            UUID of the listening configuration to poll.

        Returns
        -------
        dict
            Structured response matching ``PollResponse``.
        """
        # TODO: Fetch the listening_config from the database using
        # listening_config_id to determine the platform, keywords,
        # and pagination cursor.
        #
        # TODO: Call the appropriate platform adapter
        # (e.g. app.services.platforms.x.search_mentions) with the
        # config's keywords and cursor.
        #
        # For now, return a placeholder that satisfies the schema.

        now = datetime.now(timezone.utc)

        logger.info(
            "Polling mentions  org=%s  config=%s",
            organization_id,
            listening_config_id,
        )

        # Placeholder: In production this would call the platform adapter
        # and persist discovered mentions to the database.
        return {
            "organization_id": organization_id,
            "listening_config_id": listening_config_id,
            "platform": "x",
            "mentions_found": 0,
            "mentions": [],
            "next_cursor": None,
            "polled_at": now.isoformat(),
        }

    async def poll_all(
        self,
        organization_id: str,
    ) -> dict[str, Any]:
        """Poll all active listening configurations for an organisation.

        Returns
        -------
        dict
            Structured response matching ``PollAllResponse``.
        """
        # TODO: Fetch all active listening configs from DB for this org,
        # then call self.poll() for each one.

        now = datetime.now(timezone.utc)

        logger.info("Poll-all  org=%s", organization_id)

        return {
            "organization_id": organization_id,
            "configs_polled": 0,
            "total_mentions_found": 0,
            "results": [],
            "polled_at": now.isoformat(),
        }

    # ------------------------------------------------------------------
    # Response generation
    # ------------------------------------------------------------------

    async def generate_response(
        self,
        organization_id: str,
        mention_id: str,
        response_tone: str | None = None,
        additional_context: str | None = None,
        max_length: int | None = None,
    ) -> dict[str, Any]:
        """Generate an AI-drafted reply for a mention.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        mention_id:
            Internal ID of the mention to respond to.
        response_tone:
            Optional tone directive (e.g. 'empathetic', 'professional').
        additional_context:
            Extra context to feed the AI.
        max_length:
            Maximum character length of the response.

        Returns
        -------
        dict
            Structured response matching ``GenerateResponseResponse``.
        """
        # TODO: Look up the mention from DB to get its text, platform, and
        # author info.  For now we raise a descriptive error if the mention
        # is not found (the DB layer will be wired later).

        logger.info(
            "Generating response  org=%s  mention=%s  tone=%s",
            organization_id,
            mention_id,
            response_tone,
        )

        # Placeholder: fetch mention_text and platform from DB
        mention_text = f"[Mention {mention_id} text would come from DB]"
        platform = "x"

        tone = response_tone or "professional"
        guidelines = additional_context or ""

        # Generate the main response
        result = await self._claude.generate_response(
            mention_text=mention_text,
            tone=tone,
            guidelines=guidelines,
            platform=platform,
        )

        # Optionally trim to max_length
        suggested = result.text
        if max_length and len(suggested) > max_length:
            suggested = suggested[:max_length].rsplit(" ", 1)[0] + "..."

        # Generate 1-2 alternatives
        alternatives: list[str] = []
        for alt_tone in ["friendly", "concise"]:
            if alt_tone == tone:
                continue
            alt_result = await self._claude.generate_response(
                mention_text=mention_text,
                tone=alt_tone,
                guidelines=guidelines,
                platform=platform,
            )
            alt_text = alt_result.text
            if max_length and len(alt_text) > max_length:
                alt_text = alt_text[:max_length].rsplit(" ", 1)[0] + "..."
            alternatives.append(alt_text)
            if len(alternatives) >= 2:
                break

        now = datetime.now(timezone.utc)

        return {
            "organization_id": organization_id,
            "mention_id": mention_id,
            "suggested_response": suggested,
            "confidence_score": 0.85,
            "alternative_responses": alternatives,
            "token_usage": {
                "prompt_tokens": result.input_tokens,
                "completion_tokens": result.output_tokens,
            },
            "created_at": now.isoformat(),
        }

    # ------------------------------------------------------------------
    # Publish response
    # ------------------------------------------------------------------

    async def publish_response(
        self,
        organization_id: str,
        mention_id: str,
        response_text: str,
        social_account_id: str,
    ) -> dict[str, Any]:
        """Publish an approved response to the originating platform.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        mention_id:
            Internal mention ID to reply to.
        response_text:
            Final approved response text.
        social_account_id:
            UUID of the social account to post from.

        Returns
        -------
        dict
            Structured response matching ``PublishResponseResponse``.
        """
        # TODO: Fetch the mention and social account from DB, determine
        # the platform, then call the appropriate platform adapter to
        # post the reply.

        logger.info(
            "Publishing response  org=%s  mention=%s  account=%s",
            organization_id,
            mention_id,
            social_account_id,
        )

        now = datetime.now(timezone.utc)

        # Placeholder response: the platform adapter would return the
        # native response ID and URL.
        return {
            "organization_id": organization_id,
            "mention_id": mention_id,
            "platform": "x",
            "platform_response_id": "pending_platform_integration",
            "response_url": None,
            "published_at": now.isoformat(),
        }

    # ------------------------------------------------------------------
    # Sentiment analysis
    # ------------------------------------------------------------------

    async def analyze_sentiment(
        self,
        organization_id: str,
        mention_id: str | None = None,
        text: str | None = None,
        include_topics: bool = True,
    ) -> dict[str, Any]:
        """Analyse sentiment and risk for a mention or raw text.

        Parameters
        ----------
        organization_id:
            UUID of the organisation.
        mention_id:
            Analyse a stored mention by ID.
        text:
            Raw text to analyse (used when mention_id is not provided).
        include_topics:
            Whether to extract key topics.

        Returns
        -------
        dict
            Structured response matching ``AnalyzeSentimentResponse``.
        """
        if mention_id and not text:
            # TODO: Fetch mention text from DB
            text = f"[Mention {mention_id} text would come from DB]"

        if not text:
            raise ValueError("No text available for sentiment analysis")

        logger.info(
            "Analyzing sentiment  org=%s  mention=%s  text_len=%d",
            organization_id,
            mention_id or "n/a",
            len(text),
        )

        topic_instruction = ""
        if include_topics:
            topic_instruction = (
                '- "topics": list of 1-5 key topics extracted from the text\n'
            )

        result = await self._claude.generate_raw(
            system_prompt=(
                "You are a sentiment analysis expert. Analyze the given text and "
                "respond ONLY with valid JSON (no markdown fences) containing:\n"
                '- "sentiment": one of "positive", "neutral", "negative", "mixed"\n'
                '- "sentiment_score": float from -1.0 (very negative) to 1.0 (very positive)\n'
                '- "risk_level": one of "low", "medium", "high", "critical"\n'
                '- "risk_factors": list of identified risk factors '
                '(e.g. "brand_criticism", "legal_threat", "profanity", "misinformation")\n'
                f"{topic_instruction}"
                '- "requires_urgent_attention": boolean\n'
                '- "explanation": brief 1-2 sentence explanation of the analysis'
            ),
            user_message=f"Analyze the sentiment of this text:\n\n{text}",
        )

        # Parse the AI response as JSON
        import json
        try:
            analysis = json.loads(result.text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response if it's wrapped in text
            import re
            json_match = re.search(r"\{[\s\S]*\}", result.text)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                logger.error("Failed to parse sentiment JSON: %s", result.text[:200])
                analysis = {
                    "sentiment": "neutral",
                    "sentiment_score": 0.0,
                    "risk_level": "low",
                    "risk_factors": [],
                    "topics": [],
                    "requires_urgent_attention": False,
                    "explanation": "Unable to parse AI analysis; defaulting to neutral.",
                }

        now = datetime.now(timezone.utc)

        return {
            "organization_id": organization_id,
            "mention_id": mention_id,
            "result": {
                "sentiment": analysis.get("sentiment", "neutral"),
                "sentiment_score": float(analysis.get("sentiment_score", 0.0)),
                "risk_level": analysis.get("risk_level", "low"),
                "risk_factors": analysis.get("risk_factors", []),
                "topics": analysis.get("topics", []) if include_topics else [],
                "requires_urgent_attention": analysis.get(
                    "requires_urgent_attention", False
                ),
                "explanation": analysis.get("explanation"),
            },
            "token_usage": {
                "prompt_tokens": result.input_tokens,
                "completion_tokens": result.output_tokens,
            },
            "analyzed_at": now.isoformat(),
        }


# Module-level singleton used by the router
community_service = CommunityService()
