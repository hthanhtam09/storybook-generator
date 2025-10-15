"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { processTemplateWithContent } from "@/lib/docx-template-processor";
import { useToast } from "@/hooks/use-toast";
import type { Story, BookMetadata, ImageFile, TemplateFile } from "@/lib/types";

interface ExportButtonProps {
  stories: Story[];
  metadata: BookMetadata | null;
  images: ImageFile[];
  template: TemplateFile | null;
  disabled?: boolean;
}

export function ExportButton({
  stories,
  metadata,
  images,
  template,
  disabled,
}: ExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    if (!metadata) {
      toast({
        title: "Missing metadata",
        description: "Please fill in all required metadata fields",
        variant: "destructive",
      });
      return;
    }

    if (stories.length === 0) {
      toast({
        title: "No stories",
        description: "Please add at least one story",
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

    setIsGenerating(true);

    try {
      const blob = await processTemplateWithContent(
        template,
        stories,
        metadata,
        images
      );

      const filename = `${metadata.title.replace(/[^a-z0-9]/gi, "_")}_${
        metadata.language
      }_${new Date().toISOString().split("T")[0]}.docx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success!",
        description: "Your document has been generated using the template",
      });
    } catch (error) {
      console.error("Failed to generate document:", error);
      toast({
        title: "Export failed",
        description:
          "There was an error generating your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Export DOCX
        </>
      )}
    </Button>
  );
}
