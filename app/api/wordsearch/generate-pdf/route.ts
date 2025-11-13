import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { WordSearchGenerator } from "@/lib/wordsearch";

interface ColorPalette {
  outerBorder: [number, number, number]; // Outer border color
  outerBorderStroke: [number, number, number]; // Outer border stroke
  middleBorder: [number, number, number]; // Middle border color
  innerBorder: [number, number, number]; // Inner decorative border
  innerBorderStroke: [number, number, number]; // Inner border stroke
  cornerDecoration: [number, number, number]; // Corner decoration color
  titleBackground: [number, number, number]; // Title background
  titleBackgroundStroke: [number, number, number]; // Title border
  titleHighlight: [number, number, number]; // Title highlight
  titleText: [number, number, number]; // Title text color
  titleTextOutline: [number, number, number]; // Title text outline
  wordBackground: [number, number, number]; // Word list background
  wordBackgroundStroke: [number, number, number]; // Word list border
  wordText: [number, number, number]; // Word text color
  gridBackground: [number, number, number]; // Grid background
  gridBorder: [number, number, number]; // Grid border
  cellBackground: [number, number, number]; // Cell background
  cellBorder: [number, number, number]; // Cell border
  cellText: [number, number, number]; // Cell text color
}

interface DesignStyle {
  borderStyle:
    | "ornate"
    | "wave"
    | "organic"
    | "gradient"
    | "elegant"
    | "bold"
    | "romantic"
    | "minimalist"
    | "rustic"
    | "geometric";
  borderThickness: number;
  borderLayers: number;
  cornerRadius: number;
  cornerDecoration:
    | "circles"
    | "waves"
    | "leaves"
    | "flowing"
    | "floral"
    | "squares"
    | "hearts"
    | "clouds"
    | "angular"
    | "lines";
  titleStyle:
    | "banner"
    | "box"
    | "underline"
    | "badge"
    | "ribbon"
    | "frame"
    | "elegant"
    | "simple"
    | "rustic"
    | "modern";
  titleFontSize: number;
  titleShape: "rounded" | "square" | "curved" | "angular";
  layoutSpacing: number;
  decorationPattern:
    | "dots"
    | "waves"
    | "leaves"
    | "stars"
    | "flowers"
    | "squares"
    | "hearts"
    | "clouds"
    | "lines"
    | "geometric";
  gridStyle: "rounded" | "square" | "organic" | "modern";
}

interface Template {
  name: string;
  colors: ColorPalette;
  design: DesignStyle;
}

interface TopicVocabulary {
  topic: string;
  words: string[];
}

interface GameConfig {
  words: string[];
  topics?: TopicVocabulary[]; // New: vocabulary organized by topic
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
  template?: string; // Template name
  accentColor?: string; // Color for border and title (hex format)
  coverImage?: string; // Base64 cover image for cover page
  introduction?: string; // Introduction text for introduction page
}

interface IntroductionBlock {
  type: "heading" | "paragraph" | "bullets";
  lines: string[];
}

// Default template with white background
const getDefaultTemplate = (): Template => {
  return {
    name: "Default",
    colors: {
      outerBorder: [200, 200, 200], // Light gray (will be overridden by accentColor)
      outerBorderStroke: [150, 150, 150],
      middleBorder: [200, 200, 200],
      innerBorder: [200, 200, 200],
      innerBorderStroke: [150, 150, 150],
      cornerDecoration: [200, 200, 200],
      titleBackground: [200, 200, 200], // Will be overridden by accentColor
      titleBackgroundStroke: [150, 150, 150],
      titleHighlight: [220, 220, 220],
      titleText: [255, 255, 255], // White text
      titleTextOutline: [0, 0, 0], // Black outline
      wordBackground: [255, 255, 255], // White
      wordBackgroundStroke: [220, 220, 220], // Light gray
      wordText: [50, 50, 50], // Dark gray
      gridBackground: [255, 255, 255], // White
      gridBorder: [200, 200, 200], // Will be overridden by accentColor
      cellBackground: [255, 255, 255], // White
      cellBorder: [240, 240, 240], // Very light gray
      cellText: [50, 50, 50], // Dark gray
    },
    design: {
      borderStyle: "ornate",
      borderThickness: 2,
      borderLayers: 1,
      cornerRadius: 3,
      cornerDecoration: "circles",
      titleStyle: "banner",
      titleFontSize: 28,
      titleShape: "rounded",
      layoutSpacing: 12,
      decorationPattern: "stars",
      gridStyle: "rounded",
    },
  };
};

// Helper function to convert hex to RGB (supports both #RGB and #RRGGBB formats)
const hexToRgb = (hex: string): [number, number, number] | null => {
  if (!hex || typeof hex !== "string") return null;

  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Handle 3-digit hex (#RGB -> #RRGGBB)
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }

  // Handle 6-digit hex (#RRGGBB)
  if (cleanHex.length === 6) {
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    if (result) {
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ];
    }
  }

  return null;
};

// Get default template (always returns default with white background)
const getTemplate = (): Template => {
  return getDefaultTemplate();
};

// Create color palette with white background and accent color for border/title
const createColorPalette = (accentColor?: string): ColorPalette => {
  // Default gray color if no accent color provided
  let defaultColor: [number, number, number] = [200, 200, 200];

  if (accentColor) {
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      defaultColor = rgb;
    } else {
      // Log warning if color parsing failed
      console.warn(
        `Failed to parse accent color: ${accentColor}, using default gray`
      );
    }
  }

  // Calculate stroke colors (slightly darker)
  const strokeColor: [number, number, number] = [
    Math.max(0, defaultColor[0] - 30),
    Math.max(0, defaultColor[1] - 30),
    Math.max(0, defaultColor[2] - 30),
  ] as [number, number, number];

  const innerStrokeColor: [number, number, number] = [
    Math.max(0, defaultColor[0] - 20),
    Math.max(0, defaultColor[1] - 20),
    Math.max(0, defaultColor[2] - 20),
  ] as [number, number, number];

  const highlightColor: [number, number, number] = [
    Math.min(255, defaultColor[0] + 30),
    Math.min(255, defaultColor[1] + 30),
    Math.min(255, defaultColor[2] + 30),
  ] as [number, number, number];

  return {
    outerBorder: defaultColor,
    outerBorderStroke: strokeColor,
    middleBorder: defaultColor,
    innerBorder: defaultColor,
    innerBorderStroke: innerStrokeColor,
    cornerDecoration: defaultColor,
    titleBackground: defaultColor,
    titleBackgroundStroke: strokeColor,
    titleHighlight: highlightColor,
    titleText: [255, 255, 255], // White text for contrast
    titleTextOutline: [0, 0, 0], // Black outline
    wordBackground: [255, 255, 255], // White
    wordBackgroundStroke: [220, 220, 220], // Light gray
    wordText: [50, 50, 50], // Dark gray
    gridBackground: [255, 255, 255], // White
    gridBorder: defaultColor,
    cellBackground: [255, 255, 255], // White
    cellBorder: [240, 240, 240], // Very light gray
    cellText: [50, 50, 50], // Dark gray
  };
};

const lightenColor = (
  color: [number, number, number],
  amount = 0.75
): [number, number, number] => {
  return [
    Math.min(255, Math.round(color[0] + (255 - color[0]) * amount)),
    Math.min(255, Math.round(color[1] + (255 - color[1]) * amount)),
    Math.min(255, Math.round(color[2] + (255 - color[2]) * amount)),
  ];
};

