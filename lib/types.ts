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
  fullPageImage?: File;
}

export interface TemplateFile {
  file: File;
  name: string;
  uploadedAt: Date;
}

export interface TemplateParsedStylesSummary {
  defaultFontFamily?: string;
  defaultFontSizePt?: number;
  defaultParagraphBeforePt?: number;
  defaultParagraphAfterPt?: number;
}
