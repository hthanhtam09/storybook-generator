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
        const puzzle = this.generatePuzzle(pageWords, gridSize, pageNum);
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
    gridSize: number,
    pageNumber: number
  ): WordFillInPuzzle {
    const grid: WordFillInCell[][] = this.createEmptyGrid(gridSize);
    const placedWords: WordFillInWord[] = [];
    const usedWords = new Set<string>();

    // Sort words by length (longest first) to make placement easier
    // And ensure no short words slip through
    const sortedWords = [...words]
      .filter(w => w.length >= 2)
      .sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
      if (usedWords.has(word.toLowerCase())) continue;

      const placement = this.findBestPlacement(
        word,
        grid,
        placedWords,
        gridSize
      );
      if (placement) {
        this.placeWord(word, placement, grid, placedWords);
        usedWords.add(word.toLowerCase());
      }
    }

    // Finalize grid: Mark all empty cells as black
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (grid[r][c].letter === null) {
          grid[r][c].isBlack = true;
        }
      }
    }

    return {
      id: `puzzle-${pageNumber}-${Date.now()}`,
      pageNumber,
      grid,
      words: placedWords,
      wordList: Array.from(usedWords).sort(),
      config: {
        words: Array.from(usedWords),
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

  private static findBestPlacement(
    word: string,
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[],
    gridSize: number
  ): { row: number; col: number; direction: "horizontal" | "vertical" } | null {
    const positions: Array<{
      row: number;
      col: number;
      direction: "horizontal" | "vertical";
      score: number;
    }> = [];

    // Create randomized order of positions to scan
    const rowIndices = Array.from({ length: gridSize }, (_, i) => i).sort(
      () => Math.random() - 0.5
    );
    const colIndices = Array.from({ length: gridSize }, (_, i) => i).sort(
      () => Math.random() - 0.5
    );

    for (const row of rowIndices) {
      for (const col of colIndices) {
        // Randomize direction order
        const directions: Array<"horizontal" | "vertical"> =
          Math.random() > 0.5 ? ["horizontal", "vertical"] : ["vertical", "horizontal"];

        for (const direction of directions) {
          if (direction === "horizontal" && col + word.length <= gridSize) {
            const score = this.calculatePlacementScore(
              word,
              row,
              col,
              "horizontal",
              grid,
              placedWords
            );
            if (score > 0) {
              // Add random jitter to score for more variety
              const jitteredScore = score + (Math.random() - 0.5) * 2;
              positions.push({ row, col, direction: "horizontal", score: jitteredScore });
            }
          }

          if (direction === "vertical" && row + word.length <= gridSize) {
            const score = this.calculatePlacementScore(
              word,
              row,
              col,
              "vertical",
              grid,
              placedWords
            );
            if (score > 0) {
              // Add random jitter to score for more variety
              const jitteredScore = score + (Math.random() - 0.5) * 2;
              positions.push({ row, col, direction: "vertical", score: jitteredScore });
            }
          }
        }
      }
    }

    if (positions.length === 0) return null;

    // Sort by score (higher is better)
    positions.sort((a, b) => b.score - a.score);

    // Use weighted random selection from top candidates
    // Take top 30% of positions and randomly select from them
    const topCount = Math.max(1, Math.floor(positions.length * 0.3));
    const topCandidates = positions.slice(0, topCount);

    // Weighted random: higher score = higher probability
    const totalScore = topCandidates.reduce((sum, pos) => sum + pos.score, 0);
    if (totalScore === 0) return topCandidates[0];

    let random = Math.random() * totalScore;
    for (const candidate of topCandidates) {
      random -= candidate.score;
      if (random <= 0) {
        return {
          row: candidate.row,
          col: candidate.col,
          direction: candidate.direction,
        };
      }
    }

    // Fallback to best position
    return {
      row: topCandidates[0].row,
      col: topCandidates[0].col,
      direction: topCandidates[0].direction,
    };
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
        // We only check neighbors if we are placing a NEW letter.
        // If we are intersecting (cell.letter !== null), touching is expected/allowed.
        if (direction === "horizontal") {
            // Check Top
            if (currentRow > 0 && grid[currentRow - 1][currentCol].letter !== null) return -1;
            // Check Bottom
            if (currentRow < grid.length - 1 && grid[currentRow + 1][currentCol].letter !== null) return -1;
        } else {
            // Check Left
            if (currentCol > 0 && grid[currentRow][currentCol - 1].letter !== null) return -1;
            // Check Right
            if (currentCol < grid[0].length - 1 && grid[currentRow][currentCol + 1].letter !== null) return -1;
        }

      } else if (cell.letter.toLowerCase() === word[i].toLowerCase()) {
        score += 10; // Intersection with matching letter
        intersections++;
      } else {
        return -1; // Conflict with existing letter
      }
    }

    // Require at least one intersection for subsequent words to ensure connectivity
    if (placedWords.length > 0 && intersections === 0) {
        return -1; 
    }

    // Bonus for intersections
    score += intersections * 3;

    return score;
  }

  private static placeWord(
    word: string,
    placement: {
      row: number;
      col: number;
      direction: "horizontal" | "vertical";
    },
    grid: WordFillInCell[][],
    placedWords: WordFillInWord[]
  ): void {
    const { row, col, direction } = placement;
    const cells: { row: number; col: number }[] = [];

    for (let i = 0; i < word.length; i++) {
      const currentRow = direction === "horizontal" ? row : row + i;
      const currentCol = direction === "horizontal" ? col + i : col;

      grid[currentRow][currentCol] = {
        letter: word[i].toUpperCase(),
        isBlack: false,
        isRevealed: false,
        wordId: `word-${placedWords.length}`,
        position: i,
      };

      cells.push({ row: currentRow, col: currentCol });
    }

    placedWords.push({
      id: `word-${placedWords.length}`,
      word: word.toUpperCase(),
      startRow: row,
      startCol: col,
      direction,
      cells,
    });
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
