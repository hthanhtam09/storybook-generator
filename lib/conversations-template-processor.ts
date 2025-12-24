import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageBreak,
  ImageRun,
  HeadingLevel,
  convertInchesToTwip,
  LineRuleType,
  Footer,
  PageNumber,
} from "docx";
import type {
  ConversationsConfig,
  ConversationLesson,
  TemplateFile,
} from "./types";
import type { ConversationMetadata } from "@/components/conversations-metadata";
import { parseDocxStyles, resolveDefaults } from "./docx-style-reader";

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

// Helper functions
function createTextRun(options: {
  text: string;
  size?: number;
  font?: string;
  bold?: boolean;
  italics?: boolean;
}): TextRun {
  return new TextRun({
    text: options.text,
    size: options.size,
    font: options.font,
    bold: options.bold,
    italics: options.italics,
  });
}

function createParagraph(options: {
  children?: TextRun[];
  text?: string;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spacing?: {
    before?: number;
    after?: number;
    line?: number;
    lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType];
  };
  heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
  indent?: { left?: number };
}): Paragraph {
  const children =
    options.children ||
    (options.text ? [createTextRun({ text: options.text })] : []);

  return new Paragraph({
    children,
    alignment: options.alignment,
    spacing: options.spacing,
    heading: options.heading,
    indent: options.indent,
  });
}

/**
 * Helper function to parse tagged text content into formatted paragraphs
 * Handles [P], [LIST_NUM], [LIST_BULLET], and [ITEM] tags in sequential order
 */
