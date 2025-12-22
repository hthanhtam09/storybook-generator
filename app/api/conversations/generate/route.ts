import { NextRequest, NextResponse } from "next/server";
import type { ConversationLesson } from "@/lib/types";

export interface ConversationGenerateRequest {
  type: "introduction" | "howToUse" | "conclusion" | "description";
  lessons: ConversationLesson[];
  metadata: {
    title: string;
    author: string;
    language: string;
    proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced";
  };
}

// Detect target language from title
const detectTargetLanguageFromTitle = (title: string): string | null => {
  const haystack = title.toLowerCase();
  const mapping: Record<string, string> = {
    spanish: "Spanish",
    español: "Spanish",
    french: "French",
    français: "French",
    german: "German",
    deutsch: "German",
    italian: "Italian",
    italiano: "Italian",
    portuguese: "Portuguese",
    português: "Portuguese",
    russian: "Russian",
    japanese: "Japanese",
    nihongo: "Japanese",
    korean: "Korean",
    hangul: "Korean",
    chinese: "Chinese",
    mandarin: "Chinese",
    arabic: "Arabic",
    hindi: "Hindi",
    thai: "Thai",
    vietnamese: "Vietnamese",
    english: "English",
  };

  for (const key of Object.keys(mapping)) {
    if (haystack.includes(key)) return mapping[key];
  }
  return null;
};

// Extract topics from lessons
const extractTopicsFromLessons = (lessons: ConversationLesson[]): string[] => {
  const topics = new Set<string>();
  lessons.forEach((lesson) => {
    if (lesson.topic) {
      topics.add(lesson.topic);
    }
  });
  return Array.from(topics);
};

// Build SEO keywords
const buildSeoKeywords = (
  topics: string[],
  targetLanguage: string,
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced"
): string[] => {
  const lang = targetLanguage;
  const level = proficiencyLevel.toLowerCase();
  const topicList = topics.join(", ");

  const base = [
    `${lang} conversation practice`,
    `learn ${lang} through conversations`,
    `${lang} ${level} dialogues`,
    `${lang} speaking practice`,
    `${lang} conversation book for ${proficiencyLevel}`,
    `${lang} dialogue comprehension ${level}`,
    `${lang} vocabulary through conversations`,
    `${lang} real-life conversations`,
  ];

  if (topics.length > 0) {
    topics.forEach((topic) => {
      base.push(
        `${lang} ${topic.toLowerCase()} conversations`,
        `learn ${lang} ${topic.toLowerCase()} vocabulary`
      );
    });
  }

  return Array.from(new Set(base)).slice(0, 12);
};

