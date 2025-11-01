"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  X,
  Image as ImageIcon,
  Wand2,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { SUPPORTED_LANGUAGES, CURRENT_YEAR } from "@/lib/constants";
import { generateContent } from "@/lib/deepseek-generator";
import { useToast } from "@/hooks/use-toast";
import type { BookMetadata, Story } from "@/lib/types";

interface MetadataFormProps {
  metadata?: BookMetadata | null;
  onMetadataChange?: (metadata: BookMetadata) => void;
  stories?: Story[];
}

export function MetadataForm({
  metadata: initialMetadata,
  onMetadataChange,
  stories = [],
}: MetadataFormProps) {
  const [metadata, setMetadata] = useState<BookMetadata>(
    initialMetadata || {
      title: "",
      author: "",
      publisher: "",
      copyrightYear: CURRENT_YEAR,
      publicationLocation: "",
      language: "en",
      introduction: "",
      howToUse: "",
      conclusion: "",
      description: "",
      fullPageImage: undefined,
    }
  );
  const [fullPageImagePreview, setFullPageImagePreview] = useState<
    string | null
  >(null);
  const [generatingSections, setGeneratingSections] = useState<{
    introduction: boolean;
    howToUse: boolean;
    conclusion: boolean;
    description: boolean;
  }>({
    introduction: false,
    howToUse: false,
    conclusion: false,
    description: false,
  });
  const [prompts, setPrompts] = useState<{
    introduction: string | null;
    howToUse: string | null;
    conclusion: string | null;
    description: string | null;
  }>({
    introduction: null,
    howToUse: null,
    conclusion: null,
    description: null,
  });
  const [loadingPrompts, setLoadingPrompts] = useState<{
    introduction: boolean;
    howToUse: boolean;
    conclusion: boolean;
    description: boolean;
  }>({
    introduction: false,
    howToUse: false,
    conclusion: false,
    description: false,
  });
  const [copiedStates, setCopiedStates] = useState<{
    introduction: boolean;
    howToUse: boolean;
    conclusion: boolean;
    description: boolean;
  }>({
    introduction: false,
    howToUse: false,
    conclusion: false,
    description: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (initialMetadata) {
      setMetadata(initialMetadata);
      // Set preview if fullPageImage exists
      if (initialMetadata.fullPageImage) {
        const url = URL.createObjectURL(initialMetadata.fullPageImage);
        setFullPageImagePreview(url);
        return () => URL.revokeObjectURL(url);
      }
    }
  }, [initialMetadata]);

  const updateMetadata = (
    field: keyof BookMetadata,
    value: string | number | File
  ) => {
    const updated = { ...metadata, [field]: value };
    setMetadata(updated);
    if (onMetadataChange) {
      onMetadataChange(updated);
    }
  };

  const handleFullPageImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Image file size must be less than 10MB");
        return;
      }

      updateMetadata("fullPageImage", file);

      // Create preview
      const url = URL.createObjectURL(file);
      setFullPageImagePreview(url);
    }
  };

  const removeFullPageImage = () => {
    updateMetadata("fullPageImage", undefined as any);
    if (fullPageImagePreview) {
      URL.revokeObjectURL(fullPageImagePreview);
      setFullPageImagePreview(null);
    }
  };

  const handleFetchPrompt = async (
    type: "introduction" | "howToUse" | "conclusion" | "description"
  ) => {
    if (!stories.length) {
      toast({
        title: "No Stories Available",
        description: "Please add some stories before fetching prompt.",
        variant: "destructive",
      });
      return;
    }

    if (!metadata.title || !metadata.author) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in the book title and author before fetching prompt.",
        variant: "destructive",
      });
      return;
    }

    setLoadingPrompts((prev) => ({ ...prev, [type]: true }));

    try {
      const response = await fetch("/api/deepseek/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          stories,
          metadata: {
            title: metadata.title,
            author: metadata.author,
            language: metadata.language,
            subtitle: undefined,
            proficiencyLevel: "Intermediate" as const,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch prompt");
      }

      const data = await response.json();
      if (data.success && data.prompt) {
        setPrompts((prev) => ({ ...prev, [type]: data.prompt }));
        toast({
          title: "Prompt Fetched",
          description: `Successfully loaded prompt for ${type}.`,
        });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Prompt fetch error:", error);
      toast({
        title: "Fetch Error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while fetching prompt.",
        variant: "destructive",
      });
      setPrompts((prev) => ({ ...prev, [type]: null }));
    } finally {
      setLoadingPrompts((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleCopyPrompt = async (
    type: "introduction" | "howToUse" | "conclusion" | "description"
  ) => {
    const prompt = prompts[type];
    if (!prompt) return;

    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedStates((prev) => ({ ...prev, [type]: true }));
      toast({
        title: "Copied!",
        description: "Prompt has been copied to clipboard.",
      });
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSection = async (
    type: "introduction" | "howToUse" | "conclusion" | "description"
  ) => {
    if (!stories.length) {
      toast({
        title: "No Stories Available",
        description: "Please add some stories before generating content.",
        variant: "destructive",
      });
      return;
    }

    if (!metadata.title || !metadata.author) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in the book title and author before generating content.",
        variant: "destructive",
      });
      return;
    }

    // Set loading state for this specific section
    setGeneratingSections((prev) => ({ ...prev, [type]: true }));

    try {
      // Show initial loading message
      toast({
        title: "Generating Content",
        description: `Generating ${type} section...`,
      });

      const result = await generateContent(type, stories, metadata);

      if (result.success && result.content) {
        updateMetadata(type, result.content);
        toast({
          title: "Content Generated",
          description: `Successfully generated ${type} section.`,
        });
      } else {
        const isRateLimited = result.error?.includes("rate-limited");
        toast({
          title: isRateLimited
            ? "Service Temporarily Unavailable"
            : "Generation Failed",
          description: result.error || "Failed to generate content",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Error",
        description: "An unexpected error occurred while generating content.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state for this specific section
      setGeneratingSections((prev) => ({ ...prev, [type]: false }));
    }
  };

  const requiredFieldsFilled =
    metadata.title &&
    metadata.author &&
    metadata.publisher &&
    metadata.publicationLocation &&
    metadata.introduction &&
    metadata.howToUse &&
    metadata.conclusion &&
    metadata.description;

  const completionCount = [
    metadata.title,
    metadata.author,
    metadata.publisher,
    metadata.publicationLocation,
    metadata.introduction,
    metadata.howToUse,
    metadata.conclusion,
    metadata.description,
  ].filter(Boolean).length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Book Metadata</h3>
          <p className="text-xs text-muted-foreground">
            Enter book information and sections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {completionCount} / 8 fields
          </Badge>
          {requiredFieldsFilled && (
            <Badge
              variant="outline"
              className="gap-1 border-green-500/50 text-green-500"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Badge>
          )}
        </div>
      </div>

      <Card className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Basic Information
            </h4>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs">
                Book Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={metadata.title}
                onChange={(e) => updateMetadata("title", e.target.value)}
                placeholder="e.g., Spanish Halloween Stories for Beginners"
                className="text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="author" className="text-xs">
                  Author <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="author"
                  value={metadata.author}
                  onChange={(e) => updateMetadata("author", e.target.value)}
                  placeholder="e.g., John Smith"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publisher" className="text-xs">
                  Publisher <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="publisher"
                  value={metadata.publisher}
                  onChange={(e) => updateMetadata("publisher", e.target.value)}
                  placeholder="e.g., Language Learning Press"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="year" className="text-xs">
                  Copyright Year
                </Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max={CURRENT_YEAR}
                  value={metadata.copyrightYear}
                  onChange={(e) =>
                    updateMetadata(
                      "copyrightYear",
                      Number.parseInt(e.target.value, 10)
                    )
                  }
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs">
                  Publication Location{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  value={metadata.publicationLocation}
                  onChange={(e) =>
                    updateMetadata("publicationLocation", e.target.value)
                  }
                  placeholder="e.g., New York, USA"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-xs">
                Primary Language
              </Label>
              <Select
                value={metadata.language}
                onValueChange={(value) => updateMetadata("language", value)}
              >
                <SelectTrigger id="language" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Page Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="fullPageImage" className="text-xs">
                Full Page Image (Optional)
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload an image that will be displayed as a full page in the
                document
              </p>

              {fullPageImagePreview ? (
                <div className="relative">
                  <div className="relative w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden">
                    <img
                      src={fullPageImagePreview}
                      alt="Full page preview"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeFullPageImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metadata.fullPageImage?.name}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-4">
                      <Label htmlFor="fullPageImage" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-foreground">
                          Click to upload full page image
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          PNG, JPG, GIF up to 10MB
                        </span>
                      </Label>
                      <input
                        id="fullPageImage"
                        type="file"
                        accept="image/*"
                        onChange={handleFullPageImageUpload}
                        className="sr-only"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Content Sections
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="introduction" className="text-xs">
                  Introduction <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateSection("introduction")}
                  disabled={
                    generatingSections.introduction ||
                    !stories.length ||
                    !metadata.title ||
                    !metadata.author
                  }
                  className="h-6 px-2 text-xs"
                >
                  {generatingSections.introduction ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Textarea
                id="introduction"
                value={metadata.introduction}
                onChange={(e) => updateMetadata("introduction", e.target.value)}
                placeholder="Write an introduction to your book. This will appear at the beginning of the document."
                className="min-h-[120px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {metadata.introduction.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="howToUse" className="text-xs">
                  How to Use This Book{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateSection("howToUse")}
                  disabled={
                    generatingSections.howToUse ||
                    !stories.length ||
                    !metadata.title ||
                    !metadata.author
                  }
                  className="h-6 px-2 text-xs"
                >
                  {generatingSections.howToUse ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Textarea
                id="howToUse"
                value={metadata.howToUse}
                onChange={(e) => updateMetadata("howToUse", e.target.value)}
                placeholder="Explain how readers should use this book. Include tips for learning and getting the most out of the stories."
                className="min-h-[120px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {metadata.howToUse.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="conclusion" className="text-xs">
                  Conclusion <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateSection("conclusion")}
                  disabled={
                    generatingSections.conclusion ||
                    !stories.length ||
                    !metadata.title ||
                    !metadata.author
                  }
                  className="h-6 px-2 text-xs"
                >
                  {generatingSections.conclusion ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Textarea
                id="conclusion"
                value={metadata.conclusion}
                onChange={(e) => updateMetadata("conclusion", e.target.value)}
                placeholder="Write a conclusion for your book. This will appear at the end of the document."
                className="min-h-[120px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {metadata.conclusion.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs">
                  Book Description <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateSection("description")}
                  disabled={
                    generatingSections.description ||
                    !stories.length ||
                    !metadata.title ||
                    !metadata.author
                  }
                  className="h-6 px-2 text-xs"
                >
                  {generatingSections.description ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Textarea
                id="description"
                value={metadata.description}
                onChange={(e) => updateMetadata("description", e.target.value)}
                placeholder="Write a compelling book description for marketing and sales purposes."
                className="min-h-[120px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {metadata.description.length} characters
              </p>
            </div>
          </div>

          {/* Prompt Display Section */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-semibold text-foreground">
              AI Prompt Preview
            </h4>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Introduction Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Introduction</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFetchPrompt("introduction")}
                      disabled={
                        loadingPrompts.introduction ||
                        !stories.length ||
                        !metadata.title ||
                        !metadata.author
                      }
                      className="h-6 px-2 text-xs"
                    >
                      {loadingPrompts.introduction ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                    </Button>
                    {prompts.introduction && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrompt("introduction")}
                        className="h-6 px-2 text-xs"
                      >
                        {copiedStates.introduction ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {loadingPrompts.introduction ? (
                  <Card className="border-2">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </Card>
                ) : prompts.introduction ? (
                  <Card className="border-2">
                    <ScrollArea className="h-[250px] w-full p-3">
                      <pre className="whitespace-pre-wrap break-words text-xs font-mono text-foreground">
                        {prompts.introduction}
                      </pre>
                    </ScrollArea>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed">
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-muted-foreground text-center px-2">
                        Click icon to load prompt
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* How to Use Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">How to Use</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFetchPrompt("howToUse")}
                      disabled={
                        loadingPrompts.howToUse ||
                        !stories.length ||
                        !metadata.title ||
                        !metadata.author
                      }
                      className="h-6 px-2 text-xs"
                    >
                      {loadingPrompts.howToUse ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                    </Button>
                    {prompts.howToUse && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrompt("howToUse")}
                        className="h-6 px-2 text-xs"
                      >
                        {copiedStates.howToUse ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {loadingPrompts.howToUse ? (
                  <Card className="border-2">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </Card>
                ) : prompts.howToUse ? (
                  <Card className="border-2">
                    <ScrollArea className="h-[250px] w-full p-3">
                      <pre className="whitespace-pre-wrap break-words text-xs font-mono text-foreground">
                        {prompts.howToUse}
                      </pre>
                    </ScrollArea>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed">
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-muted-foreground text-center px-2">
                        Click icon to load prompt
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Conclusion Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Conclusion</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFetchPrompt("conclusion")}
                      disabled={
                        loadingPrompts.conclusion ||
                        !stories.length ||
                        !metadata.title ||
                        !metadata.author
                      }
                      className="h-6 px-2 text-xs"
                    >
                      {loadingPrompts.conclusion ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                    </Button>
                    {prompts.conclusion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrompt("conclusion")}
                        className="h-6 px-2 text-xs"
                      >
                        {copiedStates.conclusion ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {loadingPrompts.conclusion ? (
                  <Card className="border-2">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </Card>
                ) : prompts.conclusion ? (
                  <Card className="border-2">
                    <ScrollArea className="h-[250px] w-full p-3">
                      <pre className="whitespace-pre-wrap break-words text-xs font-mono text-foreground">
                        {prompts.conclusion}
                      </pre>
                    </ScrollArea>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed">
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-muted-foreground text-center px-2">
                        Click icon to load prompt
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Description Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Description</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFetchPrompt("description")}
                      disabled={
                        loadingPrompts.description ||
                        !stories.length ||
                        !metadata.title ||
                        !metadata.author
                      }
                      className="h-6 px-2 text-xs"
                    >
                      {loadingPrompts.description ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                    </Button>
                    {prompts.description && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyPrompt("description")}
                        className="h-6 px-2 text-xs"
                      >
                        {copiedStates.description ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {loadingPrompts.description ? (
                  <Card className="border-2">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </Card>
                ) : prompts.description ? (
                  <Card className="border-2">
                    <ScrollArea className="h-[250px] w-full p-3">
                      <pre className="whitespace-pre-wrap break-words text-xs font-mono text-foreground">
                        {prompts.description}
                      </pre>
                    </ScrollArea>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed">
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs text-muted-foreground text-center px-2">
                        Click icon to load prompt
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
