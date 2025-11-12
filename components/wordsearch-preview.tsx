"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";
import { WordSearchGenerator } from "@/lib/wordsearch";
import type { WordSearchConfig } from "@/lib/wordsearch-config";

interface WordSearchPreviewProps {
  config: WordSearchConfig;
  onExportSuccess?: () => void;
}

export function WordSearchPreview({
  config,
  onExportSuccess,
}: WordSearchPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewGrid, setPreviewGrid] = useState<any>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [autoScale, setAutoScale] = useState(100);

  const canExport = config.words.length > 0;

  // Generate preview grid when config changes
  React.useEffect(() => {
    if (config.words.length > 0) {
      const generator = new WordSearchGenerator(
        config.allowDiagonal,
        config.allowBackward
      );
      const grid = generator.generate(
        config.words.slice(0, 10),
        config.gridSize
      );
      setPreviewGrid(grid);
    } else {
      setPreviewGrid(null);
    }
  }, [config]);

  // Calculate auto-scale based on container width
  useEffect(() => {
    if (!previewGrid || !gridContainerRef.current) return;

    const calculateAutoScale = () => {
      const container = gridContainerRef.current;
      if (!container) return;

      // Cell size: 56px (w-14), gap: 4px (gap-1), padding: 16px (p-4) each side
      const cellSize = 56;
      const gap = 4;
      const padding = 16;
      const gridSize = previewGrid.size;

      // Calculate grid width
      const gridWidth =
        gridSize * cellSize + (gridSize - 1) * gap + padding * 2;

      // Available width: container width (already accounts for parent padding)
      const availableWidth = container.clientWidth;

      if (gridWidth > availableWidth && availableWidth > 0) {
        const scale = (availableWidth / gridWidth) * 100;
        setAutoScale(Math.min(scale, 100)); // Don't scale up, only down
      } else {
        setAutoScale(100);
      }
    };

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(calculateAutoScale, 0);
    window.addEventListener("resize", calculateAutoScale);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", calculateAutoScale);
    };
  }, [previewGrid]);

  const generatePDF = async () => {
    if (!canExport) return;

    setIsGeneratingPDF(true);

    try {
      const response = await fetch("/api/wordsearch/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `word-search-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        onExportSuccess?.();
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Preview</h2>
            <p className="text-sm text-muted-foreground">
              Preview your word search puzzle
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={generatePDF}
              size="sm"
              disabled={!canExport || isGeneratingPDF}
              className="flex items-center gap-2 ml-2"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isGeneratingPDF ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!canExport ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Download className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No Words Added</h3>
              <p className="text-muted-foreground">
                Add some words to see a preview of your word search puzzle.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Configuration Summary */}
            <Card>
              <div className="p-4">
                <h3 className="mb-3 text-lg font-semibold">Configuration</h3>
                {config.topics && config.topics.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Topics:</h4>
                    <div className="flex flex-wrap gap-2">
                      {config.topics.map((topic, index) => (
                        <Badge key={index} variant="outline">
                          {topic.topic} ({topic.words.length})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Word List Preview */}
            {config.showWordList && (
              <Card>
                <div className="p-4">
                  <h3 className="mb-3 text-lg font-semibold">Words to Find</h3>
                  <div className="flex flex-wrap gap-2">
                    {config.words.slice(0, 20).map((word, index) => (
                      <Badge key={index} variant="secondary">
                        {word}
                      </Badge>
                    ))}
                    {config.words.length > 20 && (
                      <Badge variant="outline">
                        +{config.words.length - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
