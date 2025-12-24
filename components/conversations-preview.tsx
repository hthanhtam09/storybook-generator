"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  MessageCircle,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ConversationsConfig, TemplateFile } from "@/lib/types";
import type { ConversationMetadata } from "@/components/conversations-metadata";
import { Separator } from "@/components/ui/separator";
import { processConversationsTemplate } from "@/lib/conversations-template-processor";

interface ConversationsPreviewProps {
  config: ConversationsConfig;
  metadata: ConversationMetadata;
  template: TemplateFile | null;
  onExportSuccess?: () => void;
  hasValidationErrors?: boolean;
}

export function ConversationsPreview({
  config,
  metadata,
  template,
  onExportSuccess,
  hasValidationErrors = false,
}: ConversationsPreviewProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportDOCX = async () => {
    if (config.lessons.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one lesson before exporting.",
        variant: "destructive",
      });
      return;
    }

    if (!template) {
      toast({
        title: "Template error",
        description: "Template file not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const blob = await processConversationsTemplate(
        template,
        config,
        metadata
      );

      const filename = `${(config.title || "conversations").replace(
        /[^a-z0-9]/gi,
        "_"
      )}_${metadata.language}_${new Date().toISOString().split("T")[0]}.docx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success!",
        description: "Conversations DOCX has been generated successfully.",
      });

      if (onExportSuccess) {
        onExportSuccess();
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate DOCX",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getTotalVocabulary = () => {
    return config.lessons.reduce(
      (sum, lesson) => sum + lesson.vocabulary.length,
      0
    );
  };

  const getTotalDialogues = () => {
    return config.lessons.reduce(
      (sum, lesson) => sum + lesson.conversation.length,
      0
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="text-sm text-muted-foreground">
              Review your conversations book before exporting
            </p>
          </div>
          <Button
            onClick={handleExportDOCX}
            disabled={
              isExporting ||
              config.lessons.length === 0 ||
              hasValidationErrors
            }
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export DOCX
              </>
            )}
          </Button>
          {hasValidationErrors && config.lessons.length > 0 && (
            <p className="text-xs text-destructive mt-2">
              Please fix all validation errors before exporting
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Book Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">
                    {config.title || "Untitled Conversations Book"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Author</p>
                    <p className="font-medium">
                      {config.author || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Publisher</p>
                    <p className="font-medium">
                      {config.publisher || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Total Lessons
                    </p>
                    <p className="font-medium">{config.lessons.length}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Total Vocabulary Words
                  </p>
                  <p className="text-2xl font-bold">{getTotalVocabulary()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Total Dialogue Entries
                  </p>
                  <p className="text-2xl font-bold">{getTotalDialogues()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {config.lessons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No lessons yet</p>
                <p className="text-sm text-muted-foreground text-center">
                  Add your first lesson to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Lessons Overview</h3>
              {config.lessons.map((lesson, index) => (
                <Card key={lesson.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          {lesson.title || `Lesson ${index + 1}`}
                        </div>
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {lesson.vocabulary.length} words
                        </Badge>
                        <Badge variant="outline">
                          {lesson.conversation.length} dialogues
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lesson.introduction && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Introduction:
                        </p>
                        <p className="text-sm bg-muted/50 p-3 rounded">
                          {lesson.introduction}
                        </p>
                      </div>
                    )}

                    {lesson.vocabulary.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Vocabulary:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lesson.vocabulary.map((vocab, vIndex) => (
                            <Badge key={vIndex} variant="outline">
                              {vocab.word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {lesson.conversation.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Conversation Preview:
                        </p>
                        <div className="bg-muted/50 p-3 rounded space-y-2">
                          {lesson.conversation
                            .slice(0, 3)
                            .map((entry, eIndex) => (
                              <div key={eIndex} className="text-sm">
                                <span className="font-semibold">
                                  {entry.speaker}:
                                </span>{" "}
                                <span>{entry.text}</span>
                              </div>
                            ))}
                          {lesson.conversation.length > 3 && (
                            <p className="text-xs text-muted-foreground italic">
                              ... and {lesson.conversation.length - 3} more
                              dialogues
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {lesson.questions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Questions:
                        </p>
                        <div className="bg-muted/50 p-3 rounded space-y-2">
                          <p className="text-sm">
                            {lesson.questions.length} comprehension{" "}
                            {lesson.questions.length === 1
                              ? "question"
                              : "questions"}{" "}
                            with {lesson.answers.length} answer
                            {lesson.answers.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
