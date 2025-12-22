"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationsInput } from "@/components/conversations-input";
import { ConversationsMetadata } from "@/components/conversations-metadata";
import {
  ConversationsImages,
  type ConversationImageFile,
} from "@/components/conversations-images";
import { ConversationsIllustrations } from "@/components/conversations-illustrations";
import {
  ConversationsMetadataForm,
  type ConversationMetadata,
} from "@/components/conversations-metadata";
import type { ConversationLesson } from "@/lib/types";

interface ConversationsPanelProps {
  onLessonsChange: (lessons: ConversationLesson[]) => void;
  onMetadataChange: (metadata: ConversationMetadata) => void;
  onImagesChange: (images: ConversationImageFile[]) => void;
}

export function ConversationsPanel({
  onLessonsChange,
  onMetadataChange,
  onImagesChange,
}: ConversationsPanelProps) {
  const [lessons, setLessons] = useState<ConversationLesson[]>([]);
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
  const [lessonsInput, setLessonsInput] = useState("");

  const handleLessonsChange = (
    newLessons: ConversationLesson[],
    inputText: string
  ) => {
    setLessons(newLessons);
    setLessonsInput(inputText);
    onLessonsChange(newLessons);
  };

  const handleMetadataChange = (newMetadata: ConversationMetadata) => {
    setMetadata(newMetadata);
    onMetadataChange(newMetadata);
  };

  const handleImagesChange = (newImages: ConversationImageFile[]) => {
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="conversations" className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="illustrations">Illustrations</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="conversations" className="mt-0 h-full">
            <ConversationsInput
              initialValue={lessonsInput}
              onLessonsChange={handleLessonsChange}
            />
          </TabsContent>

          <TabsContent value="images" className="mt-0 h-full">
            <ConversationsImages
              lessonCount={lessons.length}
              images={images}
              onImagesChange={handleImagesChange}
            />
          </TabsContent>

          <TabsContent value="illustrations" className="mt-0 h-full">
            <ConversationsIllustrations lessons={lessons} />
          </TabsContent>

          <TabsContent value="metadata" className="mt-0 h-full">
            <ConversationsMetadataForm
              metadata={metadata}
              onMetadataChange={handleMetadataChange}
              lessons={lessons}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