// Helper function to draw decorative border
const drawDecorativeBorder = (
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: ColorPalette,
  design: DesignStyle
) => {
  const borderThickness = design.borderThickness;
  const cornerRadius = design.cornerRadius;
  const innerBorderThickness = Math.max(1, borderThickness - 1);

  // Calculate inner decorative area
  const innerX = x + borderThickness * design.borderLayers;
  const innerY = y + borderThickness * design.borderLayers;
  const innerWidth = width - 2 * borderThickness * design.borderLayers;
  const innerHeight = height - 2 * borderThickness * design.borderLayers;
  const decorativeX = innerX + innerBorderThickness;
  const decorativeY = innerY + innerBorderThickness;
  const decorativeWidth = innerWidth - 2 * innerBorderThickness;
  const decorativeHeight = innerHeight - 2 * innerBorderThickness;

  // Draw border layers based on design
  for (let layer = 0; layer < design.borderLayers; layer++) {
    const layerOffset = layer * borderThickness;
    const layerX = x + layerOffset;
    const layerY = y + layerOffset;
    const layerWidth = width - 2 * layerOffset;
    const layerHeight = height - 2 * layerOffset;

    if (layer === 0) {
      // Outer layer
      pdf.setFillColor(
        colors.outerBorder[0],
        colors.outerBorder[1],
        colors.outerBorder[2]
      );
      pdf.setDrawColor(
        colors.outerBorderStroke[0],
        colors.outerBorderStroke[1],
        colors.outerBorderStroke[2]
      );
    } else if (layer === design.borderLayers - 1) {
      // Inner layer
      pdf.setFillColor(
        colors.innerBorder[0],
        colors.innerBorder[1],
        colors.innerBorder[2]
      );
      pdf.setDrawColor(
        colors.innerBorderStroke[0],
        colors.innerBorderStroke[1],
        colors.innerBorderStroke[2]
      );
    } else {
      // Middle layer
      pdf.setFillColor(
        colors.middleBorder[0],
        colors.middleBorder[1],
        colors.middleBorder[2]
      );
      pdf.setDrawColor(
        colors.middleBorder[0],
        colors.middleBorder[1],
        colors.middleBorder[2]
      );
    }

    pdf.setLineWidth(layer === 0 ? 0.5 : 0.8);

    // Draw based on border style
    if (design.borderStyle === "geometric" || design.cornerRadius === 0) {
      pdf.rect(layerX, layerY, layerWidth, layerHeight, "FD");
    } else {
      pdf.roundedRect(
        layerX,
        layerY,
        layerWidth,
        layerHeight,
        cornerRadius,
        cornerRadius,
        "FD"
      );
    }
  }

  // Draw corner decorations based on design
  const cornerSize = 8;
  pdf.setFillColor(
    colors.cornerDecoration[0],
    colors.cornerDecoration[1],
    colors.cornerDecoration[2]
  );

  const drawCornerDecoration = (cx: number, cy: number) => {
    switch (design.cornerDecoration) {
      case "circles":
        pdf.circle(cx, cy, 2, "F");
        pdf.circle(cx + 3, cy, 1.5, "F");
        pdf.circle(cx, cy + 3, 1.5, "F");
        break;
      case "waves":
        for (let i = 0; i < 3; i++) {
          pdf.circle(cx + i * 2, cy, 1.5, "F");
        }
        break;
      case "leaves":
        pdf.circle(cx, cy, 2.5, "F");
        pdf.circle(cx + 2, cy - 1, 1.5, "F");
        pdf.circle(cx - 1, cy + 2, 1.5, "F");
        break;
      case "squares":
        pdf.rect(cx - 1.5, cy - 1.5, 3, 3, "F");
        pdf.rect(cx + 1, cy - 1.5, 2, 2, "F");
        pdf.rect(cx - 1.5, cy + 1, 2, 2, "F");
        break;
      case "hearts":
        // Simple heart shape using circles
        pdf.circle(cx, cy, 1.5, "F");
        pdf.circle(cx + 1.5, cy, 1.5, "F");
        pdf.circle(cx + 0.75, cy + 1.5, 1.2, "F");
        break;
      case "clouds":
        pdf.circle(cx, cy, 2, "F");
        pdf.circle(cx + 2, cy, 1.5, "F");
        pdf.circle(cx + 1, cy + 1.5, 1.5, "F");
        break;
      case "lines":
        pdf.setLineWidth(0.5);
        pdf.line(cx - 2, cy - 2, cx + 2, cy + 2);
        pdf.line(cx - 2, cy + 2, cx + 2, cy - 2);
        break;
      case "angular":
        pdf.setLineWidth(1);
        pdf.line(cx - 2, cy - 2, cx, cy);
        pdf.line(cx, cy, cx + 2, cy - 2);
        pdf.line(cx - 2, cy + 2, cx, cy);
        pdf.line(cx, cy, cx + 2, cy + 2);
        break;
      case "floral":
        pdf.circle(cx, cy, 2, "F");
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          pdf.circle(
            cx + Math.cos(angle) * 2.5,
            cy + Math.sin(angle) * 2.5,
            1,
            "F"
          );
        }
        break;
      case "flowing":
        for (let i = 0; i < 5; i++) {
          pdf.circle(cx + i * 1.5 - 3, cy + Math.sin(i) * 1.5, 1.2, "F");
        }
        break;
    }
  };

  // Draw corner decorations at all four corners
  drawCornerDecoration(decorativeX + cornerSize, decorativeY + cornerSize);
  drawCornerDecoration(
    decorativeX + decorativeWidth - cornerSize,
    decorativeY + cornerSize
  );
  drawCornerDecoration(
    decorativeX + cornerSize,
    decorativeY + decorativeHeight - cornerSize
  );
  drawCornerDecoration(
    decorativeX + decorativeWidth - cornerSize,
    decorativeY + decorativeHeight - cornerSize
  );

  // Add decorative patterns along borders
  const patternSpacing = design.layoutSpacing;
  pdf.setFillColor(
    colors.cornerDecoration[0],
    colors.cornerDecoration[1],
    colors.cornerDecoration[2]
  );

  switch (design.decorationPattern) {
    case "dots":
      for (
        let i = decorativeX + 15;
        i < decorativeX + decorativeWidth - 15;
        i += patternSpacing
      ) {
        pdf.circle(i, decorativeY + 3, 1, "F");
        pdf.circle(i, decorativeY + decorativeHeight - 3, 1, "F");
      }
      for (
        let i = decorativeY + 15;
        i < decorativeY + decorativeHeight - 15;
        i += patternSpacing
      ) {
        pdf.circle(decorativeX + 3, i, 1, "F");
        pdf.circle(decorativeX + decorativeWidth - 3, i, 1, "F");
      }
      break;
    case "waves":
      for (
        let i = decorativeX + 10;
        i < decorativeX + decorativeWidth - 10;
        i += patternSpacing
      ) {
        const waveY = decorativeY + 3 + Math.sin((i - decorativeX) / 5) * 1.5;
        pdf.circle(i, waveY, 1.2, "F");
        pdf.circle(
          i,
          decorativeY +
            decorativeHeight -
            3 -
            Math.sin((i - decorativeX) / 5) * 1.5,
          1.2,
          "F"
        );
      }
      break;
    case "stars":
      for (
        let i = decorativeX + 15;
        i < decorativeX + decorativeWidth - 15;
        i += patternSpacing
      ) {
        pdf.circle(i, decorativeY + 3, 1.5, "F");
        pdf.circle(i, decorativeY + decorativeHeight - 3, 1.5, "F");
      }
      break;
    case "squares":
      for (
        let i = decorativeX + 15;
        i < decorativeX + decorativeWidth - 15;
        i += patternSpacing
      ) {
        pdf.rect(i - 1, decorativeY + 2, 2, 2, "F");
        pdf.rect(i - 1, decorativeY + decorativeHeight - 4, 2, 2, "F");
      }
      break;
    case "geometric":
      for (
        let i = decorativeX + 15;
        i < decorativeX + decorativeWidth - 15;
        i += patternSpacing
      ) {
        pdf.setLineWidth(0.3);
        pdf.line(i - 2, decorativeY + 2, i + 2, decorativeY + 2);
        pdf.line(i, decorativeY, i, decorativeY + 4);
      }
      break;
  }
};

// Helper function to draw decorative title without background bar
const drawDecorativeTitle = (
  pdf: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number,
  colors: ColorPalette,
  design: DesignStyle,
  borderMargin: number,
  borderWidth: number
) => {
  // Draw title text (black color, no background)
  const textY = borderMargin + 35; // Position below border margin
  pdf.setFontSize(design.titleFontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0); // Black text
  pdf.text(title, x, textY, { align: "center" });

  // Reset text color
  pdf.setTextColor(0, 0, 0);
};

// Helper function to draw page background (white background + decorative border + content area)
const drawPageBackground = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  borderMargin: number,
  borderWidth: number,
  borderHeight: number,
  colors: ColorPalette,
  design: DesignStyle
) => {
  // Draw white background for entire page
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Draw decorative border
  drawDecorativeBorder(
    pdf,
    borderMargin,
    borderMargin,
    borderWidth,
    borderHeight,
    colors,
    design
  );

  // Ensure inner content area remains white
  const borderThickness = design.borderThickness;
  const innerX = borderMargin + borderThickness * design.borderLayers;
  const innerY = borderMargin + borderThickness * design.borderLayers;
  const innerWidth = borderWidth - 2 * borderThickness * design.borderLayers;
  const innerHeight = borderHeight - 2 * borderThickness * design.borderLayers;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(innerX, innerY, innerWidth, innerHeight, "F");
};

// Helper function to draw page title
const drawPageTitle = (
  pdf: jsPDF,
  title: string,
  pageWidth: number,
  titleY: number,
  titleWidth: number,
  colors: ColorPalette,
  design: DesignStyle,
  borderMargin: number,
  borderWidth: number
) => {
  drawDecorativeTitle(
    pdf,
    title,
    pageWidth / 2,
    titleY,
    titleWidth,
    colors,
    design,
    borderMargin,
    borderWidth
  );
};

