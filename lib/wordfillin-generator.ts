import type {
  WordFillInConfig,
  WordFillInPuzzle,
  WordFillInCell,
  WordFillInWord,
  WordFillInPage,
} from "./types";

export class WordFillInGenerator {
  private static readonly DIRECTIONS = [
    { row: 0, col: 1 }, // horizontal
    { row: 1, col: 0 }, // vertical
  ];

  static generatePuzzles(config: WordFillInConfig): WordFillInPage[] {
    const { words, pages: totalPages, gridSize } = config;
    
    // Filter out words with length < 2
    const validWords = words.filter(w => w.length >= 2);
    
    const wordsPerPage = Math.ceil(validWords.length / totalPages);
    const resultPages: WordFillInPage[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const startIndex = (pageNum - 1) * wordsPerPage;
      const endIndex = Math.min(startIndex + wordsPerPage, validWords.length);
      const pageWords = validWords.slice(startIndex, endIndex);

      if (pageWords.length > 0) {
        const puzzle = this.generatePuzzle(pageWords, pageNum, gridSize);
        resultPages.push({
          pageNumber: pageNum,
          puzzle,
        });
      }
    }

    return resultPages;
  }

  private static generatePuzzle(
    words: string[],
    pageNumber: number,
    gridSize: number = 15
  ): WordFillInPuzzle {
    let bestResult: {
      grid: WordFillInCell[][];
      placedWords: WordFillInWord[];
      usedWords: Set<string>;
      droppedWords: string[];
      spreadScore: number;
    } | null = null;

    // Try multiple attempts to find the best layout
    const ATTEMPTS = 50;

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const grid = this.createEmptyGrid(gridSize);
      const placedWords: WordFillInWord[] = [];
      const usedWords = new Set<string>();

      // Shuffle words first, then sort by length descending
      // This ensures words of the same length are in random order
      const sortedWords = [...words].filter((w) => w.length >= 2);
      for (let i = sortedWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedWords[i], sortedWords[j]] = [sortedWords[j], sortedWords[i]];
      }
      sortedWords.sort((a, b) => b.length - a.length);

      // Try to place words
      this.backtrackPlace(sortedWords, grid, placedWords, usedWords, gridSize);

      const droppedWords = sortedWords.filter(
        (w) => !usedWords.has(w.toLowerCase())
      );

      // Calculate Spread Score (Bounding Box Area)
      let minR = gridSize, maxR = -1, minC = gridSize, maxC = -1;
      if (placedWords.length > 0) {
        for (const pw of placedWords) {
            const endRow = pw.direction === "vertical" ? pw.startRow + pw.word.length - 1 : pw.startRow;
            const endCol = pw.direction === "horizontal" ? pw.startCol + pw.word.length - 1 : pw.startCol;
            
            minR = Math.min(minR, pw.startRow);
            maxR = Math.max(maxR, endRow);
            minC = Math.min(minC, pw.startCol);
            maxC = Math.max(maxC, endCol);
        }
      }
      const spreadScore = (maxR - minR + 1) * (maxC - minC + 1);

      // Score this attempt
      // Priority 1: Most words placed (Fewest dropped)
      // Priority 2: Largest Spread (Least clumping)
      if (
        !bestResult ||
        droppedWords.length < bestResult.droppedWords.length ||
        (droppedWords.length === bestResult.droppedWords.length &&
          spreadScore > bestResult.spreadScore)
      ) {
        bestResult = {
          grid,
          placedWords,
          usedWords,
          droppedWords,
          spreadScore,
        };
      }

