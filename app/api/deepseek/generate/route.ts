import { NextRequest, NextResponse } from "next/server";
import type { Story } from "@/lib/types";

export interface GenerateRequest {
  type: "introduction" | "howToUse" | "conclusion" | "description";
  stories: Story[];
  metadata: {
    title: string;
    author: string;
    language: string;
    subtitle?: string;
    proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced";
  };
}

// Detect target language mentioned in title/subtitle for teaching focus
export const detectTargetLanguageFromTitle = (
  title: string,
  subtitle?: string
): string | null => {
  const haystack = `${title} ${subtitle || ""}`.toLowerCase();
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
  };

  for (const key of Object.keys(mapping)) {
    if (haystack.includes(key)) return mapping[key];
  }
  return null;
};

// Extract theme from subtitle using regex patterns
export const extractThemeFromSubtitle = (subtitle?: string): string | null => {
  if (!subtitle) return null;
  const s = subtitle.trim();

  // Patterns to catch "X Stories", "Stories about X", "X Themed Stories"
  // Example: "Start Spanish with 30 New Year Stories..." -> "New Year"
  // Example: "Halloween Stories for Kids" -> "Halloween"

  // 1. "... X Stories" (ignoring "Short" or number)
  // We look for the word(s) immediately preceding "Stories"
  // Exclude common non-theme adjectives like "Short", "Great", "New", "Best" if they are the ONLY word.
  // But "New Year" is fine.

  const storiesRegex =
    /(?:with|contains|of|about|\d+)\s+([a-zA-Z0-9\s'-]+?)\s+Stories/i;
  const match = s.match(storiesRegex);

  if (match && match[1]) {
    const candidate = match[1].trim();
    const ignored = [
      "short",
      "great",
      "best",
      "funny",
      "interesting",
      "simple",
      "easy",
    ];
    if (!ignored.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // 2. "X Themed"
  const themedRegex = /([a-zA-Z0-9\s'-]+?)\s+Themed/i;
  const matchThemed = s.match(themedRegex);
  if (matchThemed && matchThemed[1]) {
    return matchThemed[1].trim();
  }

  return null;
};

// Extract themes from story titles (prioritize subtitle theme)
export const extractThemesFromStories = (
  stories: Story[],
  bookTitle?: string,
  subtitle?: string
) => {
  const titles = stories.map((s) => s.titleOriginal);

  // 1. Try to get theme from subtitle first
  let primaryTheme = extractThemeFromSubtitle(subtitle);

  // 2. If no subtitle theme, try frequency analysis of titles
  if (!primaryTheme) {
    const tokens: string[] = [];
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "and",
      "of",
      "in",
      "on",
      "at",
      "to",
      "for",
      "with",
      "by",
      "from",
      "about",
      "el",
      "la",
      "los",
      "las",
      "un",
      "una",
      "de",
      "del",
      "al",
      "y",
      "en",
      "con",
      "por",
      "para",
      "story",
      "stories",
      "short",
      "chapter",
      "part",
    ]);

    titles.forEach((t) => {
      t.replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean)
        .forEach((w) => {
          const lw = w.toLowerCase();
          if (lw.length < 3) return;
          if (stopwords.has(lw)) return;
          tokens.push(lw); // Keep original case for display? No, let's use lowercase for counting
        });
    });

    const freq = new Map<string, number>();
    tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
    const top = Array.from(freq.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w);

    // Capitalize the top token to make it look like a theme
    if (top.length > 0) {
      primaryTheme = top[0].charAt(0).toUpperCase() + top[0].slice(1);
    }
  }

  // Fallback
  if (!primaryTheme) {
    primaryTheme = "General";
  }

  // Generate related themes (just use some keywords from titles or generic ones)
  // For now, we can leave it simple or derive from other top tokens
  const themeSummary = primaryTheme;

  // Sample a few titles
  const examples = titles.slice(0, 3);

  return { titles, themeSummary, primaryTheme, examples };
};

// Generate SEO keyword phrases from theme and target language
export const buildSeoKeywords = (
  primaryTheme: string,
  targetLanguage: string,
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced"
): string[] => {
  const theme = primaryTheme.toLowerCase();
  const lang = targetLanguage;
  const level = proficiencyLevel.toLowerCase();

  const base = [
    `${theme} short stories in ${lang}`,
    `learn ${lang} through ${theme} stories`,
    `${lang} ${theme} vocabulary`,
    `${lang} reading practice ${theme}`,
    `${lang} ${level} stories ${theme}`,
    `${lang} ${theme} book for ${proficiencyLevel}`,
    `${lang} ${theme} reading comprehension B1`,
    `${lang} ${theme} beginner to ${level} workbook`,
  ];

  // Add seasonal/occasion variants when relevant
  if (
    [
      "christmas",
      "navidad",
      "xmas",
      "noël",
      "halloween",
      "easter",
      "pascua",
      "summer",
      "winter",
      "spring",
      "autumn",
    ].some((x) => theme.includes(x))
  ) {
    base.push(
      `${lang} ${theme} activities`,
      `${theme} phrases in ${lang}`,
      `${theme} themed language learning`,
      `${lang} festive reading ${theme}`,
      `${lang} holiday gift ${theme} book`
    );
  }

  // De-duplicate and keep concise top 10
  return Array.from(new Set(base)).slice(0, 10);
};

export const generatePrompt = (
  type: "introduction" | "howToUse" | "conclusion" | "description",
  stories: Story[],
  metadata: {
    title: string;
    author: string;
    language: string;
    subtitle?: string;
    proficiencyLevel?: "Beginner" | "Intermediate" | "Advanced";
  }
): string => {
  const {
    titles: storyTitlesArr,
    themeSummary,
    primaryTheme,
    examples,
  } = extractThemesFromStories(stories, metadata.title, metadata.subtitle);
  const storyTitles = storyTitlesArr.join(", ");

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
    detectTargetLanguageFromTitle(metadata.title, metadata.subtitle) ||
    "the target language from the title";

  const fullDisplayTitle = metadata.subtitle
    ? `${metadata.title}: ${metadata.subtitle}`
    : metadata.title;

  const examplesText = examples.length ? examples.join(", ") : storyTitles;

  const proficiencyLevel = metadata.proficiencyLevel || "Intermediate";

  const seoKeywords = buildSeoKeywords(
    primaryTheme,
    targetLanguageFromTitle,
    proficiencyLevel
  );

  switch (type) {
    case "introduction":
      return `Write an engaging introduction for "${fullDisplayTitle}" by ${
        metadata.author
      }.

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${stories.length} stories about ${primaryTheme}
- ${proficiencyLevel} level learners
- ${targetLanguageFromTitle} stories with English translations

Format your response EXACTLY like this (use [P] tags):

[P]Welcome paragraph: Introduce "${fullDisplayTitle}" and explain how this book helps ${proficiencyLevel} learners master ${targetLanguageFromTitle} through engaging ${primaryTheme} stories.[/P]

[P]Special features paragraph: Explain what makes this book special - ${themeSummary} themes, natural vocabulary repetition, grammar reinforcement through stories. Emphasize fun, natural learning without boring drills.[/P]

[P]Contents paragraph: Describe what's included - ${
        stories.length
      } stories with vocabulary (pronunciation guides), English translations, and comprehension questions with answers.[/P]

[P]Closing paragraph: Encouraging message for ${proficiencyLevel} learners to begin their ${targetLanguageFromTitle} reading journey today.[/P]

Requirements:
- Write in ${languageName}
- Use [P]...[/P] tags for EACH paragraph
- NO bullet points or lists
- 300-400 words total
- Natural, warm, engaging tone
- Include keywords: ${seoKeywords.slice(0, 5).join(", ")}
`;

    case "howToUse":
      return `Write a "How to Use This Book" section for "${fullDisplayTitle}".

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${stories.length} stories about ${primaryTheme}
- ${proficiencyLevel} level

Format your response EXACTLY like this:

[P]Brief introduction (2-3 sentences) explaining how this book helps ${proficiencyLevel} learners master ${targetLanguageFromTitle} through ${primaryTheme} stories.[/P]

[P]Short sentence introducing the step-by-step reading method:[/P]

[LIST_BULLET]
[ITEM]Preview vocabulary and practice pronunciation[/ITEM]
[ITEM]Read ${targetLanguageFromTitle} story without translation[/ITEM]
[ITEM]Check English translation if needed for clarity[/ITEM]
[ITEM]Read ${targetLanguageFromTitle} version again[/ITEM]
[ITEM]Answer comprehension questions[/ITEM]
[ITEM]Read story aloud 2-3 times for pronunciation[/ITEM]
[ITEM]Review vocabulary and create your own sentences[/ITEM]
[/LIST_BULLET]

[P]Short sentence introducing practice tips:[/P]

[LIST_BULLET]
[ITEM]Study one story per day or at your pace[/ITEM]
[ITEM]Keep a notebook for new words and phrases[/ITEM]
[ITEM]Listen to native speakers and compare[/ITEM]
[ITEM]Practice with a language partner[/ITEM]
[ITEM]Revisit previous stories weekly[/ITEM]
[ITEM]Focus on main ideas before details[/ITEM]
[/LIST_BULLET]

[P]Encouraging closing message (2-3 sentences) about consistency and progress. End with ${targetLanguageFromTitle} phrase for "Happy reading!"[/P]

Requirements:
- Write in ${languageName}
- Follow the EXACT format with tags
- Use [P]...[/P] for paragraphs
- Use [LIST_BULLET]...[/LIST_BULLET] for bullet lists only
- Use [ITEM]...[/ITEM] for each list item
- 300-350 words total
`;

    case "conclusion":
      return `Write a warm conclusion for "${fullDisplayTitle}".

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${stories.length} stories completed
- ${primaryTheme} and ${themeSummary} themes
- ${proficiencyLevel} level

Write exactly 3 paragraphs (separate each with a blank line):

Paragraph 1: Congratulate readers on completing all ${stories.length} ${primaryTheme} stories. Highlight their ${targetLanguageFromTitle} progress and vocabulary growth. Express pride in their achievement.

Paragraph 2: Politely ask readers to leave a review to help other ${targetLanguageFromTitle} learners find this book. Mention that feedback helps create better learning resources.

Paragraph 3: Encourage continued practice - use new words in conversations, write own stories, revisit favorite lessons, keep reading ${targetLanguageFromTitle}. End with ${targetLanguageFromTitle} phrase meaning "Thank you and happy learning!"

Requirements:
- Write in ${languageName}
- SEPARATE PARAGRAPHS WITH BLANK LINES
- No bullet points or lists
- Warm, celebratory tone
- 200-250 words total
- Natural, flowing style
`;

    case "description":
      return `Write a compelling book description for "${fullDisplayTitle}" by ${
        metadata.author
      }.

CRITICAL: This book teaches ${targetLanguageFromTitle}, NOT English.

Context:
- ${stories.length} stories about ${primaryTheme}
- ${proficiencyLevel} level
- SEO keywords: ${seoKeywords.slice(0, 6).join(", ")}

Write in HTML format using ONLY these tags: <p>, <b>, <ul>, <li>

Structure:

<p>Opening paragraph (3-4 sentences): Hook readers with an engaging question or statement about learning ${targetLanguageFromTitle} through ${primaryTheme} stories. Mention ${proficiencyLevel} level.</p>

<p>Value paragraph (3-4 sentences): Explain how this book makes learning ${targetLanguageFromTitle} natural and fun through ${themeSummary} stories. Emphasize immersive reading, not grammar drills.</p>

<p><b>What You'll Get:</b></p>
<ul>
<li>${
        stories.length
      } captivating ${targetLanguageFromTitle} ${primaryTheme} stories</li>
<li>Perfect for ${proficiencyLevel} level - progressive difficulty</li>
<li>Full English translations for understanding</li>
<li>Vocabulary lists with pronunciation guides</li>
<li>Comprehension questions with answers</li>
<li>Practical phrases for everyday use</li>
</ul>

<p>Closing paragraph (2-3 sentences): Strong call-to-action encouraging readers to start their ${targetLanguageFromTitle} reading journey today.</p>

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const modelName = "deepseek/deepseek-r1-0528-qwen3-8b:free";

    const prompt = generatePrompt(type, stories, metadata);

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
              "X-Title": "Storybook Generator",
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

        // If successful, break out of retry loop
        if (response.ok) {
          break;
        }

        // If rate limited and we have more attempts, wait and retry
        if (response.status === 429 && attempt < maxRetries) {
          console.log(
            `Rate limited, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        // If not rate limited or last attempt, break
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

    // Handle network errors
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

      // Parse the error to provide more specific feedback
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

    // Return the generated content as-is (AI should generate clean text)
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
