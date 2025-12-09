import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { WordSearchGenerator } from "@/lib/wordsearch";
import type { GameBookConfig } from "@/lib/types";

const PAGE_WIDTH = 215.9; // 8.5 inches in mm
const PAGE_HEIGHT = 279.4; // 11 inches in mm
const MARGIN = 18;
const BORDER_MARGIN = 10;

// Helper to convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] | null => {
  if (!hex || typeof hex !== "string") return null;
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }
  if (cleanHex.length === 6) {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    if (result) {
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ];
    }
  }
  return null;
};

// Draw decorative border
const drawBorder = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  accentColor?: string
) => {
  const color = accentColor
    ? hexToRgb(accentColor) || [200, 200, 200]
    : [200, 200, 200];

  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(2);
  pdf.rect(
    BORDER_MARGIN,
    BORDER_MARGIN,
    pageWidth - 2 * BORDER_MARGIN,
    pageHeight - 2 * BORDER_MARGIN
  );
};

// Draw cover page
const drawCoverPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  coverImage?: string,
  title?: string,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  if (coverImage) {
    try {
      // Determine image format from base64 string
      const imageFormat = coverImage.startsWith("data:image/png")
        ? "PNG"
        : "JPEG";
      pdf.addImage(
        coverImage,
        imageFormat,
        MARGIN,
        MARGIN,
        pageWidth - 2 * MARGIN,
        pageHeight - 2 * MARGIN
      );
    } catch (e) {
      console.error("Error adding cover image:", e);
    }
  }

  if (title) {
    pdf.setFontSize(32);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, pageWidth / 2, pageHeight / 2, { align: "center" });
  }

  drawBorder(pdf, pageWidth, pageHeight, accentColor);
};

// Draw word search page with grid and word list on same page
const drawWordSearchPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  wordSearch: GameBookConfig["wordSearches"][0],
  grid: any,
  pageNumber: number,
  index: number,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Title section
  const titleY = 30;
  const title = wordSearch.title
    ? `WORD SEARCH #${index + 1} - ${wordSearch.title}`
    : `WORD SEARCH #${index + 1}`;

  // Draw title (large, bold)
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(title.toUpperCase(), pageWidth / 2, titleY, { align: "center" });

  // Instructions
  const instructionsY = titleY + 10; // Reduced spacing from title
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.text(
    "Find the words listed below. Words appear in every direction.",
    pageWidth / 2,
    instructionsY,
    { align: "center" }
  );

  // Calculate grid size and position (centered, but leave more space for words)
  const gridSize = grid.size;
  const gridTopY = instructionsY + 10; // Reduced from 20 to bring grid up

  // Use words directly from grid.words (these are the words actually placed in the grid)
  // grid.words contains WordPosition objects with 'word' property that has the original word
  // IMPORTANT: Only use words from grid.words - these are guaranteed to have answers in the grid
  // If a word is not in grid.words, it means it couldn't be placed and has no answer
  const placedWords = grid.words
    .map((w: any) => w.word)
    .filter((word: string) => word && word.trim().length > 0);

  // Calculate how much space we need for words box (5 columns now)
  // Use placedWords - these are guaranteed to have answers in the grid
  const numColumns = 5;
  const wordsPerColumn = Math.ceil(placedWords.length / numColumns);
  const wordSpacing = 7;
  const wordsBoxHeaderHeight = 12; // Reduced header height to fit tightly
  const wordsBoxContentHeight = wordsPerColumn * wordSpacing + 2; // Minimal padding to fit words tightly
  const wordsBoxTotalHeight = wordsBoxHeaderHeight + wordsBoxContentHeight;

  // Calculate available height for grid (leave space for words box and footer)
  // With 5 columns, words box takes even less vertical space, so grid can be bigger
  const footerHeight = 30;
  const gapBetweenGridAndWords = 30; // 30px margin top for words box
  const availableHeight =
    pageHeight -
    gridTopY -
    wordsBoxTotalHeight -
    gapBetweenGridAndWords -
    footerHeight;
  const maxGridWidth = pageWidth - 2 * MARGIN - 5; // Even less margin for bigger grid
  const maxGridHeight = availableHeight;
  const cellSize = Math.min(maxGridWidth / gridSize, maxGridHeight / gridSize);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;
  const gridStartX = (pageWidth - gridWidth) / 2; // Centered
  const gridStartY = gridTopY;

  // Draw grid border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  for (let i = 0; i <= gridSize; i++) {
    const pos = gridStartX + i * cellSize;
    pdf.line(pos, gridStartY, pos, gridStartY + gridHeight);
    pdf.line(
      gridStartX,
      gridStartY + i * cellSize,
      gridStartX + gridWidth,
      gridStartY + i * cellSize
    );
  }

  // Draw letters in grid
  pdf.setFontSize(Math.max(10, cellSize * 0.6));
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const letter = grid.grid[row][col];
      if (letter) {
        pdf.text(
          letter.toUpperCase(),
          gridStartX + col * cellSize + cellSize / 2,
          gridStartY + row * cellSize + cellSize / 2 + 2,
          { align: "center" }
        );
      }
    }
  }

  // Words to Find section (below grid)
  const wordsBoxMarginTop = 20; // 20px margin top (approximately 7.9mm, but using 30mm for clarity)
  const wordsBoxY = gridStartY + gridHeight + wordsBoxMarginTop;
  const wordsBoxWidth = pageWidth - 2 * MARGIN;
  const wordsBoxPadding = 10; // 10px padding top and sides
  const wordsBoxPaddingBottom = 5; // 5px padding bottom

  // Calculate exact height needed for words box (fit tightly)
  const wordStartY = wordsBoxY + wordsBoxPadding + 8; // Start position for words (padding + title space)
  const lastWordRow = wordsPerColumn - 1;
  const lastWordY = wordStartY + lastWordRow * wordSpacing;
  const actualWordsBoxHeight = lastWordY - wordsBoxY + wordsBoxPaddingBottom; // 5px padding at bottom

  // Draw "WORDS TO FIND" box with white background
  pdf.setFillColor(255, 255, 255); // White
  pdf.setDrawColor(0, 0, 0); // Black border
  pdf.setLineWidth(0.5);
  pdf.roundedRect(
    MARGIN,
    wordsBoxY,
    wordsBoxWidth,
    actualWordsBoxHeight,
    2,
    2,
    "FD" // Fill and draw
  );

  // Draw "WORDS TO FIND" label (centered)
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text("WORDS TO FIND", pageWidth / 2, wordsBoxY + wordsBoxPadding, {
    align: "center",
  });

  // Draw words in 5 columns
  const columnWidth = (wordsBoxWidth - wordsBoxPadding * 2) / numColumns; // Padding on both sides

  pdf.setFontSize(9); // Smaller font to fit more words
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0); // Black text

  // Display only words that were actually placed in the grid (have answers)
  // placedWords comes directly from grid.words, so all words have answers in the grid
  placedWords.forEach((word: string, wordIndex: number) => {
    const columnIndex = Math.floor(wordIndex / wordsPerColumn);
    const rowIndex = wordIndex % wordsPerColumn;
    const x = MARGIN + wordsBoxPadding + columnIndex * columnWidth;
    const y = wordStartY + rowIndex * wordSpacing;

    pdf.text(word.toUpperCase(), x, y);
  });

  // Draw footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${pageNumber}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  drawBorder(pdf, pageWidth, pageHeight, accentColor);
};

