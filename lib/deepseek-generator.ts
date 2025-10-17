import type { Story, BookMetadata } from "./types";

export type GenerationType =
  | "introduction"
  | "howToUse"
  | "conclusion"
  | "description";

export interface GenerationRequest {
  type: GenerationType;
  stories: Story[];
  metadata: {
    title: string;
    author: string;
    language: string;
  };
}

export interface GenerationResponse {
  success: boolean;
  content?: string;
  type?: GenerationType;
  error?: string;
}

export const generateContent = async (
  type: GenerationType,
  stories: Story[],
  metadata: BookMetadata
): Promise<GenerationResponse> => {
  try {
    const response = await fetch("/api/deepseek/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        stories,
        metadata: {
          title: metadata.title,
          author: metadata.author,
          language: metadata.language,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to generate content",
      };
    }

    return data;
  } catch (error) {
    console.error("Generation error:", error);
    return {
      success: false,
      error: "Network error occurred while generating content",
    };
  }
};

// Removed generateAllSections function - now each section generates independently
