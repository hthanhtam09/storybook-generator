import {
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  LineRuleType,
} from "docx";

// Spacing constants
const SPACING = {
  SMALL: 60,
  DEFAULT: 120,
  LARGE: 240,
  EXTRA_LARGE: 480,
} as const;

// Line height constants (in twips)
const LINE_HEIGHT = {
  SINGLE: 240, // 1.0 line spacing
  ONE_HALF: 360, // 1.5 line spacing
  DOUBLE: 480, // 2.0 line spacing
  TRIPLE: 720, // 3.0 line spacing
} as const;

interface MarkdownToDocxOptions {
  defaultBodySizeHalfPoints: number;
  defaultFontFamily: string;
  defaultParagraphAfterTwips: number;
  defaultHeading2Size: number;
}

/**
 * Converts markdown text to DOCX paragraphs with proper formatting
 */
export function convertMarkdownToDocx(
  markdownText: string,
  options: MarkdownToDocxOptions
): Paragraph[] {
  const {
    defaultBodySizeHalfPoints,
    defaultFontFamily,
    defaultParagraphAfterTwips,
    defaultHeading2Size,
  } = options;

  const paragraphs: Paragraph[] = [];
  const lines = markdownText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Handle section headers (lines that start with ** and end with **)
    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      const headerText = line.slice(2, -2);
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: headerText,
              size: defaultHeading2Size,
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: {
            before: SPACING.LARGE,
            after: SPACING.DEFAULT,
          },
          heading: HeadingLevel.HEADING_2,
        })
      );
      continue;
    }

    // Handle bullet points (lines that start with · or -)
    if (line.startsWith("·") || line.startsWith("-")) {
      const bulletText = line.slice(1).trim();
      const bulletTextRuns = parseBulletPointFormatting(
        bulletText,
        defaultBodySizeHalfPoints,
        defaultFontFamily
      );
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "• ",
              size: defaultBodySizeHalfPoints,
              font: defaultFontFamily,
              bold: true,
            }),
            ...bulletTextRuns,
          ],
          alignment: AlignmentType.LEFT,
          spacing: {
            after: Math.max(
              SPACING.SMALL,
              Math.round(defaultParagraphAfterTwips * 0.5)
            ),
          },
          indent: { left: 360 }, // 0.25 inch indent
        })
      );
      continue;
    }

    // Handle regular paragraphs with inline formatting
    const textRuns = parseInlineFormatting(
      line,
      defaultBodySizeHalfPoints,
      defaultFontFamily
    );

    if (textRuns.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            after: defaultParagraphAfterTwips,
            line: LINE_HEIGHT.ONE_HALF,
            lineRule: LineRuleType.AUTO,
          },
        })
      );
    }
  }

  return paragraphs;
}

/**
 * Parses bullet point formatting - makes text before colon bold, handles inline formatting
 */
function parseBulletPointFormatting(
  text: string,
  size: number,
  font: string
): TextRun[] {
  const textRuns: TextRun[] = [];

  // Check if there's a colon in the text
  const colonIndex = text.indexOf(":");
  if (colonIndex > 0) {
    // Split text at colon
    const beforeColon = text.slice(0, colonIndex).trim();
    const afterColon = text.slice(colonIndex).trim();

    // Create bold text run for the part before colon
    textRuns.push(
      new TextRun({
        text: beforeColon,
        size: size,
        font: font,
        bold: true, // Force bold for text before colon
      })
    );

    // Add the colon and everything after it with regular formatting
    if (afterColon) {
      const afterColonRuns = parseInlineFormatting(afterColon, size, font);
      textRuns.push(...afterColonRuns);
    }
  } else {
    // No colon found, use regular inline formatting
    const regularRuns = parseInlineFormatting(text, size, font);
    textRuns.push(...regularRuns);
  }

  return textRuns;
}

/**
 * Parses inline markdown formatting (bold, italic) and returns TextRun array
 */
function parseInlineFormatting(
  text: string,
  size: number,
  font: string
): TextRun[] {
  const textRuns: TextRun[] = [];
  let currentIndex = 0;

  // Regular expression to find **bold** and *italic* formatting
  const formatRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let match;

  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before the formatting
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index);
      if (beforeText) {
        textRuns.push(
          new TextRun({
            text: beforeText,
            size,
            font,
          })
        );
      }
    }

    // Handle the formatting
    if (match[1].startsWith("**") && match[1].endsWith("**")) {
      // Bold formatting
      const boldText = match[2];
      textRuns.push(
        new TextRun({
          text: boldText,
          size,
          font,
          bold: true,
        })
      );
    } else if (match[1].startsWith("*") && match[1].endsWith("*")) {
      // Italic formatting
      const italicText = match[3];
      textRuns.push(
        new TextRun({
          text: italicText,
          size,
          font,
          italics: true,
        })
      );
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text after the last formatting
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      textRuns.push(
        new TextRun({
          text: remainingText,
          size,
          font,
        })
      );
    }
  }

  // If no formatting was found, return a single TextRun
  if (textRuns.length === 0) {
    textRuns.push(
      new TextRun({
        text,
        size,
        font,
      })
    );
  }

  return textRuns;
}

/**
 * Helper function to create a section header
 */
export function createSectionHeader(
  title: string,
  options: MarkdownToDocxOptions
): Paragraph {
  const { defaultHeading2Size, defaultFontFamily } = options;

  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        size: defaultHeading2Size,
        font: defaultFontFamily,
        bold: true,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: SPACING.LARGE },
  });
}
