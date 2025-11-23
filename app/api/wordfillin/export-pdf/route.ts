import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import type { WordFillInPage } from "@/lib/types";

const PAGE_WIDTH = 215.9; // 8.5 in
const PAGE_HEIGHT = 279.4; // 11 in
const PAGE_MARGIN = 15;
const PUZZLES_PER_PAGE = 1; // Changed to 1 per page to match book layout
const ANSWERS_PER_PAGE = 4;
const SECTION_GAP = 8;

// Colors
const COLOR_ORANGE = [243, 128, 54]; // #F38036
const COLOR_LIGHT_ORANGE = [253, 233, 217]; // #FDE9D9
const COLOR_TEXT_ORANGE = [211, 84, 0]; // #D35400
const COLOR_BLACK = [0, 0, 0];
const COLOR_WHITE = [255, 255, 255];

export async function POST(request: NextRequest) {
  try {
    const { puzzles }: { puzzles: WordFillInPage[] } = await request.json();

    if (!puzzles || puzzles.length === 0) {
      return NextResponse.json(
        { error: "No puzzles provided" },
        { status: 400 }
      );
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [PAGE_WIDTH, PAGE_HEIGHT],
    });

    // 1. Render Puzzle Pages
    puzzles.forEach((page, index) => {
      if (index > 0) {
        pdf.addPage();
      }
      renderPage(pdf, page, index);
    });

    // 2. Render Answer Pages
    const answerPagesCount = Math.ceil(puzzles.length / ANSWERS_PER_PAGE);
    
    for (let i = 0; i < answerPagesCount; i++) {
      pdf.addPage();
      const startIndex = i * ANSWERS_PER_PAGE;
      const endIndex = Math.min(startIndex + ANSWERS_PER_PAGE, puzzles.length);
      const pagePuzzles = puzzles.slice(startIndex, endIndex);
      
      // Calculate answer page number (starts after all puzzle pages)
      // Assuming puzzle pages are 1 to puzzles.length
      // Answer pages could be numbered continuously or separately. 
      // Let's use continuous numbering for the PDF file itself, but the printed page number 
      // in the footer might be different. 
      // The user request said "Answers on page 192" in the puzzle footer.
      // Let's just number them sequentially for now or use a fixed "Answer Key" header.
      
      renderAnswerPage(pdf, pagePuzzles, i + 1);
    }

    const pdfBuffer = pdf.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="word-fill-in-${
          new Date().toISOString().split("T")[0]
        }.pdf"`,
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

