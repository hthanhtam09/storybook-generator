export interface WordPosition {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: string;
}

export interface WordSearchGrid {
  grid: string[][];
  words: WordPosition[];
  size: number;
}

export class WordSearchGenerator {
  private directions = {
    horizontal: { row: 0, col: 1 },
    vertical: { row: 1, col: 0 },
    diagonalDown: { row: 1, col: 1 },
    diagonalUp: { row: -1, col: 1 },
  };

  constructor(
    private allowDiagonal: boolean = true,
    private allowBackward: boolean = false
  ) {}

  generate(words: string[], gridSize: number): WordSearchGrid {
    // Initialize empty grid
    const grid: string[][] = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(""));

    const placedWords: WordPosition[] = [];
    const wordsToPlace = [...words].sort((a, b) => b.length - a.length); // Place longer words first

    for (const word of wordsToPlace) {
      const placed = this.placeWord(grid, word, gridSize);
      if (placed) {
        placedWords.push(placed);
      }
    }

    // Fill empty cells with random letters
    this.fillEmptyCells(grid);

    return {
      grid,
      words: placedWords,
      size: gridSize,
    };
  }

  private placeWord(
    grid: string[][],
    word: string,
    gridSize: number
  ): WordPosition | null {
    const maxAttempts = 100;
    const directions = this.getAvailableDirections();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const direction =
        directions[Math.floor(Math.random() * directions.length)];
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);

      if (
        this.canPlaceWord(grid, word, startRow, startCol, direction, gridSize)
      ) {
        return this.placeWordAt(grid, word, startRow, startCol, direction);
      }
    }

    return null;
  }

  private getAvailableDirections(): Array<{
    name: string;
    row: number;
    col: number;
  }> {
    const available = [
      { name: "horizontal", ...this.directions.horizontal },
      { name: "vertical", ...this.directions.vertical },
    ];

    if (this.allowDiagonal) {
      available.push(
        { name: "diagonalDown", ...this.directions.diagonalDown },
        { name: "diagonalUp", ...this.directions.diagonalUp }
      );
    }

    if (this.allowBackward) {
      const backwardDirections = available.map((dir) => ({
        name: dir.name + "_backward",
        row: -dir.row,
        col: -dir.col,
      }));
      available.push(...backwardDirections);
    }

    return available;
  }

  private canPlaceWord(
    grid: string[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: { row: number; col: number },
    gridSize: number
  ): boolean {
    const endRow = startRow + direction.row * (word.length - 1);
    const endCol = startCol + direction.col * (word.length - 1);

    // Check if word fits within grid bounds
    if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) {
      return false;
    }

    // Check if cells are empty or contain the same letter
    for (let i = 0; i < word.length; i++) {
      const row = startRow + direction.row * i;
      const col = startCol + direction.col * i;
      const cellLetter = grid[row][col];

      if (cellLetter !== "" && cellLetter !== word[i]) {
        return false;
      }
    }

    return true;
  }

  private placeWordAt(
    grid: string[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: { name: string; row: number; col: number }
  ): WordPosition {
    for (let i = 0; i < word.length; i++) {
      const row = startRow + direction.row * i;
      const col = startCol + direction.col * i;
      grid[row][col] = word[i];
    }

    const endRow = startRow + direction.row * (word.length - 1);
    const endCol = startCol + direction.col * (word.length - 1);

    return {
      word,
      startRow,
      startCol,
      endRow,
      endCol,
      direction: direction.name,
    };
  }

  private fillEmptyCells(grid: string[][]): void {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === "") {
          grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  }

  static generateMultiple(
    words: string[],
    gridSize: number,
    pageCount: number,
    allowDiagonal: boolean = true,
    allowBackward: boolean = false,
    wordsPerPage?: number,
    distributeWords?: boolean
  ): WordSearchGrid[] {
    const grids: WordSearchGrid[] = [];

    if (distributeWords && wordsPerPage) {
      // Distribute unique words across pages
      const wordsPerGrid = Math.min(wordsPerPage, words.length);
      const totalUniqueWordsAvailable = words.length;
      const maxPagesWithUniqueWords = Math.ceil(
        totalUniqueWordsAvailable / wordsPerPage
      );

      // Only create as many pages as we can with unique words
      const actualPageCount = Math.min(pageCount, maxPagesWithUniqueWords);

      // Create grids with unique distributed words
      for (let page = 0; page < actualPageCount; page++) {
        const startIndex = page * wordsPerGrid;
        const endIndex = Math.min(
          startIndex + wordsPerGrid,
          totalUniqueWordsAvailable
        );
        const wordsForThisPage = words.slice(startIndex, endIndex);

        const generator = new WordSearchGenerator(allowDiagonal, allowBackward);
        const grid = generator.generate(wordsForThisPage, gridSize);
        grids.push(grid);
      }
    } else {
      // Repeat all words on every page
      for (let i = 0; i < pageCount; i++) {
        const generator = new WordSearchGenerator(allowDiagonal, allowBackward);
        const grid = generator.generate(words, gridSize);
        grids.push(grid);
      }
    }

    return grids;
  }
}
