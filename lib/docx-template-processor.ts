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
  TableOfContents,
  Footer,
  PageNumber,
} from "docx";
import type { Story, BookMetadata, ImageFile, TemplateFile } from "./types";
import { parseDocxStyles, resolveDefaults } from "./docx-style-reader";

// Helper interfaces
interface TextRunOptions {
  text: string;
  size?: number;
  font?: string;
  bold?: boolean;
}

interface ParagraphOptions {
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
}

// Helper functions to reduce code duplication
function createTextRun(options: TextRunOptions): TextRun {
  return new TextRun({
    text: options.text,
    size: options.size,
    font: options.font,
    bold: options.bold,
  });
}

function createParagraph(options: ParagraphOptions): Paragraph {
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

function createCenteredParagraph(
  text: string,
  size: number,
  font: string,
  spacing?: number,
  lineHeight?: number,
  lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType]
): Paragraph {
  return createParagraph({
    children: [createTextRun({ text, size, font })],
    alignment: AlignmentType.CENTER,
    spacing: {
      after: spacing,
      line: lineHeight,
      lineRule: lineRule || LineRuleType.AUTO,
    },
  });
}

function createLeftParagraph(
  text: string,
  size: number,
  font: string,
  spacing?: number,
  bold?: boolean,
  lineHeight?: number,
  lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType]
): Paragraph {
  return createParagraph({
    children: [createTextRun({ text, size, font, bold })],
    alignment: AlignmentType.LEFT,
    spacing: {
      after: spacing,
      line: lineHeight,
      lineRule: lineRule || LineRuleType.AUTO,
    },
  });
}

