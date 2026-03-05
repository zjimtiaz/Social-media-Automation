"""
Content formatter service.

Formats and validates content for each social-media platform's specific
constraints: character limits, forbidden characters, hashtag formatting,
link handling, and markdown conversion.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Platform constraints
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PlatformConstraints:
    """Hard limits and formatting rules for a platform."""

    max_text_length: int
    max_hashtags: int = 30
    supports_markdown: bool = False
    supports_html: bool = False
    supports_newlines: bool = True
    max_media: int = 4
    max_title_length: int = 0           # 0 = no separate title field
    link_shortening: bool = False
    url_counts_as_chars: int = 0        # e.g. Twitter counts every URL as 23 chars
    forbidden_patterns: Tuple[str, ...] = ()


PLATFORM_CONSTRAINTS: Dict[str, PlatformConstraints] = {
    "x": PlatformConstraints(
        max_text_length=280,
        max_hashtags=5,
        supports_markdown=False,
        max_media=4,
        url_counts_as_chars=23,
    ),
    "instagram": PlatformConstraints(
        max_text_length=2200,
        max_hashtags=30,
        supports_markdown=False,
        max_media=10,
    ),
    "facebook": PlatformConstraints(
        max_text_length=63206,
        max_hashtags=10,
        supports_markdown=False,
        max_media=10,
    ),
    "linkedin": PlatformConstraints(
        max_text_length=3000,
        max_hashtags=5,
        supports_markdown=False,
        max_media=9,
    ),
    "reddit": PlatformConstraints(
        max_text_length=40000,
        max_hashtags=0,
        supports_markdown=True,
        max_media=20,
        max_title_length=300,
    ),
    "youtube": PlatformConstraints(
        max_text_length=5000,
        max_hashtags=15,
        supports_markdown=False,
        max_media=1,
        max_title_length=100,
    ),
    "quora": PlatformConstraints(
        max_text_length=10000,
        max_hashtags=0,
        supports_markdown=False,
        supports_html=True,
        max_media=10,
    ),
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class FormatterService:
    """Formats and validates content for each platform."""

    # ------------------------------------------------------------------
    # Main formatting entry point
    # ------------------------------------------------------------------

    def format_text(self, text: str, platform: str) -> str:
        """Format text content for the target platform.

        Applies platform-specific rules: character truncation, hashtag
        limits, markdown stripping/conversion, whitespace normalisation.

        Parameters
        ----------
        text : str
            Raw content text.
        platform : str
            Target platform key.

        Returns
        -------
        str
            Formatted text ready for the platform's API.
        """
        constraints = self._get_constraints(platform)

        # Normalise whitespace
        formatted = self._normalise_whitespace(text, constraints)

        # Strip markdown if platform doesn't support it
        if not constraints.supports_markdown:
            formatted = self._strip_markdown(formatted)

        # Enforce hashtag limits
        formatted = self._limit_hashtags(formatted, constraints.max_hashtags)

        # Enforce character limit
        formatted = self._enforce_char_limit(
            formatted,
            constraints.max_text_length,
            constraints.url_counts_as_chars,
        )

        return formatted.strip()

    def format_with_title(
        self,
        title: str,
        body: str,
        platform: str,
    ) -> Tuple[str, str]:
        """Format both a title and body for platforms that have separate fields.

        Returns
        -------
        tuple[str, str]
            (formatted_title, formatted_body)
        """
        constraints = self._get_constraints(platform)

        # Format title
        formatted_title = title.strip()
        if constraints.max_title_length and len(formatted_title) > constraints.max_title_length:
            formatted_title = self._smart_truncate(
                formatted_title, constraints.max_title_length,
            )

        # Format body
        formatted_body = self.format_text(body, platform)

        return formatted_title, formatted_body

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate(self, text: str, platform: str) -> List[str]:
        """Validate text against platform constraints.

        Returns a list of warning/error messages. An empty list means
        the text passes all checks.
        """
        constraints = self._get_constraints(platform)
        issues: List[str] = []

        # Length
        effective_len = self._effective_length(text, constraints.url_counts_as_chars)
        if effective_len > constraints.max_text_length:
            issues.append(
                f"Text length ({effective_len}) exceeds {platform} limit "
                f"({constraints.max_text_length})"
            )

        # Hashtag count
        hashtags = re.findall(r"#\w+", text)
        if len(hashtags) > constraints.max_hashtags and constraints.max_hashtags > 0:
            issues.append(
                f"Hashtag count ({len(hashtags)}) exceeds {platform} limit "
                f"({constraints.max_hashtags})"
            )

        # Platform-specific checks
        if platform == "x" and not text.strip():
            issues.append("Tweet text cannot be empty")

        if platform == "instagram" and not text.strip():
            issues.append("Instagram caption cannot be empty")

        if platform == "reddit":
            if constraints.max_hashtags == 0 and hashtags:
                issues.append("Reddit does not use hashtags; consider removing them")

        return issues

    # ------------------------------------------------------------------
    # Platform-specific formatters
    # ------------------------------------------------------------------

    def format_for_x(self, text: str) -> str:
        """Shortcut for X/Twitter formatting."""
        return self.format_text(text, "x")

    def format_for_instagram(self, text: str, hashtags: Optional[List[str]] = None) -> str:
        """Format for Instagram, optionally appending hashtags."""
        formatted = self.format_text(text, "instagram")
        if hashtags:
            tag_block = " ".join(f"#{t.lstrip('#')}" for t in hashtags[:30])
            formatted = f"{formatted}\n\n{tag_block}"
            # Re-enforce length after adding hashtags
            constraints = self._get_constraints("instagram")
            formatted = self._enforce_char_limit(
                formatted, constraints.max_text_length, 0,
            )
        return formatted

    def format_for_linkedin(self, text: str) -> str:
        """Shortcut for LinkedIn formatting."""
        return self.format_text(text, "linkedin")

    def format_for_reddit(self, title: str, body: str) -> Tuple[str, str]:
        """Format for Reddit with title and markdown body."""
        return self.format_with_title(title, body, "reddit")

    def format_for_youtube(self, title: str, description: str) -> Tuple[str, str]:
        """Format YouTube title and description."""
        return self.format_with_title(title, description, "youtube")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_constraints(platform: str) -> PlatformConstraints:
        key = platform.lower().strip()
        if key in PLATFORM_CONSTRAINTS:
            return PLATFORM_CONSTRAINTS[key]
        logger.warning("No constraints for platform '%s', using defaults", platform)
        return PlatformConstraints(max_text_length=5000)

    @staticmethod
    def _normalise_whitespace(text: str, constraints: PlatformConstraints) -> str:
        """Normalise whitespace while preserving intentional formatting."""
        # Collapse runs of 3+ newlines to 2
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Collapse runs of spaces (but not newlines)
        text = re.sub(r"[^\S\n]+", " ", text)
        # Remove leading/trailing whitespace per line
        lines = [line.strip() for line in text.splitlines()]
        text = "\n".join(lines)

        if not constraints.supports_newlines:
            text = text.replace("\n", " ")
            text = re.sub(r" {2,}", " ", text)

        return text

    @staticmethod
    def _strip_markdown(text: str) -> str:
        """Remove common markdown formatting from text."""
        # Headers
        text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
        # Bold/italic
        text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)
        text = re.sub(r"_{1,3}(.+?)_{1,3}", r"\1", text)
        # Strikethrough
        text = re.sub(r"~~(.+?)~~", r"\1", text)
        # Inline code
        text = re.sub(r"`(.+?)`", r"\1", text)
        # Links [text](url) -> text (url)
        text = re.sub(r"\[(.+?)\]\((.+?)\)", r"\1 (\2)", text)
        # Images ![alt](url) -> alt
        text = re.sub(r"!\[(.+?)\]\(.+?\)", r"\1", text)
        # Blockquotes
        text = re.sub(r"^>\s+", "", text, flags=re.MULTILINE)
        # Horizontal rules
        text = re.sub(r"^[-*_]{3,}$", "", text, flags=re.MULTILINE)
        return text

    @staticmethod
    def _limit_hashtags(text: str, max_count: int) -> str:
        """Limit the number of hashtags in the text."""
        if max_count <= 0:
            # Remove all hashtags for platforms that don't use them
            return text

        hashtags = re.findall(r"#\w+", text)
        if len(hashtags) <= max_count:
            return text

        # Keep only the first max_count hashtags, remove the rest
        keep = set(hashtags[:max_count])
        seen = 0
        result_parts: List[str] = []
        i = 0
        for match in re.finditer(r"#\w+", text):
            result_parts.append(text[i:match.start()])
            tag = match.group()
            if tag in keep and seen < max_count:
                result_parts.append(tag)
                seen += 1
                keep.discard(tag)
            i = match.end()
        result_parts.append(text[i:])
        return "".join(result_parts)

    @staticmethod
    def _effective_length(text: str, url_char_cost: int) -> int:
        """Calculate effective length accounting for URL shortening."""
        if not url_char_cost:
            return len(text)

        urls = re.findall(r"https?://\S+", text)
        effective = len(text)
        for url in urls:
            effective -= len(url)
            effective += url_char_cost
        return effective

    def _enforce_char_limit(
        self, text: str, max_length: int, url_char_cost: int,
    ) -> str:
        """Truncate text to fit within the character limit."""
        effective = self._effective_length(text, url_char_cost)
        if effective <= max_length:
            return text

        # Smart truncate at word boundary
        return self._smart_truncate(text, max_length)

    @staticmethod
    def _smart_truncate(text: str, max_length: int) -> str:
        """Truncate at a word boundary, preserving trailing hashtag block."""
        if len(text) <= max_length:
            return text

        # Check if there's a hashtag block at the end
        lines = text.rstrip().rsplit("\n", 1)
        if len(lines) == 2 and lines[1].strip().startswith("#"):
            hashtag_block = lines[1]
            body = lines[0]
            available = max_length - len(hashtag_block) - 2  # -2 for \n + ellipsis
            if available > 20:
                truncated_body = body[:available].rsplit(" ", 1)[0] + "..."
                return f"{truncated_body}\n{hashtag_block}"

        # Simple truncation
        truncated = text[:max_length - 1].rsplit(" ", 1)[0]
        if not truncated:
            truncated = text[:max_length - 1]
        return truncated + "..."
