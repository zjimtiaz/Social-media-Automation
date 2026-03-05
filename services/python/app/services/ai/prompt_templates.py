"""
Platform-specific prompt templates for AI content generation.

Each template is tailored to the constraints and conventions of its target
platform: character limits, formatting norms, and audience expectations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional


# ---------------------------------------------------------------------------
# Platform constraint constants
# ---------------------------------------------------------------------------

PLATFORM_LIMITS: Dict[str, int] = {
    "x": 280,
    "instagram": 2200,
    "facebook": 63206,
    "linkedin": 3000,
    "quora": 10000,
    "reddit": 40000,
    "youtube_title": 100,
    "youtube_description": 5000,
}


# ---------------------------------------------------------------------------
# Template dataclass
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PromptTemplate:
    """A single prompt template with platform metadata."""

    platform: str
    content_type: str          # short_text | article | community_response
    system_prompt: str
    user_prompt: str           # may contain {placeholders}
    max_output_tokens: int = 1024
    char_limit: Optional[int] = None
    extra_instructions: str = ""


# ---------------------------------------------------------------------------
# SHORT TEXT templates
# ---------------------------------------------------------------------------

SHORT_TEXT_TEMPLATES: Dict[str, PromptTemplate] = {
    "x": PromptTemplate(
        platform="x",
        content_type="short_text",
        char_limit=280,
        max_output_tokens=256,
        system_prompt=(
            "You are a social-media copywriter specialising in X (formerly Twitter). "
            "Your output MUST be 280 characters or fewer, including any hashtags or mentions. "
            "Write punchy, engaging tweets that drive replies and retweets."
        ),
        user_prompt=(
            "Write a tweet about the following topic.\n\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n"
            "Hashtags to consider: {hashtags}\n\n"
            "Rules:\n"
            "- Maximum 280 characters\n"
            "- Include 1-3 relevant hashtags only if they fit naturally\n"
            "- Do NOT use markdown formatting\n"
            "- Output the tweet text only, nothing else"
        ),
    ),
    "instagram": PromptTemplate(
        platform="instagram",
        content_type="short_text",
        char_limit=2200,
        max_output_tokens=512,
        system_prompt=(
            "You are an Instagram content strategist. Write captions that are "
            "visually appealing, use line breaks for readability, and include a "
            "clear call-to-action. Hashtags go at the end after a line break."
        ),
        user_prompt=(
            "Write an Instagram caption.\n\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n"
            "Hashtags to consider: {hashtags}\n\n"
            "Rules:\n"
            "- Maximum 2200 characters\n"
            "- Open with a hook line\n"
            "- Use line breaks between paragraphs\n"
            "- End with a call-to-action\n"
            "- Place 5-15 hashtags on a separate final line\n"
            "- Do NOT use markdown bold/italic (Instagram does not render it)\n"
            "- Output caption text only"
        ),
    ),
    "facebook": PromptTemplate(
        platform="facebook",
        content_type="short_text",
        char_limit=63206,
        max_output_tokens=512,
        system_prompt=(
            "You are a Facebook content creator. Write posts that encourage "
            "engagement through questions, stories, or relatable insights. "
            "Keep paragraphs short. Emojis are acceptable in moderation."
        ),
        user_prompt=(
            "Write a Facebook post.\n\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- Keep it concise but conversational (150-500 characters ideal)\n"
            "- End with a question or call-to-action to drive comments\n"
            "- Use 1-2 relevant emojis if appropriate for the tone\n"
            "- Output post text only"
        ),
    ),
    "linkedin": PromptTemplate(
        platform="linkedin",
        content_type="short_text",
        char_limit=3000,
        max_output_tokens=768,
        system_prompt=(
            "You are a LinkedIn thought-leadership ghostwriter. Write "
            "professional posts that share insight, spark discussion among "
            "industry peers, and position the author as knowledgeable."
        ),
        user_prompt=(
            "Write a LinkedIn post.\n\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- Maximum 3000 characters\n"
            "- Open with a strong hook (first 2 lines are visible before 'see more')\n"
            "- Use short paragraphs (1-2 sentences each)\n"
            "- Include a professional call-to-action\n"
            "- Add 3-5 relevant hashtags at the end\n"
            "- Do NOT use markdown; LinkedIn supports Unicode bold/italic but keep it minimal\n"
            "- Output post text only"
        ),
    ),
    "reddit": PromptTemplate(
        platform="reddit",
        content_type="short_text",
        char_limit=40000,
        max_output_tokens=768,
        system_prompt=(
            "You are a seasoned Reddit contributor. Write posts that sound "
            "authentic and community-oriented. Avoid sounding like a marketer. "
            "Reddit users value substance, honesty, and proper formatting."
        ),
        user_prompt=(
            "Write a Reddit post.\n\n"
            "Subreddit context: {subreddit}\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- Title (one concise line) on the first line, then a blank line, then the body\n"
            "- Use Reddit markdown (## for headings, **bold**, *italic*, bullet lists)\n"
            "- Sound like a genuine community member, not a brand\n"
            "- Be informative and add value\n"
            "- Do NOT use hashtags\n"
            "- Output title and body only"
        ),
    ),
    "youtube": PromptTemplate(
        platform="youtube",
        content_type="short_text",
        char_limit=5000,
        max_output_tokens=512,
        system_prompt=(
            "You are a YouTube SEO specialist and copywriter. Write titles "
            "and descriptions that are keyword-rich, click-worthy, and "
            "accurately represent the video content."
        ),
        user_prompt=(
            "Write a YouTube video title and description.\n\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- TITLE (max 100 characters): catchy, keyword-front-loaded\n"
            "- DESCRIPTION (max 5000 characters):\n"
            "  - First 2 lines: compelling summary (visible before 'Show more')\n"
            "  - Timestamps section if applicable\n"
            "  - Relevant links placeholders\n"
            "  - End with relevant tags/keywords as a comma-separated line\n"
            "- Format output exactly as:\n"
            "  TITLE: <title>\n"
            "  DESCRIPTION:\n"
            "  <description>"
        ),
    ),
    "quora": PromptTemplate(
        platform="quora",
        content_type="short_text",
        char_limit=10000,
        max_output_tokens=768,
        system_prompt=(
            "You are a Quora expert answer writer. Provide thoughtful, "
            "well-structured answers that demonstrate genuine expertise. "
            "Quora rewards depth, credibility, and helpfulness."
        ),
        user_prompt=(
            "Write a Quora answer.\n\n"
            "Question: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- Open with a direct answer to the question\n"
            "- Support with 2-3 key arguments or examples\n"
            "- Use short paragraphs for readability\n"
            "- Sound like a knowledgeable professional, not a content mill\n"
            "- Do NOT use hashtags\n"
            "- Output the answer text only"
        ),
    ),
}


# ---------------------------------------------------------------------------
# ARTICLE templates (long-form)
# ---------------------------------------------------------------------------

ARTICLE_TEMPLATES: Dict[str, PromptTemplate] = {
    "linkedin": PromptTemplate(
        platform="linkedin",
        content_type="article",
        max_output_tokens=4096,
        system_prompt=(
            "You are a professional content writer specialising in LinkedIn "
            "articles. Write well-structured, insightful articles that "
            "establish thought leadership and drive professional engagement."
        ),
        user_prompt=(
            "Write a LinkedIn article.\n\n"
            "Title: {title}\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n"
            "Target audience: {audience}\n\n"
            "Rules:\n"
            "- Include a compelling headline\n"
            "- 800-2000 words\n"
            "- Use subheadings (## H2) for structure\n"
            "- Include an introduction, 3-5 main sections, and a conclusion\n"
            "- End with a call-to-action or discussion prompt\n"
            "- Professional but accessible language\n"
            "- Output the full article in markdown"
        ),
    ),
    "facebook": PromptTemplate(
        platform="facebook",
        content_type="article",
        max_output_tokens=4096,
        system_prompt=(
            "You are a content writer for Facebook Notes / long-form posts. "
            "Write engaging, shareable articles that appeal to a broad audience."
        ),
        user_prompt=(
            "Write a long-form Facebook post / article.\n\n"
            "Title: {title}\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- 500-1500 words\n"
            "- Conversational, story-driven style\n"
            "- Short paragraphs (2-3 sentences max)\n"
            "- Include a hook, body, and conclusion\n"
            "- End with a question to spark comments\n"
            "- Output the article text"
        ),
    ),
    "reddit": PromptTemplate(
        platform="reddit",
        content_type="article",
        max_output_tokens=4096,
        system_prompt=(
            "You are an experienced Reddit long-form poster. Write detailed, "
            "substantive posts that provide genuine value to the community."
        ),
        user_prompt=(
            "Write a detailed Reddit post.\n\n"
            "Subreddit context: {subreddit}\n"
            "Title: {title}\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- Title on first line, then blank line, then body\n"
            "- Use Reddit markdown formatting\n"
            "- Include a TL;DR at the end\n"
            "- 500-3000 words\n"
            "- Sound like an authentic community member\n"
            "- Be thorough and cite sources where applicable"
        ),
    ),
    "quora": PromptTemplate(
        platform="quora",
        content_type="article",
        max_output_tokens=4096,
        system_prompt=(
            "You are a Quora expert contributor writing an in-depth answer. "
            "Provide authoritative, well-researched content that thoroughly "
            "addresses the question."
        ),
        user_prompt=(
            "Write a detailed Quora answer.\n\n"
            "Question: {title}\n"
            "Topic: {topic}\n"
            "Tone: {tone}\n"
            "Key points: {key_points}\n\n"
            "Rules:\n"
            "- Open with a concise direct answer\n"
            "- Expand with detailed analysis (1000-3000 words)\n"
            "- Use numbered lists or bullet points for key takeaways\n"
            "- Include examples and, where possible, data references\n"
            "- Maintain an authoritative yet approachable voice\n"
            "- Output the answer text only"
        ),
    ),
}


# ---------------------------------------------------------------------------
# COMMUNITY RESPONSE templates
# ---------------------------------------------------------------------------

COMMUNITY_RESPONSE_TEMPLATES: Dict[str, PromptTemplate] = {
    "x": PromptTemplate(
        platform="x",
        content_type="community_response",
        char_limit=280,
        max_output_tokens=256,
        system_prompt=(
            "You are a brand community manager responding on X (Twitter). "
            "Be concise, helpful, and on-brand. Maximum 280 characters."
        ),
        user_prompt=(
            "Compose a reply to the following mention on X.\n\n"
            "Original message: {mention_text}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- Maximum 280 characters\n"
            "- Address the user's point directly\n"
            "- Be helpful, not defensive\n"
            "- If negative sentiment, acknowledge and offer to help\n"
            "- Do NOT use hashtags in replies unless very relevant\n"
            "- Output reply text only"
        ),
    ),
    "instagram": PromptTemplate(
        platform="instagram",
        content_type="community_response",
        char_limit=2200,
        max_output_tokens=256,
        system_prompt=(
            "You are a brand community manager responding on Instagram. "
            "Be warm, authentic, and engaging."
        ),
        user_prompt=(
            "Compose a reply to the following Instagram comment.\n\n"
            "Original comment: {mention_text}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- Keep it brief (1-3 sentences)\n"
            "- Be personal and warm\n"
            "- Use 1 emoji if appropriate\n"
            "- If negative, be empathetic and offer help\n"
            "- Output reply text only"
        ),
    ),
    "facebook": PromptTemplate(
        platform="facebook",
        content_type="community_response",
        char_limit=8000,
        max_output_tokens=256,
        system_prompt=(
            "You are a brand community manager responding on Facebook. "
            "Be friendly, professional, and solution-oriented."
        ),
        user_prompt=(
            "Compose a reply to the following Facebook comment.\n\n"
            "Original comment: {mention_text}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- 1-4 sentences\n"
            "- Address the commenter by context if possible\n"
            "- For complaints, acknowledge and offer resolution path\n"
            "- Output reply text only"
        ),
    ),
    "linkedin": PromptTemplate(
        platform="linkedin",
        content_type="community_response",
        char_limit=1250,
        max_output_tokens=256,
        system_prompt=(
            "You are a brand representative responding on LinkedIn. "
            "Be professional, thoughtful, and add value."
        ),
        user_prompt=(
            "Compose a reply to the following LinkedIn comment.\n\n"
            "Original comment: {mention_text}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- Professional tone\n"
            "- 1-3 sentences\n"
            "- Add insight or acknowledge their point\n"
            "- Output reply text only"
        ),
    ),
    "reddit": PromptTemplate(
        platform="reddit",
        content_type="community_response",
        char_limit=10000,
        max_output_tokens=512,
        system_prompt=(
            "You are a community manager responding on Reddit. Sound like "
            "a genuine Redditor, not a corporate account. Be transparent "
            "about representing the brand if relevant."
        ),
        user_prompt=(
            "Compose a reply to the following Reddit comment.\n\n"
            "Original comment: {mention_text}\n"
            "Subreddit: {subreddit}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- Sound authentic, not corporate\n"
            "- Use Reddit markdown where helpful\n"
            "- Be substantive and helpful\n"
            "- Acknowledge valid criticism\n"
            "- Do NOT be salesy\n"
            "- Output reply text only"
        ),
    ),
    "youtube": PromptTemplate(
        platform="youtube",
        content_type="community_response",
        char_limit=10000,
        max_output_tokens=256,
        system_prompt=(
            "You are a channel community manager responding to YouTube "
            "comments. Be appreciative, helpful, and encourage engagement."
        ),
        user_prompt=(
            "Compose a reply to the following YouTube comment.\n\n"
            "Original comment: {mention_text}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- 1-3 sentences\n"
            "- Thank them for watching/commenting if appropriate\n"
            "- Address their point\n"
            "- Encourage further engagement (subscribe, watch another video)\n"
            "- Output reply text only"
        ),
    ),
    "quora": PromptTemplate(
        platform="quora",
        content_type="community_response",
        char_limit=10000,
        max_output_tokens=512,
        system_prompt=(
            "You are a knowledgeable professional responding on Quora. "
            "Provide value-driven replies that demonstrate expertise."
        ),
        user_prompt=(
            "Compose a reply to the following Quora comment or answer.\n\n"
            "Original text: {mention_text}\n"
            "Sentiment: {sentiment}\n"
            "Tone: {tone}\n"
            "Brand guidelines: {guidelines}\n\n"
            "Rules:\n"
            "- Be substantive and informative\n"
            "- Add new perspective or data\n"
            "- Sound like an expert, not a marketer\n"
            "- Output reply text only"
        ),
    ),
}


# ---------------------------------------------------------------------------
# Helper look-ups
# ---------------------------------------------------------------------------

def get_short_text_template(platform: str) -> PromptTemplate:
    """Return the short-text template for a given platform."""
    key = platform.lower().strip()
    if key not in SHORT_TEXT_TEMPLATES:
        raise ValueError(
            f"No short_text template for platform '{platform}'. "
            f"Available: {list(SHORT_TEXT_TEMPLATES.keys())}"
        )
    return SHORT_TEXT_TEMPLATES[key]


def get_article_template(platform: str) -> PromptTemplate:
    """Return the article template for a given platform."""
    key = platform.lower().strip()
    if key not in ARTICLE_TEMPLATES:
        raise ValueError(
            f"No article template for platform '{platform}'. "
            f"Available: {list(ARTICLE_TEMPLATES.keys())}"
        )
    return ARTICLE_TEMPLATES[key]


def get_response_template(platform: str) -> PromptTemplate:
    """Return the community-response template for a given platform."""
    key = platform.lower().strip()
    if key not in COMMUNITY_RESPONSE_TEMPLATES:
        raise ValueError(
            f"No community_response template for platform '{platform}'. "
            f"Available: {list(COMMUNITY_RESPONSE_TEMPLATES.keys())}"
        )
    return COMMUNITY_RESPONSE_TEMPLATES[key]


def format_template(template: PromptTemplate, **kwargs: str) -> str:
    """Fill placeholders in the user_prompt.

    Missing keys are replaced with empty strings rather than raising.
    """
    text = template.user_prompt
    for key, value in kwargs.items():
        text = text.replace(f"{{{key}}}", str(value))
    # Remove any remaining unfilled placeholders
    import re
    text = re.sub(r"\{[a-z_]+\}", "", text)
    return text.strip()
