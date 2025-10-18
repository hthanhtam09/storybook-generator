import type {
  Story,
  VocabularyWord,
  Question,
  QuestionOption,
  ParseResult,
  ValidationError,
} from "./types";

export function parseStories(input: string): ParseResult {
  const errors: ValidationError[] = [];
  const stories: Story[] = [];

  if (!input.trim()) {
    return { stories: [], errors: [] };
  }

  const storyBlocks = input
    .split(/(?=(?:Story|Cuento|Histoire|Geschichte|Storia) \d+:)/i)
    .filter((block) => block.trim());

  for (const block of storyBlocks) {
    try {
      const story = parseStoryBlock(block);
      if (story) {
        stories.push(story);
      }
    } catch (error) {
      errors.push({
        message:
          error instanceof Error ? error.message : "Failed to parse story",
        severity: "error",
      });
    }
  }

  // Validate story numbers are sequential
  const storyNumbers = stories.map((s) => s.number).sort((a, b) => a - b);
  for (let i = 0; i < storyNumbers.length; i++) {
    if (storyNumbers[i] !== i + 1) {
      errors.push({
        message: `Story numbers are not sequential. Expected ${i + 1}, found ${
          storyNumbers[i]
        }`,
        severity: "warning",
      });
    }
  }

  return { stories, errors };
}