// Draw word search answer page
const drawWordSearchAnswerPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  grids: Array<{ grid: string[][]; words: any[]; size: number }>,
  titles: string[],
  pageNumbers: number[],
  pageNumber: number,
  isFirstPage: boolean,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Title - only show on first page
  if (isFirstPage) {
    const titleY = 30;
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("WORD SEARCH ANSWER", pageWidth / 2, titleY, { align: "center" });
  }

  // Calculate grid layout (2x2 per page)
  const cols = 2;
  const rows = 2;
  const answerKeyStartY = isFirstPage ? 50 : 30; // Less space if no title
  const answerKeyGridGapX = 15;
  const answerKeyGridGapY = 15;
  const answerKeyTitleSpacing = 8;

  const availableWidth =
    pageWidth - 2 * MARGIN - (cols - 1) * answerKeyGridGapX;
  const availableHeight = pageHeight - answerKeyStartY - 30; // 30 for footer
  const maxCellSizeByWidth = availableWidth / (cols * 15); // Assume max 15x15 grid
  const rowSpacing = answerKeyGridGapY + answerKeyTitleSpacing;
  const maxCellSizeByHeight = (availableHeight - rowSpacing) / (rows * 15);
  const cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight, 12);

  for (let i = 0; i < grids.length; i++) {
    const grid = grids[i];
    const gridIndex = i;
    const row = Math.floor(gridIndex / cols);
    const col = gridIndex % cols;

    const gridWidth = grid.size * cellSize;
    const gridHeight = grid.size * cellSize;

    const totalGridsWidth = cols * gridWidth + (cols - 1) * answerKeyGridGapX;
    const startX = (pageWidth - totalGridsWidth) / 2;
    const gridX = startX + col * (gridWidth + answerKeyGridGapX);
    const gridY =
      answerKeyStartY +
      answerKeyTitleSpacing +
      row * (gridHeight + answerKeyGridGapY + answerKeyTitleSpacing);

    // Title with page number
    const titleText = titles[i] || "WORD SEARCH";
    const gridPage = pageNumbers[i];
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `${titleText} (page ${gridPage})`,
      gridX + gridWidth / 2,
      gridY - 4,
      { align: "center" }
    );

    // Draw grid border
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    for (let j = 0; j <= grid.size; j++) {
      const pos = gridX + j * cellSize;
      pdf.line(pos, gridY, pos, gridY + gridHeight);
      pdf.line(
        gridX,
        gridY + j * cellSize,
        gridX + gridWidth,
        gridY + j * cellSize
      );
    }

    // Draw letters
    pdf.setFontSize(Math.max(7, cellSize * 0.4));
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);

    // Identify answer cells
    const answerCells = new Set<string>();
    grid.words.forEach((wordPos: any) => {
      const { startRow, startCol, endRow, endCol } = wordPos;
      const rowStep = endRow > startRow ? 1 : endRow < startRow ? -1 : 0;
      const colStep = endCol > startCol ? 1 : endCol < startCol ? -1 : 0;
      let currentRow = startRow;
      let currentCol = startCol;
      while (true) {
        answerCells.add(`${currentRow}-${currentCol}`);
        if (currentRow === endRow && currentCol === endCol) break;
        currentRow += rowStep;
        currentCol += colStep;
      }
    });

    // Draw diagonal lines through answer words
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(1);
    grid.words.forEach((wordPos: any) => {
      const { startRow, startCol, endRow, endCol } = wordPos;
      const startX = gridX + startCol * cellSize + cellSize / 2;
      const startY = gridY + startRow * cellSize + cellSize / 2;
      const endX = gridX + endCol * cellSize + cellSize / 2;
      const endY = gridY + endRow * cellSize + cellSize / 2;
      pdf.line(startX, startY, endX, endY);
    });

    // Draw letters
    for (let rowIndex = 0; rowIndex < grid.size; rowIndex++) {
      for (let colIndex = 0; colIndex < grid.size; colIndex++) {
        const x = gridX + colIndex * cellSize;
        const y = gridY + rowIndex * cellSize;
        pdf.text(
          grid.grid[rowIndex][colIndex].toUpperCase(),
          x + cellSize / 2,
          y + cellSize / 2 + 2,
          { align: "center" }
        );
      }
    }
  }

  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${pageNumber}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  drawBorder(pdf, pageWidth, pageHeight, accentColor);
};

