"""
Claude-based sentiment and risk scoring service.

Analyses social-media mentions to determine sentiment (positive / negative /
neutral / mixed), risk level (low / medium / high / critical), and extracts
key topics. Designed to be called per-mention or in batch.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.services.ai.claude_service import ClaudeService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class SentimentResult:
    """Result of a single sentiment analysis."""

    mention_id: str
    sentiment: str                        # positive | negative | neutral | mixed
    sentiment_score: float                # -1.0 (very negative) to 1.0 (very positive)
    risk_level: str                       # low | medium | high | critical
    risk_factors: List[str] = field(default_factory=list)
    topics: List[str] = field(default_factory=list)
    requires_urgent_attention: bool = False
    explanation: str = ""
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class BatchSentimentResult:
    """Result of a batch sentiment analysis."""

    results: List[SentimentResult] = field(default_factory=list)
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    errors: List[Dict[str, str]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# System prompt for sentiment analysis
# ---------------------------------------------------------------------------

_SENTIMENT_SYSTEM_PROMPT = """\
You are a sentiment analysis expert specialising in social media content.
Analyze the given text and respond ONLY with valid JSON (no markdown fences,
no extra text) containing exactly these fields:

{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "sentiment_score": <float from -1.0 to 1.0>,
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_factors": [<list of strings>],
  "topics": [<1-5 key topics extracted>],
  "requires_urgent_attention": <boolean>,
  "explanation": "<1-2 sentence summary>"
}

Risk factors may include: "brand_criticism", "legal_threat", "profanity",
"misinformation", "customer_complaint", "competitor_mention",
"data_privacy_concern", "employee_mention", "crisis_potential",
"spam", "bot_activity".

Assign risk_level as:
- "low": benign or positive mention
- "medium": mild criticism or ambiguous tone
- "high": strong negative sentiment, public complaint, or PR risk
- "critical": legal threat, data breach mention, viral negative content,
  or anything requiring immediate human intervention
"""


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class SentimentAnalyzer:
    """Analyses sentiment and risk for social-media mentions via Claude."""

    def __init__(self, claude_service: Optional[ClaudeService] = None) -> None:
        self._claude = claude_service or ClaudeService()

    # ------------------------------------------------------------------
    # Single mention
    # ------------------------------------------------------------------

    async def analyze(
        self,
        mention_id: str,
        text: str,
        platform: str = "",
        author_name: str = "",
        context: str = "",
    ) -> SentimentResult:
        """Analyse a single mention.

        Parameters
        ----------
        mention_id:
            Unique identifier for the mention.
        text:
            The raw text to analyse.
        platform:
            Source platform (for context).
        author_name:
            Author display name (for context).
        context:
            Any additional context (e.g. brand name, product names).
        """
        user_message = self._build_user_message(text, platform, author_name, context)

        try:
            result = await self._claude.generate_raw(
                system_prompt=_SENTIMENT_SYSTEM_PROMPT,
                user_message=user_message,
                max_tokens=512,
            )
            analysis = self._parse_json(result.text)

            return SentimentResult(
                mention_id=mention_id,
                sentiment=analysis.get("sentiment", "neutral"),
                sentiment_score=float(analysis.get("sentiment_score", 0.0)),
                risk_level=analysis.get("risk_level", "low"),
                risk_factors=analysis.get("risk_factors", []),
                topics=analysis.get("topics", []),
                requires_urgent_attention=bool(
                    analysis.get("requires_urgent_attention", False)
                ),
                explanation=analysis.get("explanation", ""),
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
            )
        except Exception as exc:
            logger.exception("Sentiment analysis failed  mention=%s", mention_id)
            return SentimentResult(
                mention_id=mention_id,
                sentiment="neutral",
                sentiment_score=0.0,
                risk_level="low",
                explanation=f"Analysis failed: {exc}",
            )

    # ------------------------------------------------------------------
    # Batch analysis
    # ------------------------------------------------------------------

    async def analyze_batch(
        self,
        mentions: List[Dict[str, str]],
        context: str = "",
    ) -> BatchSentimentResult:
        """Analyse multiple mentions.

        Parameters
        ----------
        mentions:
            List of dicts each containing at least ``mention_id`` and ``text``.
            Optional keys: ``platform``, ``author_name``.
        context:
            Shared context for all mentions (e.g. brand info).
        """
        batch_result = BatchSentimentResult()

        for mention in mentions:
            try:
                sr = await self.analyze(
                    mention_id=mention["mention_id"],
                    text=mention["text"],
                    platform=mention.get("platform", ""),
                    author_name=mention.get("author_name", ""),
                    context=context,
                )
                batch_result.results.append(sr)
                batch_result.total_input_tokens += sr.input_tokens
                batch_result.total_output_tokens += sr.output_tokens
            except Exception as exc:
                batch_result.errors.append({
                    "mention_id": mention.get("mention_id", ""),
                    "error": str(exc),
                })

        return batch_result

    # ------------------------------------------------------------------
    # Quick classification (without full Claude call)
    # ------------------------------------------------------------------

    @staticmethod
    def quick_classify(text: str) -> str:
        """Rule-based quick sentiment classification.

        Useful as a fast pre-filter before calling the full Claude
        analysis. Returns ``positive``, ``negative``, or ``neutral``.
        """
        text_lower = text.lower()

        negative_signals = [
            "hate", "terrible", "worst", "scam", "fraud", "lawsuit",
            "disgusting", "awful", "unacceptable", "furious", "broken",
            "refund", "complaint", "never again", "rip off", "boycott",
        ]
        positive_signals = [
            "love", "amazing", "excellent", "fantastic", "great job",
            "best ever", "recommend", "awesome", "outstanding", "thank you",
            "brilliant", "perfect", "impressed", "wonderful",
        ]

        neg_count = sum(1 for sig in negative_signals if sig in text_lower)
        pos_count = sum(1 for sig in positive_signals if sig in text_lower)

        if neg_count > pos_count:
            return "negative"
        if pos_count > neg_count:
            return "positive"
        return "neutral"

    # ------------------------------------------------------------------
    # Urgency check
    # ------------------------------------------------------------------

    @staticmethod
    def is_urgent(result: SentimentResult) -> bool:
        """Determine if a mention requires immediate attention.

        Returns True if:
        - risk_level is "critical"
        - risk_level is "high" and sentiment_score < -0.5
        - requires_urgent_attention flag is set
        """
        if result.requires_urgent_attention:
            return True
        if result.risk_level == "critical":
            return True
        if result.risk_level == "high" and result.sentiment_score < -0.5:
            return True
        return False

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _build_user_message(
        text: str,
        platform: str,
        author_name: str,
        context: str,
    ) -> str:
        parts = [f"Analyze the sentiment of this social media mention:\n\n{text}"]
        if platform:
            parts.append(f"\nPlatform: {platform}")
        if author_name:
            parts.append(f"Author: {author_name}")
        if context:
            parts.append(f"Context: {context}")
        return "\n".join(parts)

    @staticmethod
    def _parse_json(raw: str) -> Dict[str, Any]:
        """Parse JSON from the Claude response, handling markdown fences."""
        # Try direct parse
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        # Try extracting JSON from markdown code fence or embedded JSON
        match = re.search(r"\{[\s\S]*\}", raw)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        logger.warning("Could not parse sentiment JSON: %s", raw[:200])
        return {}

    async def close(self) -> None:
        """Close the underlying Claude client."""
        await self._claude.close()
