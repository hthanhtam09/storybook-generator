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

const extractProficiencyLevel = (
  title: string
): "Beginner" | "Intermediate" | "Advanced" => {
  const titleLower = title.toLowerCase();
  
  // Check for "Advanced" first (more specific)
  if (
    titleLower.includes("advanced") ||
    titleLower.includes("expert") ||
    titleLower.includes("fluent")
  ) {
    return "Advanced";
  }
  
  // Check for "Beginner"
  if (
    titleLower.includes("beginner") ||
    titleLower.includes("starter") ||
    titleLower.includes("elementary") ||
    titleLower.includes("basic")
  ) {
    return "Beginner";
  }
  
  // Check for "Intermediate"
  if (
    titleLower.includes("intermediate") ||
    titleLower.includes("medium") ||
    titleLower.includes("level 2") ||
    titleLower.includes("level 3")
  ) {
    return "Intermediate";
  }
  
  // Default to Intermediate if no match found
  return "Intermediate";
};

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
          proficiencyLevel: extractProficiencyLevel(metadata.title),
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
