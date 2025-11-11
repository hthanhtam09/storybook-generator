import { NextRequest, NextResponse } from "next/server";
import type { TopicVocabulary } from "@/lib/wordsearch-config";

interface RequestPayload {
  topics: TopicVocabulary[];
  language?: string;
  theme?: string;
  gridSize?: number;
  introductionTitle?: string;
  returnPrompt?: boolean;
}

const getLanguageName = (code: string): string => {
  const map: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
  };
  return map[code] || code;
};

const cleanMarkdownFormatting = (text: string): string => {
  let cleaned = text;

  // Remove markdown headers (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // Remove markdown bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/__(.+?)__/g, "$1");

  // Remove markdown italic (*text* or _text_)
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1");
  cleaned = cleaned.replace(/_(.+?)_/g, "$1");

  // Remove markdown horizontal rules (--- or ***)
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, "");

  // Remove markdown code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // Remove markdown images ![alt](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "");

  // Clean up multiple consecutive empty lines (max 2)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Trim each line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  // Remove leading/trailing empty lines
  cleaned = cleaned.replace(/^\n+|\n+$/g, "");

  return cleaned;
};

// Minimal conversion from plain text to simple HTML (p, ul/li)
const convertPlainTextToHtml = (text: string): string => {
  if (!text.trim()) return "";
  // Split into blocks by double newlines
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const htmlParts: string[] = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const isBullets =
      lines.length > 1 && lines.every((l) => /^[-•]\s+/.test(l));
    if (isBullets) {
      const items = lines
        .map((l) => l.replace(/^[-•]\s+/, "").trim())
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join("");
      if (items) htmlParts.push(`<ul>${items}</ul>`);
    } else {
      // Paragraph: join single lines with space
      const paragraph = lines.join(" ").replace(/\s+/g, " ").trim();
      if (paragraph) htmlParts.push(`<p>${paragraph}</p>`);
    }
  }
  return htmlParts.join("");
};

const truncateTopicsForDisplay = (
  topics: TopicVocabulary[],
  maxTopicsToShow: number
): { list: string; hiddenCount: number } => {
  const names = topics.map((t) => t.topic.trim()).filter(Boolean);
  const shown = names.slice(0, maxTopicsToShow);
  const hiddenCount = Math.max(0, names.length - shown.length);
  return { list: shown.join(", "), hiddenCount };
};

const limitIntroLength = (text: string): string => {
  // Hard limits to keep content within a single page in typical PDF layouts
  const MAX_WORDS = 180;
  const MAX_CHARS = 1200;

  let trimmed = text.trim();

  // Limit by characters first to avoid very long content
  if (trimmed.length > MAX_CHARS) {
    trimmed = trimmed.slice(0, MAX_CHARS);
  }

  // Limit by words
  const words = trimmed.split(/\s+/);
  if (words.length > MAX_WORDS) {
    trimmed = words.slice(0, MAX_WORDS).join(" ");
  }

  return trimmed;
};