export const generatePrompt = (
  type: "introduction" | "howToUse" | "conclusion" | "description",
  lessons: ConversationLesson[],
  metadata: {
    title: string;
    author: string;
    language: string;
    proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced";
  }
): string => {
  const topics = extractTopicsFromLessons(lessons);
  const topicsText = topics.length > 0 ? topics.join(", ") : "Daily Life";

  const languageName =
    metadata.language === "en"
      ? "English"
      : metadata.language === "es"
      ? "Spanish"
      : metadata.language === "fr"
      ? "French"
      : metadata.language === "de"
      ? "German"
      : metadata.language === "it"
      ? "Italian"
      : metadata.language === "pt"
      ? "Portuguese"
      : metadata.language === "ru"
      ? "Russian"
      : metadata.language === "ja"
      ? "Japanese"
      : metadata.language === "ko"
      ? "Korean"
      : metadata.language === "zh"
      ? "Chinese"
      : metadata.language === "ar"
      ? "Arabic"
      : metadata.language === "hi"
      ? "Hindi"
      : metadata.language === "th"
      ? "Thai"
      : metadata.language === "vi"
      ? "Vietnamese"
      : metadata.language;

  const targetLanguageFromTitle =
    detectTargetLanguageFromTitle(metadata.title) ||
    "the target language from the title";

  const proficiencyLevel = metadata.proficiencyLevel || "Intermediate";

  const seoKeywords = buildSeoKeywords(
    topics,
    targetLanguageFromTitle,
    proficiencyLevel
  );

  // Sample conversation titles
  const sampleTitles = lessons
    .slice(0, 3)
    .map((l) => l.title)
    .filter(Boolean)
    .join(", ");

  switch (type) {
    case "introduction":
      return `Write an engaging introduction for "${metadata.title}" by ${
        metadata.author
      }.

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${lessons.length} conversation lessons covering: ${topicsText}
- ${proficiencyLevel} level learners
- ${targetLanguageFromTitle} conversations with English translations

Format your response EXACTLY like this (use [P] tags):

[P]Welcome paragraph: Introduce "${
        metadata.title
      }" and explain how this book helps ${proficiencyLevel} learners practice ${targetLanguageFromTitle} through real-life conversations covering ${topicsText}.[/P]

[P]Special features paragraph: Explain what makes this book special - natural dialogues, practical vocabulary, builds confidence in speaking ${targetLanguageFromTitle}. Emphasize real-world application and natural learning.[/P]

[P]Contents paragraph: Describe what's included - ${
        lessons.length
      } conversations with vocabulary (IPA + pronunciation guides), English translations, and comprehension questions with answers.[/P]

[P]Closing paragraph: Encouraging message for ${proficiencyLevel} learners to begin their ${targetLanguageFromTitle} conversation journey today.[/P]

Requirements:
- Write in ${languageName}
- Use [P]...[/P] tags for EACH paragraph
- NO bullet points or lists
- 300-400 words total
- Natural, warm, engaging tone
- Include keywords: ${seoKeywords.slice(0, 5).join(", ")}
`;

    case "howToUse":
      return `Write a "How to Use This Book" section for "${metadata.title}".

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${lessons.length} conversation lessons
- ${proficiencyLevel} level
- Topics: ${topicsText}

Format your response EXACTLY like this:

[P]Brief introduction (2-3 sentences) explaining how this book helps ${proficiencyLevel} learners master ${targetLanguageFromTitle} conversations through ${topicsText} topics.[/P]

[P]Short sentence introducing the step-by-step method:[/P]

[LIST_BULLET]
[ITEM]Review vocabulary with IPA pronunciation first[/ITEM]
[ITEM]Read the ${targetLanguageFromTitle} conversation without translation[/ITEM]
[ITEM]Check English translation to understand meaning[/ITEM]
[ITEM]Read ${targetLanguageFromTitle} conversation again aloud[/ITEM]
[ITEM]Answer comprehension questions[/ITEM]
[ITEM]Practice dialogue with a partner or role-play[/ITEM]
[ITEM]Record yourself and compare with natives[/ITEM]
[ITEM]Use phrases in real situations[/ITEM]
[/LIST_BULLET]

[P]Short sentence introducing practice tips:[/P]

[LIST_BULLET]
[ITEM]Complete 1-2 conversations daily[/ITEM]
[ITEM]Repeat each conversation 3-5 times[/ITEM]
[ITEM]Focus on natural pronunciation and intonation[/ITEM]
[ITEM]Create your own dialogue variations[/ITEM]
[ITEM]Practice with native speakers or partners[/ITEM]
[ITEM]Keep a journal of useful phrases[/ITEM]
[ITEM]Revisit previous lessons weekly[/ITEM]
[/LIST_BULLET]

[P]Encouraging closing message (2-3 sentences) about building confidence. End with ${targetLanguageFromTitle} phrase for "Happy learning!"[/P]

Requirements:
- Write in ${languageName}
- Follow the EXACT format with tags
- Use [P]...[/P] for paragraphs
- Use [LIST_BULLET]...[/LIST_BULLET] for bullet lists only
- Use [ITEM]...[/ITEM] for each list item
- 300-350 words total
`;

    case "conclusion":
      return `Write a warm conclusion for "${metadata.title}".

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${lessons.length} conversations completed
- ${topicsText} topics
- ${proficiencyLevel} level

Format your response EXACTLY like this:

[P]Congratulations paragraph: Congratulate readers on completing all ${lessons.length} conversations. Highlight their ${targetLanguageFromTitle} speaking progress through ${topicsText} topics. Express pride in their achievement.[/P]

[P]Review request paragraph: Politely ask readers to leave a review to help other ${targetLanguageFromTitle} learners find this book. Mention that their feedback helps create better learning resources.[/P]

[P]Continued practice paragraph: Encourage continued practice - use phrases in real conversations, practice with partners, revisit favorite lessons, keep speaking ${targetLanguageFromTitle}. End with ${targetLanguageFromTitle} phrase meaning "Thank you and keep speaking!"[/P]

Requirements:
- Write in ${languageName}
- Use [P]...[/P] tags for EACH paragraph
- NO bullet points or lists
- Warm, celebratory, encouraging tone
- 200-250 words total
- Natural, flowing style
`;

    case "description":
      return `Write a compelling book description for "${metadata.title}" by ${
        metadata.author
      }.

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${lessons.length} conversations
- Topics: ${topicsText}
- ${proficiencyLevel} level
- SEO keywords: ${seoKeywords.slice(0, 6).join(", ")}

Write in HTML format using ONLY these tags: <p>, <b>, <ul>, <li>

Structure:

<p>Opening paragraph (3-4 sentences): Hook readers with an engaging question or statement about learning ${targetLanguageFromTitle} conversations. Mention ${proficiencyLevel} level and ${topicsText} topics.</p>

<p>Value paragraph (3-4 sentences): Explain how this book makes learning ${targetLanguageFromTitle} natural and fun through real-life dialogues covering ${topicsText}. Emphasize practical conversation skills, not grammar drills.</p>

<p><b>What You'll Get:</b></p>
<ul>
<li>${
        lessons.length
      } practical ${targetLanguageFromTitle} conversations (${topicsText})</li>
<li>Perfect for ${proficiencyLevel} level - progressive difficulty</li>
<li>Full English translations for understanding</li>
<li>IPA pronunciation guides for accuracy</li>
<li>Comprehension questions with answers</li>
<li>Real-world conversation practice</li>
</ul>

<p>Closing paragraph (2-3 sentences): Strong call-to-action encouraging readers to start their ${targetLanguageFromTitle} conversation journey today.</p>

Requirements:
- Write in ${languageName}
- 300-350 words total
- Use HTML tags correctly
- Sales-focused, persuasive tone
- Include keywords naturally: ${seoKeywords.slice(0, 3).join(", ")}
`;

    default:
      throw new Error(`Unknown generation type: ${type}`);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: ConversationGenerateRequest = await request.json();
    const { type, lessons, metadata } = body;

    if (!type || !lessons || !metadata) {
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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const modelName = "deepseek/deepseek-r1-0528-qwen3-8b:free";

    const prompt = generatePrompt(type, lessons, metadata);

    // Retry mechanism for rate limiting
    let response;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Storybook Generator - Conversations",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              max_tokens:
                type === "description" ? 800 : type === "howToUse" ? 700 : 600,
              temperature: 0.7,
            }),
          }
        );

        if (response.ok) {
          break;
        }

        if (response.status === 429 && attempt < maxRetries) {
          console.log(
            `Rate limited, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        break;
      } catch (error) {
        if (attempt < maxRetries) {
          console.log(
            `Request failed, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        break;
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          error:
            "Network error occurred. Please check your internet connection and try again.",
          code: "NETWORK_ERROR",
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          return NextResponse.json(
            {
              error:
                "The free DeepSeek model is currently rate-limited. We tried multiple times but the service is still unavailable. Please try again in a few minutes, or consider using a paid model for better availability.",
              code: "RATE_LIMITED",
            },
            { status: 429 }
          );
        }
        if (errorData.error?.message) {
          return NextResponse.json(
            {
              error: errorData.error.message,
              code: "API_ERROR",
            },
            { status: response.status }
          );
        }
      } catch (parseError) {
        // If we can't parse the error, fall back to generic message
      }

      return NextResponse.json(
        {
          error:
            "Failed to generate content. Please check your API key and try again.",
          code: "GENERATION_FAILED",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { error: "No content generated" },
        { status: 500 }
      );
    }

    const content = generatedContent.trim();

    return NextResponse.json({
      success: true,
      content,
      type,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
