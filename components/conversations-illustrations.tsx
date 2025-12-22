"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ConversationLesson } from "@/lib/types";

interface ConversationsIllustrationsProps {
  lessons: ConversationLesson[];
}

export function ConversationsIllustrations({
  lessons,
}: ConversationsIllustrationsProps) {
  const { toast } = useToast();
  const [copiedLessonId, setCopiedLessonId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const lessonsWithPrompts = lessons.filter((lesson) => {
    const hasPrompt = lesson.imagePrompt && lesson.imagePrompt.trim();
    console.log(
      `Lesson ${lesson.id}: imagePrompt="${lesson.imagePrompt}", hasPrompt=${hasPrompt}`
    );
    return hasPrompt;
  });

  const handleCopyPrompt = async (lesson: ConversationLesson) => {
    try {
      await navigator.clipboard.writeText(lesson.imagePrompt || "");
      setCopiedLessonId(lesson.id);
      toast({
        title: "Copied!",
        description: `Image prompt for Lesson copied to clipboard.`,
      });

      setTimeout(() => {
        setCopiedLessonId(null);
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy image prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleCopyAllPrompts = async () => {
    if (lessonsWithPrompts.length === 0) {
      toast({
        title: "No prompts to copy",
        description: "There are no image prompts available.",
        variant: "destructive",
      });
      return;
    }

    try {
      const allPrompts = lessonsWithPrompts
        .map((lesson, index) => `Lesson ${index + 1}:\n${lesson.imagePrompt}`)
        .join("\n\n---\n\n");

      await navigator.clipboard.writeText(allPrompts);
      setCopiedAll(true);
      toast({
        title: "Copied All!",
        description: `All ${lessonsWithPrompts.length} image prompts copied to clipboard.`,
      });

      setTimeout(() => {
        setCopiedAll(false);
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy all image prompts to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (lessonsWithPrompts.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Illustration Prompts
            </h3>
            <p className="text-xs text-muted-foreground">
              Display image prompts from lessons
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Image className="h-3 w-3" />
              {lessonsWithPrompts.length} prompts
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAllPrompts}
              disabled={true}
              className="gap-1"
            >
              <Copy className="h-3 w-3" />
              Copy All
            </Button>
          </div>
        </div>

        <Card className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              No image prompts found in the current lessons.
            </p>
            <p className="text-xs mt-2">
              Add Image Prompt sections to your lessons to see them here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Illustration Prompts
          </h3>
          <p className="text-xs text-muted-foreground">
            Display image prompts from lessons
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Image className="h-3 w-3" />
            {lessonsWithPrompts.length} prompts
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAllPrompts}
            disabled={lessonsWithPrompts.length === 0}
            className="gap-1"
          >
            {copiedAll ? (
              <>
                <Check className="h-3 w-3" />
                Copied All
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy All
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {lessonsWithPrompts.map((lesson, index) => (
          <Card key={lesson.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">
                    Lesson {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPrompt(lesson)}
                    className="gap-1"
                  >
                    {copiedLessonId === lesson.id ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                {lesson.introduction && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {lesson.introduction}
                    </p>
                  </div>
                )}
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {lesson.imagePrompt}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