      // If perfect result (no drops and good spread), we could stop, 
      // but let's use all attempts to find the best spread.
    }

    if (!bestResult) {
        throw new Error("Failed to generate puzzle");
    }

    // Finalize grid: Mark all empty cells as black
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (bestResult.grid[r][c].letter === null) {
          bestResult.grid[r][c].isBlack = true;
        }
      }
    }

    return {
      id: `puzzle-${pageNumber}-${Date.now()}`,
      pageNumber,
      grid: bestResult.grid,
      words: bestResult.placedWords,
      wordList: Array.from(bestResult.usedWords).sort(),
      droppedWords: bestResult.droppedWords,
      config: {
        words: Array.from(bestResult.usedWords),
        pages: 1,
        gridSize,
        showAnswers: false,
      },
    };
  }

  private static createEmptyGrid(size: number): WordFillInCell[][] {
    return Array(size)
      .fill(null)
      .map(() =>
        Array(size)
          .fill(null)
          .map(() => ({
            letter: null,
            isBlack: false,
            isRevealed: false,
          }))
      );
  }

  private static backtrackPlace(
    wordsToPlace: string[],
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[],
    usedWords: Set<string>,
    gridSize: number
  ): boolean {
    if (wordsToPlace.length === 0) {
      return true;
    }

    const currentWord = wordsToPlace[0];
    const remainingWords = wordsToPlace.slice(1);

    // If word is already used (duplicate input), skip it
    if (usedWords.has(currentWord.toLowerCase())) {
      return this.backtrackPlace(remainingWords, grid, placedWords, usedWords, gridSize);
    }

    // Find all possible placements for the current word
    const candidates = this.findAllPlacements(currentWord, grid, placedWords, gridSize);

    // Randomize the top candidates to avoid deterministic clumping
    // We take the top 10 best scoring positions and shuffle them
    const topCandidates = candidates.slice(0, 10);
    for (let i = topCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]];
    }

    for (const placement of topCandidates) {
      // Apply placement
      const cellsBackup = this.applyPlacement(currentWord, placement, grid, placedWords);
      usedWords.add(currentWord.toLowerCase());

      // Recurse
      if (this.backtrackPlace(remainingWords, grid, placedWords, usedWords, gridSize)) {
        return true;
      }

      // Backtrack: Undo placement
      this.undoPlacement(grid, placedWords, cellsBackup);
      usedWords.delete(currentWord.toLowerCase());
    }

    // If we can't place the current word, skip it and try placing the rest
    return this.backtrackPlace(remainingWords, grid, placedWords, usedWords, gridSize);
  }

  private static findAllPlacements(
    word: string,
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[],
    gridSize: number
  ): Array<{ row: number; col: number; direction: "horizontal" | "vertical"; score: number }> {
    const candidates: Array<{
      row: number;
      col: number;
      direction: "horizontal" | "vertical";
      score: number;
    }> = [];

    // Check all positions
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        for (const direction of ["horizontal", "vertical"] as const) {
          if (direction === "horizontal" && col + word.length > gridSize) continue;
          if (direction === "vertical" && row + word.length > gridSize) continue;

          const score = this.calculatePlacementScore(
            word,
            row,
            col,
            direction,
            grid,
            placedWords
          );

          if (score > 0) {
            candidates.push({ row, col, direction, score });
          }
        }
      }
    }

    // Sort by score desc
    return candidates.sort((a, b) => b.score - a.score);
  }

  private static applyPlacement(
    word: string,
    placement: { row: number; col: number; direction: "horizontal" | "vertical" },
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[]
  ): Array<{ row: number; col: number; oldCell: WordFillInCell }> {
    const { row, col, direction } = placement;
    const backup: Array<{ row: number; col: number; oldCell: WordFillInCell }> = [];
    const cells: { row: number; col: number }[] = [];

    for (let i = 0; i < word.length; i++) {
      const r = direction === "horizontal" ? row : row + i;
      const c = direction === "horizontal" ? col + i : col;

      // Save state for backtracking
      backup.push({ 
        row: r, 
        col: c, 
        oldCell: { ...grid[r][c] } 
      });

      grid[r][c] = {
        letter: word[i].toUpperCase(),
        isBlack: false,
        isRevealed: false,
        wordId: `word-${placedWords.length}`,
        position: i,
      };

      cells.push({ row: r, col: c });
    }

    placedWords.push({
      id: `word-${placedWords.length}`,
      word: word.toUpperCase(),
      startRow: row,
      startCol: col,
      direction,
      cells,
    });

    return backup;
  }

  private static undoPlacement(
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[],
    backup: Array<{ row: number; col: number; oldCell: WordFillInCell }>
  ) {
    // Remove word from list
    placedWords.pop();

    // Restore grid cells
    for (const { row, col, oldCell } of backup) {
      grid[row][col] = oldCell;
    }
  }

  private static calculatePlacementScore(
    word: string,
    row: number,
    col: number,
    direction: "horizontal" | "vertical",
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[]
  ): number {
    let score = 0;
    let intersections = 0;

    // If this is the first word, any valid position is okay, but prefer center
    if (placedWords.length === 0) {
       const center = grid.length / 2;
       const dist = Math.abs(row - center) + Math.abs(col - center);
       return 100 - dist; 
    }

    // Check boundary before word
    const beforeRow = direction === "horizontal" ? row : row - 1;
    const beforeCol = direction === "horizontal" ? col - 1 : col;
    if (
      beforeRow >= 0 &&
      beforeRow < grid.length &&
      beforeCol >= 0 &&
      beforeCol < grid[0].length &&
      grid[beforeRow][beforeCol].letter !== null
    ) {
      return -1;
    }

    // Check boundary after word
    const afterRow = direction === "horizontal" ? row : row + word.length;
    const afterCol = direction === "horizontal" ? col + word.length : col;
    if (
      afterRow >= 0 &&
      afterRow < grid.length &&
      afterCol >= 0 &&
      afterCol < grid[0].length &&
      grid[afterRow][afterCol].letter !== null
    ) {
      return -1;
    }

    for (let i = 0; i < word.length; i++) {
      const currentRow = direction === "horizontal" ? row : row + i;
      const currentCol = direction === "horizontal" ? col + i : col;

      const cell = grid[currentRow][currentCol];

      if (cell.letter === null) {
        score += 1; // Empty cell

        // Check perpendicular neighbors (Side-Touching Rule)
        if (direction === "horizontal") {
            if (currentRow > 0 && grid[currentRow - 1][currentCol].letter !== null) return -1;
            if (currentRow < grid.length - 1 && grid[currentRow + 1][currentCol].letter !== null) return -1;
        } else {
            if (currentCol > 0 && grid[currentRow][currentCol - 1].letter !== null) return -1;
            if (currentCol < grid[0].length - 1 && grid[currentRow][currentCol + 1].letter !== null) return -1;
        }

      } else if (cell.letter.toLowerCase() === word[i].toLowerCase()) {
        score += 10; // Intersection with matching letter
        intersections++;
      } else {
        return -1; // Conflict with existing letter
      }
    }

    // Require at least one intersection for subsequent words
    if (placedWords.length > 0 && intersections === 0) {
        return -1; 
    }

    // Bonus for intersections
    score += intersections * 5; // Increased weight for intersections

    // Small random factor to break ties and encourage variety
    score += Math.random() * 2;

    return score;
  }

  static revealAnswers(puzzle: WordFillInPuzzle): WordFillInPuzzle {
    const newGrid = puzzle.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        isRevealed: true,
      }))
    );

    return {
      ...puzzle,
      grid: newGrid,
    };
  }

  static hideAnswers(puzzle: WordFillInPuzzle): WordFillInPuzzle {
    const newGrid = puzzle.grid.map((row) =>
      row.map((cell) => ({
        ...cell,
        isRevealed: false,
      }))
    );

    return {
      ...puzzle,
      grid: newGrid,
    };
  }
}