// Draw crossword page with grid and clues on same page
const drawCrosswordPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  crossword: GameBookConfig["crosswords"][0],
  crosswordIndex: number,
  pageNumber: number,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Title section
  const titleY = 30;
  const title = crossword.title
    ? `CROSSWORD #${crosswordIndex + 1} - ${crossword.title.toUpperCase()}`
    : `CROSSWORD #${crosswordIndex + 1}`;

  // Draw title
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(title, pageWidth / 2, titleY, { align: "center" });

  // Instructions
  const instructionsY = titleY + 10;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.text(
    "Fill in the grid using the clues below.",
    pageWidth / 2,
    instructionsY,
    { align: "center" }
  );

  // Build grid with letters and clue numbers
  const gridSize = crossword.gridSize;
  const grid: Array<
    Array<{ letter: string | null; clueNumber: number | null }>
  > = [];
  const clueNumbers: Map<string, number> = new Map(); // key: "row-col", value: clue number

  // Initialize grid
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = { letter: null, clueNumber: null };
    }
  }

  // Process clues to fill grid
  // IMPORTANT: Process ALL clues, even if some have invalid positions
  // This ensures all clues are available for display in the clues section
  crossword.clues.forEach((clue) => {
    const answer = clue.answer.toUpperCase();
    let currentRow = clue.row;
    let currentCol = clue.col;

    // Check if starting position is valid
    if (
      currentRow >= 0 &&
      currentRow < gridSize &&
      currentCol >= 0 &&
      currentCol < gridSize &&
      answer.length > 0 // Ensure answer is not empty
    ) {
      // Mark clue number at starting position
      const key = `${currentRow}-${currentCol}`;
      if (!clueNumbers.has(key)) {
        clueNumbers.set(key, clue.number);
        grid[currentRow][currentCol].clueNumber = clue.number;
      }

      // Place letters
      for (let i = 0; i < answer.length; i++) {
        if (
          currentRow >= 0 &&
          currentRow < gridSize &&
          currentCol >= 0 &&
          currentCol < gridSize
        ) {
          grid[currentRow][currentCol].letter = answer[i];
          if (clue.direction === "across") {
            currentCol++;
          } else {
            currentRow++;
          }
        } else {
          // Stop if we go out of bounds
          break;
        }
      }
    }
    // Note: Clues with invalid positions will still be shown in the clues list below
  });

  // Find min/max rows and cols that have content
  let minRow = gridSize;
  let maxRow = -1;
  let minCol = gridSize;
  let maxCol = -1;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = grid[row][col];
      if (cell.letter || cell.clueNumber !== null) {
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  // If no content, return early
  if (maxRow < 0 || maxCol < 0) {
    return {
      grid,
      minRow: 0,
      maxRow: gridSize - 1,
      minCol: 0,
      maxCol: gridSize - 1,
    };
  }

  // Calculate grid size and position (centered, respecting borders)
  // First, estimate how much space clues will need
  const estimatedCluesHeight = Math.max(
    50,
    crossword.clues.length * 3 + 20 // Rough estimate: 3mm per clue + padding
  );
  const footerHeight = 30;
  const gridTopY = instructionsY + 10;
  const availableHeight =
    pageHeight -
    gridTopY -
    estimatedCluesHeight -
    footerHeight -
    BORDER_MARGIN * 2;
  const availableWidth = pageWidth - 2 * MARGIN - 2 * BORDER_MARGIN;

  // Calculate grid dimensions based on content bounds
  const actualRows = maxRow - minRow + 1;
  const actualCols = maxCol - minCol + 1;

  // Calculate cell size - use actual content bounds for better sizing
  // Make grid bigger by using actual content dimensions instead of full grid size
  const cellSize = Math.min(
    availableWidth / Math.max(actualCols, 10), // Use actual cols or min 10
    availableHeight / Math.max(actualRows, 10) // Use actual rows or min 10
  );
  const gridWidth = cellSize * actualCols;
  const gridHeight = cellSize * actualRows;

  // Center the grid based on content bounds
  const gridStartX = (pageWidth - gridWidth) / 2;
  const gridStartY = gridTopY;

  // Draw ALL cells in the bounds to create a continuous grid
  // This ensures all cells are connected, not just cells with content
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);

  // Draw ALL cells in the bounds range to create a continuous grid
  // Cells with content: white background, cells without content: black background
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const cell = grid[row][col];
      const displayRow = row - minRow;
      const displayCol = col - minCol;
      const x = gridStartX + displayCol * cellSize;
      const y = gridStartY + displayRow * cellSize;

      // Check if cell has content (letter or clue number)
      const hasContent = cell.letter || cell.clueNumber !== null;

      if (hasContent) {
        // Draw white cell background for cells with content
        pdf.setFillColor(255, 255, 255);
        pdf.rect(x, y, cellSize, cellSize, "FD");
      } else {
        // Draw black cell background for empty cells
        pdf.setFillColor(0, 0, 0);
        pdf.rect(x, y, cellSize, cellSize, "FD");
      }

      // Draw black cell border (connected - no gaps)
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(x, y, cellSize, cellSize, "S");
    }
  }

  // Draw clue numbers in top-left corner of starting cells
  // Track which positions have already been numbered to avoid duplicates
  const numberedPositions = new Set<string>();

  pdf.setFontSize(5); // Smaller font size
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);

  crossword.clues.forEach((clue) => {
    const startRow = clue.row;
    const startCol = clue.col;

    // Check bounds before accessing cell
    if (
      startRow < 0 ||
      startRow >= gridSize ||
      startCol < 0 ||
      startCol >= gridSize
    ) {
      return;
    }

    const cell = grid[startRow][startCol];
    if (!cell) {
      return;
    }

    // Check if this position already has a clue number assigned
    const positionKey = `${startRow}-${startCol}`;
    if (numberedPositions.has(positionKey)) {
      return;
    }

    // Only draw if this cell has the matching clue number
    if (cell.clueNumber === clue.number) {
      numberedPositions.add(positionKey);

      const displayRow = startRow - minRow;
      const displayCol = startCol - minCol;
      const cellX = gridStartX + displayCol * cellSize;
      const cellY = gridStartY + displayRow * cellSize;

      // Draw number in top-left corner, closer to the corner
      pdf.text(clue.number.toString(), cellX + 0.3, cellY + 2.5, {
        align: "left",
      });
    }
  });

  // Clues section (below grid) - render each (Across / Down) as a 2-column table
  const cluesStartY = gridStartY + gridHeight + 10;
  // Keep clues inside the gray border with 10px (~2.65mm) inset from border
  const borderInset = 2.65; // ~10px
  const columnGap = 4;
  const cluesLeftX = MARGIN + BORDER_MARGIN + borderInset;
  const cluesRightMargin = MARGIN + BORDER_MARGIN + borderInset;
  const cluesAreaWidth = pageWidth - cluesLeftX - cluesRightMargin - columnGap;
  const columnWidth = cluesAreaWidth / 2; // Left vs Right (Across vs Down)
  const cluesRightX = cluesLeftX + columnWidth + columnGap;

  const drawClueTable = (
    title: string,
    clues: typeof crossword.clues,
    startX: number,
    startY: number
  ) => {
    // Title (centered)
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, startX + columnWidth / 2, startY, { align: "center" });

    // Two columns inside this section (smaller gap)
    const innerGap = 2;
    const innerColWidth = (columnWidth - innerGap) / 2;
    const col1X = startX;
    const col2X = startX + innerColWidth + innerGap;
    const rowHeight = 6;
    const tableStartY = startY + 8;
    const padding = 0;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    let y1 = tableStartY + padding;
    let y2 = tableStartY + padding;

    const half = Math.ceil(clues.length / 2);
    const col1 = clues.slice(0, half);
    const col2 = clues.slice(half);

    const renderColumn = (
      colClues: typeof clues,
      x: number,
      yStart: number
    ) => {
      let y = yStart;
      colClues.forEach((clue) => {
        // Don't stop rendering - show all clues even if they extend slightly
        // The page will accommodate them
        const text = `${clue.number}. ${clue.clue}`;
        // Limit width to innerColWidth to avoid clipping; allow wrap
        const lines = pdf.splitTextToSize(
          text,
          innerColWidth - padding * 2 - 0.5
        );
        const startRowY = y;
        lines.forEach((line: string) => {
          pdf.text(line, x + padding, y);
          y += rowHeight;
        });
      });
      return y;
    };

    y1 = renderColumn(col1, col1X, y1);
    y2 = renderColumn(col2, col2X, y2);

    const tableEndY = Math.max(y1, y2) + padding;

    return tableEndY;
  };

  // Sort clues by number (small to large)
  const acrossClues = crossword.clues
    .filter((c) => c.direction === "across")
    .sort((a, b) => a.number - b.number);
  const downClues = crossword.clues
    .filter((c) => c.direction === "down")
    .sort((a, b) => a.number - b.number);

  const nextY = drawClueTable("ACROSS", acrossClues, cluesLeftX, cluesStartY);
  const downEndY = drawClueTable("DOWN", downClues, cluesRightX, cluesStartY);

  // Draw single separator line between ACROSS and DOWN columns (no table borders)
  const sepX = cluesLeftX + columnWidth + columnGap / 2; // mid-gap
  const sepStartY = cluesStartY - 4; // slightly above titles
  const sepEndY = Math.max(nextY, downEndY) + 4;
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(sepX, sepStartY, sepX, sepEndY);

  // Draw footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${pageNumber}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  drawBorder(pdf, pageWidth, pageHeight, accentColor);

  // Return grid data for answer page (use actual content bounds)
  return { grid, minRow, maxRow, minCol, maxCol };
};

