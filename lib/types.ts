import { ObjectId, Binary } from "mongodb";

export interface VocabularyWord {
  word: string;
  ipa: string;
  pronunciation: string;
  translation: string;
}

export interface QuestionOption {
  letter: string;
  textOriginal: string;
  textTranslated: string;
}

export interface Question {
  number: number;
  questionOriginal: string;
  questionTranslated: string;
  options: QuestionOption[];
}

export interface Story {
  number: number;
  titleOriginal: string;
  titleTranslated: string;
  vocabulary: VocabularyWord[];
  textOriginal: string;
  textTranslated: string;
  questions: Question[];
  answers: string[];
  imageUrl?: string;
  illustrationPrompt?: string;
}

export interface ValidationError {
  line?: number;
  message: string;
  severity: "error" | "warning";
}

export interface ParseResult {
  stories: Story[];
  errors: ValidationError[];
}

export interface ImageFile {
  number: number;
  file: File;
  preview: string;
  name: string;
}

export interface BookMetadata {
  title: string;
  author: string;
  publisher: string;
  copyrightYear: number;
  publicationLocation: string;
  language: string;
  introduction: string;
  howToUse: string;
  conclusion: string;
  description: string;
  fullPageImage?: File;
}

export interface BookMetadataSerializable {
  title: string;
  author: string;
  publisher: string;
  copyrightYear: number;
  publicationLocation: string;
  language: string;
  introduction: string;
  howToUse: string;
  conclusion: string;
  description: string;
  fullPageImageDataUrl?: string;
}

export interface TemplateFile {
  filePath: string;
  name: string;
}

export interface TemplateParsedStylesSummary {
  defaultFontFamily?: string;
  defaultFontSizePt?: number;
  defaultParagraphBeforePt?: number;
  defaultParagraphAfterPt?: number;
}

export interface ExportedDocument {
  _id?: ObjectId;
  filename: string;
  title: string;
  language: string;
  author: string;
  createdAt: Date;
  // When the file is small (<= ~16MB), we store inline to keep things simple
  fileData?: Binary | Buffer;
  // For files that exceed MongoDB's 16MB BSON limit, we store them in GridFS
  fileDataId?: ObjectId;
  fileStorage?: "inline" | "gridfs";
  metadata: BookMetadataSerializable;
  storiesCount: number;
}

// Word Fill-in Puzzle Types
export interface WordFillInConfig {
  words: string[];
  pages: number;
  gridSize: number;
  showAnswers: boolean;
}

export interface WordFillInCell {
  letter: string | null;
  isBlack: boolean;
  isRevealed: boolean;
  wordId?: string;
  position?: number;
}

export interface WordFillInWord {
  id: string;
  word: string;
  startRow: number;
  startCol: number;
  direction: "horizontal" | "vertical";
  cells: { row: number; col: number }[];
}

export interface WordFillInPuzzle {
  id: string;
  pageNumber: number;
  grid: WordFillInCell[][];
  words: WordFillInWord[];
  wordList: string[];
  droppedWords?: string[];
  config: WordFillInConfig;
}

export interface WordFillInPage {
  pageNumber: number;
  puzzle: WordFillInPuzzle;
}

// Game Book Types
export interface WordSearchGame {
  words: string[];
  gridSize: number;
  title?: string;
}

export interface CrosswordGame {
  clues: Array<{
    number: number;
    clue: string;
    answer: string;
    direction: "across" | "down";
    row: number;
    col: number;
  }>;
  gridSize: number;
  title?: string;
}

export interface LogicPuzzle {
  title: string;
  description: string;
  clues: string[];
  solution?: string;
}

export interface SpotTheDifference {
  title: string;
  image1?: string; // base64
  image2?: string; // base64
  differences: Array<{
    x: number;
    y: number;
    description: string;
  }>;
}

export interface SudokuGame {
  grid: number[][]; // 9x9 grid, 0 for empty
  solution: number[][];
  difficulty: "easy" | "medium" | "hard";
}

export interface AlphabetTrivia {
  questions: Array<{
    letter: string;
    question: string;
    answer: string;
  }>;
}

export interface MatchingGame {
  title: string;
  pairs: Array<{
    left: string;
    right: string;
  }>;
}

export interface WordScramble {
  scrambled: string;
  answer: string;
  hint?: string;
}

export interface Maze {
  title: string;
  grid: number[][]; // 0 = path, 1 = wall
  start: { row: number; col: number };
  end: { row: number; col: number };
}

export interface Cryptogram {
  encrypted: string;
  decrypted: string;
  hint?: string;
}

export interface NameThatCity {
  clues: string[];
  answer: string;
  image?: string; // base64
}

export interface FallenPhrase {
  title: string;
  phrase: string;
  grid: string[][]; // 2D grid with letters
  wordList: string[];
}

export interface GameBookConfig {
  // Word Searches
  wordSearches: WordSearchGame[];

  // Crosswords
  crosswords: CrosswordGame[];

  // Logic Puzzles
  logicPuzzles: LogicPuzzle[];

  // Spot the Difference
  spotTheDifferences: SpotTheDifference[];

  // Sudoku
  sudokus: SudokuGame[];

  // Alphabet Trivia
  alphabetTrivias: AlphabetTrivia[];

  // Matching Games
  matchingGames: MatchingGame[];

  // Word Scrambles
  wordScrambles: WordScramble[];

  // Mazes
  mazes: Maze[];

  // Cryptograms
  cryptograms: Cryptogram[];

  // Name That City
  nameThatCities: NameThatCity[];

  // Fallen Phrases
  fallenPhrases: FallenPhrase[];

  // Book metadata
  title?: string;
  coverImage?: string; // base64
  accentColor?: string; // hex color
}

// Conversations Types
export interface ConversationVocabulary {
  word: string;
  ipa: string;
  pronunciation: string;
  translation: string;
}

export interface ConversationEntry {
  speaker: string;
  text: string;
}

export interface ConversationQuestion {
  number: number;
  questionOriginal: string;
  questionTranslated: string;
  options: Array<{
    letter: string;
    textOriginal: string;
    textTranslated: string;
  }>;
}

export interface ConversationLesson {
  id: string;
  title: string;
  titleTranslated?: string;
  introduction: string;
  imagePrompt: string;
  vocabulary: ConversationVocabulary[];
  conversation: ConversationEntry[];
  conversationTranslated?: ConversationEntry[];
  questions: ConversationQuestion[];
  answers: string[];
  topic?: string;
}

export interface ConversationsConfig {
  lessons: ConversationLesson[];
  title?: string;
  author?: string;
  publisher?: string;
  accentColor?: string;
  conversationsPerTopic?: number;
}
