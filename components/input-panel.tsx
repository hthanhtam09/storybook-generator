"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryInput } from "@/components/story-input";
import { ImageUpload } from "@/components/image-upload";
import { MetadataForm } from "@/components/metadata-form";
import { IllustrationDisplay } from "@/components/illustration-display";
import type { Story, ImageFile, BookMetadata } from "@/lib/types";

interface InputPanelProps {
  onStoriesChange: (stories: Story[]) => void;
  onMetadataChange: (metadata: BookMetadata | null) => void;
  onImagesChange: (images: ImageFile[]) => void;
}

export function InputPanel({
  onStoriesChange,
  onMetadataChange,
  onImagesChange,
}: InputPanelProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [storyInput, setStoryInput] = useState("");

  const handleStoriesChange = (newStories: Story[], inputText: string) => {
    setStories(newStories);
    setStoryInput(inputText);
    onStoriesChange(newStories);
  };

  const handleMetadataChange = (newMetadata: BookMetadata | null) => {
    setMetadata(newMetadata);
    onMetadataChange(newMetadata);
  };

  const handleImagesChange = (newImages: ImageFile[]) => {
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="stories" className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="illustrations">Illustrations</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <TabsContent value="stories" className="mt-0 h-full">
            <StoryInput
              initialValue={storyInput}
              onStoriesChange={handleStoriesChange}
            />
          </TabsContent>

          <TabsContent value="images" className="mt-0 h-full">
            <ImageUpload
              storyCount={stories.length}
              images={images}
              onImagesChange={handleImagesChange}
            />
          </TabsContent>

          <TabsContent value="metadata" className="mt-0 h-full">
            <MetadataForm
              metadata={metadata}
              onMetadataChange={handleMetadataChange}
            />
          </TabsContent>

          <TabsContent value="illustrations" className="mt-0 h-full">
            <IllustrationDisplay stories={stories} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