// Draw crossword answer grids (multiple grids per page, 2x2 layout)
const drawCrosswordAnswerPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  grids: Array<{
    grid: Array<Array<{ letter: string | null; clueNumber: number | null }>>;
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
    crossword: GameBookConfig["crosswords"][0];
    puzzlePageNumber: number;
    index: number;
  }>,
  pageNumber: number,
  isFirstPage: boolean,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Title - only show on first page
  if (isFirstPage) {
    const titleY = 30;
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("CROSSWORD ANSWER", pageWidth / 2, titleY, { align: "center" });
  }

  // Calculate grid layout (2x2 per page)
  const cols = 2;
  const rows = 2;
  const answerKeyStartY = isFirstPage ? 50 : 30;
  const answerKeyGridGapX = 15;
  const answerKeyGridGapY = 15;
  const answerKeyTitleSpacing = 8;

  const availableWidth =
    pageWidth - 2 * MARGIN - (cols - 1) * answerKeyGridGapX;
  const availableHeight = pageHeight - answerKeyStartY - 30; // 30 for footer
  const maxCellSizeByWidth = availableWidth / (cols * 15); // Assume max 15x15 grid
  const rowSpacing = answerKeyGridGapY + answerKeyTitleSpacing;
  const maxCellSizeByHeight = (availableHeight - rowSpacing) / (rows * 15);
  const cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight, 8);

  for (let i = 0; i < grids.length; i++) {
    const gridData = grids[i];
    const gridIndex = i;
    const row = Math.floor(gridIndex / cols);
    const col = gridIndex % cols;

    const actualRows = gridData.maxRow - gridData.minRow + 1;
    const actualCols = gridData.maxCol - gridData.minCol + 1;
    const gridWidth = actualCols * cellSize;
    const gridHeight = actualRows * cellSize;

    const totalGridsWidth =
      cols * (gridWidth + answerKeyGridGapX) - answerKeyGridGapX;
    const startX = (pageWidth - totalGridsWidth) / 2;
    const gridX = startX + col * (gridWidth + answerKeyGridGapX);
    const gridY =
      answerKeyStartY +
      answerKeyTitleSpacing +
      row * (gridHeight + answerKeyGridGapY + answerKeyTitleSpacing);

    // Title with page number
    const title = gridData.crossword.title
      ? `CROSSWORD #${
          gridData.index + 1
        } - ${gridData.crossword.title.toUpperCase()}`
      : `CROSSWORD #${gridData.index + 1}`;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `${title} (page ${gridData.puzzlePageNumber})`,
      gridX + gridWidth / 2,
      gridY - 4,
      { align: "center" }
    );

    // Draw ALL grid cells in bounds to create a continuous grid
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    for (let r = gridData.minRow; r <= gridData.maxRow; r++) {
      for (let c = gridData.minCol; c <= gridData.maxCol; c++) {
        const cell = gridData.grid[r][c];
        const displayRow = r - gridData.minRow;
        const displayCol = c - gridData.minCol;
        const x = gridX + displayCol * cellSize;
        const y = gridY + displayRow * cellSize;

        // Check if cell has content (letter or clue number)
        const hasContent = cell.letter || cell.clueNumber !== null;

        if (hasContent) {
          // Draw white cell background for cells with content
          pdf.setFillColor(255, 255, 255);
          pdf.rect(x, y, cellSize, cellSize, "FD");
        } else {
          // Draw black cell background for empty cells
          pdf.setFillColor(0, 0, 0);
          pdf.rect(x, y, cellSize, cellSize, "FD");
        }

        // Draw cell border
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(x, y, cellSize, cellSize, "S");

        // Draw clue number (small, top-left corner) if exists
        if (cell.clueNumber !== null) {
          pdf.setFontSize(5); // Small font size
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text(cell.clueNumber.toString(), x + 0.3, y + 2.5, {
            align: "left",
          });
        }

        // Draw letter (centered) if exists
        if (cell.letter) {
          pdf.setFontSize(Math.max(6, cellSize * 0.4));
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text(cell.letter, x + cellSize / 2, y + cellSize / 2 + 1.5, {
            align: "center",
          });
        }
      }
    }
  }

  // Draw footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${pageNumber}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  drawBorder(pdf, pageWidth, pageHeight, accentColor);
};

