"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, Gamepad2 } from "lucide-react";
import type { GameBookConfig } from "@/lib/types";

interface GameBookPreviewProps {
  config: GameBookConfig;
  onExportSuccess?: () => void;
}

export function GameBookPreview({
  config,
  onExportSuccess,
}: GameBookPreviewProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const totalGames =
    config.wordSearches.length +
    config.crosswords.length +
    config.logicPuzzles.length +
    config.spotTheDifferences.length +
    config.sudokus.length +
    config.alphabetTrivias.length +
    config.matchingGames.length +
    config.wordScrambles.length +
    config.mazes.length +
    config.cryptograms.length +
    config.nameThatCities.length +
    config.fallenPhrases.length;

  const canExport = totalGames > 0;

  const generatePDF = async () => {
    if (!canExport) return;

    setIsGeneratingPDF(true);

    try {
      const response = await fetch("/api/gamebook/generate-pdf", {
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
        a.download = `game-book-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        onExportSuccess?.();
      } else {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Error generating PDF:", error);
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
              Preview your game book
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={generatePDF}
              size="sm"
              disabled={!canExport || isGeneratingPDF}
              className="flex items-center gap-2"
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
                <Gamepad2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No Games Added</h3>
              <p className="text-muted-foreground">
                Add some games to see a preview of your game book.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Book Info */}
            <Card>
              <div className="p-4">
                <h3 className="mb-3 text-lg font-semibold">Book Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Title: </span>
                    <span>{config.title || "Untitled Book"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Total Games: </span>
                    <span>{totalGames}</span>
                  </div>
                  {config.coverImage && (
                    <div>
                      <span className="font-medium">Cover Image: </span>
                      <span className="text-green-600">✓ Added</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Games Summary */}
            <Card>
              <div className="p-4">
                <h3 className="mb-3 text-lg font-semibold">Games Summary</h3>
                <div className="space-y-2">
                  {config.wordSearches.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Word Searches: {config.wordSearches.length}
                      </Badge>
                    </div>
                  )}
                  {config.crosswords.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Crosswords: {config.crosswords.length}
                      </Badge>
                    </div>
                  )}
                  {config.logicPuzzles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Logic Puzzles: {config.logicPuzzles.length}
                      </Badge>
                    </div>
                  )}
                  {config.spotTheDifferences.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Spot the Difference: {config.spotTheDifferences.length}
                      </Badge>
                    </div>
                  )}
                  {config.sudokus.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Sudoku: {config.sudokus.length}
                      </Badge>
                    </div>
                  )}
                  {config.alphabetTrivias.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Alphabet Trivia: {config.alphabetTrivias.length}
                      </Badge>
                    </div>
                  )}
                  {config.matchingGames.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Matching Games: {config.matchingGames.length}
                      </Badge>
                    </div>
                  )}
                  {config.wordScrambles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Word Scrambles: {config.wordScrambles.length}
                      </Badge>
                    </div>
                  )}
                  {config.mazes.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Mazes: {config.mazes.length}
                      </Badge>
                    </div>
                  )}
                  {config.cryptograms.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Cryptograms: {config.cryptograms.length}
                      </Badge>
                    </div>
                  )}
                  {config.nameThatCities.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Name That City: {config.nameThatCities.length}
                      </Badge>
                    </div>
                  )}
                  {config.fallenPhrases.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        Fallen Phrases: {config.fallenPhrases.length}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Format Info */}
            <Card>
              <div className="p-4">
                <h3 className="mb-3 text-lg font-semibold">Format</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Page Size: 8.5 x 11 inches</div>
                  <div>Format: PDF</div>
                  <div className="pt-2">
                    <p className="font-medium text-foreground">Note:</p>
                    <p>
                      Word Searches and Crosswords will have their grid and word
                      list on the same page.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

