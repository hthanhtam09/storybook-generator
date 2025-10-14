"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { parseStories, validateStories } from "@/lib/story-parser";
import type { Story, ValidationError } from "@/lib/types";

interface StoryInputProps {
  initialValue?: string;
  onStoriesChange?: (stories: Story[], inputText: string) => void;
}

export function StoryInput({
  initialValue = "",
  onStoriesChange,
}: StoryInputProps) {
  const [input, setInput] = useState(initialValue);
  const [stories, setStories] = useState<Story[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!input.trim()) {
      setStories([]);
      setErrors([]);
      setIsValid(false);
      return;
    }

    // Debounce parsing
    const timer = setTimeout(() => {
      const parseResult = parseStories(input);
      const validationErrors = validateStories(parseResult.stories);
      const allErrors = [...parseResult.errors, ...validationErrors];

      setStories(parseResult.stories);
      setErrors(allErrors);
      setIsValid(
        parseResult.stories.length > 0 &&
          allErrors.filter((e) => e.severity === "error").length === 0
      );

      if (onStoriesChange) {
        onStoriesChange(parseResult.stories, input);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [input, onStoriesChange]);

  const errorCount = errors.filter((e) => e.severity === "error").length;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Story Input</h3>
          <p className="text-xs text-muted-foreground">
            Paste your structured story data here
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            {stories.length} {stories.length === 1 ? "story" : "stories"}
          </Badge>
          {isValid && stories.length > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-green-500/50 text-green-500"
            >
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errorCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {errorCount} {errorCount === 1 ? "error" : "errors"} found.
                Please fix them before exporting.
              </AlertDescription>
            </Alert>
          )}
          <div className="max-h-32 space-y-1 overflow-auto rounded-md border border-border bg-card p-3">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <AlertCircle
                  className={`mt-0.5 h-3 w-3 flex-shrink-0 ${
                    error.severity === "error"
                      ? "text-destructive"
                      : "text-yellow-500"
                  }`}
                />
                <span
                  className={
                    error.severity === "error"
                      ? "text-destructive"
                      : "text-yellow-500"
                  }
                >
                  {error.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="flex-1 p-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-full w-full resize-none rounded-md bg-background p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Paste your structured story data here"
        />
      </Card>
    </div>
  );
}
