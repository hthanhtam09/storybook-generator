"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { InputPanel } from "@/components/input-panel";
import { PreviewPanel } from "@/components/preview-panel";
import { Toaster } from "@/components/ui/toaster";
import type { Story, BookMetadata, ImageFile, TemplateFile } from "@/lib/types";

const HARDCODED_TEMPLATE: TemplateFile = {
  filePath: "templates/template-1.docx",
  name: "template-1.docx",
};

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [metadata, setMetadata] = useState<BookMetadata | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);

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
            />
          </div>
          <div className="w-1/2">
            <PreviewPanel
              stories={stories}
              metadata={metadata}
              images={images}
              template={HARDCODED_TEMPLATE}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
