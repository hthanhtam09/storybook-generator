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
    const wordsPerPage = Math.ceil(words.length / totalPages);
    const resultPages: WordFillInPage[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const startIndex = (pageNum - 1) * wordsPerPage;
      const endIndex = Math.min(startIndex + wordsPerPage, words.length);
      const pageWords = words.slice(startIndex, endIndex);

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

    // Sort words by length (longest first) for better placement
    const sortedWords = [...words].sort((a, b) => b.length - a.length);

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

    // Fill remaining empty cells with random black squares
    this.fillEmptyCells(grid, gridSize);

    return {
      id: `puzzle-${pageNumber}-${Date.now()}`,
      pageNumber,
      grid,
      words: placedWords,
      wordList: Array.from(usedWords),
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

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Try horizontal placement
        if (col + word.length <= gridSize) {
          const score = this.calculatePlacementScore(
            word,
            row,
            col,
            "horizontal",
            grid,
            placedWords
          );
          if (score > 0) {
            positions.push({ row, col, direction: "horizontal", score });
          }
        }

        // Try vertical placement
        if (row + word.length <= gridSize) {
          const score = this.calculatePlacementScore(
            word,
            row,
            col,
            "vertical",
            grid,
            placedWords
          );
          if (score > 0) {
            positions.push({ row, col, direction: "vertical", score });
          }
        }
      }
    }

    if (positions.length === 0) return null;

    // Sort by score (higher is better) and return the best position
    positions.sort((a, b) => b.score - a.score);
    return positions[0];
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

    for (let i = 0; i < word.length; i++) {
      const currentRow = direction === "horizontal" ? row : row + i;
      const currentCol = direction === "horizontal" ? col + i : col;

      const cell = grid[currentRow][currentCol];

      if (cell.letter === null) {
        score += 1; // Empty cell
      } else if (cell.letter.toLowerCase() === word[i].toLowerCase()) {
        score += 10; // Intersection with matching letter
        intersections++;
      } else {
        return -1; // Conflict with existing letter
      }
    }

    // Bonus for intersections
    score += intersections * 5;

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

  private static fillEmptyCells(
    grid: WordFillInCell[][],
    gridSize: number
  ): void {
    // Make all empty cells black by default
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col].letter === null) {
          grid[row][col].isBlack = true;
        }
      }
    }

    // Ensure no isolated white cells (cells surrounded by black cells)
    this.ensureConnectivity(grid, gridSize);
  }

  private static ensureConnectivity(
    grid: WordFillInCell[][],
    gridSize: number
  ): void {
    const visited = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(false));
    const whiteCells: { row: number; col: number }[] = [];

    // Find all white cells
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (!grid[row][col].isBlack && grid[row][col].letter !== null) {
          whiteCells.push({ row, col });
        }
      }
    }

    if (whiteCells.length === 0) return;

    // DFS to find connected components
    const components: Array<{ row: number; col: number }[]> = [];

    for (const cell of whiteCells) {
      if (!visited[cell.row][cell.col]) {
        const component: { row: number; col: number }[] = [];
        this.dfs(cell.row, cell.col, grid, visited, component, gridSize);
        components.push(component);
      }
    }

    // If there are multiple components, connect them by removing some black cells
    if (components.length > 1) {
      this.connectComponents(components, grid, gridSize);
    }
  }

  private static dfs(
    row: number,
    col: number,
    grid: WordFillInCell[][],
    visited: boolean[][],
    component: { row: number; col: number }[],
    gridSize: number
  ): void {
    if (
      row < 0 ||
      row >= gridSize ||
      col < 0 ||
      col >= gridSize ||
      visited[row][col]
    ) {
      return;
    }

    if (grid[row][col].isBlack || grid[row][col].letter === null) {
      return;
    }

    visited[row][col] = true;
    component.push({ row, col });

    // Check all 4 directions
    this.dfs(row - 1, col, grid, visited, component, gridSize);
    this.dfs(row + 1, col, grid, visited, component, gridSize);
    this.dfs(row, col - 1, grid, visited, component, gridSize);
    this.dfs(row, col + 1, grid, visited, component, gridSize);
  }

  private static connectComponents(
    components: Array<{ row: number; col: number }[]>,
    grid: WordFillInCell[][],
    gridSize: number
  ): void {
    // Simple approach: find the closest pair of components and connect them
    for (let i = 0; i < components.length - 1; i++) {
      const component1 = components[i];
      const component2 = components[i + 1];

      let minDistance = Infinity;
      let bestPath: { row: number; col: number }[] = [];

      // Find shortest path between components
      for (const cell1 of component1) {
        for (const cell2 of component2) {
          const path = this.findPath(cell1, cell2, grid, gridSize);
          if (path && path.length < minDistance) {
            minDistance = path.length;
            bestPath = path;
          }
        }
      }

      // Create a minimal path by adding strategic black cells
      // This ensures connectivity without creating empty white cells
      for (let i = 1; i < bestPath.length - 1; i++) {
        const cell = bestPath[i];
        if (grid[cell.row][cell.col].letter === null) {
          // Keep as black cell for connectivity
          grid[cell.row][cell.col].isBlack = true;
        }
      }
    }
  }

  private static findPath(
    start: { row: number; col: number },
    end: { row: number; col: number },
    grid: WordFillInCell[][],
    gridSize: number
  ): { row: number; col: number }[] | null {
    // Simple BFS to find path
    const queue: Array<{
      row: number;
      col: number;
      path: { row: number; col: number }[];
    }> = [{ ...start, path: [start] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.row},${current.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.row === end.row && current.col === end.col) {
        return current.path;
      }

      // Check all 4 directions
      const directions = [
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 },
      ];

      for (const dir of directions) {
        if (
          dir.row >= 0 &&
          dir.row < gridSize &&
          dir.col >= 0 &&
          dir.col < gridSize
        ) {
          const dirKey = `${dir.row},${dir.col}`;
          if (!visited.has(dirKey)) {
            queue.push({
              ...dir,
              path: [...current.path, dir],
            });
          }
        }
      }
    }

    return null;
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
