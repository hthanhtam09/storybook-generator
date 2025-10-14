"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { InputPanel } from "@/components/input-panel";
import { PreviewPanel } from "@/components/preview-panel";
import { Toaster } from "@/components/ui/toaster";
import type { Story, BookMetadata, ImageFile, TemplateFile } from "@/lib/types";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [template, setTemplate] = useState<TemplateFile | null>(null);

  return (
    <>
      <div className="flex h-screen flex-col">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-border">
            <InputPanel
              onStoriesChange={setStories}
              onMetadataChange={setMetadata}
              onImagesChange={setImages}
              onTemplateChange={setTemplate}
            />
          </div>
          <div className="w-1/2">
            <PreviewPanel
              stories={stories}
              metadata={metadata}
              images={images}
              template={template}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
