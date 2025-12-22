import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  convertInchesToTwip,
  LineRuleType,
  PageBreak,
  Footer,
  PageNumber,
} from "docx";
import type { ConversationsConfig } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Spacing constants (matching Story Generator)
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

// Default font settings (matching Story Generator)
const DEFAULT_FONT_FAMILY = "Times New Roman";
const DEFAULT_BODY_SIZE = 22; // 11pt
const DEFAULT_HEADING_SIZE = 28; // 14pt
const DEFAULT_PARAGRAPH_AFTER = 120; // 6pt

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
  vocabularyWords: string[]
): TextRun[] {
  if (vocabularyWords.length === 0) {
    return [
      new TextRun({
        text,
        size: DEFAULT_BODY_SIZE,
        font: DEFAULT_FONT_FAMILY,
      }),
    ];
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
        textRuns.push(
          new TextRun({
            text: beforeText,
            size: DEFAULT_BODY_SIZE,
            font: DEFAULT_FONT_FAMILY,
          })
        );
      }
    }

    const matchedText = text.substring(start, end);
    textRuns.push(
      new TextRun({
        text: matchedText,
        size: DEFAULT_BODY_SIZE,
        font: DEFAULT_FONT_FAMILY,
        bold: true,
      })
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      textRuns.push(
        new TextRun({
          text: remainingText,
          size: DEFAULT_BODY_SIZE,
          font: DEFAULT_FONT_FAMILY,
        })
      );
    }
  }

  return textRuns.length > 0
    ? textRuns
    : [
        new TextRun({
          text,
          size: DEFAULT_BODY_SIZE,
          font: DEFAULT_FONT_FAMILY,
        }),
      ];
}

