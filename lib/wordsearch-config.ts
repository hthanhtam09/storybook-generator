export interface TopicVocabulary {
  topic: string;
  words: string[];
}

export interface WordSearchConfig {
  words: string[]; // Legacy support - will be populated from topics
  topics: TopicVocabulary[]; // New: vocabulary organized by topic
  gridSize: number;
  difficulty: "easy" | "medium" | "hard";
  language: string;
  theme: string;
  template?: string;
  showWordList: boolean;
  allowDiagonal: boolean;
  allowBackward: boolean;
  pageCount: number;
  wordsPerPage: number;
  distributeWords: boolean;
  showAnswersInGrid: boolean;
  accentColor?: string; // Color for border and title (hex format)
  images?: string[]; // Array of base64 image strings (max 3 images)
  coverImage?: string; // Base64 cover image for cover page
  introduction?: string; // Introduction text for introduction page
  introductionTitle?: string; // Title to be included at the beginning of introduction
}
