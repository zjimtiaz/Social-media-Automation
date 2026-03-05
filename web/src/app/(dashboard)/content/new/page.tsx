"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PLATFORMS, CONTENT_TYPES } from "@/lib/constants";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Save,
  Image as ImageIcon,
  X,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function ContentNewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [contentType, setContentType] = useState("text");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setText(
      "Here is an AI-generated post that is ready for your review and customization. This content has been optimized for engagement and reach across your selected platforms."
    );
    setIsGenerating(false);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
    router.push("/content");
  };

  const handleSubmitForApproval = async () => {
    setIsSaving(true);
    // Simulate submit
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
    router.push("/content");
  };

  const selectedPlatformDef = PLATFORMS.find((p) =>
    selectedPlatforms.includes(p.id)
  );
  const maxLength = selectedPlatformDef?.maxTextLength ?? 5000;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back button */}
      <Link
        href="/content"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Content
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Text editor */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Content</h2>
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                <Sparkles className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                maxLength={maxLength}
                placeholder="Write your content here, or use AI to generate it..."
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>
                  {text.length} / {maxLength.toLocaleString()} characters
                </span>
                {text.length > maxLength * 0.9 && (
                  <span className="text-yellow-600">Approaching limit</span>
                )}
              </div>
            </div>
          </div>

          {/* Media upload placeholder */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Media</h2>
            </div>
            <div className="p-4">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-8">
                <ImageIcon className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, GIF, MP4 up to 50MB
                </p>
                <button className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar options */}
        <div className="space-y-4">
          {/* Platforms */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Platforms</h2>
            </div>
            <div className="space-y-2 p-4">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    selectedPlatforms.includes(platform.id)
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white text-xs font-bold"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.name.charAt(0)}
                  </div>
                  <span className="flex-1 text-left font-medium">
                    {platform.name}
                  </span>
                  {selectedPlatforms.includes(platform.id) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content type */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Content Type
              </h2>
            </div>
            <div className="p-4">
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tone */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Tone</h2>
            </div>
            <div className="p-4">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="humorous">Humorous</option>
                <option value="formal">Formal</option>
                <option value="inspirational">Inspirational</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleSubmitForApproval}
              disabled={!text || selectedPlatforms.length === 0 || isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={!text || isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
