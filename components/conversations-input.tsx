"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, MessageCircle } from "lucide-react";
import type { ConversationLesson } from "@/lib/types";

interface ConversationsInputProps {
  initialValue?: string;
  onLessonsChange?: (
    lessons: ConversationLesson[],
    inputText: string,
    hasErrors: boolean
  ) => void;
}

interface ValidationError {
  line?: number;
  message: string;
  severity: "error" | "warning";
}

interface ParseResult {
  lessons: ConversationLesson[];
  errors: ValidationError[];
}

const parseLessons = (text: string): ParseResult => {
  const lessons: ConversationLesson[] = [];
  const errors: ValidationError[] = [];

  const lines = text.split("\n");
  let currentLesson: Partial<ConversationLesson> | null = null;
  let currentSection:
    | "intro"
    | "vocab"
    | "conversation"
    | "conversationTranslated"
    | "questions"
    | "answers"
    | "topic"
    | null = null;
  let lessonCount = 0;
  let currentQuestionText = "";
  let currentTopic = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    if (!line) continue;

    // Check for Conversation header (e.g., "Conversation 1:", "Lesson 1:", "## Conversation 1:")
    const conversationMatch = line.match(
      /^(?:##\s*)?(?:Conversation|Lesson)\s+(\d+):?\s*(.*)$/i
    );
    if (conversationMatch) {
      // Save previous lesson
      if (currentLesson) {
        if (
          currentLesson.introduction ||
          (currentLesson.vocabulary && currentLesson.vocabulary.length > 0) ||
          (currentLesson.conversation && currentLesson.conversation.length > 0)
        ) {
          lessons.push({
            id: `lesson-${lessonCount}`,
            title: currentLesson.title || "",
            titleTranslated: currentLesson.titleTranslated || "",
            introduction: currentLesson.introduction || "",
            vocabulary: currentLesson.vocabulary || [],
            conversation: currentLesson.conversation || [],
            conversationTranslated: currentLesson.conversationTranslated || [],
            questions: currentLesson.questions || [],
            answers: currentLesson.answers || [],
            topic: currentLesson.topic,
          });
        }
      }

      // Start new lesson
      lessonCount++;
      const title = conversationMatch[2].trim();
      currentLesson = {
        title: title,
        titleTranslated: "",
        introduction: "",
        vocabulary: [],
        conversation: [],
        conversationTranslated: [],
        questions: [],
        answers: [],
        topic: currentTopic || undefined,
      };
      currentSection = null;
      currentQuestionText = "";
      continue;
    }

    // Check for conversation title with + prefix (original language)
    // After vocabulary section, next line with + (not a section header) is the conversation title
    if (
      currentSection === "vocab" &&
      currentLesson &&
      currentLesson.vocabulary &&
      currentLesson.vocabulary.length > 0
    ) {
      const titleMatch = line.match(/^\+(.+)$/);
      if (
        titleMatch &&
        !line.match(
          /^\+\s*(Topic|Introduction|Vocabulary|Vocabulario|Conversation|Questions?|Answers?):?\s*$/i
        )
      ) {
        currentLesson.title = titleMatch[1].trim();
        currentSection = "conversation";
        continue;
      }

      // Detect potential missing + prefix (line looks like a title but has no +)
      if (
        !line.startsWith("+") && // Does NOT start with +
        !line.includes("→") && // Not a vocabulary line
        !line.match(/^[a-z]/) && // Starts with capital letter
        line.length > 5 &&
        line.length < 80 &&
        !line.includes(":") && // Not dialogue
        !line.match(/^\d/) && // Not numbered
        currentLesson.vocabulary.length > 5 // Has sufficient vocabulary
      ) {
        // Parse it as title anyway (without +) to continue parsing dialogue
        currentLesson.title = line.trim();
        currentSection = "conversation";
        continue;
      }
    }

    // Check for translated conversation title with + prefix
    if (
      currentSection === "conversation" &&
      currentLesson &&
      currentLesson.conversation &&
      currentLesson.conversation.length > 0 &&
      !currentLesson.conversationTranslated?.length
    ) {
      const titleMatch = line.match(/^\+(.+)$/);
      if (
        titleMatch &&
        !line.match(
          /^\+\s*(Topic|Introduction|Vocabulary|Vocabulario|Conversation|Questions?|Answers?):?\s*$/i
        )
      ) {
        currentLesson.titleTranslated = titleMatch[1].trim();
        currentSection = "conversationTranslated";
        continue;
      }

      // Detect potential missing + prefix for translated title
      if (
        !line.startsWith("+") && // Does NOT start with +
        !line.includes(":") && // Not dialogue
        !line.match(/^[a-z]/) && // Starts with capital letter
        line.length > 5 &&
        line.length < 80 &&
        currentLesson.conversation.length > 5 // Has sufficient dialogue
      ) {
        // Parse it as title anyway (without +) to continue parsing dialogue
        currentLesson.titleTranslated = line.trim();
        currentSection = "conversationTranslated";
        continue;
      }
    }

    // Check for section headers with + prefix (more flexible matching)
    if (line.match(/^\+\s*Topic:?$/i)) {
      currentSection = "topic";
      continue;
    }
    if (line.match(/^\+\s*Introduction:?$/i)) {
      currentSection = "intro";
      continue;
    }
    if (
      line.match(/^\+\s*Vocabulary:?$/i) ||
      line.match(/^\+\s*Vocabulario/i)
    ) {
      currentSection = "vocab";
      continue;
    }
    if (line.match(/^\+\s*Conversation:?$/i)) {
      currentSection = "conversation";
      continue;
    }
    if (line.match(/^\+Questions?:?$/i) || line.match(/^\+Questions?\s+de/i)) {
      // Before switching to questions, check if we should capture the translated conversation
      currentSection = "questions";
      currentQuestionText = "";
      continue;
    }
    if (line.match(/^\+Answers?:?$/i) || line.match(/^\+R[ée]ponses/i)) {
      currentSection = "answers";
      continue;
    }

    // Process content based on current section
    if (currentSection === "topic") {
      // Store topic for upcoming lessons
      currentTopic = line.trim();
      continue;
    }

    if (currentLesson) {
      if (currentSection === "intro") {
        currentLesson.introduction = currentLesson.introduction
          ? currentLesson.introduction + "\n" + line
          : line;
      } else if (currentSection === "vocab") {
        // Parse vocabulary: word → /ipa/ → pronunciation → translation
        const parts = line.split("→").map((p) => p.trim());
        if (parts.length === 4) {
          const word = parts[0].trim();
          const ipa = parts[1].replace(/^\/|\/$/g, "").trim(); // Remove surrounding slashes
          const pronunciation = parts[2].trim();
          const translation = parts[3].trim();

          if (word && translation) {
            currentLesson.vocabulary = currentLesson.vocabulary || [];
            currentLesson.vocabulary.push({
              word,
              ipa,
              pronunciation,
              translation,
            });
          }
        } else {
          // Try old format for backward compatibility: word|ipa|translation
          const oldParts = line.split("|");
          if (oldParts.length >= 3) {
            const word = oldParts[0].trim();
            const ipa = oldParts[1].trim();
            const translation = oldParts[2].trim();
            if (word && translation) {
              currentLesson.vocabulary = currentLesson.vocabulary || [];
              currentLesson.vocabulary.push({
                word,
                ipa,
                pronunciation: "",
                translation,
              });
            }
          }
        }
      } else if (currentSection === "conversation") {
        // Parse conversation: Speaker: Text
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const speaker = match[1].trim();
          const text = match[2].trim();
          if (speaker && text) {
            currentLesson.conversation = currentLesson.conversation || [];
            currentLesson.conversation.push({ speaker, text });
          }
        }
      } else if (currentSection === "conversationTranslated") {
        // Parse translated conversation: Speaker: Text
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          const speaker = match[1].trim();
          const text = match[2].trim();
          if (speaker && text) {
            currentLesson.conversationTranslated =
              currentLesson.conversationTranslated || [];
            currentLesson.conversationTranslated.push({ speaker, text });
          }
        }
      } else if (currentSection === "questions") {
        // Parse questions - format similar to Story Generator
        // Question format: "¿Question? / Question?"
        // Options format: "a) Option / Option"

        // Check if this is a question line (starts with ¿ or has bilingual format)
        if (
          line.match(/^[¿?]/) ||
          (line.includes(" / ") && !line.match(/^[a-d]\)/))
        ) {
          // This is a question line
          if (currentQuestionText) {
            // Process previous question if exists
            // (will be processed when we hit options)
          }
          currentQuestionText = line;
        } else if (line.match(/^[a-d]\)/)) {
          // This is an option line
          if (currentQuestionText) {
            // Parse the question
            const questionParts = currentQuestionText.split("/");
            if (questionParts.length === 2) {
              const questionNumber = (currentLesson.questions?.length || 0) + 1;

              // Create question if not exists
              if (
                !currentLesson.questions?.find(
                  (q) => q.number === questionNumber
                )
              ) {
                currentLesson.questions = currentLesson.questions || [];
                currentLesson.questions.push({
                  number: questionNumber,
                  questionOriginal: questionParts[0].trim(),
                  questionTranslated: questionParts[1].trim(),
                  options: [],
                });
              }
            }
            currentQuestionText = "";
          }

          // Parse option
          const optionMatch = line.match(/^([a-d])\)\s*(.+)$/);
          if (optionMatch && currentLesson.questions) {
            const letter = optionMatch[1];
            const optionText = optionMatch[2].trim();
            const optionParts = optionText.split("/");

            if (optionParts.length === 2) {
              const lastQuestion =
                currentLesson.questions[currentLesson.questions.length - 1];
              if (lastQuestion) {
                lastQuestion.options.push({
                  letter,
                  textOriginal: optionParts[0].trim(),
                  textTranslated: optionParts[1].trim(),
                });
              }
            }
          }
        }
      } else if (currentSection === "answers") {
        // Parse answers - format: "a) Answer / Answer" or just "a)"
        const answerMatch = line.match(/^([a-d])\)/);
        if (answerMatch) {
          currentLesson.answers = currentLesson.answers || [];
          currentLesson.answers.push(answerMatch[1]);
        }
      }
    }
  }

  // Save last lesson
  if (currentLesson) {
    if (
      currentLesson.introduction ||
      (currentLesson.vocabulary && currentLesson.vocabulary.length > 0) ||
      (currentLesson.conversation && currentLesson.conversation.length > 0)
    ) {
      lessons.push({
        id: `lesson-${lessonCount}`,
        title: currentLesson.title || "",
        titleTranslated: currentLesson.titleTranslated || "",
        introduction: currentLesson.introduction || "",
        vocabulary: currentLesson.vocabulary || [],
        conversation: currentLesson.conversation || [],
        conversationTranslated: currentLesson.conversationTranslated || [],
        questions: currentLesson.questions || [],
        answers: currentLesson.answers || [],
        topic: currentLesson.topic,
      });
    }
  }

  return { lessons, errors };
};

