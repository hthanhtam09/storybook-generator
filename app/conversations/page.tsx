"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { ConversationsPanel } from "@/components/conversations-panel";
import { ConversationsPreview } from "@/components/conversations-preview";
import { Toaster } from "@/components/ui/toaster";
import type {
  ConversationsConfig,
  ConversationLesson,
  TemplateFile,
} from "@/lib/types";
import type { ConversationImageFile } from "@/components/conversations-images";
import type { ConversationMetadata } from "@/components/conversations-metadata";

const HARDCODED_TEMPLATE: TemplateFile = {
  filePath: "templates/template-1.docx",
  name: "template-1.docx",
};

export default function ConversationsPage() {
  const [config, setConfig] = useState<ConversationsConfig>({
    lessons: [],
    title: "",
    author: "",
    publisher: "",
    accentColor: "#3b82f6",
    conversationsPerTopic: 10,
  });
  const [metadata, setMetadata] = useState<ConversationMetadata>({
    title: "",
    author: "",
    publisher: "",
    copyrightYear: new Date().getFullYear(),
    publicationLocation: "",
    language: "en",
    introduction: "",
    howToUse: "",
    conclusion: "",
    description: "",
    fullPageImage: undefined,
  });
  const [images, setImages] = useState<ConversationImageFile[]>([]);

  const handleLessonsChange = (lessons: ConversationLesson[]) => {
    setConfig((prev) => ({
      ...prev,
      lessons,
    }));
  };

  const handleMetadataChange = (newMetadata: ConversationMetadata) => {
    setMetadata(newMetadata);
    setConfig((prev) => ({
      ...prev,
      title: newMetadata.title,
      author: newMetadata.author,
      publisher: newMetadata.publisher,
    }));
  };

  const handleImagesChange = (newImages: ConversationImageFile[]) => {
    setImages(newImages);
  };

  const handleExportSuccess = () => {
    // Could add success feedback here if needed
  };

  return (
    <>
      <div className="flex h-screen flex-col">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-border">
            <ConversationsPanel
              onLessonsChange={handleLessonsChange}
              onMetadataChange={handleMetadataChange}
              onImagesChange={handleImagesChange}
            />
          </div>
          <div className="w-1/2">
            <ConversationsPreview
              config={config}
              metadata={metadata}
              images={images}
              template={HARDCODED_TEMPLATE}
              onExportSuccess={handleExportSuccess}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
