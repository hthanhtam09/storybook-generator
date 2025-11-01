import { NextRequest, NextResponse } from "next/server";
import { generatePrompt, type GenerateRequest } from "../generate/route";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { type, stories, metadata } = body;

    if (!type || !stories || !metadata) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      ["introduction", "howToUse", "conclusion", "description"].includes(
        type
      ) === false
    ) {
      return NextResponse.json(
        { error: "Invalid generation type" },
        { status: 400 }
      );
    }

    const prompt = generatePrompt(type, stories, metadata);

    return NextResponse.json({
      success: true,
      prompt,
      type,
    });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