const buildWordSearchIntroductionPrompt = (
  topics: TopicVocabulary[],
  title: string,
  language: string,
  gridSize: number
): string => {
  const languageName = getLanguageName(language);
  const { list: topicList, hiddenCount } = truncateTopicsForDisplay(topics, 10);
  const totalWords = topics.reduce((sum, t) => sum + t.words.length, 0);
  const topicDetails = topics
    .map((t) => `- ${t.topic}: ${t.words.length} words`)
    .join("\n");

  return `Write a concise, professional introduction for a word search puzzle book titled "${title}".

STRICT OUTPUT FORMAT (for PDF rendering engine):
- Output MUST be SIMPLE HTML ONLY with these tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>
- NO CSS, NO inline styles, NO classes, NO other tags
- Do NOT include markdown (#, ##, *, **, __, etc.)
- The VERY FIRST element MUST be a <p> paragraph (do NOT start with any headings)
- Do NOT include an opening heading like "Introducing Word Search Puzzle for Senior"
- Use <h2> for section headings (e.g., WHAT'S IN THIS BOOK, BENEFITS, HOW TO USE)
- Use <p> for short paragraphs
- Use <ul><li>...</li></ul> for bullets (or <ol> if ordered)

This is a WORD SEARCH PUZZLE BOOK, not a storybook. The book contains vocabulary word search puzzles organized by topics.

Context:
- Book Title: "${title}"
- Target Language: ${languageName}
- Number of Topics: ${topics.length}
- Topics Covered (sample): ${topicList}${
    hiddenCount > 0 ? `, and ${hiddenCount} more` : ""
  }
- Total Vocabulary Words: ${totalWords}
- Grid Size: ${gridSize}x${gridSize}

Topic Breakdown:
${topicDetails}

ULTRA-CONCISE STRUCTURE (use ONLY the allowed HTML tags):

1) Opening (as <p>, 4-5 short, engaging sentences): Introduce "${title}" and its purpose (reinforce ${languageName} vocabulary with engaging word searches). Keep sentences punchy and motivating.

2) WHAT'S IN THIS BOOK (<h2> + <ul> with 3-5 <li>): Include:
   - ${topics.length} topic-based word searches
   - Grid size: ${gridSize}x${gridSize}
   - Topics include: ${topicList}${
    hiddenCount > 0 ? ` (and ${hiddenCount} more)` : ""
  }
   - Over ${totalWords} vocabulary words

3) BENEFITS (<h2> + <ul> with 3-4 <li>): Cover:
   - Vocabulary recognition and spelling
   - Pattern recognition in ${languageName}
   - Confidence through puzzle-solving
   - Reinforcement by repetition

4) HOW TO USE (<h2> + <ul> with 3-4 <li>): Simple instructions (start with any topic, use word list, review after solving).

5) Closing (as <p>, 1 sentence): Encourage learners to enjoy building ${languageName} vocabulary.

CRITICAL OUTPUT REQUIREMENTS:
- Write in ${languageName}
- Output format: SIMPLE HTML ONLY with the allowed tags
- Professional tone: Engaging, encouraging, and suitable for educational PDF documents
- Length: STRICTLY 140-200 words total. Keep every sentence short.
- Structure: Clear paragraphs with logical flow
- Focus: Word search puzzles as a learning tool, not stories
- Mention: Specific topics and vocabulary learning benefits naturally
- Language: Natural, varied phrasing (avoid repetitive wording)
- Tone: Professional yet accessible, encouraging self-paced learning`;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RequestPayload> | null;

    if (!body || !Array.isArray(body.topics)) {
      return NextResponse.json(
        { error: "Request must include a topics array." },
        { status: 400 }
      );
    }

    const topics = body.topics.filter(
      (topic): topic is TopicVocabulary =>
        typeof topic?.topic === "string" &&
        topic.topic.trim().length > 0 &&
        Array.isArray(topic.words) &&
        topic.words.length > 0
    );

    if (topics.length === 0) {
      return NextResponse.json(
        {
          error:
            "Each topic must include a name and at least one vocabulary word.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured." },
        { status: 500 }
      );
    }

    const title =
      (body.introductionTitle && body.introductionTitle.trim()) ||
      (body.theme && body.theme.trim()) ||
      "Word Search Puzzle Collection";
    const language = body.language || "en";
    const gridSize = Number.isFinite(body.gridSize as number)
      ? (body.gridSize as number)
      : 15;

    const prompt = buildWordSearchIntroductionPrompt(
      topics,
      title,
      language,
      gridSize
    );
    // If only prompt is requested (fallback for AI issues), return it directly
    if (body.returnPrompt) {
      return NextResponse.json({
        success: true,
        prompt,
      });
    }
    const modelName = "deepseek/deepseek-r1-0528-qwen3-8b:free";

    const maxRetries = 3;
    const retryDelay = 2000;
    let response: Response | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Word Search Generator",
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
              max_tokens: 1000,
              temperature: 0.7,
            }),
          }
        );

        if (response.ok) {
          break;
        }

        if (response.status === 429 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        break;
      } catch (error) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
        console.error("Introduction generation request failed:", error);
        return NextResponse.json(
          {
            error:
              "Network error occurred while contacting the AI service. Please try again later.",
          },
          { status: 500 }
        );
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          error:
            "No response received from the AI service. Please try again later.",
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter introduction error:", errorText);

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 429) {
          return NextResponse.json(
            {
              error:
                "The AI service is currently rate-limited. Please try again in a few minutes.",
            },
            { status: 429 }
          );
        }
        if (errorData.error?.message) {
          return NextResponse.json(
            { error: errorData.error.message },
            { status: response.status }
          );
        }
      } catch {
        // ignore parse errors and fall back to generic message
      }

      return NextResponse.json(
        {
          error:
            "Failed to generate introduction content. Please verify your OpenRouter configuration.",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedContent: string | undefined =
      data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { error: "AI returned no content. Please try again." },
        { status: 500 }
      );
    }

    // Clean markdown formatting (retain simple HTML)
    let cleanedContent = cleanMarkdownFormatting(generatedContent.trim());

    // Ensure we have minimal HTML; if not, convert plain text to simple HTML
    const hasSimpleHtml = /<(h2|h3|p|ul|ol|li)\b/i.test(cleanedContent);
    if (!hasSimpleHtml) {
      cleanedContent = convertPlainTextToHtml(cleanedContent);
    }

    // Remove any lingering "§" characters if the model returned them
    cleanedContent = cleanedContent.replace(/§/g, "");

    // Remove unwanted leading title if present (exact match, case-insensitive)
    cleanedContent = cleanedContent
      // Remove exact <h1>/<h2> heading "Introducing Word Search Puzzle for Senior" at the very start
      .replace(
        /^\s*<h[12]\b[^>]*>\s*Introducing\s+Word\s+Search\s+Puzzle\s+for\s+Senior\s*<\/h[12]>\s*/i,
        ""
      )
      // Also remove if wrapped as a paragraph at the very start
      .replace(
        /^\s*<p\b[^>]*>\s*Introducing\s+Word\s+Search\s+Puzzle\s+for\s+Senior\s*<\/p>\s*/i,
        ""
      );

    // Ensure content starts from the first <p> element: drop anything before first <p>
    const firstPMatch = cleanedContent.match(/<p\b[^>]*>/i);
    if (firstPMatch && firstPMatch.index && firstPMatch.index > 0) {
      cleanedContent = cleanedContent.slice(firstPMatch.index);
    }

    // Limit length (risk: may cut tags; keep conservative limits)
    const limitedContent = limitIntroLength(cleanedContent);

    return NextResponse.json({
      success: true,
      content: limitedContent,
    });
  } catch (error) {
    console.error("Introduction API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
