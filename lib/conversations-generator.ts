import type { ConversationLesson } from "./types";
import type { ConversationMetadata } from "@/components/conversations-metadata";

export type ConversationGenerationType =
  | "introduction"
  | "howToUse"
  | "conclusion"
  | "description";

export interface ConversationGenerationRequest {
  type: ConversationGenerationType;
  lessons: ConversationLesson[];
  metadata: {
    title: string;
    author: string;
    language: string;
  };
}

export interface ConversationGenerationResponse {
  success: boolean;
  content?: string;
  type?: ConversationGenerationType;
  error?: string;
}

const extractProficiencyLevel = (
  title: string
): "Beginner" | "Intermediate" | "Advanced" => {
  const titleLower = title.toLowerCase();

  if (
    titleLower.includes("advanced") ||
    titleLower.includes("expert") ||
    titleLower.includes("fluent") ||
    titleLower.includes("c1") ||
    titleLower.includes("c2")
  ) {
    return "Advanced";
  }

  if (
    titleLower.includes("beginner") ||
    titleLower.includes("starter") ||
    titleLower.includes("elementary") ||
    titleLower.includes("basic") ||
    titleLower.includes("a1") ||
    titleLower.includes("a2")
  ) {
    return "Beginner";
  }

  if (
    titleLower.includes("intermediate") ||
    titleLower.includes("medium") ||
    titleLower.includes("b1") ||
    titleLower.includes("b2")
  ) {
    return "Intermediate";
  }

  return "Intermediate";
};

export const generateConversationContent = async (
  type: ConversationGenerationType,
  lessons: ConversationLesson[],
  metadata: ConversationMetadata
): Promise<ConversationGenerationResponse> => {
  try {
    const response = await fetch("/api/conversations/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        lessons,
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
