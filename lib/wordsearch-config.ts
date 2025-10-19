export interface WordSearchConfig {
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