function parseStoryBlock(block: string): Story | null {
  const lines = block.split("\n").map((line) => line.trim());

  const titleLine = lines[0];

  // Try multiple title formats
  let titleMatch = titleLine.match(
    /(?:Story|Cuento|Histoire|Geschichte|Storia) (\d+):\s*(.+?)\s*\/\s*(.+)/i
  );

  if (!titleMatch) {
    // Try format: Story [number]: Title (Translated Title)
    titleMatch = titleLine.match(
      /(?:Story|Cuento|Histoire|Geschichte|Storia) (\d+):\s*(.+?)\s*\(\s*(.+?)\s*\)/i
    );
  }

  if (!titleMatch) {
    // Try format: Story [number]: Title - Translated Title
    titleMatch = titleLine.match(
      /(?:Story|Cuento|Histoire|Geschichte|Storia) (\d+):\s*(.+?)\s*-\s*(.+)/i
    );
  }

  if (!titleMatch) {
    // Try format: Story [number]: Title
    titleMatch = titleLine.match(
      /(?:Story|Cuento|Histoire|Geschichte|Storia) (\d+):\s*(.+)/i
    );
    if (titleMatch) {
      // If only one title is found, use it for both original and translated
      titleMatch[3] = titleMatch[2];
    }
  }

  if (!titleMatch) {
    throw new Error(
      "Invalid story title format. Supported formats:\n" +
        "- Story [number]: Title / Translated Title\n" +
        "- Story [number]: Title (Translated Title)\n" +
        "- Story [number]: Title - Translated Title\n" +
        "- Story [number]: Title"
    );
  }

  const storyNumber = Number.parseInt(titleMatch[1], 10);
  const titleOriginal = titleMatch[2].trim();
  const titleTranslated = titleMatch[3] ? titleMatch[3].trim() : titleOriginal;

  const vocabularyStartIndex = lines.findIndex(
    (line) =>
      line.startsWith("+") &&
      (line.toLowerCase().includes("vocabulario") ||
        line.toLowerCase().includes("vocabulary"))
  );
  if (vocabularyStartIndex === -1) {
    throw new Error(
      `Story ${storyNumber}: Missing +Vocabulario / +Vocabulary section`
    );
  }

  const vocabulary: VocabularyWord[] = [];
  let currentIndex = vocabularyStartIndex + 1;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();

    // Stop if we hit another section with + prefix or empty line followed by story title
    if (
      line.startsWith("+") ||
      (!line &&
        currentIndex + 1 < lines.length &&
        lines[currentIndex + 1].startsWith("+"))
    ) {
      break;
    }

    if (!line) {
      currentIndex++;
      continue;
    }

    // Stop if we hit a line that looks like a story title (no arrows, capitalized)
    if (
      !line.includes("→") &&
      line.length > 3 &&
      line[0] === line[0].toUpperCase() &&
      !line.match(/^\d+\./)
    ) {
      break;
    }

    // Match format: word → /ipa/ → pronunciation → translation
    const vocabMatch = line.match(
      /^(.+?)\s*→\s*\/(.+?)\/\s*→\s*(.+?)\s*→\s*(.+)/
    );

    if (vocabMatch) {
      vocabulary.push({
        word: vocabMatch[1].trim(),
        ipa: vocabMatch[2].trim(),
        pronunciation: vocabMatch[3].trim(),
        translation: vocabMatch[4].trim(),
      });
    }
    currentIndex++;
  }

  if (vocabulary.length !== 10) {
    throw new Error(
      `Story ${storyNumber}: Expected 10 vocabulary words, found ${vocabulary.length}`
    );
  }

  let storyTextStartIndex = -1;
  for (let i = currentIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line &&
      line[0] === line[0].toUpperCase() &&
      !line.startsWith("+") &&
      !line.toLowerCase().includes("preguntas") &&
      !line.toLowerCase().includes("comprehension") &&
      !line.toLowerCase().includes("respuestas") &&
      !line.toLowerCase().includes("answers") &&
      line.length > 3 &&
      !line.includes("→") // Not a vocabulary line
    ) {
      storyTextStartIndex = i;
      break;
    }
  }

  if (storyTextStartIndex === -1) {
    throw new Error(`Story ${storyNumber}: Missing story text section`);
  }

  // Check if the first line is a title (short, no periods) or actual story content
  const firstLine = lines[storyTextStartIndex].trim();
  const isTitle =
    firstLine.length < 50 &&
    !firstLine.includes(".") &&
    !firstLine.includes(",");

  currentIndex = isTitle ? storyTextStartIndex + 1 : storyTextStartIndex;
  const originalStoryLines: string[] = [];

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();

    // Stop if we hit another section with + prefix (like the translated title)
    if (line && line.startsWith("+")) {
      // Check if this looks like a translated title (not a section header)
      const titleText = line.substring(1).trim(); // Remove the + prefix
      if (
        titleText &&
        titleText[0] === titleText[0].toUpperCase() &&
        !titleText.includes(".") &&
        !titleText.includes(",") &&
        !titleText.toLowerCase().includes("vocabulario") &&
        !titleText.toLowerCase().includes("vocabulary") &&
        !titleText.toLowerCase().includes("preguntas") &&
        !titleText.toLowerCase().includes("comprehension") &&
        !titleText.toLowerCase().includes("respuestas") &&
        !titleText.toLowerCase().includes("answers") &&
        !titleText.toLowerCase().includes("illustration") &&
        !titleText.toLowerCase().includes("prompt") &&
        titleText.length > 3 &&
        titleText.length < 100 &&
        originalStoryLines.length > 0
      ) {
        // This looks like a translated title, stop here
        break;
      }
    }

    // Also stop if we hit another capitalized title-like line (the translated version)
    // Look for a line that appears to be a title (capitalized, no periods, reasonable length)
    // But be more specific - it should look like a proper title, not dialogue
    if (
      line &&
      line[0] === line[0].toUpperCase() &&
      !line.startsWith("—") &&
      !line.startsWith('"') &&
      !line.startsWith("+") &&
      !line.includes(".") &&
      !line.includes(",") &&
      !line.includes(":") && // Exclude dialogue lines like "A sombra sussurra:"
      line.length > 3 &&
      line.length < 100 && // Reasonable title length
      originalStoryLines.length > 0 // At least some story content
    ) {
      // Additional check: if the next few lines also look like story content,
      // this might be the translated title
      let looksLikeTranslatedTitle = true;
      let hasStoryContentAfter = false;

      for (let i = 1; i <= 5 && currentIndex + i < lines.length; i++) {
        const nextLine = lines[currentIndex + i].trim();
        if (
          nextLine &&
          (nextLine.startsWith("+") ||
            nextLine.toLowerCase().includes("preguntas") ||
            nextLine.toLowerCase().includes("comprehension"))
        ) {
          looksLikeTranslatedTitle = false;
          break;
        }

        // Check if there's actual story content after this line
        if (
          nextLine &&
          !nextLine.startsWith("+") &&
          (nextLine.includes(".") ||
            nextLine.includes("—") ||
            nextLine.includes('"'))
        ) {
          hasStoryContentAfter = true;
        }
      }

      // If this looks like a title and there's story content after it, it's likely the translated title
      if (looksLikeTranslatedTitle && hasStoryContentAfter) {
        break;
      }
    }

    if (line) {
      originalStoryLines.push(line);
    }
    currentIndex++;
  }

  // Skip the translated title line
  currentIndex++;
  const translatedStoryLines: string[] = [];

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();

    // Stop if we hit the questions section with + prefix
    if (
      line.startsWith("+") &&
      (line.toLowerCase().includes("preguntas de comprensión") ||
        line.toLowerCase().includes("comprehension questions"))
    ) {
      break;
    }

    if (line) {
      translatedStoryLines.push(line);
    }
    currentIndex++;
  }

  const textOriginal = originalStoryLines.join("\n").trim();
  const textTranslated = translatedStoryLines.join("\n").trim();

  if (!textOriginal || !textTranslated) {
    throw new Error(
      `Story ${storyNumber}: Story text must include both original and translated versions`
    );
  }

  const questionsStartIndex = lines.findIndex(
    (line) =>
      line.startsWith("+") &&
      (line.toLowerCase().includes("preguntas de comprensión") ||
        line.toLowerCase().includes("comprehension questions"))
  );

  if (questionsStartIndex === -1) {
    throw new Error(
      `Story ${storyNumber}: Missing +Preguntas de Comprensión / +Comprehension Questions section`
    );
  }

  const questions: Question[] = [];
  currentIndex = questionsStartIndex + 1;

  while (currentIndex < lines.length && !lines[currentIndex].startsWith("+")) {
    const line = lines[currentIndex];

    // Match question format: Question text / Translated question text (without number prefix)
    const questionMatch = line.match(/^¿?(.+?)\s*\/\s*(.+?)$/);

    if (questionMatch && !line.match(/^[a-c]\)/)) {
      const questionOriginal = questionMatch[1].trim();
      const questionTranslated = questionMatch[2].trim();

      const options: QuestionOption[] = [];

      // Parse options (a, b, c)
      for (let i = 0; i < 3; i++) {
        currentIndex++;
        if (currentIndex < lines.length) {
          const optionLine = lines[currentIndex];
          const optionMatch = optionLine.match(
            /^([a-c])\)\s*(.+?)\s*\/\s*(.+)/
          );

          if (optionMatch) {
            options.push({
              letter: optionMatch[1],
              textOriginal: optionMatch[2].trim(),
              textTranslated: optionMatch[3].trim(),
            });
          }
        }
      }

      if (options.length === 3) {
        questions.push({
          number: questions.length + 1,
          questionOriginal,
          questionTranslated,
          options,
        });
      }
    }

    currentIndex++;
  }

  if (questions.length === 0) {
    throw new Error(`Story ${storyNumber}: No comprehension questions found`);
  }

  const answers: string[] = [];

  // Find the answers section
  const answersStartIndex = lines.findIndex(
    (line) =>
      line.startsWith("+") &&
      (line.toLowerCase().includes("respuestas correctas") ||
        line.toLowerCase().includes("correct answers"))
  );

  if (answersStartIndex !== -1) {
    currentIndex = answersStartIndex + 1;

    // Parse answers - each answer is on a separate line starting with a), b), or c)
    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();

      // Stop if we hit another section with + prefix or another story
      if (
        line.startsWith("+") ||
        line.match(/^(?:Story|Cuento|Histoire|Geschichte|Storia) \d+:/i)
      ) {
        break;
      }

      // Skip blank lines
      if (!line) {
        currentIndex++;
        continue;
      }

      // Match answer format: a) text / translated text
      // We only need to extract the letter
      const answerMatch = line.match(/^([a-c])\)/);

      if (answerMatch) {
        answers.push(answerMatch[1]);
      }

      currentIndex++;
    }
  }

  if (answers.length !== questions.length) {
    throw new Error(
      `Story ${storyNumber}: Expected ${questions.length} answers (found ${questions.length} questions), but found ${answers.length} answers`
    );
  }

  // Find and extract illustration prompt
  let illustrationPrompt: string | undefined;
  const illustrationStartIndex = lines.findIndex(
    (line) =>
      line.startsWith("+") &&
      (line.toLowerCase().includes("illustration prompt") ||
        line.toLowerCase().includes("prompt de ilustración"))
  );

  if (illustrationStartIndex !== -1) {
    const promptLines: string[] = [];
    let currentIndex = illustrationStartIndex + 1;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();

      // Stop if we hit another section with + prefix or another story
      if (
        line.startsWith("+") ||
        line.match(/^(?:Story|Cuento|Histoire|Geschichte|Storia) \d+:/i)
      ) {
        break;
      }

      if (line) {
        promptLines.push(line);
      }
      currentIndex++;
    }

    illustrationPrompt = promptLines.join("\n").trim();
  }

  return {
    number: storyNumber,
    titleOriginal,
    titleTranslated,
    vocabulary,
    textOriginal,
    textTranslated,
    questions,
    answers,
    illustrationPrompt,
  };
}

export function validateStories(stories: Story[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (stories.length === 0) {
    errors.push({
      message: "No stories found. Please add at least one story.",
      severity: "warning",
    });
    return errors;
  }

  for (const story of stories) {
    // Validate vocabulary count
    if (story.vocabulary.length !== 10) {
      errors.push({
        message: `Story ${story.number}: Must have exactly 10 vocabulary words`,
        severity: "error",
      });
    }

    if (story.questions.length === 0) {
      errors.push({
        message: `Story ${story.number}: Must have at least one comprehension question`,
        severity: "error",
      });
    }

    if (story.answers.length !== story.questions.length) {
      errors.push({
        message: `Story ${story.number}: Number of answers (${story.answers.length}) must match number of questions (${story.questions.length})`,
        severity: "error",
      });
    }

    // Validate each question has 3 options
    story.questions.forEach((question) => {
      if (question.options.length !== 3) {
        errors.push({
          message: `Story ${story.number}, Question ${question.number}: Must have exactly 3 options`,
          severity: "error",
        });
      }
    });

    // Validate story text is not empty
    if (!story.textOriginal || !story.textTranslated) {
      errors.push({
        message: `Story ${story.number}: Story text cannot be empty`,
        severity: "error",
      });
    }
  }

  return errors;
}
