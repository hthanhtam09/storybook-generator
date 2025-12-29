"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationsInput } from "@/components/conversations-input";
import {
  ConversationsMetadataForm,
  type ConversationMetadata,
} from "@/components/conversations-metadata";
import type { ConversationLesson } from "@/lib/types";

interface ConversationsPanelProps {
  onLessonsChange: (lessons: ConversationLesson[]) => void;
  onMetadataChange: (metadata: ConversationMetadata) => void;
}

export function ConversationsPanel({
  onLessonsChange,
  onMetadataChange,
}: ConversationsPanelProps) {
  const [lessons, setLessons] = useState<ConversationLesson[]>([]);
  const [metadata, setMetadata] = useState<ConversationMetadata>({
    title: "",
    author: "",
    publisher: "",
    copyrightYear: 2024,
    publicationLocation: "",
    language: "en",
    introduction: "",
    howToUse: "",
    conclusion: "",
    description: "",
    fullPageImage: undefined,
  });
  const [lessonsInput, setLessonsInput] = useState("");

  // Set the current year on client side only to avoid hydration mismatch
  useEffect(() => {
    setMetadata((prev) => ({
      ...prev,
      copyrightYear: new Date().getFullYear(),
    }));
  }, []);

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

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="conversations" className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
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