// Draw game title page (centered title)
const drawGameTitlePage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title: string,
  pageNumber: number,
  sectionNumber: number,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Draw section number at the top (centered)
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Section #${sectionNumber}`, pageWidth / 2, pageHeight / 2 - 20, {
    align: "center",
  });

  // Draw title centered below section number
  pdf.setFontSize(32);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(title.toUpperCase(), pageWidth / 2, pageHeight / 2 + 10, {
    align: "center",
  });

  // Draw footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${pageNumber}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  drawBorder(pdf, pageWidth, pageHeight, accentColor);
};

// Draw simple text-based game page
const drawTextGamePage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  title: string,
  content: string[],
  pageNumber: number,
  accentColor?: string
) => {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  const titleY = 40;

  // Draw title
  if (accentColor) {
    const color = hexToRgb(accentColor) || [200, 200, 200];
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.setDrawColor(
      Math.max(0, color[0] - 30),
      Math.max(0, color[1] - 30),
      Math.max(0, color[2] - 30)
    );
    pdf.roundedRect(
      MARGIN,
      titleY - 15,
      pageWidth - 2 * MARGIN,
      20,
      3,
      3,
      "FD"
    );
  }

  pdf.setFontSize(20);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title.toUpperCase(), pageWidth / 2, titleY, { align: "center" });

  // Draw content
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  let currentY = titleY + 40;
  content.forEach((line) => {
    if (currentY + 10 > pageHeight - 40) return;
    pdf.text(line, MARGIN + 10, currentY);
    currentY += 10;
  });

  // Draw footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 20, {
    align: "center",
  });

  drawBorder(pdf, pageWidth, pageHeight, accentColor);
};

