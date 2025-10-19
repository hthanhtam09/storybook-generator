"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Download, Loader2 } from "lucide-react";
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

  const canExport = config.words.length > 0;

  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 150));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

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

  const generatePDF = async () => {
    if (!canExport) return;

    setIsGeneratingPDF(true);

    try {
      const response = await fetch("/api/generate-pdf", {
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
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-4 w-4" />
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Words:</span>{" "}
                    {config.words.length}
                  </div>
                  <div>
                    <span className="font-medium">Grid Size:</span>{" "}
                    {config.gridSize}x{config.gridSize}
                  </div>
                  <div>
                    <span className="font-medium">Difficulty:</span>{" "}
                    {config.difficulty}
                  </div>
                  <div>
                    <span className="font-medium">Language:</span>{" "}
                    {config.language.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">Pages:</span>{" "}
                    {config.pageCount}
                  </div>
                  <div>
                    <span className="font-medium">Words per Page:</span>{" "}
                    {config.wordsPerPage}
                  </div>
                </div>
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

            {/* Grid Preview */}
            {previewGrid && (
              <Card>
                <div className="p-4">
                  <h3 className="mb-3 text-lg font-semibold">Grid Preview</h3>
                  <div className="flex justify-center">
                    <div
                      className="grid gap-1 p-4 border rounded-lg bg-background"
                      style={{
                        gridTemplateColumns: `repeat(${previewGrid.size}, 1fr)`,
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "center",
                      }}
                    >
                      {previewGrid.grid.map((row: string[], rowIndex: number) =>
                        row.map((letter: string, colIndex: number) => {
                          const isAnswerCell = previewGrid.words.some(
                            (wordPos: any) => {
                              const { startRow, startCol, endRow, endCol } =
                                wordPos;
                              const rowStep =
                                endRow > startRow
                                  ? 1
                                  : endRow < startRow
                                  ? -1
                                  : 0;
                              const colStep =
                                endCol > startCol
                                  ? 1
                                  : endCol < startCol
                                  ? -1
                                  : 0;

                              let currentRow = startRow;
                              let currentCol = startCol;

                              while (true) {
                                if (
                                  currentRow === rowIndex &&
                                  currentCol === colIndex
                                ) {
                                  return true;
                                }
                                if (
                                  currentRow === endRow &&
                                  currentCol === endCol
                                )
                                  break;
                                currentRow += rowStep;
                                currentCol += colStep;
                              }
                              return false;
                            }
                          );

                          return (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className={`
                                w-8 h-8 flex items-center justify-center text-sm font-bold border
                                ${
                                  isAnswerCell && config.showAnswersInGrid
                                    ? "bg-primary/20 text-primary"
                                    : "bg-background text-foreground"
                                }
                              `}
                            >
                              {letter.toUpperCase()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Export Button */}
            <div className="flex justify-center">
              <Button
                onClick={generatePDF}
                size="lg"
                disabled={!canExport || isGeneratingPDF}
                className="flex items-center gap-2"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {isGeneratingPDF ? "Generating PDF..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
