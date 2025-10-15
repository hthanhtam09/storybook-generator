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
  onExportSuccess?: () => void;
}

export function ExportButton({
  stories,
  metadata,
  images,
  template,
  disabled,
  onExportSuccess,
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

      // Create a File object from the blob
      const file = new File([blob], filename, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Prepare metadata for serialization
      const serializableMetadata = {
        ...metadata,
        fullPageImage: metadata.fullPageImage, // Keep File object for server processing
      };

      // Save to database
      const formData = new FormData();
      formData.append("file", file);
      formData.append("metadata", JSON.stringify(serializableMetadata));
      formData.append("storiesCount", stories.length.toString());

      // If there's a fullPageImage, append it separately
      if (metadata.fullPageImage) {
        formData.append("fullPageImage", metadata.fullPageImage);
      } else {
        console.log("No fullPageImage to append");
      }

      const saveResponse = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error("Save response error:", {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          errorText: errorText,
        });
        throw new Error(
          `Failed to save document to database: ${saveResponse.status} ${saveResponse.statusText}`
        );
      }

      const saveResult = await saveResponse.json();

      // Also provide immediate download
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
        description: "Your document has been generated and saved to history",
      });

      // Trigger refresh of history tab
      if (onExportSuccess) {
        onExportSuccess();
      }
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