export async function POST(req: NextRequest) {
  try {
    const { config, metadata } = (await req.json()) as {
      config: ConversationsConfig;
      metadata?: any;
    };

    if (!config || !config.lessons || config.lessons.length === 0) {
      return NextResponse.json(
        { error: "No lessons provided" },
        { status: 400 }
      );
    }

    const prefaceChildren: Paragraph[] = [];
    const contentChildren: Paragraph[] = [];

    // Copyright page (preface section)
    prefaceChildren.push(
      new Paragraph({
        text: "",
        spacing: { after: SPACING.EXTRA_LARGE },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Copyright ${new Date().getFullYear()} by ${
              config.publisher || "Publisher"
            }`,
            size: DEFAULT_BODY_SIZE,
            font: DEFAULT_FONT_FAMILY,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: DEFAULT_PARAGRAPH_AFTER },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "All rights reserved. No portion of this book may be replicated, distributed, or preserved in a data storage system in any format or through any method, including digital, photographic, or audio means, without the publisher's prior written consent.",
            size: DEFAULT_BODY_SIZE,
            font: DEFAULT_FONT_FAMILY,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: DEFAULT_PARAGRAPH_AFTER * 2 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Initial Release ${new Date().getFullYear()}`,
            size: DEFAULT_BODY_SIZE,
            font: DEFAULT_FONT_FAMILY,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: DEFAULT_PARAGRAPH_AFTER },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `${config.title || "Conversations"} / ${
              config.author || "Author"
            } – 1st ed.`,
            size: DEFAULT_BODY_SIZE,
            font: DEFAULT_FONT_FAMILY,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: DEFAULT_PARAGRAPH_AFTER },
      }),
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    // Table of Contents
    prefaceChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Table of Contents",
            size: DEFAULT_HEADING_SIZE,
            font: DEFAULT_FONT_FAMILY,
            bold: true,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: SPACING.LARGE },
      }),
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    // Process each lesson
    config.lessons.forEach((lesson, lessonIndex) => {
      // Lesson title
      contentChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Conversation ${lessonIndex + 1}`,
              size: DEFAULT_HEADING_SIZE,
              font: DEFAULT_FONT_FAMILY,
              bold: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: SPACING.LARGE, after: SPACING.SMALL },
          heading: HeadingLevel.TITLE,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: lesson.title || `Conversation ${lessonIndex + 1}`,
              size: DEFAULT_HEADING_SIZE,
              font: DEFAULT_FONT_FAMILY,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: SPACING.LARGE },
        })
      );

      // Introduction
      if (lesson.introduction) {
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Introduction",
                size: DEFAULT_HEADING_SIZE,
                font: DEFAULT_FONT_FAMILY,
                bold: true,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: {
              before: SPACING.DEFAULT,
              after: SPACING.DEFAULT,
            },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: lesson.introduction,
                size: DEFAULT_BODY_SIZE,
                font: DEFAULT_FONT_FAMILY,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: {
              after: DEFAULT_PARAGRAPH_AFTER,
              line: LINE_HEIGHT.ONE_HALF,
              lineRule: LineRuleType.AUTO,
            },
          })
        );
      }

      // Vocabulary
      if (lesson.vocabulary.length > 0) {
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Vocabulary",
                size: DEFAULT_HEADING_SIZE,
                font: DEFAULT_FONT_FAMILY,
                bold: true,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: {
              before: SPACING.DEFAULT,
              after: SPACING.DEFAULT,
            },
          })
        );

        lesson.vocabulary.forEach((vocab, index) => {
          const children: TextRun[] = [
            new TextRun({
              text: `${index + 1}. `,
              size: DEFAULT_BODY_SIZE,
              font: DEFAULT_FONT_FAMILY,
            }),
            new TextRun({
              text: vocab.word,
              size: DEFAULT_BODY_SIZE,
              font: DEFAULT_FONT_FAMILY,
              bold: true,
            }),
            new TextRun({
              text: ` → /${vocab.ipa}/ → ${vocab.pronunciation} → `,
              size: DEFAULT_BODY_SIZE,
              font: DEFAULT_FONT_FAMILY,
            }),
            new TextRun({
              text: vocab.translation,
              size: DEFAULT_BODY_SIZE,
              font: DEFAULT_FONT_FAMILY,
              bold: true,
            }),
          ];

          contentChildren.push(
            new Paragraph({
              children,
              alignment: AlignmentType.LEFT,
              spacing: {
                after: Math.max(
                  SPACING.SMALL,
                  Math.round(DEFAULT_PARAGRAPH_AFTER * 0.5)
                ),
                line: LINE_HEIGHT.DOUBLE,
                lineRule: LineRuleType.AUTO,
              },
            })
          );
        });
      }

      // Conversation
      if (lesson.conversation.length > 0) {
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Conversation",
                size: DEFAULT_HEADING_SIZE,
                font: DEFAULT_FONT_FAMILY,
                bold: true,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: {
              before: SPACING.DEFAULT,
              after: SPACING.DEFAULT,
            },
          })
        );

        // Create set of vocabulary words for bolding
        const vocabWords = lesson.vocabulary.map((v) => v.word);

        lesson.conversation.forEach((entry) => {
          // Bold vocabulary words in conversation text
          const textRuns: TextRun[] = [
            new TextRun({
              text: `${entry.speaker}: `,
              size: DEFAULT_BODY_SIZE,
              font: DEFAULT_FONT_FAMILY,
              bold: true,
            }),
            ...createTextRunsWithBoldVocabulary(entry.text, vocabWords),
          ];

          contentChildren.push(
            new Paragraph({
              children: textRuns,
              alignment: AlignmentType.JUSTIFIED,
              spacing: {
                after: DEFAULT_PARAGRAPH_AFTER,
                line: LINE_HEIGHT.DOUBLE,
                lineRule: LineRuleType.AUTO,
              },
            })
          );
        });
      }

      // Questions
      if (lesson.questions.length > 0) {
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Comprehension Questions",
                size: DEFAULT_HEADING_SIZE,
                font: DEFAULT_FONT_FAMILY,
                bold: true,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: {
              before: SPACING.DEFAULT,
              after: SPACING.DEFAULT,
            },
          })
        );

        lesson.questions.forEach((question) => {
          contentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${question.number}. ${question.questionOriginal}`,
                  size: DEFAULT_BODY_SIZE,
                  font: DEFAULT_FONT_FAMILY,
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: {
                after: Math.max(
                  SPACING.SMALL,
                  Math.round(DEFAULT_PARAGRAPH_AFTER * 0.5)
                ),
                line: LINE_HEIGHT.DOUBLE,
                lineRule: LineRuleType.AUTO,
              },
            })
          );

          question.options.forEach((option) => {
            contentChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${option.letter}) ${option.textOriginal}`,
                    size: DEFAULT_BODY_SIZE,
                    font: DEFAULT_FONT_FAMILY,
                  }),
                ],
                alignment: AlignmentType.LEFT,
                spacing: {
                  after: Math.max(
                    SPACING.SMALL,
                    Math.round(DEFAULT_PARAGRAPH_AFTER * 0.5)
                  ),
                  line: LINE_HEIGHT.DOUBLE,
                  lineRule: LineRuleType.AUTO,
                },
                indent: { left: convertInchesToTwip(0.25) },
              })
            );
          });
        });
      }

      // Answers
      if (lesson.answers.length > 0) {
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Answers",
                size: DEFAULT_HEADING_SIZE,
                font: DEFAULT_FONT_FAMILY,
                bold: true,
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.LEFT,
            spacing: {
              before: SPACING.DEFAULT,
              after: SPACING.DEFAULT,
            },
          })
        );

        lesson.answers.forEach((answer, aIndex) => {
          contentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${aIndex + 1}. ${answer})`,
                  size: DEFAULT_BODY_SIZE,
                  font: DEFAULT_FONT_FAMILY,
                  bold: true,
                }),
              ],
              alignment: AlignmentType.LEFT,
              spacing: {
                after: Math.max(SPACING.SMALL, DEFAULT_PARAGRAPH_AFTER - 20),
              },
            })
          );
        });
      }

      // Page break after each lesson (except last)
      if (lessonIndex < config.lessons.length - 1) {
        contentChildren.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }
    });

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

    // Create document with two sections (preface without numbering, content with numbering)
    const doc = new Document({
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

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Return DOCX file
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="conversations-${Date.now()}.docx"`,
      },
    });
  } catch (error) {
    console.error("DOCX generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate DOCX",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