const renderPage = (pdf: jsPDF, page: WordFillInPage, index: number) => {
  // Content Area
  const contentX = PAGE_MARGIN; // Left margin
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2; // Right margin
  const contentY = 15;

  // 2. Header
  const headerHeight = 25;
  pdf.setFillColor(COLOR_ORANGE[0], COLOR_ORANGE[1], COLOR_ORANGE[2]);
  pdf.rect(contentX, contentY, contentWidth, headerHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(32);
  pdf.setTextColor(COLOR_WHITE[0], COLOR_WHITE[1], COLOR_WHITE[2]);
  pdf.text(`${page.pageNumber}`, contentX + contentWidth / 2, contentY + 17, {
    align: "center",
  });

  // 3. Word List
  const wordListY = contentY + headerHeight;
  const wordListHeight = 60; // Fixed height for word list area
  
  pdf.setFillColor(COLOR_LIGHT_ORANGE[0], COLOR_LIGHT_ORANGE[1], COLOR_LIGHT_ORANGE[2]);
  pdf.rect(contentX, wordListY, contentWidth, wordListHeight, "F");

  renderWordList(
    pdf,
    page.puzzle.wordList,
    contentX + 5,
    wordListY + 5,
    contentWidth - 10,
    wordListHeight - 10
  );

  // 4. Grid
  const gridY = wordListY + wordListHeight + 10;
  const availableHeight = PAGE_HEIGHT - gridY - 20; // Bottom margin
  
  renderGrid(
    pdf,
    page.puzzle.grid,
    contentX,
    gridY,
    contentWidth,
    availableHeight,
    false // Don't show answers
  );

  // 5. Footer
  const footerY = PAGE_HEIGHT - 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(COLOR_ORANGE[0], COLOR_ORANGE[1], COLOR_ORANGE[2]);
  pdf.text(`${page.pageNumber + 151}`, contentX + 10, footerY); // Example offset

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(COLOR_BLACK[0], COLOR_BLACK[1], COLOR_BLACK[2]);
  pdf.text("Answers on page 192.", contentX + contentWidth - 10, footerY, {
    align: "right",
  });
};

const renderAnswerPage = (pdf: jsPDF, puzzles: WordFillInPage[], pageIndex: number) => {
  const contentX = PAGE_MARGIN;
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const contentY = 15;
  const contentHeight = PAGE_HEIGHT - 30;

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(COLOR_BLACK[0], COLOR_BLACK[1], COLOR_BLACK[2]);
  pdf.text("Answer Key", contentX + contentWidth / 2, contentY + 10, { align: "center" });

  // Grid Layout for 4 puzzles (2x2)
  const startY = contentY + 20;
  const gap = 10;
  const itemWidth = (contentWidth - gap) / 2;
  const itemHeight = (contentHeight - 40) / 2;

  puzzles.forEach((page, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    
    const itemX = contentX + col * (itemWidth + gap);
    const itemY = startY + row * (itemHeight + gap);

    // Draw Puzzle Number
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(COLOR_ORANGE[0], COLOR_ORANGE[1], COLOR_ORANGE[2]);
    pdf.text(`${page.pageNumber}`, itemX + itemWidth / 2, itemY + 5, { align: "center" });

    // Draw Solved Grid
    renderGrid(
      pdf,
      page.puzzle.grid,
      itemX,
      itemY + 8,
      itemWidth,
      itemHeight - 15,
      true // Show answers
    );
  });
  
  // Footer
  const footerY = PAGE_HEIGHT - 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(COLOR_BLACK[0], COLOR_BLACK[1], COLOR_BLACK[2]);
  pdf.text(`Answers - Page ${pageIndex}`, contentX + contentWidth / 2, footerY, { align: "center" });
};

// Group words by length and sort
const groupWordsByLength = (words: string[]): Array<{ length: number; words: string[] }> => {
  const sorted = [...words].sort((a, b) => a.length - b.length);
  const groups: Array<{ length: number; words: string[] }> = [];
  let currentLength = 0;
  let currentGroup: string[] = [];

  for (const word of sorted) {
    if (word.length === currentLength) {
      currentGroup.push(word);
    } else {
      if (currentGroup.length > 0) {
        groups.push({ length: currentLength, words: currentGroup });
      }
      currentLength = word.length;
      currentGroup = [word];
    }
  }

  if (currentGroup.length > 0) {
    groups.push({ length: currentLength, words: currentGroup });
  }

  return groups;
};

const renderWordList = (
  pdf: jsPDF,
  words: string[],
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const groups = groupWordsByLength(words);
  const numGroups = groups.length;
  const colWidth = width / Math.max(1, numGroups);
  
  groups.forEach((group, index) => {
    const groupX = x + index * colWidth;
    let currentY = y;
    
    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(COLOR_TEXT_ORANGE[0], COLOR_TEXT_ORANGE[1], COLOR_TEXT_ORANGE[2]);
    pdf.text(`${group.length}`, groupX + colWidth / 2, currentY + 4, { align: "center" });
    
    currentY += 8;
    
    // Words
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(COLOR_BLACK[0], COLOR_BLACK[1], COLOR_BLACK[2]);
    
    const lineHeight = 5;
    group.words.sort().forEach((word) => {
      pdf.text(word.toUpperCase(), groupX + colWidth / 2, currentY + 4, { align: "center" });
      currentY += lineHeight;
    });
  });
};

// Helper to find the bounding box of the active puzzle area
const getGridBoundingBox = (grid: WordFillInPage["puzzle"]["grid"]) => {
  let minRow = grid.length;
  let maxRow = -1;
  let minCol = grid[0]?.length || 0;
  let maxCol = -1;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c].isBlack) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  // Handle case where grid is empty or all black (shouldn't happen for valid puzzle)
  if (maxRow === -1) return { minRow: 0, maxRow: grid.length - 1, minCol: 0, maxCol: (grid[0]?.length || 1) - 1 };

  return { minRow, maxRow, minCol, maxCol };
};

const renderGrid = (
  pdf: jsPDF,
  grid: WordFillInPage["puzzle"]["grid"],
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  showAnswers: boolean = false
) => {
  // Crop grid to active area
  const { minRow, maxRow, minCol, maxCol } = getGridBoundingBox(grid);
  
  const rows = maxRow - minRow + 1;
  const cols = maxCol - minCol + 1;
  
  // Calculate cell size to fit
  const cellSize = Math.min(maxWidth / cols, maxHeight / rows);
  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;
  
  const offsetX = x + (maxWidth - gridWidth) / 2;
  const offsetY = y + (maxHeight - gridHeight) / 2;

  pdf.setLineWidth(showAnswers ? 0.4 : 0.7); // Thinner border for small answer grids
  pdf.setDrawColor(0, 0, 0);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gridRow = minRow + r;
      const gridCol = minCol + c;
      
      const cell = grid[gridRow][gridCol];
      const cellX = offsetX + c * cellSize;
      const cellY = offsetY + r * cellSize;

      if (!cell.isBlack) {
        // Only draw white cells
        pdf.setFillColor(255, 255, 255);
        pdf.rect(cellX, cellY, cellSize, cellSize, "FD"); // Fill white, Draw border
        
        // Draw letter if revealed or present (depending on config, usually empty for puzzle)
        // But for now let's keep it empty unless it's a "revealed" puzzle export
        // If we want to support answer key, we check cell.isRevealed or similar
        if (showAnswers && cell.letter) {
           pdf.setFont("helvetica", "bold");
           pdf.setFontSize(cellSize * 0.9); // Increased font size for answers (HUGE)
           pdf.setTextColor(0, 0, 0);
           // Adjust vertical alignment for larger font
           pdf.text(cell.letter, cellX + cellSize / 2, cellY + cellSize * 0.8, { align: "center" });
        } else if (cell.isRevealed && cell.letter) {
           // Also show if explicitly revealed in puzzle mode (though usually not for print)
           pdf.setFont("helvetica", "bold");
           pdf.setFontSize(cellSize * 0.6);
           pdf.setTextColor(0, 0, 0);
           pdf.text(cell.letter, cellX + cellSize / 2, cellY + cellSize * 0.7, { align: "center" });
        }
      } else {
        // Fill black cells
        pdf.setFillColor(0, 0, 0);
        pdf.rect(cellX, cellY, cellSize, cellSize, "F");
      }
    }
  }
};

