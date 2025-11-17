import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import type { WordFillInPage } from "@/lib/types";

const PAGE_WIDTH = 215.9; // 8.5 in
const PAGE_HEIGHT = 279.4; // 11 in
const PAGE_MARGIN = 15;
const PUZZLES_PER_PAGE = 2;
const SECTION_GAP = 8;

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

    const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    const contentHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;
    const puzzleHeight =
      (contentHeight - SECTION_GAP * (PUZZLES_PER_PAGE - 1)) / PUZZLES_PER_PAGE;

    puzzles.forEach((page, index) => {
      if (index > 0 && index % PUZZLES_PER_PAGE === 0) {
        pdf.addPage();
      }

      const slot = index % PUZZLES_PER_PAGE;
      const originY =
        PAGE_MARGIN + slot * (puzzleHeight + SECTION_GAP);

      renderPuzzleSection(
        pdf,
        page,
        PAGE_MARGIN,
        originY,
        contentWidth,
        puzzleHeight
      );

      const isLastPuzzle = index === puzzles.length - 1;
      const filledPage = slot === PUZZLES_PER_PAGE - 1;
      if (isLastPuzzle || filledPage) {
        const pageNumber = Math.ceil((index + 1) / PUZZLES_PER_PAGE);
        drawPageFooter(pdf, pageNumber, PAGE_WIDTH, PAGE_HEIGHT);
      }
    });

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

const renderPuzzleSection = (
  pdf: jsPDF,
  page: WordFillInPage,
  originX: number,
  originY: number,
  width: number,
  height: number
) => {
  const { puzzle } = page;
  const sectionPadding = 6;
  const wordListWidth = width * 0.45; // Increased from 0.42 to give more space for words
  const gridGap = 6; // Reduced from 8
  const gridWidth = width - wordListWidth - gridGap - sectionPadding * 2;
  const gridHeight = height - sectionPadding * 2 - 10;

  // Section border
  pdf.setDrawColor(210, 210, 210);
  pdf.roundedRect(originX, originY, width, height, 3, 3, "S");

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(
    `Puzzle ${page.pageNumber}`,
    originX + sectionPadding,
    originY + sectionPadding + 4
  );

  const contentY = originY + sectionPadding + 10; // Reduced from 12
  const wordListX = originX + sectionPadding;
  const gridX = originX + sectionPadding + wordListWidth + gridGap;

  renderWordList(
    pdf,
    puzzle.wordList,
    wordListX,
    contentY,
    wordListWidth,
    height - sectionPadding - 10 // Increased available height
  );
  renderGrid(
    pdf,
    puzzle.grid,
    gridX,
    contentY,
    gridWidth,
    gridHeight
  );
};

