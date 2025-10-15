"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Story } from "@/lib/types";

interface IllustrationDisplayProps {
  stories: Story[];
}

export function IllustrationDisplay({ stories }: IllustrationDisplayProps) {
  const { toast } = useToast();
  const [copiedStoryId, setCopiedStoryId] = useState<number | null>(null);

  const storiesWithPrompts = stories.filter(
    (story) => story.illustrationPrompt && story.illustrationPrompt.trim()
  );

  const handleCopyPrompt = async (story: Story) => {
    try {
      await navigator.clipboard.writeText(story.illustrationPrompt || "");
      setCopiedStoryId(story.number);
      toast({
        title: "Copied!",
        description: `Illustration prompt for Story ${story.number} copied to clipboard.`,
      });

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStoryId(null);
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy illustration prompt to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (storiesWithPrompts.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Illustration Prompts
            </h3>
            <p className="text-xs text-muted-foreground">
              Display illustration prompts from stories
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Image className="h-3 w-3" />
            {storiesWithPrompts.length} prompts
          </Badge>
        </div>

        <Card className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              No illustration prompts found in the current stories.
            </p>
            <p className="text-xs mt-2">
              Add +Illustration Prompt sections to your stories to see them
              here.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Illustration Prompts
          </h3>
          <p className="text-xs text-muted-foreground">
            Display illustration prompts from stories
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Image className="h-3 w-3" />
          {storiesWithPrompts.length} prompts
        </Badge>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {storiesWithPrompts.map((story) => (
          <Card key={story.number} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">
                    Story {story.number}: {story.titleOriginal} (
                    {story.titleTranslated})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPrompt(story)}
                    className="gap-1"
                  >
                    {copiedStoryId === story.number ? (
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
                <div className="bg-muted rounded-md p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {story.illustrationPrompt}
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
