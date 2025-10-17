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