function parseTextContent(
  text: string,
  fontSize: number,
  fontFamily: string
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Remove any leading/trailing whitespace
  text = text.trim();

  // Check if text contains tags
  if (
    !text.includes("[P]") &&
    !text.includes("[LIST_NUM]") &&
    !text.includes("[LIST_BULLET]")
  ) {
    // Fallback to old parsing for backward compatibility
    return parseTextContentFallback(text, fontSize, fontFamily);
  }

  // Parse tags in sequential order
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
          createParagraph({
            children: [
              createTextRun({
                text: content,
                size: fontSize,
                font: fontFamily,
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
              createParagraph({
                children: [
                  createTextRun({
                    text: `${index + 1}. `,
                    size: fontSize,
                    font: fontFamily,
                    bold: true,
                  }),
                  createTextRun({
                    text: itemContent,
                    size: fontSize,
                    font: fontFamily,
                  }),
                ],
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
          createParagraph({
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
              createParagraph({
                children: [
                  createTextRun({
                    text: "• ",
                    size: fontSize,
                    font: fontFamily,
                    bold: true,
                  }),
                  createTextRun({
                    text: itemContent,
                    size: fontSize,
                    font: fontFamily,
                  }),
                ],
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
          createParagraph({
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

    return parseTextContentFallback(cleanText, fontSize, fontFamily);
  }

  return paragraphs;
}

/**
 * Fallback parser for backward compatibility (old format without tags)
 */
function parseTextContentFallback(
  text: string,
  fontSize: number,
  fontFamily: string
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Split by double line breaks first (paragraph separator)
  const blocks = text.split(/\n\n+/).filter((block) => block.trim());

  blocks.forEach((block, blockIndex) => {
    const trimmedBlock = block.trim();

    // Check if block contains multiple lines (lists)
    const lines = trimmedBlock.split(/\n/).filter((line) => line.trim());

    if (lines.length > 1) {
      // Multi-line block - process each line
      lines.forEach((line, lineIndex) => {
        const trimmedLine = line.trim();
        const lineNumberMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
        const lineBulletMatch = trimmedLine.match(/^[•\-\*]\s+(.+)/);

        if (lineNumberMatch) {
          // Numbered list item
          paragraphs.push(
            createParagraph({
              children: [
                createTextRun({
                  text: lineNumberMatch[1] + ". ",
                  size: fontSize,
                  font: fontFamily,
                  bold: true,
                }),
                createTextRun({
                  text: lineNumberMatch[2],
                  size: fontSize,
                  font: fontFamily,
                }),
              ],
              indent: { left: 360 },
              spacing: {
                before: lineIndex === 0 ? SPACING.DEFAULT : 0,
                after: SPACING.DEFAULT,
              },
            })
          );
        } else if (lineBulletMatch) {
          // Bullet point item
          paragraphs.push(
            createParagraph({
              children: [
                createTextRun({
                  text: "• ",
                  size: fontSize,
                  font: fontFamily,
                  bold: true,
                }),
                createTextRun({
                  text: lineBulletMatch[1],
                  size: fontSize,
                  font: fontFamily,
                }),
              ],
              indent: { left: 360 },
              spacing: {
                before: lineIndex === 0 ? SPACING.DEFAULT : 0,
                after: SPACING.DEFAULT,
              },
            })
          );
        } else if (trimmedLine) {
          // Regular line within multi-line block
          paragraphs.push(
            createParagraph({
              children: [
                createTextRun({
                  text: trimmedLine,
                  size: fontSize,
                  font: fontFamily,
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

      // Add extra space after list block
      if (blockIndex < blocks.length - 1) {
        paragraphs.push(
          createParagraph({
            text: "",
            spacing: { after: SPACING.SMALL },
          })
        );
      }
    } else {
      // Single line block
      const lineNumberMatch = trimmedBlock.match(/^(\d+)\.\s+(.+)/);
      const lineBulletMatch = trimmedBlock.match(/^[•\-\*]\s+(.+)/);

      if (lineNumberMatch) {
        // Single numbered item
        paragraphs.push(
          createParagraph({
            children: [
              createTextRun({
                text: lineNumberMatch[1] + ". ",
                size: fontSize,
                font: fontFamily,
                bold: true,
              }),
              createTextRun({
                text: lineNumberMatch[2],
                size: fontSize,
                font: fontFamily,
              }),
            ],
            indent: { left: 360 },
            spacing: { after: SPACING.DEFAULT },
          })
        );
      } else if (lineBulletMatch) {
        // Single bullet item
        paragraphs.push(
          createParagraph({
            children: [
              createTextRun({
                text: "• ",
                size: fontSize,
                font: fontFamily,
                bold: true,
              }),
              createTextRun({
                text: lineBulletMatch[1],
                size: fontSize,
                font: fontFamily,
              }),
            ],
            indent: { left: 360 },
            spacing: { after: SPACING.DEFAULT },
          })
        );
      } else {
        // Regular paragraph
        paragraphs.push(
          createParagraph({
            children: [
              createTextRun({
                text: trimmedBlock,
                size: fontSize,
                font: fontFamily,
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
    }
  });

  return paragraphs;
}

/**
 * Helper function to check if a character is a word character (Unicode-aware)
 */
function isWordChar(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a) || // a-z
    (code >= 0x30 && code <= 0x39) || // 0-9
    code === 0x5f || // _
    code >= 0xc0 || // Extended ASCII and Unicode letters
    /[\p{L}\p{N}_]/u.test(char) // Unicode letter or number
  );
}

/**
 * Helper function to check if a position in text is a word boundary (Unicode-aware)
 */
function isWordBoundary(text: string, pos: number): boolean {
  if (pos === 0 || pos === text.length) return true;
  const prevChar = text[pos - 1];
  const nextChar = text[pos];
  return !isWordChar(prevChar) || !isWordChar(nextChar);
}

/**
 * Helper function to create text runs with vocabulary words bolded
 * Handles Unicode characters and inflected forms
 */
function createTextRunsWithBoldVocabulary(
  text: string,
  vocabularyWords: string[],
  size: number,
  font: string
): TextRun[] {
  if (vocabularyWords.length === 0) {
    return [createTextRun({ text, size, font })];
  }

  // Sort by length descending to match longer phrases first
  const sortedWords = [...vocabularyWords].sort((a, b) => b.length - a.length);

  // Create match positions: [start, end, wordIndex]
  const matches: Array<[number, number, number]> = [];

  for (let wordIndex = 0; wordIndex < sortedWords.length; wordIndex++) {
    const word = sortedWords[wordIndex];
    const wordLower = word.toLowerCase();
    const wordLength = word.length;

    // Escape special regex characters
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // First, try exact matches (case-insensitive)
    const exactRegex = new RegExp(escaped, "gi");
    let match;

    exactRegex.lastIndex = 0;

    while ((match = exactRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (isWordBoundary(text, start) && isWordBoundary(text, end)) {
        const overlaps = matches.some(
          ([existingStart, existingEnd]) =>
            start < existingEnd && end > existingStart
        );

        if (!overlaps) {
          matches.push([start, end, wordIndex]);
        }
      }
    }

    // Also try to match inflected forms
    let searchIndex = 0;
    while (searchIndex < text.length) {
      const remainingText = text.substring(searchIndex);
      const lowerRemaining = remainingText.toLowerCase();
      const wordIndexInText = lowerRemaining.indexOf(wordLower);

      if (wordIndexInText === -1) break;

      const absoluteStart = searchIndex + wordIndexInText;
      const absoluteEnd = absoluteStart + wordLength;

      if (isWordBoundary(text, absoluteStart)) {
        let extendedEnd = absoluteEnd;
        while (extendedEnd < text.length && isWordChar(text[extendedEnd])) {
          extendedEnd++;
        }

        const matchedText = text.substring(absoluteStart, extendedEnd);

        if (
          matchedText.toLowerCase().startsWith(wordLower) &&
          matchedText.length >= wordLength
        ) {
          const overlaps = matches.some(
            ([existingStart, existingEnd]) =>
              absoluteStart < existingEnd && extendedEnd > existingStart
          );

          if (!overlaps) {
            matches.push([absoluteStart, extendedEnd, wordIndex]);
          }
        }
      }

      searchIndex = absoluteStart + 1;
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a[0] - b[0]);

  // Remove overlapping matches
  const nonOverlappingMatches: Array<[number, number, number]> = [];
  for (const match of matches) {
    const [start, end] = match;
    const overlaps = nonOverlappingMatches.some(
      ([existingStart, existingEnd]) =>
        start < existingEnd && end > existingStart
    );
    if (!overlaps) {
      nonOverlappingMatches.push(match);
    }
  }

  // Build text runs
  const textRuns: TextRun[] = [];
  let lastIndex = 0;

  for (const [start, end] of nonOverlappingMatches) {
    if (start > lastIndex) {
      const beforeText = text.substring(lastIndex, start);
      if (beforeText) {
        textRuns.push(createTextRun({ text: beforeText, size, font }));
      }
    }

    const matchedText = text.substring(start, end);
    textRuns.push(
      createTextRun({
        text: matchedText,
        size,
        font,
        bold: true,
      })
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      textRuns.push(createTextRun({ text: remainingText, size, font }));
    }
  }

  return textRuns.length > 0 ? textRuns : [createTextRun({ text, size, font })];
}

export async function processConversationsTemplate(
  template: TemplateFile,
  config: ConversationsConfig,
  metadata: ConversationMetadata
): Promise<Blob> {
  const doc = await generateConversationsDocument(
    config,
    metadata,
    template
  );
  return await Packer.toBlob(doc);
}

async function generateConversationsDocument(
  config: ConversationsConfig,
  metadata: ConversationMetadata,
  template?: TemplateFile
): Promise<Document> {
  // Read defaults from template styles if available
  let defaultFontFamily = "Times New Roman";
  let defaultBodySizeHalfPoints = 22; // 11pt
  let defaultParagraphAfterTwips = 120; // 6pt
  let defaultHeading2Size = 28; // 14pt

  try {
    if (template?.filePath) {
      const parsed = await parseDocxStyles(template.filePath);
      const resolved = resolveDefaults(parsed);
      defaultFontFamily = resolved.run?.fontFamily || defaultFontFamily;

      // Get body text size
      const sizePt = resolved.run?.fontSizePt;
      if (typeof sizePt === "number" && sizePt > 0) {
        defaultBodySizeHalfPoints = Math.round(sizePt * 2);
      }

      // Get paragraph spacing
      const afterPt = resolved.paragraph?.spacing?.afterPt;
      if (typeof afterPt === "number" && afterPt >= 0) {
        defaultParagraphAfterTwips = Math.round(afterPt * 20);
      }
    }
  } catch (e) {
    console.error("Failed to apply template styles, using defaults", e);
  }

  const prefaceChildren: Paragraph[] = [];
  const contentChildren: Paragraph[] = [];

  // Full page image if provided (placed at the very beginning)
  if (metadata.fullPageImage) {
    try {
      const imageBuffer = await metadata.fullPageImage.arrayBuffer();
      const contentWidthInches = 6 - 0.75 * 2; // 4.5"
      const contentHeightInches = 9 - 0.75 * 2; // 7.5"
      const oneLineInches = 240 / 1440; // ≈ 0.1667"
      const reservedHeightInches = Math.max(
        0,
        contentHeightInches - oneLineInches
      );

      prefaceChildren.push(
        createParagraph({
          children: [
            new ImageRun({
              data: imageBuffer as any,
              transformation: {
                width: Math.round(96 * contentWidthInches),
                height: Math.round(96 * reservedHeightInches),
              },
            } as any),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
        }),
        createParagraph({ children: [new PageBreak()] })
      );
    } catch (error) {
      console.error("Failed to add full page image:", error);
    }
  }

  // Copyright page
  prefaceChildren.push(
    createParagraph({ text: "", spacing: { after: SPACING.EXTRA_LARGE } }),
    createParagraph({
      children: [
        createTextRun({
          text: `Copyright ${metadata.copyrightYear} by ${metadata.publisher}`,
          size: defaultBodySizeHalfPoints,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: defaultParagraphAfterTwips },
    }),
    createParagraph({
      children: [
        createTextRun({
          text: "All rights reserved. No portion of this book may be replicated, distributed, or preserved in a data storage system in any format or through any method, including digital, photographic, or audio means, without the publisher's prior written consent.",
          size: defaultBodySizeHalfPoints,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: defaultParagraphAfterTwips * 2 },
    }),
    createParagraph({
      children: [
        createTextRun({
          text: `Initial Release ${metadata.copyrightYear}`,
          size: defaultBodySizeHalfPoints,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: defaultParagraphAfterTwips },
    }),
    createParagraph({
      children: [
        createTextRun({
          text: `${metadata.title} / ${metadata.author} – 1st ed.`,
          size: defaultBodySizeHalfPoints,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: defaultParagraphAfterTwips },
    }),
    createParagraph({
      children: [
        createTextRun({
          text: `Published in ${metadata.publicationLocation}`,
          size: defaultBodySizeHalfPoints,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: defaultParagraphAfterTwips * 3 + 40 },
    }),
    createParagraph({ children: [new PageBreak()] })
  );

  // Table of Contents
  prefaceChildren.push(
    createParagraph({
      children: [
        createTextRun({
          text: "Table of Contents",
          size: defaultHeading2Size,
          font: defaultFontFamily,
          bold: true,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: SPACING.LARGE },
    }),
    createParagraph({ children: [new PageBreak()] })
  );

  // Introduction section (if provided)
  if (metadata.introduction) {
    contentChildren.push(
      createParagraph({
        children: [
          createTextRun({
            text: "Introduction",
            size: defaultHeading2Size,
            font: defaultFontFamily,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING.LARGE },
      })
    );

    // Parse and add formatted introduction content
    const introductionContent = parseTextContent(
      metadata.introduction,
      defaultBodySizeHalfPoints,
      defaultFontFamily
    );
    contentChildren.push(...introductionContent);

    contentChildren.push(createParagraph({ children: [new PageBreak()] }));
  }

  // How to Use This Book section (if provided)
  if (metadata.howToUse) {
    contentChildren.push(
      createParagraph({
        children: [
          createTextRun({
            text: "How to Use This Book",
            size: defaultHeading2Size,
            font: defaultFontFamily,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING.LARGE },
      })
    );

    // Parse and add formatted how-to content
    const howToUseContent = parseTextContent(
      metadata.howToUse,
      defaultBodySizeHalfPoints,
      defaultFontFamily
    );
    contentChildren.push(...howToUseContent);

    contentChildren.push(createParagraph({ children: [new PageBreak()] }));
  }

  // Process each lesson
  const conversationsPerTopic = config.conversationsPerTopic || 10; // Default to 10 conversations per topic

  for (
    let lessonIndex = 0;
    lessonIndex < config.lessons.length;
    lessonIndex++
  ) {
    const lesson = config.lessons[lessonIndex];

    // Add Topic page at the start of each group
    if (lessonIndex % conversationsPerTopic === 0 && lesson.topic) {
      const topicNumber = Math.floor(lessonIndex / conversationsPerTopic) + 1;

      // Remove any text in parentheses like "(Conversations 1-10)" from topic
      const cleanTopic = lesson.topic.replace(/\s*\([^)]*\)\s*/g, "").trim();

      // Create vertical spacing by adding empty paragraphs
      // Page height is 9", margins 0.75" each = 7.5" content area
      // Need approximately 3.5" of empty space above to center content
      // Each empty paragraph with spacing ≈ 0.5"
      // We need about 7 empty paragraphs to create ~3.5" of space

      // Add empty paragraphs for vertical spacing
      for (let i = 0; i < 4; i++) {
        contentChildren.push(
          createParagraph({
            text: "",
            spacing: { after: convertInchesToTwip(0.5) },
          })
        );
      }

      contentChildren.push(
        // Line 1: Topic X
        createParagraph({
          children: [
            createTextRun({
              text: `Topic ${topicNumber}`,
              size: 28, // 14pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.SMALL },
        }),
        // Line 2: Topic name
        createParagraph({
          children: [
            createTextRun({
              text: cleanTopic,
              size: 36, // 18pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.DEFAULT },
        }),
        createParagraph({ children: [new PageBreak()] })
      );
    }

    // Lesson title
    contentChildren.push(
      createParagraph({
        children: [
          createTextRun({
            text: `Conversation ${lessonIndex + 1}`,
            size: 28, // 14pt
            font: defaultFontFamily,
            bold: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: SPACING.LARGE, after: SPACING.SMALL },
        heading: HeadingLevel.TITLE,
      }),
      createParagraph({
        children: [
          createTextRun({
            text: lesson.title || `Conversation ${lessonIndex + 1}`,
            size: 36, // 18pt
            font: defaultFontFamily,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING.LARGE },
      })
    );

    // Introduction (size 32 = 16pt, no heading, NO + sign, NO page break)
    if (lesson.introduction) {
      contentChildren.push(
        createParagraph({
          children: [
            createTextRun({
              text: "Introduction",
              size: 32, // 16pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: SPACING.DEFAULT, after: SPACING.DEFAULT },
        })
      );

      // Parse and add formatted introduction content
      const introContent = parseTextContent(
        lesson.introduction,
        defaultBodySizeHalfPoints,
        defaultFontFamily
      );
      contentChildren.push(...introContent);
    }

    // Vocabulary (size 32 = 16pt, no heading, with page break, NO + sign)
    if (lesson.vocabulary.length > 0) {
      contentChildren.push(
        createParagraph({
          children: [
            createTextRun({
              text: "Vocabulary",
              size: 32, // 16pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: defaultParagraphAfterTwips },
        })
      );

      lesson.vocabulary.forEach((vocab, index) => {
        const children: TextRun[] = [
          createTextRun({
            text: `${index + 1}. `,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
          }),
          createTextRun({
            text: vocab.word,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: true,
          }),
          createTextRun({
            text: ` → /${vocab.ipa}/ → ${vocab.pronunciation} → `,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
          }),
          createTextRun({
            text: vocab.translation,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: true,
          }),
        ];

        contentChildren.push(
          createParagraph({
            children,
            alignment: AlignmentType.LEFT,
            spacing: {
              after: Math.max(
                SPACING.SMALL,
                Math.round(defaultParagraphAfterTwips * 0.5)
              ),
              line: LINE_HEIGHT.DOUBLE,
              lineRule: LineRuleType.AUTO,
            },
          })
        );
      });
    }

    // Conversation - Original (with title)
    if (lesson.conversation.length > 0) {
      const vocabWords = lesson.vocabulary.map((v) => v.word);

      // Title for original conversation
      contentChildren.push(
        createParagraph({
          children: [
            createTextRun({
              text: lesson.title || `Conversation ${lessonIndex + 1}`,
              size: 32, // 16pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: SPACING.DEFAULT, after: SPACING.DEFAULT },
        })
      );

      lesson.conversation.forEach((entry) => {
        const textRuns: TextRun[] = [
          createTextRun({
            text: `${entry.speaker}: `,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: true,
          }),
          ...createTextRunsWithBoldVocabulary(
            entry.text,
            vocabWords,
            defaultBodySizeHalfPoints,
            defaultFontFamily
          ),
        ];

        contentChildren.push(
          createParagraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              after: defaultParagraphAfterTwips,
              line: LINE_HEIGHT.DOUBLE,
              lineRule: LineRuleType.AUTO,
            },
          })
        );
      });
    }

    // Conversation - Translated (if available)
    if (
      lesson.conversationTranslated &&
      lesson.conversationTranslated.length > 0
    ) {
      const vocabWordsTranslated = lesson.vocabulary.map((v) => v.translation);

      // Title for translated conversation
      contentChildren.push(
        createParagraph({
          children: [
            createTextRun({
              text:
                lesson.titleTranslated ||
                `Conversation ${lessonIndex + 1} (Translation)`,
              size: 32, // 16pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: SPACING.DEFAULT, after: SPACING.DEFAULT },
        })
      );

      lesson.conversationTranslated.forEach((entry) => {
        const textRuns: TextRun[] = [
          createTextRun({
            text: `${entry.speaker}: `,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: true,
          }),
          ...createTextRunsWithBoldVocabulary(
            entry.text,
            vocabWordsTranslated,
            defaultBodySizeHalfPoints,
            defaultFontFamily
          ),
        ];

        contentChildren.push(
          createParagraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              after: defaultParagraphAfterTwips,
              line: LINE_HEIGHT.DOUBLE,
              lineRule: LineRuleType.AUTO,
            },
          })
        );
      });
    }

    // Questions (size 32 = 16pt, no heading, NO + sign)
    if (lesson.questions.length > 0) {
      contentChildren.push(
        createParagraph({
          children: [
            createTextRun({
              text: "Comprehension Questions",
              size: 32, // 16pt
              font: defaultFontFamily,
              bold: true,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: SPACING.LARGE, after: defaultParagraphAfterTwips },
        })
      );

      lesson.questions.forEach((question) => {
        contentChildren.push(
          createParagraph({
            children: [
              createTextRun({
                text: `${question.number}. ${question.questionOriginal} / ${question.questionTranslated}`,
                size: defaultBodySizeHalfPoints,
                font: defaultFontFamily,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: {
              after: Math.max(
                SPACING.SMALL,
                Math.round(defaultParagraphAfterTwips * 0.5)
              ),
              line: LINE_HEIGHT.DOUBLE,
              lineRule: LineRuleType.AUTO,
            },
          })
        );

        question.options.forEach((option) => {
          contentChildren.push(
            createParagraph({
              children: [
                createTextRun({
                  text: `${option.letter}) ${option.textOriginal} / ${option.textTranslated}`,
                  size: defaultBodySizeHalfPoints,
                  font: defaultFontFamily,
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: {
                after: Math.max(
                  SPACING.SMALL,
                  Math.round(defaultParagraphAfterTwips * 0.5)
                ),
                line: LINE_HEIGHT.DOUBLE,
                lineRule: LineRuleType.AUTO,
              },
              indent: { left: convertInchesToTwip(0.25) },
            })
          );
        });
      });

      // Page break after questions
      contentChildren.push(createParagraph({ children: [new PageBreak()] }));
    }
  }

  // Answers section (for ALL lessons at the end) - with page break before
  contentChildren.push(
    createParagraph({
      children: [
        createTextRun({
          text: "Answers",
          size: defaultHeading2Size,
          font: defaultFontFamily,
          bold: true,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: SPACING.LARGE },
    })
  );

  config.lessons.forEach((lesson, index) => {
    const answerString = lesson.answers.join(" - ");
    contentChildren.push(
      createParagraph({
        children: [
          createTextRun({
            text: `${index + 1}. `,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: false,
          }),
          createTextRun({
            text: lesson.title || `Conversation ${index + 1}`,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: true,
          }),
          createTextRun({
            text: `: ${answerString}`,
            size: defaultBodySizeHalfPoints,
            font: defaultFontFamily,
            bold: false,
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: {
          after: Math.max(SPACING.SMALL, defaultParagraphAfterTwips - 20),
        },
      })
    );
  });

  // Conclusion section (if provided)
  if (metadata.conclusion) {
    contentChildren.push(
      createParagraph({ children: [new PageBreak()] }),
      createParagraph({
        children: [
          createTextRun({
            text: "Conclusion",
            size: defaultHeading2Size,
            font: defaultFontFamily,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING.LARGE },
      })
    );

    // Parse and add formatted conclusion content
    const conclusionContent = parseTextContent(
      metadata.conclusion,
      defaultBodySizeHalfPoints,
      defaultFontFamily
    );
    contentChildren.push(...conclusionContent);
  }

  // Footer with centered page number for content section
  const contentFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
          }),
        ],
      }),
    ],
  });

  return new Document({
    sections: [
      // Preface section: no page numbering
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(6),
              height: convertInchesToTwip(9),
            },
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        children: prefaceChildren,
      },
      // Content section: page numbering starts at 1 in footer
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(6),
              height: convertInchesToTwip(9),
            },
            margin: {
              top: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
            pageNumbers: {
              start: 1,
            },
          },
        },
        children: contentChildren,
        footers: {
          default: contentFooter,
        },
      },
    ],
  });
}
