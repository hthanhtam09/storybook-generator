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
import { CheckCircle2, Upload, X, Image as ImageIcon } from "lucide-react";
import { SUPPORTED_LANGUAGES, CURRENT_YEAR } from "@/lib/constants";
import type { BookMetadata } from "@/lib/types";

interface MetadataFormProps {
  metadata?: BookMetadata | null;
  onMetadataChange?: (metadata: BookMetadata) => void;
}

export function MetadataForm({
  metadata: initialMetadata,
  onMetadataChange,
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
      fullPageImage: undefined,
    }
  );
  const [fullPageImagePreview, setFullPageImagePreview] = useState<
    string | null
  >(null);

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

  const requiredFieldsFilled =
    metadata.title &&
    metadata.author &&
    metadata.publisher &&
    metadata.publicationLocation &&
    metadata.introduction &&
    metadata.howToUse &&
    metadata.conclusion;

  const completionCount = [
    metadata.title,
    metadata.author,
    metadata.publisher,
    metadata.publicationLocation,
    metadata.introduction,
    metadata.howToUse,
    metadata.conclusion,
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
            {completionCount} / 7 fields
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
              <Label htmlFor="introduction" className="text-xs">
                Introduction <span className="text-destructive">*</span>
              </Label>
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
              <Label htmlFor="howToUse" className="text-xs">
                How to Use This Book <span className="text-destructive">*</span>
              </Label>
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
              <Label htmlFor="conclusion" className="text-xs">
                Conclusion <span className="text-destructive">*</span>
              </Label>
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
          </div>
        </div>
      </Card>
    </div>
  );
}
