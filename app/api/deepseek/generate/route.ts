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

// Curated high-level theme detection across multiple languages
export const detectHighLevelTheme = (
  titles: string[],
  bookTitle: string,
  subtitle?: string
): { primary?: string; related?: string[] } => {
  const haystack = `${bookTitle} ${subtitle || ""} ${titles.join(
    " "
  )}`.toLowerCase();
  const candidates: Array<{
    name: string;
    keywords: string[];
    related?: string[];
  }> = [
    {
      name: "Christmas",
      keywords: [
        "christmas",
        "navidad",
        "noël",
        "xmas",
        "natale",
        "weihnacht",
        "navideño",
        "festive",
        "holiday",
      ],
      related: ["festive", "holiday", "winter"],
    },
    {
      name: "Halloween",
      keywords: ["halloween", "día de brujas", "hallowe'en"],
      related: ["spooky", "autumn"],
    },
    {
      name: "Easter",
      keywords: ["easter", "pascua", "paques", "ostern"],
      related: ["spring", "holiday"],
    },
    {
      name: "Winter",
      keywords: ["winter", "invierno", "hiver", "inverno", "winterzeit"],
      related: ["snow", "holiday"],
    },
    {
      name: "Summer",
      keywords: ["summer", "verano", "été", "estate", "sommer"],
      related: ["vacation", "travel"],
    },
    {
      name: "School",
      keywords: ["school", "escuela", "école", "schul"],
      related: ["classroom", "learning"],
    },
  ];

  for (const c of candidates) {
    if (c.keywords.some((k) => haystack.includes(k))) {
      return { primary: c.name, related: c.related || [] };
    }
  }
  return {};
};

