import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import type { WordFillInPage, WordFillInCell } from "@/lib/types";

const PAGE_WIDTH = 215.9; // 8.5 in
const PAGE_HEIGHT = 279.4; // 11 in
const PAGE_MARGIN = 15;
const ANSWERS_PER_PAGE = 4;

// Colors
const COLOR_ORANGE = [243, 128, 54]; // #F38036
const COLOR_BLACK = [0, 0, 0];

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
      
      // Left Page: Word List
      renderWordListPage(pdf, page);
      
      // Right Page: Grid
      pdf.addPage();
      renderGridPage(pdf, page);
    });

    // 2. Render Answer Pages
    const answerPagesCount = Math.ceil(puzzles.length / ANSWERS_PER_PAGE);
    
    for (let i = 0; i < answerPagesCount; i++) {
      pdf.addPage();
      const startIndex = i * ANSWERS_PER_PAGE;
      const endIndex = Math.min(startIndex + ANSWERS_PER_PAGE, puzzles.length);
      const pagePuzzles = puzzles.slice(startIndex, endIndex);
      
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

const renderWordListPage = (pdf: jsPDF, page: WordFillInPage) => {
  const contentX = PAGE_MARGIN;
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const contentY = 15;
  const contentHeight = PAGE_HEIGHT - 30;

  // 1. Header (Puzzle Number)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(48);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${page.pageNumber}`, contentX, contentY + 15);

  // 2. Word List Container
  const wordListY = contentY + 30;
  const wordListHeight = contentHeight - 40;
  
  // Thick border around word list
  pdf.setLineWidth(1.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(contentX, wordListY, contentWidth, wordListHeight);

  renderWordList(
    pdf,
    page.puzzle.wordList,
    contentX + 5, // Padding inside border
    wordListY + 5,
    contentWidth - 10,
    wordListHeight - 10
  );
};

const renderGridPage = (pdf: jsPDF, page: WordFillInPage) => {
  const contentX = PAGE_MARGIN;
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const contentY = 15;
  const contentHeight = PAGE_HEIGHT - 30;

  // 1. Grid (Centered)
  // We want the grid to be as large as possible but square
  const gridSize = Math.min(contentWidth, contentHeight - 20);
  const gridY = contentY + (contentHeight - gridSize) / 2 - 10;

  // Thick border around grid is handled by renderGrid's outer border or we add one here
  // The sample shows a thick border AROUND the grid.
  // Let's let renderGrid handle the cells, and we draw a thick box around it.
  
  renderGrid(
    pdf,
    page.puzzle.grid,
    contentX,
    gridY,
    contentWidth,
    gridSize,
    false // Don't show answers
  );

  // 2. Footer
  const footerY = PAGE_HEIGHT - 15;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Answer on page 188", contentX + contentWidth, footerY, {
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
  
  // Determine number of columns based on width and typical word length
  // For a full page (A4/Letter), 3 or 4 columns is good.
  const numColumns = 3; 
  const colWidth = width / numColumns;
  const gutter = 5;

  let currentCol = 0;
  let currentY = y;
  const startY = y;

  groups.forEach((group) => {
    // Check if group fits in current column, else move to next
    // Estimate height: header (8) + words (5 * count) + gap (10)
    const groupHeight = 8 + group.words.length * 5 + 10;
    
    if (currentY + groupHeight > y + height) {
      currentCol++;
      currentY = startY;
    }

    if (currentCol >= numColumns) {
      // Overflow? Just stop or maybe squeeze?
      // For now, let's just stop to avoid crash
      return; 
    }

    const groupX = x + currentCol * colWidth;
    
    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${group.length} letter words`, groupX, currentY + 5);
    
    currentY += 10;
    
    // Words
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    
    const lineHeight = 6;
    group.words.sort().forEach((word) => {
      pdf.text(word.toUpperCase(), groupX, currentY + 4);
      currentY += lineHeight;
    });

    currentY += 8; // Gap between groups
  });
};

const renderGrid = (
  pdf: jsPDF,
  grid: WordFillInCell[][],
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  showAnswers: boolean = false
) => {
  // Use full grid size
  const minRow = 0;
  const maxRow = grid.length - 1;
  const minCol = 0;
  const maxCol = (grid[0]?.length || 1) - 1;
  
  const rows = grid.length;
  const cols = grid[0]?.length || 1;
  
  // Calculate cell size to fit
  const cellSize = Math.min(maxWidth / cols, maxHeight / rows);
  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;
  
  const offsetX = x + (maxWidth - gridWidth) / 2;
  const offsetY = y + (maxHeight - gridHeight) / 2;

  // 1. Fill Cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gridRow = minRow + r;
      const gridCol = minCol + c;
      const cell = grid[gridRow][gridCol];
      const cellX = offsetX + c * cellSize;
      const cellY = offsetY + r * cellSize;

      if (cell.isBlack) {
        // Use a dark gray instead of pure black so grid lines are visible
        // This prevents the "clumping" visual effect
        pdf.setFillColor(50, 50, 50); 
        pdf.rect(cellX, cellY, cellSize, cellSize, "F");
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(cellX, cellY, cellSize, cellSize, "F");
      }
    }
  }

  // 2. Draw Grid Lines (on top of fills)
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(0, 0, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellX = offsetX + c * cellSize;
      const cellY = offsetY + r * cellSize;
      pdf.rect(cellX, cellY, cellSize, cellSize, "S");
    }
  }

  // 3. Draw Thick Border around the entire grid
  pdf.setLineWidth(1.5);
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(offsetX, offsetY, gridWidth, gridHeight);

  // 4. Draw Letters
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gridRow = minRow + r;
      const gridCol = minCol + c;
      const cell = grid[gridRow][gridCol];
      const cellX = offsetX + c * cellSize;
      const cellY = offsetY + r * cellSize;

      if (!cell.isBlack) {
        if (showAnswers && cell.letter) {
           pdf.setFont("helvetica", "bold");
           pdf.setFontSize(cellSize * 0.9);
           pdf.setTextColor(0, 0, 0);
           pdf.text(cell.letter, cellX + cellSize / 2, cellY + cellSize * 0.75, { align: "center" });
        } else if (cell.isRevealed && cell.letter) {
           pdf.setFont("helvetica", "bold");
           pdf.setFontSize(cellSize * 0.6);
           pdf.setTextColor(0, 0, 0);
           pdf.text(cell.letter, cellX + cellSize / 2, cellY + cellSize * 0.7, { align: "center" });
        }
      }
    }
  }
};


