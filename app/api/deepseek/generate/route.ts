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
  
  const storiesRegex = /(?:with|contains|of|about|\d+)\s+([a-zA-Z0-9\s'-]+?)\s+Stories/i;
  const match = s.match(storiesRegex);
  
  if (match && match[1]) {
    const candidate = match[1].trim();
    const ignored = ["short", "great", "best", "funny", "interesting", "simple", "easy"];
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
      "the", "a", "an", "and", "of", "in", "on", "at", "to", "for", "with", "by", "from", "about",
      "el", "la", "los", "las", "un", "una", "de", "del", "al", "y", "en", "con", "por", "para",
      "story", "stories", "short", "chapter", "part"
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
      return `Write an engaging introduction for a language learning book titled "${fullDisplayTitle}" by ${
        metadata.author
      }.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

Context:
- The book contains ${stories.length} stories in ${languageName}
- Example story titles: ${examplesText}
- Main theme: ${primaryTheme}
- Related themes: ${themeSummary}
- Target audience: ${proficiencyLevel} learners
- SEO Keywords to incorporate naturally: ${seoKeywords.join(", ")}

Structure Guidelines (be creative with wording while maintaining these elements):

1. Opening: Start with a warm, welcoming greeting that mentions "${fullDisplayTitle}". Introduce the book as a guide for learning ${targetLanguageFromTitle} through stories designed for ${proficiencyLevel} learners. Explain that stories are in ${targetLanguageFromTitle} with English translations for support.

2. Book Overview: Describe what makes this book special. Mention the ${primaryTheme} theme and related themes (${themeSummary}). Explain how the stories use repetition to naturally reinforce ${targetLanguageFromTitle} vocabulary and grammar. Highlight what learners will achieve by the end.

3. What's in This Book: Include a section (with heading) that lists:
   - ${
     stories.length
   } short stories in accessible ${targetLanguageFromTitle} with English translations
   - Vocabulary lists with pronunciation guides and meanings
   - Comprehension questions in both languages with answers
   - Illustration prompts for creative engagement

4. Why This Book: Include a section highlighting:
   - Appropriate for ${proficiencyLevel} level learners
   - Engaging ${themeSummary} themes
   - Progressive learning through story repetition
   - Natural language acquisition approach

5. Closing: End with an encouraging message inviting ${proficiencyLevel.toLowerCase()} learners to begin their ${targetLanguageFromTitle} journey through ${primaryTheme} stories.

Requirements:
- Write in ${languageName}
- Be engaging, encouraging, and welcoming
- Include specific references to the stories and themes
- Use natural, varied language (avoid repetitive phrasing)
- Format bullet points clearly (· or - symbol)
- Maintain focus on learning ${targetLanguageFromTitle}, not English
- Incorporate SEO keywords naturally throughout
`;

    case "howToUse":
      return `Write a helpful "How to Use This Book" section for a language learning book titled "${fullDisplayTitle}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

Context:
- The book contains ${stories.length} stories in ${languageName}
- Example story titles: ${examplesText}
- Main theme: ${primaryTheme}
- Related themes: ${themeSummary}
- Target audience: ${proficiencyLevel} learners

Structure Guidelines (adapt wording naturally while covering these areas):

1. Opening: Introduce how the book is designed to make learning ${targetLanguageFromTitle} structured, engaging, and effective for ${proficiencyLevel} learners. Explain that stories are in ${targetLanguageFromTitle} with English translations for support.

2. Main Instructions: Provide clear, practical guidance on:
   - Reading approach: Start with ${targetLanguageFromTitle} version, use English translation for clarity
   - Vocabulary learning: How to use the pronunciation guides and meanings effectively
   - Comprehension practice: Using the questions to test understanding
   - Regular practice: Suggested frequency and methods (reading aloud, sharing with others)
   - Creative engagement: Using illustration prompts

3. Tips for Success: Include practical advice such as:
   - Focusing on understanding main ideas first
   - Pacing yourself appropriately
   - Keeping notes for reinforcement
   - Practicing speaking with others
   - Enjoying the ${themeSummary} themes to stay motivated

4. Closing: End with an encouraging message about the learning journey at the ${proficiencyLevel} level. Include a ${targetLanguageFromTitle} phrase meaning "Happy reading!" or similar encouragement.

Requirements:
- Write in ${languageName}
- Be instructional, supportive, and clear
- Reference the actual stories and themes naturally
- Use varied, natural language
- Format instructions and tips clearly
- Maintain focus on learning ${targetLanguageFromTitle}
- Adapt tone to ${proficiencyLevel} learners' needs
`;

    case "conclusion":
      return `Write a warm, celebratory conclusion for a language learning book titled "${fullDisplayTitle}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

Context:
- The book contains ${stories.length} stories in ${languageName}
- Example story titles: ${examplesText}
- Main theme: ${primaryTheme}
- Related themes: ${themeSummary}
- Target audience: ${proficiencyLevel} learners

Structure Guidelines (vary your expression while including these elements):

1. Celebration: Congratulate readers on completing the book. Express how the ${themeSummary} stories have made their ${targetLanguageFromTitle} learning journey exciting and memorable. Highlight how these themes helped build skills appropriate for ${proficiencyLevel} learners.

2. Feedback Request: Politely ask readers to share their thoughts through reviews. Mention that their feedback helps create better resources for learners. (Express this naturally, not word-for-word.)

3. Continued Learning: Encourage readers to:
   - Use new ${targetLanguageFromTitle} words in conversations
   - Write their own mini-stories
   - Revisit the stories for practice
   - Share with friends or family
   - Continue their ${targetLanguageFromTitle} learning adventure

4. Closing: End with a ${targetLanguageFromTitle} phrase meaning "Thank you and happy learning!" or similar encouraging message.

Requirements:
- Write in ${languageName}
- Be celebratory, warm, and encouraging
- Reference the stories and themes naturally
- Use varied, heartfelt language
- Maintain focus on learning ${targetLanguageFromTitle}
- Match tone to ${proficiencyLevel} learners
- Include feedback request and continued learning encouragement
`;

    case "description":
      return `Write a compelling book description for a language learning book titled "${fullDisplayTitle}" by ${
        metadata.author
      }.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

Context:
- The book contains ${stories.length} stories in ${languageName}
- Example story titles: ${examplesText}
- Main theme: ${primaryTheme}
- Related themes: ${themeSummary}
- Target audience: ${proficiencyLevel} learners
- SEO Keywords to incorporate: ${seoKeywords.join(", ")}

Structure Guidelines (use HTML with ONLY <p>, <b>, <i>, <br>, <ul>, <li> tags):

1. Hook: Open with an engaging question or statement that highlights learning ${targetLanguageFromTitle} in an enjoyable way. Mention the ${proficiencyLevel} level.

2. Value Proposition: Explain how the book makes learning ${targetLanguageFromTitle} fun, natural, and engaging through ${primaryTheme} stories. Emphasize it's designed for ${proficiencyLevel} learners and avoids heavy memorization.

3. Learning Outcomes: Describe what readers will achieve—stronger ${targetLanguageFromTitle} skills, expanded vocabulary, and reading confidence.

4. Key Features: Create a "Why This Book Is Perfect for You" section with a bulleted list covering:
   - Learning ${targetLanguageFromTitle} through engaging stories (not drills)
   - ${
     stories.length
   } captivating ${primaryTheme} stories with examples from actual titles
   - Appropriate for ${proficiencyLevel} level
   - Progressive difficulty
   - ${targetLanguageFromTitle}-English translations
   - Reading comprehension improvement
   - Vocabulary expansion with pronunciation guides
   - Practical phrases for everyday use
   - Illustration prompts for creativity

5. SEO & Call to Action: Naturally incorporate SEO keywords. Include a call-to-action encouraging purchase.

6. Note: Add a brief note about the ${primaryTheme} focus, practice suggestions, and the convenience of having all stories in one place.

Requirements:
- Write in ${languageName}
- Use ONLY <p>, <b>, <i>, <br>, <ul>, <li> HTML tags (no markdown, no wrapper tags)
- Be engaging and purchase-inspiring
- Reference actual stories and themes naturally
- Vary language and phrasing
- Include 2-3 specific adventure examples based on story titles
- Maintain focus on learning ${targetLanguageFromTitle}
- Format bullet points clearly
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
              max_tokens: 1000,
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
