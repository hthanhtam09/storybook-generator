"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      console.log("Starting PDF export...");

      const html2canvas = (await import("html2canvas")).default;
      console.log("html2canvas loaded");

      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      console.log("jsPDF loaded:", jsPDF);

      // Create a style element to override all oklch colors
      const styleOverride = document.createElement("style");
      styleOverride.textContent = `
        * {
          color: rgb(0, 0, 0) !important;
          background-color: rgb(255, 255, 255) !important;
          border-color: rgb(204, 204, 204) !important;
        }
        .bg-black {
          background-color: rgb(0, 0, 0) !important;
        }
        .bg-gray-100 {
          background-color: rgb(245, 245, 245) !important;
        }
        .bg-red-50 { background-color: rgb(254, 242, 242) !important; }
        .bg-blue-50 { background-color: rgb(239, 246, 255) !important; }
        .bg-green-50 { background-color: rgb(240, 253, 244) !important; }
        .bg-yellow-50 { background-color: rgb(254, 252, 232) !important; }
        .bg-purple-50 { background-color: rgb(250, 245, 255) !important; }
        .bg-pink-50 { background-color: rgb(253, 242, 248) !important; }
        .bg-indigo-50 { background-color: rgb(238, 242, 255) !important; }
        .bg-orange-50 { background-color: rgb(255, 247, 237) !important; }
        .bg-teal-50 { background-color: rgb(240, 253, 250) !important; }
        .bg-cyan-50 { background-color: rgb(236, 254, 255) !important; }
        .bg-lime-50 { background-color: rgb(247, 254, 231) !important; }
        .bg-rose-50 { background-color: rgb(255, 241, 242) !important; }
        .text-red-600 { color: rgb(220, 38, 38) !important; }
        .text-blue-600 { color: rgb(37, 99, 235) !important; }
        .text-green-600 { color: rgb(22, 163, 74) !important; }
        .text-yellow-600 { color: rgb(202, 138, 4) !important; }
        .text-purple-600 { color: rgb(147, 51, 234) !important; }
        .text-pink-600 { color: rgb(219, 39, 119) !important; }
        .text-indigo-600 { color: rgb(79, 70, 229) !important; }
        .text-orange-600 { color: rgb(234, 88, 12) !important; }
        .text-teal-600 { color: rgb(13, 148, 136) !important; }
        .text-cyan-600 { color: rgb(8, 145, 178) !important; }
        .text-lime-600 { color: rgb(101, 163, 13) !important; }
        .text-rose-600 { color: rgb(225, 29, 72) !important; }
      `;

      // Add the style to the document head
      document.head.appendChild(styleOverride);

      console.log("Creating PDF with all pages...");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [8.5, 11], // 8.5 x 11 inches
      });
      console.log("PDF created");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Store original page index
      const originalPageIndex = currentPageIndex;

      // Process each puzzle page
      for (let i = 0; i < puzzles.length; i++) {
        console.log(`Processing page ${i + 1}/${puzzles.length}...`);
        // Wait for DOM to update
        await new Promise((resolve) => setTimeout(resolve, 100));

        const node = previewRef.current;
        if (!node) continue;

        console.log(`Capturing page ${i + 1}...`);

        // Create temporary style for PDF export - larger cells only for download
        const gridSize = puzzles[i].puzzle.grid.length;
        const margin = 0.5; // inches
        const availableWidthIn = pageWidth - margin * 2;
        const availableHeightIn = pageHeight - margin * 2;
        const cellSizeIn = Math.min(
          availableWidthIn / gridSize,
          availableHeightIn / gridSize
        );

        const pdfStyleOverride = document.createElement("style");
        pdfStyleOverride.textContent = `
          .puzzle-cell { 
            width: ${cellSizeIn}in !important; 
            height: ${cellSizeIn}in !important; 
            font-size: ${Math.max(cellSizeIn * 0.4, 0.2)}in !important;
            font-weight: bold !important;
          }
        `;
        document.head.appendChild(pdfStyleOverride);

        // Wait for style to apply
        await new Promise((resolve) => setTimeout(resolve, 50));

        const canvas = await html2canvas(node, {
          backgroundColor: "#ffffff",
          scale: 2, // Higher resolution for better quality
          useCORS: true,
          logging: false,
        });

        console.log(
          `Canvas created for page ${i + 1}:`,
          canvas.width,
          "x",
          canvas.height
        );

        const imgData = canvas.toDataURL("image/png");

        // Remove temporary style immediately after capture
        document.head.removeChild(pdfStyleOverride);

        // Use full page with minimal margins
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = pageHeight - margin * 2;

        // Add new page if not the first page
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate position to center content, fill entire printable area
        const canvasRatio = canvas.width / canvas.height;
        const targetRatio = imgWidth / imgHeight;
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;
        if (canvasRatio > targetRatio) {
          // limit by width
          finalHeight = imgWidth / canvasRatio;
        } else {
          // limit by height
          finalWidth = imgHeight * canvasRatio;
        }
        const x = margin + (imgWidth - finalWidth) / 2;
        const y = margin + (imgHeight - finalHeight) / 2;

        pdf.addImage(
          imgData,
          "PNG",
          x,
          y,
          finalWidth,
          finalHeight,
          undefined,
          "FAST"
        );

        console.log(`Page ${i + 1} added to PDF`);
      }

      // Restore original page
      handlePageChange(originalPageIndex);

      // Remove the style override
      document.head.removeChild(styleOverride);

      console.log("Saving PDF...");
      pdf.save(
        `word-fill-in-puzzle-${new Date().toISOString().split("T")[0]}.pdf`
      );
      console.log("PDF saved successfully with all pages");
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      alert(
        `Export PDF thất bại: ${error.message || error}. Vui lòng thử lại.`
      );
    } finally {
      setIsExporting(false);
    }
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {currentPuzzle && (
          <div className="space-y-6">
            {/* Puzzle Grid */}
            <Card ref={previewRef}>
              <CardHeader>
                <CardTitle className="text-center">
                  Word Fill-in Puzzle - Trang {currentPageIndex + 1}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
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
                            puzzle-cell w-8 h-8 border border-gray-300 flex items-center justify-center text-sm font-bold
                            ${
                              cell.isBlack
                                ? "bg-black"
                                : cell.letter
                                ? `${getWordBackgroundColor(
                                    cell.wordId
                                  )} ${getWordColor(cell.wordId)}`
                                : "bg-gray-100"
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

            {/* Puzzle Info */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin puzzle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Kích thước lưới:</span>
                  <Badge variant="outline">
                    {currentPuzzle.grid.length} x {currentPuzzle.grid[0].length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Số từ:</span>
                  <Badge variant="outline">{currentPuzzle.words.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Ô đen:</span>
                  <Badge variant="outline">
                    {
                      currentPuzzle.grid.flat().filter((cell) => cell.isBlack)
                        .length
                    }
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Ô trắng:</span>
                  <Badge variant="outline">
                    {
                      currentPuzzle.grid.flat().filter((cell) => !cell.isBlack)
                        .length
                    }
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
