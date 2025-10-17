import { NextRequest, NextResponse } from "next/server";
import type { Story } from "@/lib/types";

interface GenerateRequest {
  type: "introduction" | "howToUse" | "conclusion" | "description";
  stories: Story[];
  metadata: {
    title: string;
    author: string;
    language: string;
  };
}

const generatePrompt = (
  type: "introduction" | "howToUse" | "conclusion" | "description",
  stories: Story[],
  metadata: { title: string; author: string; language: string }
): string => {
  const storyTitles = stories.map((story) => story.titleOriginal).join(", ");
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

  switch (type) {
    case "introduction":
      return `Write an introduction for a language learning book titled "${metadata.title}" by ${metadata.author}. 

CRITICAL INSTRUCTION: Analyze the book title "${metadata.title}" to determine the target language. The book teaches the language mentioned in the title (e.g., if title contains "Spanish", teach Spanish; if "French", teach French; if "German", teach German, etc.). You MUST write about learning the language from the title, NOT English. English is only used for translations to help understand the target language.

The book contains ${stories.length} stories in ${languageName}:
${storyTitles}

Follow this EXACT format structure:

Start with "Welcome to ${metadata.title}!" and explain this book is a fun and friendly guide to learning the language mentioned in the title through simple stories designed for beginners. CRITICAL: Analyze the title to determine the target language. Stories are written in the target language with English translations for support. ALL language learning references must be about learning the target language from the title, NOT English. Mention who it's for and what makes it special. Describe the stories and their themes. Explain how they're crafted to be short and repetitive to help reinforce the target language vocabulary and grammar naturally. Mention what learners will achieve by the end in terms of the target language skills.

**What's in This Book?**
Create a bulleted list with these exact items:
· ${stories.length} Short Stories: Written in simple [target language from title] with English translations provided afterward for clarity. The stories feature the specific themes and topics from the provided stories.
· Vocabulary Lists: Each story includes key [target language from title] words with pronunciation guides and English meanings to build your [target language from title] vocabulary effortlessly.
· Comprehension Questions: Multiple-choice questions in [target language from title] and English follow each story to test your [target language from title] understanding, with answers provided to track your progress.
· Illustration Prompts: Drawing prompts bring each story to life, perfect for learners.

**Why This Book?**
Create a bulleted list with these items:
· Perfect for Beginners: Uses basic vocabulary and repetitive structures
· Fun Themes: Stories revolve around the specific themes and topics from the provided stories
· Progressive Learning: Stories build on each other with repetition
· No Grammar Stress: Learn naturally through stories, not rules

End with "Perfect for beginners. Let's dive into the [specific theme from stories] magic and start your [target language from title] journey!" - replace [specific theme from stories] with the actual theme from the stories and [target language from title] with the language from the book title

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided
- Include specific references to the actual stories and their themes
- Make it engaging and encouraging
- Ensure all bullet points are properly formatted with · symbol
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title to determine the target language. Stories are written in the target language with English translations for support. All language learning references must be about learning the target language from the title
- IMPORTANT: When you see [specific theme from stories] or similar placeholders, replace them with the actual themes from the provided stories (e.g., if stories are about Halloween, use "Halloween"; if about Christmas, use "Christmas", etc.)


Generate content that matches this exact format while incorporating details from the provided stories.`;

    case "howToUse":
      return `Write a "How to Use This Book" section for a language learning book titled "${metadata.title}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title "${metadata.title}" to determine the target language. The book teaches the language mentioned in the title (e.g., if title contains "Spanish", teach Spanish; if "French", teach French; if "German", teach German, etc.). You MUST write about learning the language from the title, NOT English. English is only used for translations to help understand the target language.

The book contains ${stories.length} stories in ${languageName}:
${storyTitles}

Follow this EXACT format structure:

Start with "This book is crafted to make learning [target language from title] fun, simple, and effective for beginners. Here's how to get the most out of ${metadata.title}:" and then create a bulleted list. IMPORTANT: Analyze the title to determine the target language. Stories are written in the target language with English translations for support. All references to language learning should be about learning the target language from the title.

**Main Instructions**
· Read the Stories: Start with the [target language from title] version of each short story. The language is simple and repetitive to help you understand. Check the English translation afterward if you need clarity.
· Learn Vocabulary: Each story comes with a list of new [target language from title] words, including pronunciation guides and English meanings. Read them in context, then try using them in your own sentences to make them stick.
· Answer Questions: Test your comprehension with multiple-choice questions in [target language from title] and English. Check the provided answers to see your progress and revisit any tricky parts.
· Practice Regularly: Aim for one or two stories daily. Re-read favorites, read aloud to practice pronunciation, or share with a friend or teacher for extra fun. Repetition builds confidence!
· Get Creative with Illustrations: Use the illustration prompts to draw the scenes from the stories. This is great for learners or anyone who enjoys visualizing stories to enhance learning.

**"Tips for Success:"**
Create a bulleted list with these items:
· Start Simple: Focus on the main idea of each story—don't worry about every word. Understanding grows with practice.
· Take Your Time: If a story feels challenging, pause and re-read. Progress comes with patience.
· Use a Notebook: Write down new words, phrases, or your thoughts about the stories to reinforce learning.
· Involve Others: Read with a parent, teacher, or friend for support and to practice speaking.
· Enjoy the Story Vibe: Let the themes and topics from the stories inspire you to keep exploring [target language from title]!

**Closing Paragraph:**
End with "With these steps, you'll find learning [target language from title] both fun and rewarding. [[target language from title] phrase meaning 'Happy reading!']"

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided
- Include specific references to the actual stories and their themes
- Make it instructional and encouraging
- Ensure all bullet points are properly formatted with · symbol
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title to determine the target language. Stories are written in the target language with English translations for support. All language learning references must be about learning the target language from the title
- IMPORTANT: When you see placeholders like [theme] or [specific themes], replace them with the actual themes from the provided stories


Generate content that matches this exact format while incorporating details from the provided stories.`;

    case "conclusion":
      return `Write a conclusion for a language learning book titled "${metadata.title}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title "${metadata.title}" to determine the target language. The book teaches the language mentioned in the title (e.g., if title contains "Spanish", teach Spanish; if "French", teach French; if "German", teach German, etc.). You MUST write about learning the language from the title, NOT English. English is only used for translations to help understand the target language.

The book contains ${stories.length} stories in ${languageName}:
${storyTitles}

Follow this EXACT format structure:

Start with "Congratulations on completing ${metadata.title}!" Express hope that the stories have made the learning journey exciting and memorable. Mention specific themes from the stories and how they helped build [target language from title] skills.

"Your feedback means the world to us! Please share your thoughts by leaving a review on our website or wherever you purchased this book. Your input helps us create even better resources for learners like you."

"Keep Learning: Use your new words in conversations, write your own mini-stories, or revisit these tales to keep the story spirit alive. Share them with friends or family for extra practice. Your [target language from title] adventure is just beginning—keep exploring with joy! [[target language from title] phrase meaning 'Thank you and happy learning!']"

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided
- Include specific references to the actual stories and their themes
- Make it celebratory and encouraging
- Use warm, congratulatory language
- Include the exact phrases for feedback request and closing
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title to determine the target language. Stories are written in the target language with English translations for support. All language learning references must be about learning the target language from the title
- IMPORTANT: When you see placeholders like [theme] or [specific themes], replace them with the actual themes from the provided stories


Generate content that matches this exact format while incorporating details from the provided stories.`;

    case "description":
      return `Write a book description for a language learning book titled "${metadata.title}" by ${metadata.author}.

CRITICAL INSTRUCTION: Analyze the book title "${metadata.title}" to determine the target language. The book teaches the language mentioned in the title (e.g., if title contains "Spanish", teach Spanish; if "French", teach French; if "German", teach German, etc.). You MUST write about learning the language from the title, NOT English. English is only used for translations to help understand the target language.

The book contains ${stories.length} stories in ${languageName}:
${storyTitles}

Follow this EXACT HTML structure using ONLY <p>, <b>, <i>, <br>, <ul>, <li> tags:

<p><b>Tired of struggling with complex grammar or boring textbooks?</b><br><br>
Learn [target language from title] in a delightful way!</p>

<p>We believe learning a language should feel like diving into a magical story—fun, natural, and engaging. <i>${metadata.title}</i> is crafted for A1-level beginners, helping you build [target language from title] skills through ${stories.length} [specific theme from stories] yet heartwarming stories without heavy memorization.</p>

<p>By the end, you'll have a stronger grasp of basic [target language from title], a wider vocabulary, and confidence in reading short stories and answering questions.</p>

<p><b>Why This Book Is Perfect for You:</b></p>

<ul>
  <li><p><b>Learn [target language from title] Joyfully</b>: Skip tedious grammar drills—learn like kids do, through lively stories that feel magical.</p></li>
  <li><p><b>${stories.length} Whimsical Stories</b>: Follow characters in [specific theme from stories] adventures like [create 2-3 specific examples based on the actual stories]—fun scenarios that spark imagination.</p></li>
  <li><p><b>Tailored for A1 Beginners</b>: Each story uses simple, clear language, so you understand most of it instantly and absorb the rest naturally.</p></li>
  <li><p><b>Progress with Ease</b>: Stories build gradually, making [target language from title] approachable. You'll be amazed at your progress from story 1 to story ${stories.length}!</p></li>
  <li><p><b>[target language from title]-English Translations</b>: Read the [target language from title] version first, then check the English translation for clarity—no dictionary needed.</p></li>
  <li><p><b>Enhance Reading Skills</b>: Stories boost comprehension naturally, helping you read with confidence step by step.</p></li>
  <li><p><b>Expand Vocabulary Effortlessly</b>: Each story includes 10 key words with pronunciation guides and English meanings, making learning easy and contextual.</p></li>
  <li><p><b>Master Everyday Phrases</b>: Learn practical expressions used by native speakers in fun, magical settings.</p></li>
  <li><p><b>Bonus Illustration Prompts</b>: Minimalist doodle-style drawing ideas spark creativity and bring stories to life.</p></li>
</ul>

<p><b>Get Started Now</b>: Scroll up and grab your copy!</p>

<p><i>Note</i>: These stories focus on [specific theme from stories] adventures to build confidence. For extra practice, revisit vocabulary and questions after each story. With all ${stories.length} stories in one place, this book offers convenient, offline learning.</p>

Requirements:
- Be written in ${languageName}
- Use the exact format structure provided above
- Include specific references to the actual stories and their themes
- Make it engaging and encouraging
- Ensure all bullet points are properly formatted with · symbol
- Do not add any additional content outside this format
- CRITICAL: Analyze the book title to determine the target language. Stories are written in the target language with English translations for support. All language learning references must be about learning the target language from the title
- IMPORTANT: When you see [specific theme from stories] or similar placeholders, replace them with the actual themes from the provided stories (e.g., if stories are about Halloween, use "Halloween"; if about Christmas, use "Christmas", etc.)
- Create 2-3 specific adventure examples based on the actual story titles provided
- FORMAT: Return VALID HTML using ONLY <p>, <b>, <i>, <br>, <ul>, <li> tags. No markdown. Do NOT include wrapper tags like <html>, <head>, <body>.

Generate content that matches this exact format while incorporating details from the provided stories.`;

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
      !["introduction", "howToUse", "conclusion", "description"].includes(type)
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
              "HTTP-Referer":
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
              "X-Title":
                process.env.NEXT_PUBLIC_SITE_NAME || "Storybook Generator",
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
