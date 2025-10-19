import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { WordSearchGenerator } from "@/lib/wordsearch";

interface GameConfig {
  words: string[];
  gridSize: number;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  theme: string;
  showWordList: boolean;
  allowDiagonal: boolean;
  allowBackward: boolean;
  pageCount: number;
  wordsPerPage: number;
  distributeWords: boolean;
  showAnswersInGrid: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const config: GameConfig = await request.json();

    // Generate multiple word search grids
    const grids = WordSearchGenerator.generateMultiple(
      config.words,
      config.gridSize,
      config.pageCount,
      config.allowDiagonal,
      config.allowBackward,
      config.wordsPerPage,
      config.distributeWords
    );

    // Create PDF with 8x11 inch format
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [203.2, 279.4], // 8x11 inches in mm
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    // Add each grid as 2 separate pages
    grids.forEach((grid, index) => {
      // Page 1: Words to find
      if (index > 0) {
        pdf.addPage();
      }

      // Add title for words page
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Word Search Puzzle ${index + 1} - Words to Find`,
        pageWidth / 2,
        30,
        { align: "center" }
      );

      // Add word list without bullets
      if (config.showWordList) {
        const wordsPerPage = Math.ceil(grid.words.length / 3); // 3 columns
        const columnWidth = contentWidth / 3;
        const startY = 60;

        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");

        grid.words.forEach((wordPos, wordIndex) => {
          const columnIndex = Math.floor(wordIndex / wordsPerPage);
          const rowIndex = wordIndex % wordsPerPage;
          const x = margin + columnIndex * columnWidth + 10;
          const y = startY + rowIndex * 15;

          pdf.text(wordPos.word, x, y);
        });
      }

      // Add footer for words page
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Page ${index * 2 + 1} of ${
          grids.length * 2 + Math.ceil(grids.length / 6)
        }`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );

      // Page 2: Grid only
      pdf.addPage();

      // Add title for grid page
      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Word Search Puzzle ${index + 1}`, pageWidth / 2, 30, {
        align: "center",
      });

      // Calculate grid dimensions - make it larger and centered
      const maxGridSize = Math.min(contentWidth - 40, pageHeight - 100);
      const cellSize = Math.min(maxGridSize / grid.size, 12);
      const gridWidth = cellSize * grid.size;
      const gridHeight = cellSize * grid.size;
      const gridX = (pageWidth - gridWidth) / 2;
      const gridY = (pageHeight - gridHeight) / 2;

      // Draw grid with bold text
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");

      grid.grid.forEach((row, rowIndex) => {
        row.forEach((letter, colIndex) => {
          const x = gridX + colIndex * cellSize;
          const y = gridY + rowIndex * cellSize;

          // Draw cell border
          pdf.rect(x, y, cellSize, cellSize);

          // Draw letter with bold font
          pdf.text(
            letter.toUpperCase(),
            x + cellSize / 2,
            y + cellSize / 2 + 3,
            { align: "center" }
          );
        });
      });

      // Add footer
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Page ${index * 2 + 2} of ${
          grids.length * 2 + Math.ceil(grids.length / 6)
        }`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    });

    // Add answer key pages with improved design
    const gridsPerPage = 6; // 2 per row, 3 rows
    const totalAnswerPages = Math.ceil(grids.length / gridsPerPage);

    for (let answerPage = 0; answerPage < totalAnswerPages; answerPage++) {
      pdf.addPage();

      pdf.setFontSize(24);
      pdf.setFont("helvetica", "bold");
      pdf.text("Answer Key", pageWidth / 2, 20, { align: "center" });

      const startGridIndex = answerPage * gridsPerPage;
      const endGridIndex = Math.min(
        startGridIndex + gridsPerPage,
        grids.length
      );

      // Create 2x3 grid layout with better spacing
      const largeGridSize = 18; // Slightly smaller for better fit
      const cellSize = 3.5; // Larger cells for better visibility
      const padding = 12;
      const cols = 2;

      for (let i = startGridIndex; i < endGridIndex; i++) {
        const gridIndex = i - startGridIndex;
        const row = Math.floor(gridIndex / cols);
        const col = gridIndex % cols;

        const grid = grids[i];
        const gridWidth = largeGridSize * cellSize;
        const gridHeight = largeGridSize * cellSize;

        // Center the grids with proper spacing
        const totalGridsWidth = cols * gridWidth + (cols - 1) * padding * 2;
        const startX = (pageWidth - totalGridsWidth) / 2;
        const gridX = startX + col * (gridWidth + padding * 2);
        const gridY = 40 + row * (gridHeight + padding * 2 + 15);

        // Add grid number with better styling
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Puzzle ${i + 1}`, gridX + gridWidth / 2, gridY - 8, {
          align: "center",
        });

        // Draw grid with improved design
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");

        // First draw all cells
        for (
          let rowIndex = 0;
          rowIndex < Math.min(grid.size, largeGridSize);
          rowIndex++
        ) {
          for (
            let colIndex = 0;
            colIndex < Math.min(grid.size, largeGridSize);
            colIndex++
          ) {
            const x = gridX + colIndex * cellSize;
            const y = gridY + rowIndex * cellSize;

            // Check if this cell is part of any word and get word index for coloring
            let wordIndex = -1;
            let isAnswerCell = false;

            grid.words.forEach((wordPos, wIndex) => {
              const { startRow, startCol, endRow, endCol } = wordPos;
              const rowStep =
                endRow > startRow ? 1 : endRow < startRow ? -1 : 0;
              const colStep =
                endCol > startCol ? 1 : endCol < startCol ? -1 : 0;

              let currentRow = startRow;
              let currentCol = startCol;

              while (true) {
                if (currentRow === rowIndex && currentCol === colIndex) {
                  isAnswerCell = true;
                  wordIndex = wIndex;
                  break;
                }
                if (currentRow === endRow && currentCol === endCol) break;
                currentRow += rowStep;
                currentCol += colStep;
              }
            });

            // Draw cell background with improved colors
            if (isAnswerCell && wordIndex >= 0) {
              const colors = [
                [255, 182, 193], // Light Pink
                [173, 216, 230], // Light Blue
                [255, 218, 185], // Peach
                [152, 251, 152], // Pale Green
                [221, 160, 221], // Plum
                [176, 224, 230], // Powder Blue
                [255, 192, 203], // Pink
                [175, 238, 238], // Pale Turquoise
                [240, 230, 140], // Khaki
                [255, 182, 193], // Light Pink
                [144, 238, 144], // Light Green
                [216, 191, 216], // Thistle
              ];
              const colorIndex = wordIndex % colors.length;
              pdf.setFillColor(
                colors[colorIndex][0],
                colors[colorIndex][1],
                colors[colorIndex][2]
              );
              pdf.rect(x, y, cellSize, cellSize, "F");
            }

            // Draw cell border with darker lines for answer cells
            if (isAnswerCell) {
              pdf.setDrawColor(100, 100, 100);
              pdf.setLineWidth(0.1);
            } else {
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineWidth(0.05);
            }
            pdf.rect(x, y, cellSize, cellSize);

            // Reset line width
            pdf.setLineWidth(0.05);

            // Draw letter with better contrast
            if (isAnswerCell) {
              pdf.setTextColor(0, 0, 0); // Black for answer cells
            } else {
              pdf.setTextColor(120, 120, 120); // Gray for non-answer cells
            }

            pdf.text(
              grid.grid[rowIndex][colIndex].toUpperCase(),
              x + cellSize / 2,
              y + cellSize / 2 + 2,
              { align: "center" }
            );
          }
        }

        // Reset text color
        pdf.setTextColor(0, 0, 0);
      }

      // Add footer for answer pages
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Page ${grids.length * 2 + answerPage + 1} of ${
          grids.length * 2 + totalAnswerPages
        }`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Convert PDF to buffer
    const pdfBuffer = pdf.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="word-search-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
