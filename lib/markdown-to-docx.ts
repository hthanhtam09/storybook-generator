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
 * Converts markdown/tagged text to DOCX paragraphs with proper formatting
 * Handles [P], [LIST_NUM], [LIST_BULLET], [ITEM] tags and traditional markdown
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

  // Check if text contains tags - use new parser
  if (
    markdownText.includes("[P]") ||
    markdownText.includes("[LIST_NUM]") ||
    markdownText.includes("[LIST_BULLET]")
  ) {
    return convertTaggedToDocx(markdownText, options);
  }

  // Otherwise use traditional markdown parser

  // First split by double line breaks to separate paragraphs/blocks
  const blocks = markdownText.split(/\n\n+/).filter((block) => block.trim());

  blocks.forEach((block, blockIndex) => {
    // Then split each block by single line breaks
    const lines = block.split("\n").filter((line) => line.trim());

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        return;
      }

      // Handle section headers (lines that start with ** and end with **)
      if (
        trimmedLine.startsWith("**") &&
        trimmedLine.endsWith("**") &&
        trimmedLine.length > 4
      ) {
        const headerText = trimmedLine.slice(2, -2);
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
        return;
      }

      // Handle numbered lists (1., 2., 3., etc.)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
      if (numberedMatch) {
        const numberText = numberedMatch[1] + ". ";
        const contentText = numberedMatch[2];
        const contentRuns = parseInlineFormatting(
          contentText,
          defaultBodySizeHalfPoints,
          defaultFontFamily
        );

        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: numberText,
                size: defaultBodySizeHalfPoints,
                font: defaultFontFamily,
                bold: true,
              }),
              ...contentRuns,
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              before: lineIndex === 0 ? SPACING.DEFAULT : 0,
              after: SPACING.DEFAULT,
            },
            indent: { left: 360 }, // 0.25 inch indent
          })
        );
        return;
      }

      // Handle bullet points (lines that start with ·, -, or *)
      if (
        trimmedLine.startsWith("·") ||
        trimmedLine.startsWith("-") ||
        trimmedLine.startsWith("•") ||
        trimmedLine.startsWith("*")
      ) {
        const bulletText = trimmedLine.slice(1).trim();
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
              before: lineIndex === 0 ? SPACING.DEFAULT : 0,
              after: SPACING.DEFAULT,
            },
            indent: { left: 360 }, // 0.25 inch indent
          })
        );
        return;
      }

      // Handle regular paragraphs with inline formatting
      const textRuns = parseInlineFormatting(
        trimmedLine,
        defaultBodySizeHalfPoints,
        defaultFontFamily
      );

      if (textRuns.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              after: SPACING.LARGE,
              line: LINE_HEIGHT.ONE_HALF,
              lineRule: LineRuleType.AUTO,
            },
          })
        );
      }
    });

    // Add extra space after each block (except the last one)
    if (blockIndex < blocks.length - 1 && lines.length > 1) {
      paragraphs.push(
        new Paragraph({
          text: "",
          spacing: { after: SPACING.SMALL },
        })
      );
    }
  });

  return paragraphs;
}

/**
 * Converts tagged text to DOCX paragraphs in sequential order
 * Handles [P], [LIST_NUM], [LIST_BULLET], and [ITEM] tags
 */
function convertTaggedToDocx(
  text: string,
  options: MarkdownToDocxOptions
): Paragraph[] {
  const {
    defaultBodySizeHalfPoints,
    defaultFontFamily,
    defaultParagraphAfterTwips,
  } = options;

  const paragraphs: Paragraph[] = [];
  text = text.trim();

  // Parse tags in sequential order as they appear
  const tagRegex =
    /\[P\]([\s\S]*?)\[\/P\]|\[LIST_NUM\]([\s\S]*?)\[\/LIST_NUM\]|\[LIST_BULLET\]([\s\S]*?)\[\/LIST_BULLET\]/g;
  let match;
  let hasMatches = false;

  while ((match = tagRegex.exec(text)) !== null) {
    hasMatches = true;
    if (match[1]) {
      // This is a [P] paragraph
      const content = match[1].trim();
      if (content) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: content,
                size: defaultBodySizeHalfPoints,
                font: defaultFontFamily,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              after: SPACING.LARGE,
              line: LINE_HEIGHT.ONE_HALF,
              lineRule: LineRuleType.AUTO,
            },
          })
        );
      }
    } else if (match[2]) {
      // This is a [LIST_NUM]
      const listContent = match[2].trim();
      const items = listContent.match(/\[ITEM\]([\s\S]*?)\[\/ITEM\]/g);

      if (items) {
        items.forEach((item, index) => {
          const itemContent = item.replace(/\[ITEM\]|\[\/ITEM\]/g, "").trim();
          if (itemContent) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${index + 1}. `,
                    size: defaultBodySizeHalfPoints,
                    font: defaultFontFamily,
                    bold: true,
                  }),
                  new TextRun({
                    text: itemContent,
                    size: defaultBodySizeHalfPoints,
                    font: defaultFontFamily,
                  }),
                ],
                alignment: AlignmentType.LEFT,
                indent: { left: 360 },
                spacing: {
                  before: index === 0 ? SPACING.DEFAULT : 0,
                  after: SPACING.DEFAULT,
                },
              })
            );
          }
        });

        // Add space after list
        paragraphs.push(
          new Paragraph({
            text: "",
            spacing: { after: SPACING.SMALL },
          })
        );
      }
    } else if (match[3]) {
      // This is a [LIST_BULLET]
      const listContent = match[3].trim();
      const items = listContent.match(/\[ITEM\]([\s\S]*?)\[\/ITEM\]/g);

      if (items) {
        items.forEach((item, index) => {
          const itemContent = item.replace(/\[ITEM\]|\[\/ITEM\]/g, "").trim();
          if (itemContent) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: "• ",
                    size: defaultBodySizeHalfPoints,
                    font: defaultFontFamily,
                    bold: true,
                  }),
                  new TextRun({
                    text: itemContent,
                    size: defaultBodySizeHalfPoints,
                    font: defaultFontFamily,
                  }),
                ],
                alignment: AlignmentType.LEFT,
                indent: { left: 360 },
                spacing: {
                  before: index === 0 ? SPACING.DEFAULT : 0,
                  after: SPACING.DEFAULT,
                },
              })
            );
          }
        });

        // Add space after list
        paragraphs.push(
          new Paragraph({
            text: "",
            spacing: { after: SPACING.SMALL },
          })
        );
      }
    }
  }

  // If no matches found but contains tags, strip tags and parse as plain text
  if (!hasMatches && (text.includes("[") || text.includes("]"))) {
    const cleanText = text
      .replace(/\[P\]|\[\/P\]/g, "\n\n")
      .replace(/\[LIST_NUM\]|\[\/LIST_NUM\]/g, "\n")
      .replace(/\[LIST_BULLET\]|\[\/LIST_BULLET\]/g, "\n")
      .replace(/\[ITEM\]/g, "")
      .replace(/\[\/ITEM\]/g, "\n")
      .trim();

    // Split by double line breaks and create paragraphs
    const blocks = cleanText.split(/\n\n+/).filter((block) => block.trim());
    blocks.forEach((block) => {
      const lines = block.split(/\n/).filter((line) => line.trim());
      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmedLine,
                  size: defaultBodySizeHalfPoints,
                  font: defaultFontFamily,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: SPACING.DEFAULT,
                line: LINE_HEIGHT.ONE_HALF,
                lineRule: LineRuleType.AUTO,
              },
            })
          );
        }
      });
    });
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