// Helper function to draw page footer
const drawPageFooter = (
  pdf: jsPDF,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
  footerNote?: string
) => {
  // Position footer below border (border margin is 10mm, so footer at 5mm from bottom)
  const footerY = pageHeight - 15;

  // Draw footer note if provided (e.g., "Answers on page X")
  if (footerNote) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100); // Gray color for the note
    pdf.text(footerNote, pageWidth - 18 - 5, footerY, {
      align: "right",
    });
  }

  // Draw page number only if pageNumber > 0 (0 means no page number for cover/TOC pages)
  if (pageNumber > 0) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${pageNumber}`, pageWidth / 2, footerY, {
      align: "center",
    });
  }
};

// Helper function to draw cover page
const drawCoverPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  coverImage: string | undefined,
  colors: ColorPalette,
  design: DesignStyle
) => {
  // Draw white background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  const borderMargin = 10;
  const borderWidth = pageWidth - 2 * borderMargin;
  const borderHeight = pageHeight - 2 * borderMargin;
  const innerOffset = design.borderThickness * design.borderLayers;
  const innerX = borderMargin + innerOffset;
  const innerY = borderMargin + innerOffset;
  const innerWidth = borderWidth - 2 * innerOffset;
  const innerHeight = borderHeight - 2 * innerOffset;

  drawDecorativeBorder(
    pdf,
    borderMargin,
    borderMargin,
    borderWidth,
    borderHeight,
    colors,
    design
  );

  pdf.setFillColor(255, 255, 255);
  pdf.rect(innerX, innerY, innerWidth, innerHeight, "F");

  if (coverImage) {
    try {
      // Detect image format
      const format =
        coverImage.startsWith("data:image/jpeg") ||
        coverImage.startsWith("data:image/jpg")
          ? "JPEG"
          : "PNG";

      pdf.addImage(coverImage, format, innerX, innerY, innerWidth, innerHeight);
    } catch (error) {
      console.error("Error adding cover image:", error);
    }
  }
};

// Helper function to convert text to Title Case (first letter uppercase, rest lowercase)
const toTitleCase = (text: string): string => {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to draw table of contents page
const drawTableOfContents = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  borderMargin: number,
  borderWidth: number,
  borderHeight: number,
  colors: ColorPalette,
  design: DesignStyle,
  topics: string[],
  introPageNumber: number,
  howToPlayPageNumber: number,
  startPageNumber: number
) => {
  // Draw page background
  drawPageBackground(
    pdf,
    pageWidth,
    pageHeight,
    borderMargin,
    borderWidth,
    borderHeight,
    colors,
    design
  );

  // Draw title
  const titleY = 40;
  drawPageTitle(
    pdf,
    "TABLE OF CONTENTS",
    pageWidth,
    titleY,
    150,
    colors,
    design,
    borderMargin,
    borderWidth
  );

  // Draw table of contents items
  const margin = 18;
  const contentStartY = titleY + 30;
  const lineHeight = 12;
  const pageNumberWidth = 30;

  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  let currentY = contentStartY;

  // Draw Introduction entry
  const drawTOCEntry = (title: string, pageNumber: number | string) => {
    pdf.text(title.toUpperCase(), margin, currentY);

    // Draw page numbers with dots
    const titleWidth = pdf.getTextWidth(title.toUpperCase());
    const dotsStartX = margin + titleWidth + 5;
    const dotsEndX = pageWidth - margin - pageNumberWidth - 5;
    const dotsY = currentY - 2;

    // Draw dots
    const dotSpacing = 3;
    for (let x = dotsStartX; x < dotsEndX; x += dotSpacing) {
      pdf.circle(x, dotsY, 0.5, "F");
    }

    // Draw page number
    pdf.text(
      String(pageNumber),
      pageWidth - margin - pageNumberWidth,
      currentY,
      { align: "right" }
    );

    currentY += lineHeight;
  };

  // Add Introduction
  drawTOCEntry("Introduction", introPageNumber);

  // Add How to Play
  drawTOCEntry("How to Play", howToPlayPageNumber);

  // Add topics
  topics.forEach((topic, index) => {
    const vocabularyPage = startPageNumber + index * 2;
    const gridPage = startPageNumber + index * 2 + 1;

    drawTOCEntry(topic, `${vocabularyPage}-${gridPage}`);
  });

  // Draw footer
  drawPageFooter(pdf, 2, pageWidth, pageHeight);
};

// Helper to draw a full-width TOC entry with circle indicator
const drawFullWidthTOCEntry = (
  pdf: jsPDF,
  title: string,
  pageNumber: number | string,
  x: number,
  y: number,
  width: number,
  colors: ColorPalette,
  lineHeight: number,
  isBold: boolean = false,
  hasUnderline: boolean = false,
  showCircle: boolean = false
): number => {
  const circleRadius = 2;
  let textStartX = x;
  const pageNumberText =
    pageNumber === "" || pageNumber === null || pageNumber === undefined
      ? ""
      : String(pageNumber);

  if (showCircle) {
    const circleX = x + circleRadius + 2;
    const circleY = y - circleRadius;
    pdf.setFillColor(
      colors.titleBackground[0],
      colors.titleBackground[1],
      colors.titleBackground[2]
    );
    pdf.circle(circleX, circleY, circleRadius, "F");
    textStartX = circleX + circleRadius + 5;
  }

  // Calculate available width for text (accounting for page number and spacing)
  const pageNumberX = x + width - 5;
  const pageNumberWidth = pageNumberText ? pdf.getTextWidth(pageNumberText) : 0;
  const reservedWidth = pageNumberWidth + 10; // Space for page number and padding
  const availableTextWidth = pageNumberX - textStartX - reservedWidth;

  // Draw title text (Title Case) with text wrapping
  const titleText = toTitleCase(title);
  const fontSize = isBold ? 16 : 14;
  pdf.setFontSize(fontSize);
  pdf.setFont("helvetica", isBold ? "bold" : "normal");
  pdf.setTextColor(0, 0, 0);

  // Split text to fit within available width
  const textLines = pdf.splitTextToSize(
    titleText,
    Math.max(availableTextWidth, 20)
  );
  let currentY = y;

  // Draw each line of text
  textLines.forEach((line: string, lineIndex: number) => {
    pdf.text(line, textStartX, currentY);
    if (lineIndex < textLines.length - 1) {
      currentY += lineHeight * 0.65; // Further reduced spacing for wrapped lines
    }
  });

  // Draw underline if requested (only on last line)
  if (hasUnderline && textLines.length > 0) {
    const lastLineWidth = pdf.getTextWidth(textLines[textLines.length - 1]);
    pdf.setDrawColor(
      colors.titleBackground[0],
      colors.titleBackground[1],
      colors.titleBackground[2]
    );
    pdf.setLineWidth(1);
    pdf.line(
      textStartX,
      currentY + 2,
      textStartX + lastLineWidth,
      currentY + 2
    );
    pdf.setLineWidth(0.2);
  }

  // Draw dots between title and page number (only if page number exists)
  const lastLineWidth =
    textLines.length > 0
      ? pdf.getTextWidth(textLines[textLines.length - 1])
      : 0;
  const dotsStartX = textStartX + lastLineWidth + 5;

  if (pageNumberText) {
    const dotsEndX = pageNumberX - pageNumberWidth - 5;
    const dotsY = currentY - 2;

    if (dotsEndX > dotsStartX) {
      const dotSpacing = 3;
      for (let dx = dotsStartX; dx < dotsEndX; dx += dotSpacing) {
        pdf.circle(dx, dotsY, 0.5, "F");
      }
    }

    // Draw page number aligned with last line of text
    pdf.text(pageNumberText, pageNumberX, currentY, {
      align: "right",
    });
  } else {
    const dotsY = currentY - 2;
    const dotSpacing = 3;
    for (let dx = dotsStartX; dx < x + width - 10; dx += dotSpacing) {
      pdf.circle(dx, dotsY, 0.5, "F");
    }
  }

  // Return the Y position after all lines
  return currentY + lineHeight * 0.85; // Further reduced spacing after entry
};

// Helper to draw a two-column TOC entry with circle indicator
const drawTwoColumnTOCEntry = (
  pdf: jsPDF,
  title: string,
  pageNumber: number | string,
  x: number,
  y: number,
  columnWidth: number,
  colors: ColorPalette,
  lineHeight: number
): number => {
  const circleRadius = 1.5; // Smaller circle for topics
  const circleX = x + circleRadius + 2;
  const circleY = y - circleRadius;
  const textStartX = circleX + circleRadius + 5;

  // Draw colored circle
  pdf.setFillColor(
    colors.titleBackground[0],
    colors.titleBackground[1],
    colors.titleBackground[2]
  );
  pdf.circle(circleX, circleY, circleRadius, "F");

  // Calculate available width for text (accounting for page number and spacing)
  const pageNumberWidth = pdf.getTextWidth(String(pageNumber));
  const reservedWidth = pageNumberWidth + 10; // Space for page number and padding
  const availableTextWidth = columnWidth - (textStartX - x) - reservedWidth;

  // Draw title text (Title Case) with text wrapping
  const titleText = toTitleCase(title);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);

  // Split text to fit within available width
  const textLines = pdf.splitTextToSize(
    titleText,
    Math.max(availableTextWidth, 20)
  );
  let currentY = y;

  // Draw each line of text
  textLines.forEach((line: string, lineIndex: number) => {
    pdf.text(line, textStartX, currentY);
    if (lineIndex < textLines.length - 1) {
      currentY += lineHeight * 0.65; // Further reduced spacing for wrapped lines
    }
  });

  // Draw dots between title and page number within column width (only on last line)
  const lastLineWidth =
    textLines.length > 0
      ? pdf.getTextWidth(textLines[textLines.length - 1])
      : 0;
  const dotsStartX = textStartX + lastLineWidth + 5;
  const dotsEndX = x + columnWidth - pageNumberWidth - 5;
  const dotsY = currentY - 2;

  if (dotsEndX > dotsStartX) {
    const dotSpacing = 3;
    for (let dx = dotsStartX; dx < dotsEndX; dx += dotSpacing) {
      pdf.circle(dx, dotsY, 0.5, "F");
    }
  }

  // Page number aligned right within column, aligned with last line of text
  pdf.text(String(pageNumber), x + columnWidth, currentY, { align: "right" });

  // Return the Y position after all lines
  return currentY + lineHeight * 0.85; // Further reduced spacing after entry
};

// Helper to draw TOC section heading styled like introduction headings
const drawTocSectionHeading = (
  pdf: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number,
  colors: ColorPalette
): number => {
  const headingFontSize = 16;
  const headingLineHeight = 7; // Reduced from 8
  const spacingAfter = 3; // Reduced from 5
  const headingText = title.toUpperCase();

  pdf.setFontSize(headingFontSize);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(
    colors.titleBackground[0],
    colors.titleBackground[1],
    colors.titleBackground[2]
  );

  // Split text to fit within available width
  const textLines = pdf.splitTextToSize(headingText, Math.max(width, 20));
  let currentY = y;

  // Draw each line of text
  textLines.forEach((line: string, lineIndex: number) => {
    pdf.text(line, x, currentY);
    if (lineIndex < textLines.length - 1) {
      currentY += headingLineHeight * 0.7; // Reduced spacing
    }
  });

  // Draw underline on last line only
  const underlineY = currentY + headingLineHeight - 1.5;
  const lastLineWidth =
    textLines.length > 0
      ? pdf.getTextWidth(textLines[textLines.length - 1])
      : width;
  pdf.setDrawColor(
    colors.titleBackground[0],
    colors.titleBackground[1],
    colors.titleBackground[2]
  );
  pdf.setLineWidth(0.6);
  pdf.line(x, underlineY, x + Math.min(lastLineWidth, width), underlineY);
  pdf.setLineWidth(0.2);
  pdf.setTextColor(0, 0, 0);

  return currentY + headingLineHeight + spacingAfter;
};

// Two-column, multi-page Table of Contents renderer with three sections
// Returns the number of TOC pages rendered.
const drawTableOfContentsMulti = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  borderMargin: number,
  borderWidth: number,
  borderHeight: number,
  colors: ColorPalette,
  design: DesignStyle,
  topics: string[],
  introPageNumber: number,
  howToPlayPageNumber: number,
  wordSearchStartPage: number,
  answerPageStart: number,
  startingTocPageNumber: number
): number => {
  // Layout constants - optimized for maximum space usage
  const titleY = 40;
  const margin = 15; // Reduced from 18
  const contentStartY = titleY + 25; // Reduced from 30 (for first page with title)
  const contentStartYNoTitle = borderMargin + 10; // For pages without title (page 2+)
  const bottomLimitFirstPage = pageHeight - 15; // First page with footer space
  const bottomLimitOtherPages = pageHeight - 10; // Other pages, use more space
  const lineHeight = 9.5; // Further reduced from 10 for tighter spacing
  const sectionSpacing = 3; // Further reduced from 4
  const columnGap = 15; // Reduced from 20
  const contentWidth = pageWidth - 2 * margin;
  const rowsPerColumn = Math.floor(
    (bottomLimitFirstPage - contentStartY) / lineHeight
  );

  // Structure:
  // Part 1: Introduction (full width) + How To Play (full width) = 2 rows
  // Part 2: "Word search by topic" header (full width) = 1 row + topics (2 topics per row)
  // Part 3: Answer (full width) = 1 row
  // Total full-width rows = 4 (Intro, How To Play, Header, Answer)
  // Topic rows = Math.ceil(topics.length / 2) (2 topics per row)

  // Calculate pages needed
  const fullWidthRows = 4; // Intro, How To Play, Header, Answer
  const topicRows = Math.ceil(topics.length / 2); // 2 topics per row
  const totalRows = fullWidthRows + topicRows;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerColumn));

  let currentPage = 0;
  let currentY = contentStartY;
  let currentBottomLimit = bottomLimitFirstPage; // Track bottom limit for current page

  // Helper to start a new page
  const startNewPage = () => {
    if (currentPage > 0) {
      // Draw footer on previous page before adding new one (TOC pages don't have page numbers)
      drawPageFooter(
        pdf,
        0, // 0 means no page number for TOC pages
        pageWidth,
        pageHeight
      );
      pdf.addPage();
    }
    currentPage++;

    // Draw page background
    drawPageBackground(
      pdf,
      pageWidth,
      pageHeight,
      borderMargin,
      borderWidth,
      borderHeight,
      colors,
      design
    );

    // Only draw title on first page
    if (currentPage === 1) {
      drawPageTitle(
        pdf,
        "TABLE OF CONTENTS",
        pageWidth,
        titleY,
        150,
        colors,
        design,
        borderMargin,
        borderWidth
      );
      currentY = contentStartY;
      currentBottomLimit = bottomLimitFirstPage;
    } else {
      // For subsequent pages, start content higher (no title) and use full page
      currentY = contentStartYNoTitle; // Start much higher
      currentBottomLimit = bottomLimitOtherPages; // Use more space
    }

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
  };

  // Start first page
  startNewPage();

  // Part 1: Introduction and How To Play (full width, bold and larger)
  if (currentY + lineHeight > currentBottomLimit) {
    startNewPage();
  }
  currentY = drawFullWidthTOCEntry(
    pdf,
    "Introduction",
    introPageNumber,
    margin,
    currentY,
    contentWidth,
    colors,
    lineHeight,
    true // isBold
  );

  // Check if we exceeded bottom limit after drawing (in case text wrapped)
  if (currentY > currentBottomLimit) {
    startNewPage();
  }

  if (currentY + lineHeight > currentBottomLimit) {
    startNewPage();
  }
  currentY = drawFullWidthTOCEntry(
    pdf,
    "How to Play",
    howToPlayPageNumber,
    margin,
    currentY,
    contentWidth,
    colors,
    lineHeight,
    true // isBold
  );

  // Check if we exceeded bottom limit after drawing
  if (currentY > currentBottomLimit) {
    startNewPage();
  }

  // Add spacing before Part 2
  currentY += sectionSpacing * 0.4; // Further reduced spacing

  // Part 2: "Word search by topic" header styled like introduction headings
  if (currentY + lineHeight > currentBottomLimit) {
    startNewPage();
  }
  currentY = drawTocSectionHeading(
    pdf,
    "Word Search By Topic",
    margin,
    currentY,
    contentWidth,
    colors
  );

  // Add top padding before topics list
  const topicsTopPadding = 3; // Further reduced from 4
  currentY += topicsTopPadding;

  // Topics in 2 columns layout (2 topics per row)
  // Calculate how many topics per row based on available width
  const topicsPerRow = 2; // 2 topics per row
  const topicEntryWidth =
    (contentWidth - (topicsPerRow - 1) * columnGap) / topicsPerRow;

  let rowStartY = currentY;
  let rowMaxY = currentY; // Track the maximum Y in current row
  let topicsInCurrentRow = 0;

  topics.forEach((topic, index) => {
    const vocabularyPage = wordSearchStartPage + index * 2;

    // Check if we need to start a new row (after completing previous row)
    if (topicsInCurrentRow > 0 && topicsInCurrentRow % topicsPerRow === 0) {
      // Move to next row
      currentY = rowMaxY + 0.8; // Further reduced spacing between rows
      rowStartY = currentY;
      rowMaxY = currentY;
    }

    // Check if we need a new page
    if (rowStartY + lineHeight * 3 > currentBottomLimit) {
      startNewPage();
      rowStartY = currentY; // Use currentY which is set by startNewPage
      rowMaxY = currentY;
      topicsInCurrentRow = 0;
    }

    // Calculate position for this topic (2 topics per row)
    const colIndex = topicsInCurrentRow % topicsPerRow;
    const x = margin + colIndex * (topicEntryWidth + columnGap);
    const y = rowStartY;

    // Draw topic entry
    const newY = drawTwoColumnTOCEntry(
      pdf,
      topic,
      vocabularyPage,
      x,
      y,
      topicEntryWidth,
      colors,
      lineHeight
    );

    // Update rowMaxY to track the bottom of the current row
    if (newY > rowMaxY) {
      rowMaxY = newY;
    }

    // Check if text wrapped and exceeded bottom limit
    if (rowMaxY > currentBottomLimit) {
      startNewPage();
      rowStartY = currentY; // Use currentY which is set by startNewPage
      rowMaxY = currentY;
      topicsInCurrentRow = 0;
      // Redraw on new page
      const redrawX = margin;
      const redrawY = currentY;
      rowMaxY = drawTwoColumnTOCEntry(
        pdf,
        topic,
        vocabularyPage,
        redrawX,
        redrawY,
        topicEntryWidth,
        colors,
        lineHeight
      );
      currentY = rowMaxY;
    }

    topicsInCurrentRow++;
  });

  // Update currentY to the bottom of the last row
  currentY = rowMaxY;
  currentY += sectionSpacing * 0.4; // Further reduced spacing before Answer section

  // Part 3: Answer (full width with circle, bold and larger)
  if (currentY + lineHeight > currentBottomLimit) {
    startNewPage();
  }
  currentY = drawFullWidthTOCEntry(
    pdf,
    "Answer",
    answerPageStart,
    margin,
    currentY,
    contentWidth,
    colors,
    lineHeight,
    true // isBold
  );

  // Check if we exceeded bottom limit after drawing
  if (currentY > currentBottomLimit) {
    startNewPage();
  }

  // Draw footer on last page (TOC pages don't have page numbers)
  drawPageFooter(
    pdf,
    0, // 0 means no page number for TOC pages
    pageWidth,
    pageHeight
  );

  return totalPages;
};

const isLikelyHeading = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (trimmed.endsWith(":")) return true;
  const alphabetic = trimmed.replace(/[^A-Za-z]/g, "");
  if (!alphabetic) return false;
  return trimmed === trimmed.toUpperCase();
};

const parseIntroductionContent = (text: string): IntroductionBlock[] => {
  const sections = text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0);

  const blocks: IntroductionBlock[] = [];

  sections.forEach((lines) => {
    if (lines.length === 1 && isLikelyHeading(lines[0])) {
      blocks.push({
        type: "heading",
        lines: [lines[0].replace(/:$/, "").trim()],
      });
      return;
    }

    // Case 1: Each line starts with a bullet marker (-, •, or *)
    if (lines.every((line) => /^[-•*]\s+/.test(line))) {
      blocks.push({
        type: "bullets",
        lines: lines.map((line) => line.replace(/^[-•*]\s+/, "").trim()),
      });
      return;
    }

    // Case 2: Single line that includes multiple inline asterisk bullets: "* item one. * item two. * item three"
    if (lines.length === 1 && /(?:^|\s)\*\s+/.test(lines[0])) {
      const items = lines[0]
        .split(/\s*\*\s+/)
        .map((s) => s.trim().replace(/^[\-\u2022]\s+/, "")) // also strip stray - or •
        .filter((s) => s.length > 0);
      if (items.length >= 2) {
        blocks.push({
          type: "bullets",
          lines: items,
        });
        return;
      }
    }

    const paragraphText = lines.join(" ").replace(/\s+/g, " ").trim();
    if (paragraphText) {
      blocks.push({
        type: "paragraph",
        lines: [paragraphText],
      });
    }
  });

  return blocks;
};

// Basic HTML detection
const isHtmlIntroduction = (text: string): boolean => {
  if (!text) return false;
  // Heuristic: if it contains HTML block tags we support
  return /<(h1|h2|h3|p|ul|ol|li)(\s|>)/i.test(text);
};

// Strip any remaining HTML tags
const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Parse a very small safe subset of HTML into IntroductionBlock[]
// Supported:
// - <h1>, <h2>, <h3> -> heading
// - <p> -> paragraph
// - <ul><li>...</li></ul> -> bullets
// - <ol><li>...</li></ol> -> bullets (numbering ignored in PDF text mode)
// Inline tags like <strong>, <em>, <b>, <i> are stripped (no rich-text rendering)
const parseIntroductionHtml = (html: string): IntroductionBlock[] => {
  if (!html || typeof html !== "string") return [];

  const normalized = html
    // Normalize newlines to spaces to simplify regex parsing
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ");

  const blocks: IntroductionBlock[] = [];

  // Process block tags in-order by scanning the string
  // Find the next occurrence of any supported block tag
  const blockRegex = /<(h1|h2|h3|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(normalized)) !== null) {
    const [full, tag, inner] = match;
    // Text between lastIndex and current match (if any) -> as a paragraph
    const interstitial = normalized.slice(lastIndex, match.index).trim();
    if (interstitial) {
      const clean = stripTags(interstitial);
      if (clean) {
        blocks.push({ type: "paragraph", lines: [clean] });
      }
    }

    const innerHtml = inner;
    switch (tag.toLowerCase()) {
      case "h1":
      case "h2":
      case "h3": {
        const heading = stripTags(innerHtml);
        if (heading) {
          blocks.push({ type: "heading", lines: [heading] });
        }
        break;
      }
      case "p": {
        const paragraph = stripTags(innerHtml);
        if (paragraph) {
          blocks.push({ type: "paragraph", lines: [paragraph] });
        }
        break;
      }
      case "ul":
      case "ol": {
        // Collect li items
        const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
        const items: string[] = [];
        let liMatch: RegExpExecArray | null;
        while ((liMatch = liRegex.exec(innerHtml)) !== null) {
          const item = stripTags(liMatch[1]);
          if (item) items.push(item);
        }
        if (items.length) {
          blocks.push({ type: "bullets", lines: items });
        }
        break;
      }
    }

    lastIndex = match.index + full.length;
  }

  // Trailing text after last block
  const trailing = normalized.slice(lastIndex).trim();
  if (trailing) {
    const clean = stripTags(trailing);
    if (clean) {
      blocks.push({ type: "paragraph", lines: [clean] });
    }
  }

  return blocks;
};

// Helper function to draw introduction page
const drawIntroduction = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  borderMargin: number,
  borderWidth: number,
  borderHeight: number,
  colors: ColorPalette,
  design: DesignStyle,
  introductionText: string | undefined,
  pageNumber: number
) => {
  // Draw page background
  drawPageBackground(
    pdf,
    pageWidth,
    pageHeight,
    borderMargin,
    borderWidth,
    borderHeight,
    colors,
    design
  );

  // Draw title
  const titleY = 40;
  drawPageTitle(
    pdf,
    "INTRODUCTION",
    pageWidth,
    titleY,
    150,
    colors,
    design,
    borderMargin,
    borderWidth
  );

  // Draw introduction text
  const margin = 18;
  const contentStartY = titleY + 25;
  const maxWidth = pageWidth - 2 * margin;
  const parsedBlocks =
    introductionText && introductionText.trim()
      ? isHtmlIntroduction(introductionText)
        ? parseIntroductionHtml(introductionText.trim())
        : parseIntroductionContent(introductionText.trim())
      : [];

  pdf.setTextColor(0, 0, 0);

  const defaultText = [
    "Welcome to this Word Search puzzle book!",
    "",
    "This book contains a collection of word search puzzles designed to help you learn and practice vocabulary in a fun and engaging way.",
    "",
    "Each puzzle focuses on a specific topic, allowing you to explore different themes while improving your word recognition skills.",
    "",
    "We hope you enjoy solving these puzzles and expanding your vocabulary!",
  ];

  let currentY = contentStartY;

  // Debug marker: if introduction text contains "§", show a small green dot next to the title.
  // Also strip all "§" occurrences from the content before rendering.
  let hasCssDebugMarker = false;
  let sanitizedIntroduction = introductionText?.trim() || "";
  if (sanitizedIntroduction.includes("§")) {
    hasCssDebugMarker = true;
    sanitizedIntroduction = sanitizedIntroduction.replace(/§+/g, "");
  }

  // If we sanitized, re-parse blocks accordingly
  if (
    sanitizedIntroduction &&
    sanitizedIntroduction !== introductionText?.trim()
  ) {
    if (isHtmlIntroduction(sanitizedIntroduction)) {
      const htmlBlocks = parseIntroductionHtml(sanitizedIntroduction);
      if (htmlBlocks.length) {
        // Replace parsed blocks with sanitized blocks
        (parsedBlocks as unknown as IntroductionBlock[]).length = 0;
        htmlBlocks.forEach((b) =>
          (parsedBlocks as unknown as IntroductionBlock[]).push(b)
        );
      }
    } else {
      const plainBlocks = parseIntroductionContent(sanitizedIntroduction);
      if (plainBlocks.length) {
        (parsedBlocks as unknown as IntroductionBlock[]).length = 0;
        plainBlocks.forEach((b) =>
          (parsedBlocks as unknown as IntroductionBlock[]).push(b)
        );
      }
    }
  }

  // Render the visual debug dot if requested
  if (hasCssDebugMarker) {
    // Draw a small green dot to the right of the title area
    pdf.setFillColor(0, 180, 90);
    // Title baseline is at titleY; we place the dot near the right margin inside border
    const dotX = pageWidth - 22; // inside border
    const dotY = titleY - 2; // slightly above title baseline
    pdf.circle(dotX, dotY, 1.5, "F");
  }

  if (parsedBlocks.length === 0) {
    const lineHeight = 7;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");

    defaultText.forEach((line) => {
      if (line === "") {
        currentY += 3;
        return;
      }

      const lines = pdf.splitTextToSize(line, maxWidth);
      lines.forEach((l: string) => {
        if (currentY > pageHeight - 35) return;
        pdf.text(l, margin, currentY);
        currentY += lineHeight;
      });
      currentY += 4;
    });
  } else {
    const headingFontSize = 16;
    const headingLineHeight = 8;
    const paragraphFontSize = 11;
    const paragraphLineHeight = 6.5;
    const bulletFontSize = 11;
    const bulletLineHeight = 6;
    const bulletIndent = 6;
    const bulletRadius = 1.2;
    const bottomLimit = pageHeight - 35;

    parsedBlocks.forEach((block, index) => {
      if (currentY > bottomLimit) {
        return;
      }

      switch (block.type) {
        case "heading": {
          const headingText = block.lines[0];
          pdf.setFontSize(headingFontSize);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(
            colors.titleBackground[0],
            colors.titleBackground[1],
            colors.titleBackground[2]
          );
          pdf.text(headingText.toUpperCase(), margin, currentY);
          currentY += headingLineHeight;

          pdf.setDrawColor(
            colors.titleBackground[0],
            colors.titleBackground[1],
            colors.titleBackground[2]
          );
          pdf.setLineWidth(0.6);
          pdf.line(margin, currentY - 1.5, pageWidth - margin, currentY - 1.5);
          pdf.setLineWidth(0.2);

          currentY += 5;
          pdf.setTextColor(0, 0, 0);
          break;
        }

        case "bullets": {
          pdf.setFontSize(bulletFontSize);
          pdf.setFont("helvetica", "normal");

          block.lines.forEach((line) => {
            if (currentY > bottomLimit) return;

            const textLines = pdf.splitTextToSize(
              line,
              maxWidth - bulletIndent
            );

            textLines.forEach((textLine: string, lineIndex: number) => {
              if (currentY > bottomLimit) return;

              if (lineIndex === 0) {
                const bulletCenterY = currentY - bulletLineHeight / 2 + 2;
                pdf.setFillColor(
                  colors.titleBackground[0],
                  colors.titleBackground[1],
                  colors.titleBackground[2]
                );
                pdf.circle(
                  margin + bulletRadius,
                  bulletCenterY,
                  bulletRadius,
                  "F"
                );
              }

              pdf.setTextColor(0, 0, 0);
              pdf.text(textLine, margin + bulletIndent, currentY);
              currentY += bulletLineHeight;
            });

            currentY += 2;
          });

          currentY += 4;
          break;
        }

        case "paragraph":
        default: {
          const paragraphText = block.lines
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          if (!paragraphText) break;

          pdf.setFontSize(paragraphFontSize);
          pdf.setFont("helvetica", "normal");

          // Standard paragraph (no highlight or border)
          const lines = pdf.splitTextToSize(paragraphText, maxWidth);
          lines.forEach((line: string) => {
            if (currentY > bottomLimit) return;
            pdf.setTextColor(0, 0, 0);
            pdf.text(line, margin, currentY);
            currentY += paragraphLineHeight;
          });
          currentY += 6;
          break;
        }
      }
    });
  }

  // Draw footer
  drawPageFooter(pdf, pageNumber, pageWidth, pageHeight);
};

// Helper function to draw rules & directions page with illustration
const drawRulesAndDirections = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  borderMargin: number,
  borderWidth: number,
  borderHeight: number,
  colors: ColorPalette,
  design: DesignStyle,
  pageNumber: number
) => {
  // Draw page background
  drawPageBackground(
    pdf,
    pageWidth,
    pageHeight,
    borderMargin,
    borderWidth,
    borderHeight,
    colors,
    design
  );

  // Draw title
  const titleY = 40;
  drawPageTitle(
    pdf,
    "HOW TO PLAY",
    pageWidth,
    titleY,
    150,
    colors,
    design,
    borderMargin,
    borderWidth
  );

  const margin = 18;
  const contentStartY = titleY + 15;

  // Draw subtitle
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    "Follow these simple steps to solve word search puzzles",
    pageWidth / 2,
    contentStartY,
    { align: "center" }
  );

  let currentY = contentStartY + 15;

  // Draw instructions with styled boxes
  const instructions = [
    {
      number: 1,
      title: "Read the Word List",
      text: "Look at the word list on the vocabulary page. These are the words you need to find.",
    },
    {
      number: 2,
      title: "Search in the Grid",
      text: "Find each word in the grid on the puzzle page. Words are hidden among random letters.",
    },
    {
      number: 3,
      title: "Check All Directions",
      text: "Words can be found horizontally, vertically, or diagonally. They can also be read forward or backward.",
    },
    {
      number: 4,
      title: "Mark Your Findings",
      text: "Circle or highlight each word as you find it to keep track of your progress.",
    },
    {
      number: 5,
      title: "Verify Your Answers",
      text: "Check your answers on the answer key pages at the end of the book.",
    },
  ];

  const boxWidth = pageWidth - 2 * margin;
  const boxHeight = 14; // Reduced height
  const boxSpacing = 4; // Reduced spacing between items
  const numberCircleSize = 7; // Slightly smaller circle

  instructions.forEach((instruction, index) => {
    const boxY = currentY;

    // Draw number circle (no background box)
    const numberX = margin + 5;
    const numberY = boxY + 7; // Center vertically in reduced height

    // Circle background with accent color
    pdf.setFillColor(
      colors.titleBackground[0],
      colors.titleBackground[1],
      colors.titleBackground[2]
    );
    pdf.circle(numberX, numberY, numberCircleSize, "F");

    // Circle border
    pdf.setDrawColor(
      colors.titleBackgroundStroke[0],
      colors.titleBackgroundStroke[1],
      colors.titleBackgroundStroke[2]
    );
    pdf.setLineWidth(0.5);
    pdf.circle(numberX, numberY, numberCircleSize, "D");

    // Number text (white)
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(instruction.number), numberX, numberY + 2, {
      align: "center",
    });

    // Instruction title
    const titleX = margin + 20;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(
      colors.titleBackground[0],
      colors.titleBackground[1],
      colors.titleBackground[2]
    );
    pdf.text(instruction.title, titleX, boxY + 5);

    // Instruction text
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    const textLines = pdf.splitTextToSize(instruction.text, boxWidth - 30);
    textLines.forEach((line: string, lineIndex: number) => {
      pdf.text(line, titleX, boxY + 10 + lineIndex * 3.5);
    });

    // Calculate actual height used by this instruction
    const actualHeight = Math.max(boxHeight, 10 + textLines.length * 3.5);
    currentY += actualHeight + boxSpacing;
  });

  // Draw illustration - example grid showing how to find words
  // Calculate available width within border margins
  const contentAreaWidth = pageWidth - 2 * margin;
  const illustrationSize = Math.min(55, contentAreaWidth - 10); // Ensure it fits with padding
  const illustrationX = margin + (contentAreaWidth - illustrationSize) / 2; // Center within content area
  const illustrationY = currentY + 10;

  // Example grid: 5x5 showing sample words
  const exampleGridSize = 5;
  const cellSize = illustrationSize / exampleGridSize;

  // Fixed example grid letters (deterministic)
  const exampleLetters = [
    ["S", "A", "R", "B", "L"],
    ["H", "U", "E", "M", "D"],
    ["P", "O", "N", "Q", "O"],
    ["W", "C", "A", "T", "G"],
    ["Y", "L", "E", "R", "S"],
  ];

  const highlightLines = [
    {
      startRow: 3,
      startCol: 1,
      endRow: 3,
      endCol: 3,
      color: colors.titleBackground,
      word: "CAT",
      direction: "horizontal",
    },
    {
      startRow: 1,
      startCol: 4,
      endRow: 3,
      endCol: 4,
      color: colors.titleBackground,
      word: "DOG",
      direction: "vertical",
    },
    {
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 2,
      color: colors.titleBackground,
      word: "SUN",
      direction: "diagonal",
    },
  ];

  // Draw grid cells - no background, just borders and text
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setLineWidth(0.2);

  // First, draw all cell borders
  for (let row = 0; row < exampleGridSize; row++) {
    for (let col = 0; col < exampleGridSize; col++) {
      const x = illustrationX + col * cellSize;
      const y = illustrationY + row * cellSize;

      // Draw cell border (light gray)
      pdf.setDrawColor(230, 230, 230);
      pdf.rect(x, y, cellSize, cellSize, "D");
    }
  }

  // Then, draw highlight lines FIRST (behind the text) so text appears on top
  pdf.setLineCap("round");
  highlightLines.forEach((line) => {
    pdf.setDrawColor(line.color[0], line.color[1], line.color[2]);
    pdf.setLineWidth(1.2);
    const startX = illustrationX + line.startCol * cellSize + cellSize / 2;
    const startY = illustrationY + line.startRow * cellSize + cellSize / 2;
    const endX = illustrationX + line.endCol * cellSize + cellSize / 2;
    const endY = illustrationY + line.endRow * cellSize + cellSize / 2;
    pdf.line(startX, startY, endX, endY);
  });
  pdf.setLineCap("butt");
  pdf.setLineWidth(0.2);

  // Finally, draw all letters on top of the highlight lines
  for (let row = 0; row < exampleGridSize; row++) {
    for (let col = 0; col < exampleGridSize; col++) {
      const x = illustrationX + col * cellSize;
      const y = illustrationY + row * cellSize;

      // Get letter from fixed grid
      const letter = exampleLetters[row][col];

      // Draw letter
      pdf.setTextColor(
        colors.cellText[0],
        colors.cellText[1],
        colors.cellText[2]
      );
      pdf.text(letter, x + cellSize / 2, y + cellSize / 2 + 1.5, {
        align: "center",
      });
    }
  }

  // Add label below illustration
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text(
    `Highlighted examples: ${highlightLines
      .map((line) => `"${line.word}" (${line.direction})`)
      .join(", ")}`,
    pageWidth / 2,
    illustrationY + illustrationSize + 8,
    { align: "center" }
  );

  // Add tip box at the bottom (ensure it's within border)
  const tipY = illustrationY + illustrationSize + 20;
  const bottomMargin = pageHeight - borderMargin - 20; // Leave space for footer
  if (tipY + 15 < bottomMargin) {
    pdf.setFillColor(255, 250, 230); // Light yellow background
    pdf.setDrawColor(255, 200, 100); // Orange border
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, tipY, boxWidth, 15, 3, 3, "FD");

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(200, 120, 0);
    pdf.text("TIP:", margin + 5, tipY + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 80, 0);
    pdf.text(
      "Start by looking for the first letter of each word, then check all directions!",
      margin + 25,
      tipY + 5
    );
  }

  // Draw footer
  drawPageFooter(pdf, pageNumber, pageWidth, pageHeight);
};

// Generic function to render a page with title, subtitle, content, and footer
interface PageRenderOptions {
  title: string;
  titleY?: number;
  titleWidth?: number;
  subtitle?: string;
  subtitleY?: number;
  pageNumber: number;
  footerNote?: string;
  contentRenderer: (pdf: jsPDF) => void;
}

const renderPage = (
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  borderMargin: number,
  borderWidth: number,
  borderHeight: number,
  colors: ColorPalette,
  design: DesignStyle,
  options: PageRenderOptions
) => {
  // Draw page background (white background + decorative border + content area)
  drawPageBackground(
    pdf,
    pageWidth,
    pageHeight,
    borderMargin,
    borderWidth,
    borderHeight,
    colors,
    design
  );

  // Draw title only if provided and not empty
  const titleY = options.titleY || 40;
  const titleWidth = options.titleWidth || 150;
  if (options.title && options.title.trim() !== "") {
    drawPageTitle(
      pdf,
      options.title,
      pageWidth,
      titleY,
      titleWidth,
      colors,
      design,
      borderMargin,
      borderWidth
    );
  }

  // Draw subtitle if provided
  let currentY = titleY;
  if (options.subtitle) {
    const subtitleY = titleY + 15 + 10; // After title + spacing + 10mm padding top
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.text(options.subtitle, pageWidth / 2, subtitleY, {
      align: "center",
    });
    currentY = subtitleY + 10 + 10; // After subtitle + spacing + 10mm padding bottom
  } else {
    // If no subtitle, content starts after title
    currentY = titleY + 10;
  }

  // Render custom content
  options.contentRenderer(pdf);

  // Draw footer
  drawPageFooter(
    pdf,
    options.pageNumber,
    pageWidth,
    pageHeight,
    options.footerNote
  );
};

export async function POST(request: NextRequest) {
  try {
    const config: GameConfig = await request.json();

    // Get default template with white background
    const template = getTemplate();
    // Create color palette with accent color for border/title, white background
    // Debug: Log accent color to verify it's being received
    if (config.accentColor) {
      console.log("Received accent color:", config.accentColor);
    }
    const colors = createColorPalette(config.accentColor);
    // Debug: Log the generated colors to verify they're correct
    if (config.accentColor) {
      console.log("Generated colors:", {
        outerBorder: colors.outerBorder,
        titleBackground: colors.titleBackground,
      });
    }
    const design = template.design;

    // Check if we're using topics or legacy words array
    const useTopics = config.topics && config.topics.length > 0;

    let grids: any[] = [];
    let topicTitles: string[] = [];

    if (useTopics) {
      // Generate grids per topic - each topic gets one grid with all its words
      config.topics!.forEach((topic) => {
        // Generate one grid per topic with all words from that topic
        const generator = new WordSearchGenerator(
          config.allowDiagonal,
          config.allowBackward
        );
        const topicGrid = generator.generate(topic.words, config.gridSize);

        // Store topic title for this grid
        topicTitles.push(topic.topic);

        grids.push(topicGrid);
      });
    } else {
      // Legacy: Generate multiple word search grids from words array
      grids = WordSearchGenerator.generateMultiple(
        config.words,
        config.gridSize,
        config.pageCount,
        config.allowDiagonal,
        config.allowBackward,
        config.wordsPerPage,
        config.distributeWords
      );

      // Use theme or default title for legacy mode
      grids.forEach(() => {
        topicTitles.push(config.theme || "WORD SEARCH");
      });
    }

    // Create PDF with 8.5x11 inch format
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [215.9, 279.4], // 8.5x11 inches in mm
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const borderMargin = 10;
    const contentWidth = pageWidth - 2 * margin;
    const borderWidth = pageWidth - 2 * borderMargin;
    const borderHeight = pageHeight - 2 * borderMargin;

    // Page 1: Blank white page
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    // Page 2: Cover Page
    pdf.addPage();
    drawCoverPage(
      pdf,
      pageWidth,
      pageHeight,
      config.coverImage,
      colors,
      design
    );

    // Compute TOC pagination (three-section layout) before rendering to derive correct page numbers
    // Replicate TOC layout constants used in drawTableOfContentsMulti
    const titleY = 40;
    const marginTOC = 18;
    const contentStartY = titleY + 30;
    const bottomLimit = pageHeight - 35;
    const lineHeight = 12;
    const sectionSpacing = 8;
    const rowsPerColumn = Math.floor(
      (bottomLimit - contentStartY) / lineHeight
    );

    // Structure:
    // Part 1: Introduction (full width) + How To Play (full width) = 2 rows
    // Part 2: "Word search by topic" header (full width) = 1 row + topics (2 topics per row)
    // Part 3: Answer (full width) = 1 row
    // Total full-width rows = 4 (Intro, How To Play, Header, Answer)
    // Topic rows = Math.ceil(topics.length / 2) (2 topics per row)
    const fullWidthRows = 4; // Intro, How To Play, Header, Answer
    const topicRows = Math.ceil(topicTitles.length / 2); // 2 topics per row
    const totalRows = fullWidthRows + topicRows;
    const tocPages = Math.max(1, Math.ceil(totalRows / rowsPerColumn));

    // Derive dynamic page numbers - starting from Introduction as page 1
    // Cover and TOC pages don't have page numbers
    const introPageNumber = 1; // Introduction is page 1
    const howToPlayPageNumber = 2; // How to Play is page 2
    const wordSearchStartPage = 3; // Word search pages start from page 3
    const answerPageStart = wordSearchStartPage + grids.length * 2; // after all word search pages
    const tocStartPage = 0; // TOC pages don't have page numbers (0 means no number)

    // Render TOC (multi-page, three sections)
    pdf.addPage();
    drawTableOfContentsMulti(
      pdf,
      pageWidth,
      pageHeight,
      borderMargin,
      borderWidth,
      borderHeight,
      colors,
      design,
      topicTitles,
      introPageNumber,
      howToPlayPageNumber,
      wordSearchStartPage,
      answerPageStart,
      tocStartPage
    );

    // Page 3: Introduction
    pdf.addPage();
    drawIntroduction(
      pdf,
      pageWidth,
      pageHeight,
      borderMargin,
      borderWidth,
      borderHeight,
      colors,
      design,
      config.introduction,
      introPageNumber
    );

    // Page 4: Rules & Directions
    pdf.addPage();
    drawRulesAndDirections(
      pdf,
      pageWidth,
      pageHeight,
      borderMargin,
      borderWidth,
      borderHeight,
      colors,
      design,
      howToPlayPageNumber
    );

    // Add each grid as 2 separate pages (starting from page 5)
    // Define gridsPerPage here so it's available in the loop
    const gridsPerPage = 4; // Answer pages show 4 grids per page (2x2)

    grids.forEach((grid, index) => {
      // Page 1: Words to find (page 5, 7, 9, etc.)
      pdf.addPage();

      const topicTitle = topicTitles[index] || config.theme || "WORD SEARCH";
      const titleText = `${topicTitle.toUpperCase()}`;

      // Calculate page numbers (starting from page 4)
      const vocabularyPageNumber = wordSearchStartPage + index * 2;
      const gridPageNumber = wordSearchStartPage + index * 2 + 1;

      // Render word list page
      renderPage(
        pdf,
        pageWidth,
        pageHeight,
        borderMargin,
        borderWidth,
        borderHeight,
        colors,
        design,
        {
          title: titleText,
          subtitle: "Can you find all the words related to this theme?",
          pageNumber: vocabularyPageNumber,
          contentRenderer: (pdf) => {
            // Add word list without bullets with decorative styling
            if (config.showWordList) {
              // Use 4 columns to maximize space usage
              const numColumns = 4;
              const wordsPerColumn = Math.ceil(grid.words.length / numColumns);
              const columnWidth = contentWidth / numColumns;
              // Calculate startY based on title (40) and subtitle
              // Title: 40mm, Subtitle: after title
              const titleY = 40;
              const subtitleY = titleY + 12 + 8; // Reduced spacing
              const subtitlePaddingBottom = 24; // Padding bottom between subtitle and word list
              const startY = subtitleY + subtitlePaddingBottom; // Added padding bottom after subtitle
              const wordSpacing = 15; // Reduced from 15

              pdf.setFontSize(15); // Slightly reduced from 16
              pdf.setFont("helvetica", "normal");

              grid.words.forEach((wordPos: any, wordIndex: number) => {
                const columnIndex = Math.floor(wordIndex / wordsPerColumn);
                const rowIndex = wordIndex % wordsPerColumn;
                // Center x position for each column
                const columnCenterX =
                  margin + columnIndex * columnWidth + columnWidth / 2;
                const y = startY + rowIndex * wordSpacing;

                // Convert word to uppercase
                const wordUpper = wordPos.word.toUpperCase();

                // Calculate word width for centered background
                const wordWidth = pdf.getTextWidth(wordUpper);
                const backgroundWidth = Math.max(wordWidth + 6, 35); // Reduced padding and min width

                // Add subtle background for each word (centered)
                pdf.setFillColor(
                  colors.wordBackground[0],
                  colors.wordBackground[1],
                  colors.wordBackground[2]
                );
                pdf.roundedRect(
                  columnCenterX - backgroundWidth / 2,
                  y - 6, // Reduced from 8
                  backgroundWidth,
                  8, // Reduced from 10
                  2,
                  2,
                  "F"
                );

                // Draw word text (centered, uppercase)
                pdf.setTextColor(
                  colors.wordText[0],
                  colors.wordText[1],
                  colors.wordText[2]
                );
                pdf.text(wordUpper, columnCenterX, y, {
                  align: "center",
                });
              });

              // Reset text color
              pdf.setTextColor(0, 0, 0);
            }
          },
        }
      );

      // Page 2: Grid only
      pdf.addPage();

      const gridTopicTitle =
        topicTitles[index] || config.theme || "WORD SEARCH";
      const gridTitleText = `${gridTopicTitle.toUpperCase()}`;

      // Calculate answer page number for this grid
      // Answer pages show 4 grids per page (2x2)
      const answerPageNumber =
        wordSearchStartPage +
        grids.length * 2 +
        Math.floor(index / gridsPerPage);

      // Render grid page
      renderPage(
        pdf,
        pageWidth,
        pageHeight,
        borderMargin,
        borderWidth,
        borderHeight,
        colors,
        design,
        {
          title: "", // No title for grid page
          pageNumber: gridPageNumber,
          footerNote: `Answers on page ${answerPageNumber}`,
          contentRenderer: (pdf) => {
            // Calculate grid dimensions - maximize space usage
            const topOffset = 5; // Reduced padding top
            const bottomOffset = 15; // Reduced from 20
            const maxGridSize = Math.min(
              contentWidth - 10, // Reduced from 20
              pageHeight - topOffset - bottomOffset
            );
            const cellSize = Math.min(maxGridSize / grid.size, 20); // Increased max from 18 to 20
            const gridWidth = cellSize * grid.size;
            const gridHeight = cellSize * grid.size;
            const gridX = (pageWidth - gridWidth) / 2;
            // Center vertically but use more space
            const availableHeight = pageHeight - topOffset - bottomOffset;
            const gridY = topOffset + (availableHeight - gridHeight) / 2;

            // Draw grid with bold text - larger font for better readability
            pdf.setFontSize(Math.max(20, cellSize * 1)); // Scale font with cell size, minimum 12
            pdf.setFont("helvetica", "normal");

            grid.grid.forEach((row: any, rowIndex: number) => {
              row.forEach((letter: any, colIndex: number) => {
                const x = gridX + colIndex * cellSize;
                const y = gridY + rowIndex * cellSize;

                // Draw cell with subtle background (no border)
                pdf.setFillColor(
                  colors.cellBackground[0],
                  colors.cellBackground[1],
                  colors.cellBackground[2]
                );
                pdf.rect(x, y, cellSize, cellSize, "F");

                // Draw letter with bold font, centered
                pdf.setTextColor(
                  colors.cellText[0],
                  colors.cellText[1],
                  colors.cellText[2]
                );
                pdf.text(
                  letter.toUpperCase(),
                  x + cellSize / 2,
                  y + cellSize / 2 + 3,
                  { align: "center" }
                );
              });
            });

            // Reset text color
            pdf.setTextColor(0, 0, 0);
          },
        }
      );
    });

    // Add answer key pages with improved design - 4 grids per page (2x2)
    // gridsPerPage is already defined above
    const totalAnswerPages = Math.ceil(grids.length / gridsPerPage);
    // answerPageStart is already calculated earlier before TOC rendering

    const answerKeyStartY = 55; // Further reduced to maximize space for grids
    const answerKeyTitleSpacing = 6; // Further reduced
    const answerKeyGridGapX = 20; // Further reduced for wider grids
    const answerKeyGridGapY = 12; // Further reduced for better space utilization

    for (let answerPage = 0; answerPage < totalAnswerPages; answerPage++) {
      pdf.addPage();

      const startGridIndex = answerPage * gridsPerPage;
      const endGridIndex = Math.min(
        startGridIndex + gridsPerPage,
        grids.length
      );

      // Render answer page
      renderPage(
        pdf,
        pageWidth,
        pageHeight,
        borderMargin,
        borderWidth,
        borderHeight,
        colors,
        design,
        {
          title: "ANSWER",
          titleWidth: 100,
          pageNumber: answerPageStart + answerPage,
          contentRenderer: (pdf) => {
            // Create 2x2 grid layout (2 columns, 2 rows) with larger cells like main grid
            const cols = 2;
            // Calculate cell size to make grids wider - maximize space usage
            const availableWidth =
              pageWidth - 2 * margin - (cols - 1) * answerKeyGridGapX;
            const availableHeight = pageHeight - answerKeyStartY - 15; // Reduced from 20mm for footer
            const maxCellSizeByWidth = availableWidth / (cols * 20); // For 20x20 grid
            // Account for vertical spacing between rows when calculating height
            const rowSpacing = answerKeyGridGapY + answerKeyTitleSpacing;
            const maxCellSizeByHeight =
              (availableHeight - rowSpacing) / (2 * 20); // 2 rows, 20x20 grid, minus spacing
            const cellSize = Math.min(
              maxCellSizeByWidth,
              maxCellSizeByHeight,
              16
            ); // Increased max to 16mm for even larger grids

            for (let i = startGridIndex; i < endGridIndex; i++) {
              const gridIndex = i - startGridIndex;
              const row = Math.floor(gridIndex / cols);
              const col = gridIndex % cols;

              const grid = grids[i];
              const largeGridSize = grid.size; // Use full grid size
              const gridWidth = largeGridSize * cellSize;
              const gridHeight = largeGridSize * cellSize;

              // Center the grids with proper spacing
              const totalGridsWidth =
                cols * gridWidth + (cols - 1) * answerKeyGridGapX;
              const startX = (pageWidth - totalGridsWidth) / 2;
              const gridX = startX + col * (gridWidth + answerKeyGridGapX);
              const gridY =
                answerKeyStartY +
                answerKeyTitleSpacing +
                row * (gridHeight + answerKeyGridGapY + answerKeyTitleSpacing);

              // Add title with page numbers - moved higher up
              const answerTopicTitle =
                topicTitles[i] || config.theme || "WORD SEARCH";
              const titleText = answerTopicTitle;
              const gridPage = wordSearchStartPage + i * 2 + 1; // Page with grid
              const pageInfo = `(page ${gridPage})`;

              pdf.setFontSize(11);
              pdf.setFont("helvetica", "normal");
              pdf.text(
                `${titleText} ${pageInfo}`,
                gridX + gridWidth / 2,
                gridY - 4, // Further reduced spacing
                {
                  align: "center",
                }
              );

              // Draw grid with improved design - format like main grid
              const fontSize = Math.max(8, cellSize * 0.45); // Scale font with cell size, similar to main grid
              pdf.setFontSize(fontSize);
              pdf.setFont("helvetica", "normal"); // Normal font, not bold

              // Calculate text offset to center text vertically in cell
              // In jsPDF, text Y coordinate is baseline, so we need offset to center
              // For helvetica font, baseline is approximately 80% from top, so offset ≈ fontSize * 0.2
              const textOffsetY = fontSize * 0.2; // Dynamic offset based on font size

              // First, identify which cells are part of answer words
              const answerCells = new Set<string>();
              const wordCellMap = new Map<string, number>(); // Map cell to word index for border color variation

              grid.words.forEach((wordPos: any, wordIndex: number) => {
                const { startRow, startCol, endRow, endCol } = wordPos;
                const rowStep =
                  endRow > startRow ? 1 : endRow < startRow ? -1 : 0;
                const colStep =
                  endCol > startCol ? 1 : endCol < startCol ? -1 : 0;
                let currentRow = startRow;
                let currentCol = startCol;
                while (true) {
                  const cellKey = `${currentRow}-${currentCol}`;
                  answerCells.add(cellKey);
                  wordCellMap.set(cellKey, wordIndex);
                  if (currentRow === endRow && currentCol === endCol) break;
                  currentRow += rowStep;
                  currentCol += colStep;
                }
              });

              // Draw all cells first with normal background
              for (let rowIndex = 0; rowIndex < grid.size; rowIndex++) {
                for (let colIndex = 0; colIndex < grid.size; colIndex++) {
                  const x = gridX + colIndex * cellSize;
                  const y = gridY + rowIndex * cellSize;

                  // Always use normal background color (no border)
                  pdf.setFillColor(
                    colors.cellBackground[0],
                    colors.cellBackground[1],
                    colors.cellBackground[2]
                  );

                  // Draw cell without border
                  pdf.rect(x, y, cellSize, cellSize, "F");
                }
              }

              // Draw diagonal lines through answer words FIRST (before text) to avoid covering letters
              pdf.setDrawColor(
                colors.innerBorder[0],
                colors.innerBorder[1],
                colors.innerBorder[2]
              ); // Use template's innerBorder color for diagonal lines
              pdf.setLineWidth(1); // Thinner lines to avoid covering text

              grid.words.forEach((wordPos: any) => {
                const { startRow, startCol, endRow, endCol } = wordPos;

                // Calculate start and end points for diagonal line
                // Align with text center position (center of cell + text offset)
                const startX = gridX + startCol * cellSize + cellSize / 2;
                const startY =
                  gridY + startRow * cellSize + cellSize / 2 + textOffsetY;
                const endX = gridX + endCol * cellSize + cellSize / 2;
                const endY =
                  gridY + endRow * cellSize + cellSize / 2 + textOffsetY;

                // Draw diagonal line through the word
                pdf.line(startX, startY, endX, endY);
              });

              // Draw letters AFTER lines so they appear on top and are not covered
              for (let rowIndex = 0; rowIndex < grid.size; rowIndex++) {
                for (let colIndex = 0; colIndex < grid.size; colIndex++) {
                  const x = gridX + colIndex * cellSize;
                  const y = gridY + rowIndex * cellSize;

                  // Draw letter with same format as main grid, centered
                  pdf.setTextColor(
                    colors.cellText[0],
                    colors.cellText[1],
                    colors.cellText[2]
                  );
                  pdf.text(
                    grid.grid[rowIndex][colIndex].toUpperCase(),
                    x + cellSize / 2,
                    y + cellSize / 2 + textOffsetY,
                    { align: "center" }
                  );
                }
              }

              // Reset line width
              pdf.setLineWidth(0.3);

              // Reset text color
              pdf.setTextColor(0, 0, 0);
            }
          },
        }
      );
    }

    // Convert PDF to buffer
    const pdfBuffer = pdf.output("arraybuffer");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="word-search-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
