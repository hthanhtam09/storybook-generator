import { NextRequest, NextResponse } from "next/server";
import type { WordFillInPage } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { puzzles }: { puzzles: WordFillInPage[] } = await request.json();

    if (!puzzles || puzzles.length === 0) {
      return NextResponse.json(
        { error: "No puzzles provided" },
        { status: 400 }
      );
    }

    // Generate PDF content using a simple approach
    const pdfContent = generateSimplePDF(puzzles);

    // Return PDF as response
    return new NextResponse(pdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="word-fill-in-puzzle-${
          new Date().toISOString().split("T")[0]
        }.pdf"`,
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

function generateSimplePDF(puzzles: WordFillInPage[]): ArrayBuffer {
  // Create a simple text-based PDF content
  let pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${calculateContentLength(puzzles)}
>>
stream
BT
/F1 12 Tf
72 720 Td
(Word Fill-in Puzzle) Tj
0 -20 Td
(${new Date().toLocaleDateString()}) Tj
0 -40 Td

${generatePuzzleContent(puzzles)}

ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Arial
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
000000${(calculateContentLength(puzzles) + 500)
    .toString()
    .padStart(6, "0")} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${calculateContentLength(puzzles) + 600}
%%EOF`;

  return new TextEncoder().encode(pdfContent).buffer;
}

function calculateContentLength(puzzles: WordFillInPage[]): number {
  let length = 200; // Base content
  puzzles.forEach((page) => {
    length += 100; // Page header
    length += page.puzzle.wordList.length * 20; // Word list
    length += page.puzzle.grid.length * page.puzzle.grid[0].length * 2; // Grid
  });
  return length;
}

function generatePuzzleContent(puzzles: WordFillInPage[]): string {
  return puzzles
    .map(
      (page, pageIndex) => `
(Page ${pageIndex + 1}) Tj
0 -20 Td
(Grid Size: ${page.puzzle.grid.length}x${page.puzzle.grid[0].length}) Tj
0 -20 Td
(Words: ${page.puzzle.words.length}) Tj
0 -20 Td
(Word List:) Tj
0 -20 Td
${page.puzzle.wordList.map((word) => `(${word}) Tj 0 -15 Td`).join("\n")}
0 -40 Td
(Puzzle Grid:) Tj
0 -20 Td
${generateGridText(page.puzzle.grid)}
0 -40 Td
`
    )
    .join("\n");
}

function generateGridText(grid: any[][]): string {
  return grid
    .map(
      (row) =>
        `(${row
          .map((cell) => (cell.isBlack ? "█" : cell.letter || "□"))
          .join(" ")}) Tj 0 -15 Td`
    )
    .join("\n");
}