function createJustifiedParagraph(
  text: string,
  size: number,
  font: string,
  spacing?: number,
  lineHeight?: number,
  lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType]
): Paragraph {
  return createParagraph({
    children: [createTextRun({ text, size, font })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: {
      after: spacing,
      line: LINE_HEIGHT.ONE_HALF,
      lineRule: lineRule || LineRuleType.AUTO,
    },
  });
}

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

// Story section builder functions
function buildStoryHeader(
  story: Story,
  defaultHeading2Size: number,
  defaultFontFamily: string
): Paragraph[] {
  return [
    createParagraph({
      children: [
        createTextRun({
          text: `Story ${story.number}`,
          size: defaultHeading2Size,
          bold: true,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: SPACING.LARGE, after: SPACING.SMALL },
      heading: HeadingLevel.TITLE,
    }),
    createParagraph({
      children: [
        createTextRun({
          text: story.titleOriginal,
          size: defaultHeading2Size,
          font: defaultFontFamily,
          bold: true,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: SPACING.LARGE },
    }),
    createParagraph({
      children: [
        createTextRun({
          text: `( ${story.titleTranslated} )`,
          size: defaultHeading2Size,
          bold: true,
          font: defaultFontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      spacing: { after: SPACING.LARGE },
    }),
  ];
}

function buildStoryVocabulary(
  story: Story,
  defaultBodySizeHalfPoints: number,
  defaultFontFamily: string,
  defaultParagraphAfterTwips: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createParagraph({
      children: [new PageBreak()],
    }),
    createParagraph({
      children: [
        createTextRun({
          text: "Vocabulary",
          size: 28, // 14px = 28 half-points
          font: defaultFontFamily,
          bold: true,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: defaultParagraphAfterTwips },
    }),
  ];

  story.vocabulary.forEach((word, index) => {
    paragraphs.push(
      createLeftParagraph(
        `${index + 1}. ${word.word} → /${word.ipa}/ → ${word.pronunciation} → ${
          word.translation
        }`,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        Math.max(SPACING.SMALL, Math.round(defaultParagraphAfterTwips * 0.5)),
        false,
        LINE_HEIGHT.DOUBLE,
        LineRuleType.AUTO
      )
    );
  });

  return paragraphs;
}

function buildStoryText(
  story: Story,
  defaultHeading2Size: number,
  defaultBodySizeHalfPoints: number,
  defaultFontFamily: string,
  defaultParagraphAfterTwips: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Original text
  paragraphs.push(
    createLeftParagraph(
      story.titleOriginal,
      defaultHeading2Size,
      defaultFontFamily,
      defaultParagraphAfterTwips,
      true,
      LINE_HEIGHT.TRIPLE,
      LineRuleType.EXACT
    )
  );

  story.textOriginal.split("\n").forEach((line) => {
    if (line.trim()) {
      paragraphs.push(
        createJustifiedParagraph(
          line.replace(/—/g, "\u2014"),
          defaultBodySizeHalfPoints,
          defaultFontFamily,
          defaultParagraphAfterTwips,
          LINE_HEIGHT.DOUBLE,
          LineRuleType.AUTO
        )
      );
    }
  });

  // Translated text
  paragraphs.push(
    createLeftParagraph(
      story.titleTranslated,
      defaultHeading2Size,
      defaultFontFamily,
      defaultParagraphAfterTwips,
      true,
      LINE_HEIGHT.TRIPLE,
      LineRuleType.EXACT
    )
  );

  story.textTranslated.split("\n").forEach((line) => {
    if (line.trim()) {
      paragraphs.push(
        createJustifiedParagraph(
          line.replace(/—/g, "\u2014"),
          defaultBodySizeHalfPoints,
          defaultFontFamily,
          defaultParagraphAfterTwips,
          LINE_HEIGHT.DOUBLE,
          LineRuleType.AUTO
        )
      );
    }
  });

  return paragraphs;
}

function buildStoryQuestions(
  story: Story,
  defaultHeading2Size: number,
  defaultBodySizeHalfPoints: number,
  defaultFontFamily: string,
  defaultParagraphAfterTwips: number
): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createParagraph({
      children: [
        createTextRun({
          text: "Comprehension Questions",
          size: defaultHeading2Size,
          font: defaultFontFamily,
          bold: true,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: defaultParagraphAfterTwips },
    }),
  ];

  story.questions.forEach((question) => {
    paragraphs.push(
      createLeftParagraph(
        `${question.number}. ${question.questionOriginal} / ${question.questionTranslated}`,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        Math.max(SPACING.SMALL, Math.round(defaultParagraphAfterTwips * 0.5)),
        false,
        LINE_HEIGHT.DOUBLE,
        LineRuleType.AUTO
      )
    );

    question.options.forEach((option) => {
      paragraphs.push(
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

  paragraphs.push(createParagraph({ children: [new PageBreak()] }));

  return paragraphs;
}

export async function processTemplateWithContent(
  template: TemplateFile,
  stories: Story[],
  metadata: BookMetadata,
  images: ImageFile[]
): Promise<Blob> {
  // Generate document with full features matching the preview
  const doc = await generateDocumentFromTemplate(
    stories,
    metadata,
    images,
    template
  );
  return await Packer.toBlob(doc);
}

async function generateDocumentFromTemplate(
  stories: Story[],
  metadata: BookMetadata,
  images: ImageFile[],
  template?: TemplateFile
): Promise<Document> {
  // Read defaults from template styles if available
  let defaultFontFamily = "Times New Roman";
  let defaultBodySizeHalfPoints = 22; // 11pt
  let defaultParagraphAfterTwips = 120; // 6pt
  let defaultHeading2Size = 28;

  try {
    if (template?.file) {
      const parsed = await parseDocxStyles(template.file);
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
    // Fallback to internal defaults on any parsing issue
    console.error("Failed to apply template styles, using defaults", e);
  }
  const prefaceChildren: (Paragraph | TableOfContents)[] = [];
  const contentChildren: (Paragraph | TableOfContents)[] = [];

  // Full page image if provided (placed at the very beginning)
  if (metadata.fullPageImage) {
    try {
      const imageBuffer = await metadata.fullPageImage.arrayBuffer();
      // Reserve approximately one text line for the following PageBreak
      // Page content area: 6x9 inches page with 0.75" margins => 4.5" x 7.5"
      // One single-spaced line ~ 240 twips => 240/1440 inch ≈ 0.1667"
      const contentWidthInches = 6 - 0.75 * 2; // 4.5"
      const contentHeightInches = 9 - 0.75 * 2; // 7.5"
      const oneLineInches = 240 / 1440; // ≈ 0.1667"
      const reservedHeightInches = Math.max(
        0,
        contentHeightInches - oneLineInches
      ); // ~7.33"
      prefaceChildren.push(
        createParagraph({
          children: [
            new ImageRun({
              data: imageBuffer as any,
              transformation: {
                width: Math.round(96 * contentWidthInches), // Content width (page width - margins)
                height: Math.round(96 * reservedHeightInches), // Leave ~1 text line for PageBreak
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
    createCenteredParagraph(
      `Copyright ${metadata.copyrightYear} by ${metadata.publisher}`,
      defaultBodySizeHalfPoints,
      defaultFontFamily,
      defaultParagraphAfterTwips
    ),
    createCenteredParagraph(
      "All rights reserved. No portion of this book may be replicated, distributed, or preserved in a data storage system in any format or through any method, including digital, photographic, or audio means, without the publisher's prior written consent.",
      defaultBodySizeHalfPoints,
      defaultFontFamily,
      defaultParagraphAfterTwips * 2
    ),
    createCenteredParagraph(
      `Initial Release ${metadata.copyrightYear}`,
      defaultBodySizeHalfPoints,
      defaultFontFamily,
      defaultParagraphAfterTwips
    ),
    createCenteredParagraph(
      `${metadata.title} / ${metadata.author} – 1st ed.`,
      defaultBodySizeHalfPoints,
      defaultFontFamily,
      defaultParagraphAfterTwips
    ),
    createCenteredParagraph(
      `Published in ${metadata.publicationLocation}`,
      defaultBodySizeHalfPoints,
      defaultFontFamily,
      defaultParagraphAfterTwips * 3 + 40
    ),
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

  // Introduction section
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
    }),
    ...metadata.introduction.split("\n").map((line) =>
      createJustifiedParagraph(
        line,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        defaultParagraphAfterTwips,
        LINE_HEIGHT.ONE_HALF, // 1.5 line spacing
        LineRuleType.AUTO
      )
    ),
    createParagraph({ children: [new PageBreak()] })
  );

  // How to Use This Book section
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
    }),
    ...metadata.howToUse.split("\n").map((line) =>
      createJustifiedParagraph(
        line,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        defaultParagraphAfterTwips,
        LINE_HEIGHT.ONE_HALF, // 1.5 line spacing
        LineRuleType.AUTO
      )
    ),
    createParagraph({ children: [new PageBreak()] })
  );

  // Stories section
  for (const story of stories) {
    // Story header
    contentChildren.push(
      ...buildStoryHeader(story, defaultHeading2Size, defaultFontFamily)
    );

    // Story image
    const image = images.find((img) => img.number === story.number);
    if (image) {
      try {
        const imageBuffer = await image.file.arrayBuffer();
        contentChildren.push(
          createParagraph({
            children: [
              new ImageRun({
                data: imageBuffer as any,
                transformation: {
                  width: Math.round(96 * 4.5),
                  height: Math.round(96 * 4.5),
                },
              } as any),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: SPACING.LARGE, after: SPACING.LARGE },
          })
        );
      } catch (error) {
        console.error(`Failed to add image for story ${story.number}:`, error);
      }
    }

    // Story vocabulary
    contentChildren.push(
      ...buildStoryVocabulary(
        story,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        defaultParagraphAfterTwips
      )
    );

    // Story text (original and translated)
    contentChildren.push(
      ...buildStoryText(
        story,
        28,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        defaultParagraphAfterTwips
      )
    );

    // Story questions
    contentChildren.push(
      ...buildStoryQuestions(
        story,
        defaultHeading2Size,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        defaultParagraphAfterTwips
      )
    );
  }

  // Answers section
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

  stories.forEach((story, index) => {
    const answerString = story.answers.join(" - ");
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
            text: story.titleOriginal,
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

  contentChildren.push(createParagraph({ children: [new PageBreak()] }));

  // Conclusion section
  contentChildren.push(
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
    }),
    ...metadata.conclusion.split("\n").map((line) =>
      createJustifiedParagraph(
        line,
        defaultBodySizeHalfPoints,
        defaultFontFamily,
        defaultParagraphAfterTwips,
        LINE_HEIGHT.ONE_HALF, // 1.5 line spacing
        LineRuleType.AUTO
      )
    )
  );

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
      // Preface section: no numbering
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
      // Content section: numbering starts at 1 in footer
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
