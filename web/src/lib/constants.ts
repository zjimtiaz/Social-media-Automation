// ---------------------------------------------------------------------------
// Platform definitions
// ---------------------------------------------------------------------------

export interface PlatformDefinition {
  /** Unique identifier used in the DB and API */
  id: string;
  /** Display name */
  name: string;
  /** Lucide icon name (from lucide-react) */
  icon: string;
  /** Tailwind / hex brand color */
  color: string;
  /** Maximum characters for a text post */
  maxTextLength: number;
  /** Maximum characters for a post title (if applicable) */
  maxTitleLength?: number;
}

export const PLATFORMS: PlatformDefinition[] = [
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: "Twitter",
    color: "#1DA1F2",
    maxTextLength: 280,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "Facebook",
    color: "#1877F2",
    maxTextLength: 63_206,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "Instagram",
    color: "#E4405F",
    maxTextLength: 2_200,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "Linkedin",
    color: "#0A66C2",
    maxTextLength: 3_000,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "Music2",
    color: "#000000",
    maxTextLength: 2_200,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "Youtube",
    color: "#FF0000",
    maxTextLength: 5_000,
    maxTitleLength: 100,
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: "MessageCircle",
    color: "#FF4500",
    maxTextLength: 40_000,
    maxTitleLength: 300,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: "Pin",
    color: "#E60023",
    maxTextLength: 500,
  },
] as const;

// ---------------------------------------------------------------------------
// Content types
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = [
  { id: "text", label: "Text Post" },
  { id: "image", label: "Image Post" },
  { id: "video", label: "Video Post" },
  { id: "carousel", label: "Carousel / Gallery" },
  { id: "story", label: "Story" },
  { id: "reel", label: "Reel / Short" },
  { id: "thread", label: "Thread" },
  { id: "poll", label: "Poll" },
  { id: "link", label: "Link Share" },
  { id: "article", label: "Article / Long-form" },
] as const;

export type ContentTypeId = (typeof CONTENT_TYPES)[number]["id"];

// ---------------------------------------------------------------------------
// Approval statuses
// ---------------------------------------------------------------------------

export const APPROVAL_STATUSES = [
  { id: "pending", label: "Pending Review", color: "yellow" },
  { id: "approved", label: "Approved", color: "green" },
  { id: "rejected", label: "Rejected", color: "red" },
  { id: "revision_requested", label: "Revision Requested", color: "orange" },
  { id: "auto_approved", label: "Auto-Approved", color: "blue" },
] as const;

export type ApprovalStatusId = (typeof APPROVAL_STATUSES)[number]["id"];

// ---------------------------------------------------------------------------
// Campaign objectives
// ---------------------------------------------------------------------------

export const CAMPAIGN_OBJECTIVES = [
  { id: "awareness", label: "Brand Awareness" },
  { id: "reach", label: "Reach" },
  { id: "traffic", label: "Website Traffic" },
  { id: "engagement", label: "Engagement" },
  { id: "app_installs", label: "App Installs" },
  { id: "video_views", label: "Video Views" },
  { id: "lead_generation", label: "Lead Generation" },
  { id: "conversions", label: "Conversions" },
  { id: "catalog_sales", label: "Catalog Sales" },
  { id: "store_traffic", label: "Store Traffic" },
] as const;

export type CampaignObjectiveId =
  (typeof CAMPAIGN_OBJECTIVES)[number]["id"];
