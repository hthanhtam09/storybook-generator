"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { WordFillInPage, WordFillInPuzzle } from "@/lib/types";

// Function to generate consistent colors for words
const getWordColor = (wordId?: string): string => {
  if (!wordId) return "text-gray-600";

  // Create a simple hash from wordId
  let hash = 0;
  for (let i = 0; i < wordId.length; i++) {
    hash = wordId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to a color index (0-11 for 12 different colors)
  const colorIndex = Math.abs(hash) % 12;

  const colors = [
    "text-red-600", // 0
    "text-blue-600", // 1
    "text-green-600", // 2
    "text-yellow-600", // 3
    "text-purple-600", // 4
    "text-pink-600", // 5
    "text-indigo-600", // 6
    "text-orange-600", // 7
    "text-teal-600", // 8
    "text-cyan-600", // 9
    "text-lime-600", // 10
    "text-rose-600", // 11
  ];

  return colors[colorIndex];
};

const getWordBackgroundColor = (wordId?: string): string => {
  if (!wordId) return "bg-white";

  // Create a simple hash from wordId
  let hash = 0;
  for (let i = 0; i < wordId.length; i++) {
    hash = wordId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to a background color index (0-11 for 12 different colors)
  const colorIndex = Math.abs(hash) % 12;

  const backgroundColors = [
    "bg-red-50", // 0
    "bg-blue-50", // 1
    "bg-green-50", // 2
    "bg-yellow-50", // 3
    "bg-purple-50", // 4
    "bg-pink-50", // 5
    "bg-indigo-50", // 6
    "bg-orange-50", // 7
    "bg-teal-50", // 8
    "bg-cyan-50", // 9
    "bg-lime-50", // 10
    "bg-rose-50", // 11
  ];

  return backgroundColors[colorIndex];
};

interface WordFillInPreviewProps {
  puzzles: WordFillInPage[];
}

export function WordFillInPreview({ puzzles }: WordFillInPreviewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [currentPuzzle, setCurrentPuzzle] = useState<WordFillInPuzzle | null>(
    null
  );
  const previewRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Update current puzzle when puzzles change
  useEffect(() => {
    if (puzzles.length > 0 && currentPageIndex < puzzles.length) {
      setCurrentPuzzle(puzzles[currentPageIndex].puzzle);
    } else {
      setCurrentPuzzle(null);
    }
  }, [puzzles, currentPageIndex]);

  const handleToggleAnswers = async () => {
    if (!currentPuzzle) return;

    try {
      const { WordFillInGenerator } = await import(
        "@/lib/wordfillin-generator"
      );
      const updatedPuzzle = showAnswers
        ? WordFillInGenerator.hideAnswers(currentPuzzle)
        : WordFillInGenerator.revealAnswers(currentPuzzle);

      setCurrentPuzzle(updatedPuzzle);
      setShowAnswers(!showAnswers);
    } catch (error) {
      console.error("Error toggling answers:", error);
    }
  };

  const handlePageChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < puzzles.length) {
      setCurrentPageIndex(newIndex);
      setCurrentPuzzle(puzzles[newIndex].puzzle);
      setShowAnswers(false);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);

      const html2canvas = (await import("html2canvas")).default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [8.5, 11],
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 0; // No margin for the image itself, we handle it in layout

      // Store original page index
      const originalPageIndex = currentPageIndex;

      // Process each puzzle page
      for (let i = 0; i < puzzles.length; i++) {
        // Update state to render the correct page in the hidden print view
        handlePageChange(i);
        
        // Wait for React to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        const node = printRef.current;
        if (!node) continue;

        // Make the print view visible temporarily for capture (but off-screen or absolute positioned)
        // Actually, we can just capture it even if it's hidden from user view as long as it's in DOM and has dimensions
        // But html2canvas works best if element is visible. 
        // We will rely on the fact that it is rendered in a hidden container that has display:block but maybe z-index -1 or similar.
        
        const canvas = await html2canvas(node, {
          scale: 2, // High res
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 816, // 8.5in * 96dpi
        });

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          pdf.addPage();
        }

        // Calculate dimensions to fit page
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      // Restore original page
      handlePageChange(originalPageIndex);

      pdf.save(
        `word-fill-in-puzzle-${new Date().toISOString().split("T")[0]}.pdf`
      );
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      alert(`Export PDF thất bại: ${error.message || error}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to group words by length
  const getGroupedWords = (words: string[]) => {
    const groups: { [key: number]: string[] } = {};
    words.forEach((word) => {
      const len = word.length;
      if (!groups[len]) groups[len] = [];
      groups[len].push(word);
    });
    return groups;
  };

  if (puzzles.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p>Chưa có puzzle nào được tạo</p>
            <p className="text-sm">Hãy nhập từ và tạo puzzle ở tab bên trái</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Word Fill-in Puzzle</h2>
          <Badge variant="outline">
            Trang {currentPageIndex + 1} / {puzzles.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAnswers}
            disabled={!currentPuzzle}
          >
            {showAnswers ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showAnswers ? "Ẩn đáp án" : "Hiện đáp án"}
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={puzzles.length === 0 || isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Đang xuất..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPageIndex - 1)}
          disabled={currentPageIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Trang trước
        </Button>
        <div className="flex gap-2">
          {puzzles.map((_, index) => (
            <Button
              key={index}
              variant={index === currentPageIndex ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(index)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPageIndex + 1)}
          disabled={currentPageIndex === puzzles.length - 1}
        >
          Trang sau
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Content - Interactive View */}
      <div className="flex-1 overflow-auto p-4">
        {currentPuzzle && (
          <div className="space-y-6">
            {/* Puzzle Grid */}
            <Card>
              <CardContent>
                <div className="flex justify-center pt-6">
                  <div
                    className="grid gap-0 border-2 border-gray-800"
                    style={{
                      gridTemplateColumns: `repeat(${currentPuzzle.grid.length}, 1fr)`,
                      width: "fit-content",
                    }}
                  >
                    {currentPuzzle.grid.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`
                            w-8 h-8 border border-gray-300 flex items-center justify-center text-sm font-bold
                            ${
                              cell.isBlack
                                ? "bg-black"
                                : showAnswers && cell.letter
                                ? `${getWordBackgroundColor(
                                    cell.wordId
                                  )} ${getWordColor(cell.wordId)}`
                                : "bg-white"
                            }
                            ${
                              cell.isRevealed && cell.letter
                                ? "ring-2 ring-blue-400 ring-opacity-50"
                                : ""
                            }
                          `}
                        >
                          {cell.isBlack
                            ? ""
                            : cell.isRevealed
                            ? cell.letter || ""
                            : ""}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Word List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Danh sách từ ({currentPuzzle.words.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {currentPuzzle.words.map((wordObj, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className={`justify-center ${getWordBackgroundColor(
                        wordObj.id
                      )} ${getWordColor(wordObj.id)} border-2`}
                    >
                      {wordObj.word}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Hidden Print Layout - Only for PDF Generation */}
      <div className="fixed left-0 top-0 -z-50 overflow-hidden w-0 h-0">
        <div
          ref={printRef}
          style={{
            width: "816px", // 8.5 inches at 96 DPI
            minHeight: "1056px", // 11 inches at 96 DPI
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial, sans-serif",
            position: "relative",
          }}
        >
          {currentPuzzle && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div
                style={{
                  backgroundColor: "#F38036", // Orange from image
                  height: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "48px",
                  fontWeight: "bold",
                  width: "100%",
                }}
              >
                {currentPuzzle.pageNumber}
              </div>

              {/* Word List Section */}
              <div
                style={{
                  backgroundColor: "#FDE9D9", // Light Orange from image
                  padding: "20px 40px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "40px",
                  justifyContent: "center",
                  minHeight: "150px",
                }}
              >
                {Object.entries(getGroupedWords(currentPuzzle.wordList))
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([length, words]) => (
                    <div key={length} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div
                        style={{
                          color: "#D35400",
                          fontWeight: "bold",
                          fontSize: "18px",
                          marginBottom: "5px",
                          textAlign: "center",
                        }}
                      >
                        {length}
                      </div>
                      {words.sort().map((word) => (
                        <div
                          key={word}
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#222",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>

              {/* Grid Section */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start", // Align to top of remaining space
                  paddingTop: "60px",
                  paddingBottom: "40px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${currentPuzzle.grid.length}, 1fr)`,
                    gap: "0",
                    // No outer border for the grid container to allow irregular shape
                    width: "fit-content",
                  }}
                >
                  {currentPuzzle.grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`print-${rowIndex}-${colIndex}`}
                        style={{
                          width: "40px", // Slightly larger for print
                          height: "40px",
                          // Only show border if it's NOT a black cell
                          border: !cell.isBlack ? "2px solid black" : "none",
                          // Remove internal borders where cells touch to create cleaner look? 
                          // Actually standard crossword has borders on all sides of a cell.
                          // But we need to handle the "shared" borders to avoid double thickness.
                          // CSS Grid gap=0 handles this usually, but we need to be careful.
                          // Let's use outline or specific border sides if needed. 
                          // Simple border: 1px solid black.
                          // To match image "thick" look: 2px.
                          // To avoid double borders: margin -1px? Or just let them overlap.
                          // Grid gap -2px?
                          // Let's try standard border and see.
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "24px",
                          fontWeight: "bold",
                          backgroundColor: "transparent", // Always transparent background
                          position: "relative",
                        }}
                      >
                         {!cell.isBlack ? (
                            <div style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                textTransform: "uppercase",
                                fontFamily: "Arial, sans-serif",
                            }}>
                                {cell.isRevealed || cell.letter ? (cell.letter || "") : ""}
                            </div>
                         ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "20px 40px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#F38036",
                  fontWeight: "bold",
                  fontSize: "18px",
                  marginBottom: "20px",
                }}
              >
                <div>{currentPuzzle.pageNumber + 151}</div> {/* Example offset to match 152 */}
                <div style={{ color: "black", fontStyle: "italic", fontSize: "14px", fontWeight: "normal" }}>
                  Answers on page 192.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