export function ConversationsInput({
  initialValue = "",
  onLessonsChange,
}: ConversationsInputProps) {
  const [input, setInput] = useState(initialValue);
  const [lessons, setLessons] = useState<ConversationLesson[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!input.trim()) {
      setLessons([]);
      setErrors([]);
      setIsValid(false);
      if (onLessonsChange) {
        onLessonsChange([], input, false);
      }
      return;
    }

    const timer = setTimeout(() => {
      const parseResult = parseLessons(input);
      const hasErrors =
        parseResult.errors.filter((e) => e.severity === "error").length > 0;

      setLessons(parseResult.lessons);
      setErrors(parseResult.errors);
      setIsValid(parseResult.lessons.length > 0 && !hasErrors);

      if (onLessonsChange) {
        onLessonsChange(parseResult.lessons, input, hasErrors);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [input, onLessonsChange]);

  const errorCount = errors.filter((e) => e.severity === "error").length;

  const getTotalVocabulary = () => {
    return lessons.reduce((sum, lesson) => sum + lesson.vocabulary.length, 0);
  };

  const getTotalDialogues = () => {
    return lessons.reduce((sum, lesson) => sum + lesson.conversation.length, 0);
  };

  const getTotalQuestions = () => {
    return lessons.reduce((sum, lesson) => sum + lesson.questions.length, 0);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Conversations Input
          </h3>
          <p className="text-xs text-muted-foreground">
            Paste your conversation data (single topic or full book)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <MessageCircle className="h-3 w-3" />
            {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
          </Badge>
          {getTotalVocabulary() > 0 && (
            <Badge variant="outline" className="gap-1">
              {getTotalVocabulary()} words
            </Badge>
          )}
          {getTotalDialogues() > 0 && (
            <Badge variant="outline" className="gap-1">
              {getTotalDialogues()} dialogues
            </Badge>
          )}
          {getTotalQuestions() > 0 && (
            <Badge variant="outline" className="gap-1">
              {getTotalQuestions()} questions
            </Badge>
          )}
          {isValid && lessons.length > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-green-500/50 text-green-500"
            >
              <CheckCircle2 className="h-3 w-3" />
              Valid
            </Badge>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errorCount > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {errorCount} {errorCount === 1 ? "error" : "errors"} found.
                Please fix them before exporting.
              </AlertDescription>
            </Alert>
          )}
          <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-border bg-card p-3">
            {errors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <AlertCircle
                  className={`mt-0.5 h-3 w-3 flex-shrink-0 ${
                    error.severity === "error"
                      ? "text-destructive"
                      : "text-yellow-500"
                  }`}
                />
                <span
                  className={
                    error.severity === "error"
                      ? "text-destructive"
                      : "text-yellow-500"
                  }
                >
                  {error.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="flex-1 p-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-full w-full resize-none rounded-md bg-background p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder={`+Topic
Daily Life & Greetings

## Conversation 1: At the Coffee Shop

+Introduction
John and Mary meet at a coffee shop. They haven't seen each other for a long time and catch up on their lives.

+Vocabulary
catch up → /kætʃ ʌp/ → katch uhp → to reconnect
coffee → /ˈkɔːfi/ → kaw-fee → coffee
friend → /frend/ → frend → friend

+At the Coffee Shop
John: Hey Mary! Long time no see! Want to catch up at the coffee shop?
Mary: John! It's been forever! How have you been, my friend?
John: I've been great! Just busy with work. How about you?
Mary: Same here. Let's get some coffee!

+At the Coffee Shop (Translation)
John: Hey Mary! Long time no see! Want to reconnect at the cafe?
Mary: John! It's been forever! How have you been, my friend?
John: I've been great! Just busy with work. How about you?
Mary: Same here. Let's get some coffee!

+Questions
¿Where do they meet? / Where do they meet?
a) At home / At home
b) At the coffee shop / At the coffee shop
c) At work / At work

+Answers
b)

## Conversation 2: Shopping at the Market
...`}
        />
      </Card>
    </div>
  );
}