// Group words by length and sort
const groupWordsByLength = (words: string[]): Array<{ length: number; words: string[] }> => {
  // Sort words by length (shortest first)
  const sorted = [...words].sort((a, b) => a.length - b.length);

  // Group by length
  const groups: Array<{ length: number; words: string[] }> = [];
  let currentLength = 0;
  let currentGroup: string[] = [];

  for (const word of sorted) {
    if (word.length === currentLength) {
      currentGroup.push(word);
    } else {
      // Save previous group if exists
      if (currentGroup.length > 0) {
        groups.push({ length: currentLength, words: currentGroup });
      }
      // Start new group
      currentLength = word.length;
      currentGroup = [word];
    }
  }

  // Save last group
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
  // Use 3 columns for better space utilization
  const columns = width > 70 ? 3 : 2; // Use 3 columns if width is sufficient
  const columnGap = 3; // Reduced spacing
  const columnWidth = (width - columnGap * (columns - 1)) / columns;
  const lineHeight = 4.2; // Reduced from 6 to fit more words
  const groupSpacing = 2.5; // Reduced from 8 to fit more groups
  const titleHeight = 3.2; // Reduced from 5
  const titleBottomMargin = 0.8; // Reduced from 2

  // Group words by length
  const wordGroups = groupWordsByLength(words);

  let currentY = y;
  const bottomLimit = y + height - 2; // Leave small margin at bottom

  wordGroups.forEach((group) => {
    // Calculate space needed for this group
    const groupRows = Math.ceil(group.words.length / columns);
    const groupHeight = titleHeight + titleBottomMargin + groupRows * lineHeight;

    // Check if we have enough space for this entire group
    if (currentY + groupHeight > bottomLimit) {
      // Try to fit at least some words from this group
      const availableHeight = bottomLimit - currentY - titleHeight - titleBottomMargin;
      const maxRows = Math.floor(availableHeight / lineHeight);
      
      if (maxRows > 0) {
        // Draw title
        pdf.setFillColor(200, 220, 255);
        pdf.setDrawColor(150, 180, 220);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(x, currentY - 2.5, width, titleHeight, 1.5, 1.5, "FD");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7); // Reduced from 8
        pdf.setTextColor(50, 100, 180);
        const titleText = `${group.length} ${group.length === 1 ? "letter" : "letters"}`;
        pdf.text(titleText.toUpperCase(), x + width / 2, currentY, {
          align: "center",
        });

        currentY += titleHeight + titleBottomMargin;

        // Draw only words that fit
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8); // Reduced from 9
        pdf.setTextColor(0, 0, 0);

        const wordsToShow = Math.min(group.words.length, maxRows * columns);
        const wordsPerColumn = Math.max(1, Math.ceil(wordsToShow / columns));

        for (let i = 0; i < wordsToShow; i++) {
          const columnIndex = Math.floor(i / wordsPerColumn);
          const rowIndex = i % wordsPerColumn;
          const textX = x + columnIndex * (columnWidth + columnGap);
          const textY = currentY + rowIndex * lineHeight;

          if (textY <= bottomLimit) {
            pdf.text(group.words[i], textX, textY);
          }
        }
      }
      return; // Stop here, no more space
    }

    // Draw title background
    pdf.setFillColor(200, 220, 255);
    pdf.setDrawColor(150, 180, 220);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, currentY - 2.5, width, titleHeight, 1.5, 1.5, "FD");

    // Draw title text
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7); // Reduced from 8
    pdf.setTextColor(50, 100, 180);
    const titleText = `${group.length} ${group.length === 1 ? "letter" : "letters"}`;
    pdf.text(titleText.toUpperCase(), x + width / 2, currentY, {
      align: "center",
    });

    currentY += titleHeight + titleBottomMargin;

    // Draw words in this group
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8); // Reduced from 9
    pdf.setTextColor(0, 0, 0);

    const wordsPerColumn = Math.max(1, Math.ceil(group.words.length / columns));

    group.words.forEach((word, index) => {
      const columnIndex = Math.floor(index / wordsPerColumn);
      const rowIndex = index % wordsPerColumn;
      const textX = x + columnIndex * (columnWidth + columnGap);
      const textY = currentY + rowIndex * lineHeight;

      if (textY <= bottomLimit) {
        pdf.text(word, textX, textY);
      }
    });

    // Move to next group position
    currentY += groupRows * lineHeight + groupSpacing;
  });
};

const renderGrid = (
  pdf: jsPDF,
  grid: WordFillInPage["puzzle"]["grid"],
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) => {
  const rows = grid.length;
  const cols = grid[0]?.length || rows;
  const cellSize = Math.min(maxWidth / cols, maxHeight / rows);
  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;
  const offsetX = x + (maxWidth - gridWidth) / 2;
  const offsetY = y + (maxHeight - gridHeight) / 2;

  pdf.setLineWidth(0.2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = grid[row][col];
      const cellX = offsetX + col * cellSize;
      const cellY = offsetY + row * cellSize;

      if (cell.isBlack) {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(cellX, cellY, cellSize, cellSize, "FD");
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(cellX, cellY, cellSize, cellSize, "S");
      }
    }
  }
};

const drawPageFooter = (
  pdf: jsPDF,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number
) => {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Page ${pageNumber}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );
  pdf.setTextColor(0, 0, 0);
};