export async function POST(request: NextRequest) {
  try {
    const config: GameBookConfig = await request.json();

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [PAGE_WIDTH, PAGE_HEIGHT],
    });

    let pageNumber = 1;
    let sectionNumber = 1; // Global section counter across all games

    // Cover page
    if (config.coverImage || config.title) {
      drawCoverPage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        config.coverImage,
        config.title,
        config.accentColor
      );
      pageNumber++;
    }

    // Word Searches - store grids and titles for answer pages
    const wordSearchGrids: Array<{
      grid: string[][];
      words: any[];
      size: number;
    }> = [];
    const wordSearchTitles: string[] = [];
    const wordSearchPageNumbers: number[] = [];
    const wordSearchGenerator = new WordSearchGenerator(true, true);

    let wordSearchSectionAdded = false;
    for (let i = 0; i < config.wordSearches.length; i++) {
      const wordSearch = config.wordSearches[i];
      if (wordSearch.words.length === 0) continue;

      // Add title page only before first word search (section page)
      if (!wordSearchSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "WORD SEARCH",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        wordSearchSectionAdded = true;
      }

      pdf.addPage();

      // Generate grid multiple times to get the best result (most words placed)
      // This ensures we match what was saved during import
      // Try many times to ensure we place as many words as possible
      let grid = wordSearchGenerator.generate(
        wordSearch.words,
        wordSearch.gridSize
      );
      for (let attempt = 0; attempt < 50; attempt++) {
        const testGrid = wordSearchGenerator.generate(
          wordSearch.words,
          wordSearch.gridSize
        );
        if (testGrid.words.length > grid.words.length) {
          grid = testGrid;
        }
        // If we've placed all words, no need to continue
        if (grid.words.length >= wordSearch.words.length) {
          break;
        }
      }

      // Store grid and title for answer page
      wordSearchGrids.push(grid);
      wordSearchTitles.push(
        wordSearch.title
          ? `WORD SEARCH #${i + 1} - ${wordSearch.title}`
          : `WORD SEARCH #${i + 1}`
      );
      wordSearchPageNumbers.push(pageNumber);

      drawWordSearchPage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        wordSearch,
        grid,
        pageNumber,
        i,
        config.accentColor
      );
      pageNumber++;
    }

    // Crosswords - store grids and titles for answer pages
    const crosswordGrids: Array<{
      grid: Array<Array<{ letter: string | null; clueNumber: number | null }>>;
      minRow: number;
      maxRow: number;
      minCol: number;
      maxCol: number;
    }> = [];
    const crosswordTitles: string[] = [];
    const crosswordPageNumbers: number[] = [];
    const crosswordIndices: number[] = []; // Store actual crossword indices

    // Track if we've added section page for crosswords
    let crosswordSectionAdded = false;
    for (let i = 0; i < config.crosswords.length; i++) {
      const crossword = config.crosswords[i];
      if (crossword.clues.length === 0) continue;

      // Add title page only before first crossword (section page)
      if (!crosswordSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "CROSSWORD",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        crosswordSectionAdded = true;
      }

      pdf.addPage();

      const result = drawCrosswordPage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        crossword,
        i, // crosswordIndex - đánh số theo thứ tự trong mảng crosswords (bắt đầu từ 0)
        pageNumber,
        config.accentColor
      );

      // Store grid data for answer page
      if (result) {
        crosswordGrids.push({
          grid: result.grid,
          minRow: result.minRow,
          maxRow: result.maxRow,
          minCol: result.minCol,
          maxCol: result.maxCol,
        });
        crosswordTitles.push(
          crossword.title
            ? `CROSSWORD #${i + 1} - ${crossword.title.toUpperCase()}`
            : `CROSSWORD #${i + 1}`
        );
        crosswordPageNumbers.push(pageNumber);
        crosswordIndices.push(i); // Store the actual index in config.crosswords
      }

      pageNumber++;
    }

    // Logic Puzzles
    let logicPuzzleSectionAdded = false;
    for (let i = 0; i < config.logicPuzzles.length; i++) {
      const puzzle = config.logicPuzzles[i];
      // Add title page only before first logic puzzle (section page)
      if (!logicPuzzleSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "LOGIC PUZZLE",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        logicPuzzleSectionAdded = true;
      }

      pdf.addPage();
      const content = [puzzle.description, ...puzzle.clues];
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        puzzle.title || "LOGIC PUZZLE",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Spot the Difference
    let spotTheDifferenceSectionAdded = false;
    for (let i = 0; i < config.spotTheDifferences.length; i++) {
      const std = config.spotTheDifferences[i];
      // Add title page only before first spot the difference (section page)
      if (!spotTheDifferenceSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "SPOT THE DIFFERENCE",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        spotTheDifferenceSectionAdded = true;
      }

      pdf.addPage();
      const content = std.differences.map(
        (d, i) => `${i + 1}. ${d.description}`
      );
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        std.title || "SPOT THE DIFFERENCE",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Sudoku
    let sudokuSectionAdded = false;
    for (let i = 0; i < config.sudokus.length; i++) {
      const sudoku = config.sudokus[i];
      // Add title page only before first sudoku (section page)
      if (!sudokuSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "SUDOKU",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        sudokuSectionAdded = true;
      }

      pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

      const titleY = 40;
      const title = `SUDOKU - ${sudoku.difficulty.toUpperCase()}`;

      if (config.accentColor) {
        const color = hexToRgb(config.accentColor) || [200, 200, 200];
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(
          MARGIN,
          titleY - 15,
          PAGE_WIDTH - 2 * MARGIN,
          20,
          3,
          3,
          "FD"
        );
      }

      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.text(title, PAGE_WIDTH / 2, titleY, { align: "center" });

      // Draw 9x9 grid
      const gridSize = 90;
      const cellSize = gridSize / 9;
      const gridStartX = (PAGE_WIDTH - gridSize) / 2;
      const gridStartY = titleY + 40;

      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      for (let i = 0; i <= 9; i++) {
        const pos = gridStartX + i * cellSize;
        const lineWidth = i % 3 === 0 ? 1 : 0.3;
        pdf.setLineWidth(lineWidth);
        pdf.line(pos, gridStartY, pos, gridStartY + gridSize);
        pdf.line(
          gridStartX,
          gridStartY + i * cellSize,
          gridStartX + gridSize,
          gridStartY + i * cellSize
        );
      }

      // Draw numbers
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const num = sudoku.grid[row][col];
          if (num > 0) {
            pdf.text(
              num.toString(),
              gridStartX + col * cellSize + cellSize / 2,
              gridStartY + row * cellSize + cellSize / 2 + 3,
              { align: "center" }
            );
          }
        }
      }

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${pageNumber}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 20, {
        align: "center",
      });
      drawBorder(pdf, PAGE_WIDTH, PAGE_HEIGHT, config.accentColor);
      pageNumber++;
    }

    // Alphabet Trivia
    let alphabetTriviaSectionAdded = false;
    for (let i = 0; i < config.alphabetTrivias.length; i++) {
      const at = config.alphabetTrivias[i];
      // Add title page only before first alphabet trivia (section page)
      if (!alphabetTriviaSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "ALPHABET TRIVIA",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        alphabetTriviaSectionAdded = true;
      }

      pdf.addPage();
      const content = at.questions.map(
        (q) => `${q.letter}: ${q.question} (Answer: ${q.answer})`
      );
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        "ALPHABET TRIVIA",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Matching Games
    let matchingGameSectionAdded = false;
    for (let i = 0; i < config.matchingGames.length; i++) {
      const mg = config.matchingGames[i];
      // Add title page only before first matching game (section page)
      if (!matchingGameSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "MATCHING GAME",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        matchingGameSectionAdded = true;
      }

      pdf.addPage();
      const content = mg.pairs.map((p) => `${p.left} ↔ ${p.right}`);
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        mg.title || "MATCHING GAME",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Word Scrambles
    let wordScrambleSectionAdded = false;
    for (let i = 0; i < config.wordScrambles.length; i++) {
      const ws = config.wordScrambles[i];
      // Add title page only before first word scramble (section page)
      if (!wordScrambleSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "WORD SCRAMBLE",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        wordScrambleSectionAdded = true;
      }

      pdf.addPage();
      const content = [
        `Scrambled: ${ws.scrambled}`,
        ws.hint ? `Hint: ${ws.hint}` : "",
        `Answer: ${ws.answer}`,
      ].filter((l) => l.length > 0);
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        "WORD SCRAMBLE",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Mazes (simplified representation)
    let mazeSectionAdded = false;
    for (let i = 0; i < config.mazes.length; i++) {
      const maze = config.mazes[i];
      // Add title page only before first maze (section page)
      if (!mazeSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "MAZE",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        mazeSectionAdded = true;
      }

      pdf.addPage();
      const content = [
        `Start: (${maze.start.row}, ${maze.start.col})`,
        `End: (${maze.end.row}, ${maze.end.col})`,
        "Find your way from start to end!",
      ];
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        maze.title || "MAZE",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Cryptograms
    let cryptogramSectionAdded = false;
    for (let i = 0; i < config.cryptograms.length; i++) {
      const cg = config.cryptograms[i];
      // Add title page only before first cryptogram (section page)
      if (!cryptogramSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "CRYPTOGRAM",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        cryptogramSectionAdded = true;
      }

      pdf.addPage();
      const content = [
        `Encrypted: ${cg.encrypted}`,
        cg.hint ? `Hint: ${cg.hint}` : "",
        `Answer: ${cg.decrypted}`,
      ].filter((l) => l.length > 0);
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        "CRYPTOGRAM",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Name That City
    let nameThatCitySectionAdded = false;
    for (let i = 0; i < config.nameThatCities.length; i++) {
      const ntc = config.nameThatCities[i];
      // Add title page only before first name that city (section page)
      if (!nameThatCitySectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "NAME THAT CITY",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        nameThatCitySectionAdded = true;
      }

      pdf.addPage();
      const content = [...ntc.clues, `Answer: ${ntc.answer}`];
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        "NAME THAT CITY",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Fallen Phrases
    let fallenPhraseSectionAdded = false;
    for (let i = 0; i < config.fallenPhrases.length; i++) {
      const fp = config.fallenPhrases[i];
      // Add title page only before first fallen phrase (section page)
      if (!fallenPhraseSectionAdded) {
        pdf.addPage();
        drawGameTitlePage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          "FALLEN PHRASE",
          pageNumber,
          sectionNumber,
          config.accentColor
        );
        pageNumber++;
        sectionNumber++;
        fallenPhraseSectionAdded = true;
      }

      pdf.addPage();
      const content = [
        `Phrase: ${fp.phrase}`,
        `Words: ${fp.wordList.join(", ")}`,
      ];
      drawTextGamePage(
        pdf,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        fp.title || "FALLEN PHRASE",
        content,
        pageNumber,
        config.accentColor
      );
      pageNumber++;
    }

    // Word Search Answer Pages (at the end, after all games)
    if (wordSearchGrids.length > 0) {
      const gridsPerPage = 4; // 2x2 layout
      const totalAnswerPages = Math.ceil(wordSearchGrids.length / gridsPerPage);

      for (let answerPage = 0; answerPage < totalAnswerPages; answerPage++) {
        pdf.addPage();
        const startGridIndex = answerPage * gridsPerPage;
        const endGridIndex = Math.min(
          startGridIndex + gridsPerPage,
          wordSearchGrids.length
        );

        const gridsForPage = wordSearchGrids.slice(
          startGridIndex,
          endGridIndex
        );
        const titlesForPage = wordSearchTitles.slice(
          startGridIndex,
          endGridIndex
        );
        const pageNumbersForPage = wordSearchPageNumbers.slice(
          startGridIndex,
          endGridIndex
        );

        drawWordSearchAnswerPage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          gridsForPage,
          titlesForPage,
          pageNumbersForPage,
          pageNumber,
          answerPage === 0, // isFirstPage
          config.accentColor
        );
        pageNumber++;
      }
    }

    // Crossword Answer Pages (after word search answer pages, 4 grids per page)
    if (crosswordGrids.length > 0) {
      const gridsPerPage = 4; // 2x2 layout
      const totalAnswerPages = Math.ceil(crosswordGrids.length / gridsPerPage);

      for (let answerPage = 0; answerPage < totalAnswerPages; answerPage++) {
        pdf.addPage();
        const startGridIndex = answerPage * gridsPerPage;
        const endGridIndex = Math.min(
          startGridIndex + gridsPerPage,
          crosswordGrids.length
        );

        const gridsForPage = crosswordGrids
          .slice(startGridIndex, endGridIndex)
          .map((gridData, idx) => ({
            ...gridData,
            crossword:
              config.crosswords[crosswordIndices[startGridIndex + idx]],
            puzzlePageNumber: crosswordPageNumbers[startGridIndex + idx],
            index: crosswordIndices[startGridIndex + idx], // Use actual crossword index
          }));

        drawCrosswordAnswerPage(
          pdf,
          PAGE_WIDTH,
          PAGE_HEIGHT,
          gridsForPage,
          pageNumber,
          answerPage === 0, // isFirstPage
          config.accentColor
        );
        pageNumber++;
      }
    }

    // Convert PDF to buffer
    const pdfBuffer = pdf.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="game-book-${Date.now()}.pdf"`,
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