// Extract lightweight themes from story titles (prioritize high-level themes)
export const extractThemesFromStories = (
  stories: Story[],
  bookTitle?: string,
  subtitle?: string
) => {
  const titles = stories.map((s) => s.titleOriginal);
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
    "into",
    "over",
    "under",
    "after",
    "before",
    "is",
    "are",
    "be",
    "being",
    "been",
    "this",
    "that",
    "these",
    "those",
    "my",
    "your",
    "his",
    "her",
    "their",
    "our",
    // common romance articles/preps
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "de",
    "del",
    "al",
    "y",
    "en",
    "con",
    "por",
    "para",
  ]);

  const noisySpecifics = new Set([
    // de-prioritize overly specific nouns that shouldn't become the main theme
    "árbol",
    "arbol",
    "estrella",
    "cantora",
    "duende",
    "tree",
    "star",
    "singer",
    "imp",
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
        if (noisySpecifics.has(lw)) return;
        tokens.push(lw);
      });
  });

  const freq = new Map<string, number>();
  tokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1));
  const top = Array.from(freq.entries())
    .filter(([, count]) => count > 1) // reduce singletons
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  const { primary: curatedPrimary, related: curatedRelated } =
    detectHighLevelTheme(titles, bookTitle || "", subtitle);

  const primaryTheme = curatedPrimary || top[0] || titles[0] || "stories";
  const relatedThemes =
    curatedRelated && curatedRelated.length
      ? curatedRelated
      : top.filter((t) => t !== primaryTheme);
  const themeList = [primaryTheme, ...relatedThemes].slice(0, 5);
  const themeSummary = themeList.join(", ");

  // Sample a few titles only (avoid listing all)
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
      return `Write an introduction for a language learning book titled "${fullDisplayTitle}" by ${
        metadata.author
      }. 

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

The book contains ${
        stories.length
      } stories in ${languageName}. Example story titles (not exhaustive): ${examplesText}

Detected main theme: ${primaryTheme}. Related themes: ${themeSummary}.

Audience level: ${proficiencyLevel}. Tailor tone and expectations to ${proficiencyLevel} learners.

Include a short, compelling marketing hook and a concise list of SEO keywords relevant to the themes and ${targetLanguageFromTitle}. SEO Keywords: ${seoKeywords.join(
        ", "
      )}

Follow this EXACT format structure:

Start with "Welcome to ${fullDisplayTitle}!" and explain this book is a fun and friendly guide to learning ${targetLanguageFromTitle} through simple stories designed for ${proficiencyLevel} learners. Stories are written in the target language with English translations for support. Mention who it's for and what makes it special. Describe the stories and their high-level themes (${themeSummary}). Explain how they're crafted with repetition to help reinforce ${targetLanguageFromTitle} vocabulary and grammar naturally. Mention what learners will achieve by the end in terms of ${targetLanguageFromTitle} skills.

**What's in This Book?**
Create a bulleted list with these exact items:
· ${
        stories.length
      } Short Stories: Written in accessible ${targetLanguageFromTitle} with English translations provided afterward for clarity. Themes include ${themeSummary}.
· Vocabulary Lists: Each story includes key ${targetLanguageFromTitle} words with pronunciation guides and English meanings to build your ${targetLanguageFromTitle} vocabulary.
· Comprehension Questions: Multiple-choice questions in ${targetLanguageFromTitle} and English follow each story to test your understanding, with answers provided.
· Illustration Prompts: Drawing prompts bring each story to life.

**Why This Book?**
Create a bulleted list with these items:
· Right for ${proficiencyLevel}: Content matches ${proficiencyLevel} needs
· Engaging Themes: Stories revolve around ${themeSummary}
· Progressive Learning: Stories build on each other with repetition
· Learn Naturally: Acquire patterns through stories, not heavy rules

End with "Perfect for ${proficiencyLevel.toLowerCase()} learners. Let's dive into the ${primaryTheme} magic and start your ${targetLanguageFromTitle} journey!"

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided
- Include specific references to the actual stories and their themes
- Make it engaging and encouraging
- Ensure all bullet points are properly formatted with · symbol
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title and subtitle to determine the target language. All language learning references must be about learning ${targetLanguageFromTitle}
`;

    case "howToUse":
      return `Write a "How to Use This Book" section for a language learning book titled "${fullDisplayTitle}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

The book contains ${stories.length} stories in ${languageName}. Example story titles (not exhaustive): ${examplesText}

Detected main theme: ${primaryTheme}. Related themes: ${themeSummary}.

Audience level: ${proficiencyLevel}. Tailor instructions to ${proficiencyLevel} learners.

Follow this EXACT format structure:

Start with "This book is crafted to make learning ${targetLanguageFromTitle} structured, engaging, and effective for ${proficiencyLevel} learners. Here's how to get the most out of ${fullDisplayTitle}:" and then create a bulleted list. Stories are written in the target language with English translations for support.

**Main Instructions**
· Read the Stories: Start with the ${targetLanguageFromTitle} version of each short story. The language is accessible with helpful repetition. Check the English translation afterward if you need clarity.
· Learn Vocabulary: Each story includes ${targetLanguageFromTitle} words with pronunciation guides and English meanings. Read them in context, then use them in your own sentences.
· Answer Questions: Test comprehension with multiple-choice questions in ${targetLanguageFromTitle} and English. Check the provided answers and revisit any tricky parts.
· Practice Regularly: Aim for one or two stories daily. Re-read favorites, read aloud to practice pronunciation, or share with a partner or teacher.
· Get Creative with Illustrations: Use the illustration prompts to draw scenes from the stories.

**"Tips for Success:"**
Create a bulleted list with these items:
· Focus on Meaning: Prioritize the main idea—precision grows with practice.
· Pace Yourself: If a story feels challenging, pause and re-read.
· Keep Notes: Write down new words, phrases, or reflections to reinforce learning.
· Practice Speaking: Read with a friend or tutor to build fluency.
· Enjoy the Themes: Let ${themeSummary} inspire you to keep exploring ${targetLanguageFromTitle}!

**Closing Paragraph:**
End with "With these steps, you'll find learning ${targetLanguageFromTitle} both motivating and rewarding at the ${proficiencyLevel} level. [${targetLanguageFromTitle} phrase meaning 'Happy reading!']"

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided
- Include specific references to the actual stories and their themes
- Make it instructional and supportive
- Ensure all bullet points are properly formatted with · symbol
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title and subtitle to determine the target language. All language learning references must be about learning ${targetLanguageFromTitle}
`;

    case "conclusion":
      return `Write a conclusion for a language learning book titled "${fullDisplayTitle}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

The book contains ${stories.length} stories in ${languageName}. Example story titles (not exhaustive): ${examplesText}

Detected main theme: ${primaryTheme}. Related themes: ${themeSummary}.

Audience level: ${proficiencyLevel}. Match the closing tone to ${proficiencyLevel} learners.

Follow this EXACT format structure:

Start with "Congratulations on completing ${fullDisplayTitle}!" Express hope that the stories have made the learning journey exciting and memorable. Mention specific high-level themes such as ${themeSummary} and how they helped build ${targetLanguageFromTitle} skills for ${proficiencyLevel} learners.

"Your feedback means the world to us! Please share your thoughts by leaving a review on our website or wherever you purchased this book. Your input helps us create even better resources for learners like you."

"Keep Learning: Use your new words in conversations, write your own mini-stories, or revisit these tales to keep the story spirit alive. Share them with friends or family for extra practice. Your ${targetLanguageFromTitle} adventure is just beginning—keep exploring with joy! [${targetLanguageFromTitle} phrase meaning 'Thank you and happy learning!']"

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided
- Include specific references to the actual stories and their themes
- Make it celebratory and encouraging
- Include the exact phrases for feedback request and closing
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title and subtitle to determine the target language. All language learning references must be about learning ${targetLanguageFromTitle}
`;

    case "description":
      return `Write a book description for a language learning book titled "${fullDisplayTitle}" by ${
        metadata.author
      }.

CRITICAL INSTRUCTION: Analyze the book title and subtitle to determine the target language. The book teaches ${targetLanguageFromTitle}. You MUST write about learning ${targetLanguageFromTitle}, NOT English. English is only used for translations to help understand the target language.

The book contains ${
        stories.length
      } stories in ${languageName}. Example story titles (not exhaustive): ${examplesText}

Detected main theme: ${primaryTheme}. Related themes: ${themeSummary}. Audience level: ${proficiencyLevel}.

Follow this EXACT HTML structure using ONLY <p>, <b>, <i>, <br>, <ul>, <li> tags:

<p><b>Looking for engaging ${targetLanguageFromTitle} practice without boring drills?</b><br><br>
Level: ${proficiencyLevel}. Learn ${targetLanguageFromTitle} the enjoyable way!</p>

<p>We believe learning a language should feel like diving into a magical story—fun, natural, and engaging. <i>${fullDisplayTitle}</i> is crafted for ${proficiencyLevel} learners, helping you build ${targetLanguageFromTitle} skills through ${
        stories.length
      } ${primaryTheme} stories without heavy memorization.</p>

<p>By the end, you'll have a stronger grasp of core ${targetLanguageFromTitle}, a wider vocabulary, and confidence in reading short stories and answering questions.</p>

<p><b>Why This Book Is Perfect for You:</b></p>

<ul>
  <li><p><b>Learn ${targetLanguageFromTitle} Joyfully</b>: Skip tedious grammar drills—learn through lively, theme-rich stories.</p></li>
  <li><p><b>${
    stories.length
  } Captivating Stories</b>: Follow characters in ${primaryTheme} adventures like ${examplesText}—scenarios that spark imagination.</p></li>
  <li><p><b>Right for ${proficiencyLevel}</b>: Language and tasks suit ${proficiencyLevel} learners.</p></li>
  <li><p><b>Progress with Ease</b>: Stories build gradually, making ${targetLanguageFromTitle} approachable from start to finish.</p></li>
  <li><p><b>${targetLanguageFromTitle}-English Translations</b>: Read the ${targetLanguageFromTitle} version first, then check the English translation—no dictionary needed.</p></li>
  <li><p><b>Enhance Reading Skills</b>: Improve comprehension naturally through repeated patterns and context.</p></li>
  <li><p><b>Expand Vocabulary Effortlessly</b>: Each story includes 10 key words with pronunciation and English meanings.</p></li>
  <li><p><b>Master Everyday Phrases</b>: Learn practical expressions used by native speakers in thematic settings.</p></li>
  <li><p><b>Bonus Illustration Prompts</b>: Minimalist drawing ideas spark creativity and bring scenes to life.</p></li>
</ul>

<p><b>SEO Keywords</b>: ${seoKeywords.join(", ")}</p>

<p><b>Get Started Now</b>: Scroll up and grab your copy!</p>

<p><i>Note</i>: These stories focus on ${primaryTheme} adventures to build confidence. For extra practice, revisit vocabulary and questions after each story. With all ${
        stories.length
      } stories in one place, this book offers convenient, offline learning.</p>

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided above
- Include specific references to the actual stories and their themes (e.g., ${themeSummary})
- Make it engaging and purchase-inspiring
- Ensure all bullet points are properly formatted with · symbol
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title and subtitle to determine the target language. All language learning references must be about learning ${targetLanguageFromTitle}
- Create 2-3 specific adventure examples based on sample story titles provided
- FORMAT: Return VALID HTML using ONLY <p>, <b>, <i>, <br>, <ul>, <li> tags. No markdown. Do NOT include wrapper tags like <html>, <head>, <body>.
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
