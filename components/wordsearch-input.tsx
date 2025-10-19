"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WordSearchConfig } from "@/lib/wordsearch-config";

interface WordSearchInputProps {
  config: WordSearchConfig;
  onConfigChange: (config: WordSearchConfig) => void;
}

export function WordSearchInput({
  config,
  onConfigChange,
}: WordSearchInputProps) {
  const { toast } = useToast();
  const [bulkWords, setBulkWords] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Helper function to safely calculate page count
  const calculatePageCount = (wordCount: number, wordsPerPage: number) => {
    if (!wordCount || wordCount <= 0) return 1;
    if (!wordsPerPage || wordsPerPage <= 0) return 1;
    return Math.ceil(wordCount / wordsPerPage);
  };

  const removeWord = (word: string) => {
    const newWords = config.words.filter((w) => w !== word);
    onConfigChange({
      ...config,
      words: newWords,
      pageCount: calculatePageCount(newWords.length, config.wordsPerPage),
    });
  };

  const clearAllWords = () => {
    const wordCount = config.words.length;
    onConfigChange({
      ...config,
      words: [],
      pageCount: 1,
    });
    setErrorMessage("");

    if (wordCount > 0) {
      toast({
        title: "Success!",
        description: `Removed ${wordCount} words from the list.`,
      });
    }
  };

  const addBulkWords = () => {
    setErrorMessage("");

    const words = bulkWords
      .split(/[,;\n]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      toast({
        title: "Notice",
        description: "No words found. Please enter words and try again.",
        variant: "destructive",
      });
      return;
    }

    const wordCount: Record<string, number> = {};
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const duplicates = Object.entries(wordCount)
      .filter(([word, count]) => count > 1)
      .map(([word, count]) => `${word} (${count} times)`);

    if (duplicates.length > 0) {
      setErrorMessage(
        `Warning: Duplicate words found: ${duplicates.join(
          ", "
        )}. Will keep only 1 instance of each word.`
      );
    }

    const previousWordCount = config.words.length;
    const uniqueWords = [...new Set([...config.words, ...words])];
    onConfigChange({
      ...config,
      words: uniqueWords,
      pageCount: calculatePageCount(uniqueWords.length, config.wordsPerPage),
    });
    setBulkWords("");

    const actualAddedWords = [...new Set(words)].length;
    toast({
      title: "Success!",
      description: `Added ${actualAddedWords} words to the list. Total: ${
        previousWordCount + actualAddedWords
      } words.`,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Word Search Generator</h2>
          <p className="text-sm text-muted-foreground">
            Create professional word search puzzles
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Word Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Words
              </CardTitle>
              <CardDescription>
                Add words to create your word search puzzle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bulk Word Input */}
              <div className="space-y-2">
                <Label>Bulk Add Words</Label>
                <Textarea
                  placeholder="apple, banana, orange&#10;grape&#10;watermelon"
                  value={bulkWords}
                  onChange={(e) => {
                    setBulkWords(e.target.value);
                    setErrorMessage("");
                  }}
                  rows={4}
                  className={
                    errorMessage ? "border-red-500 focus:border-red-500" : ""
                  }
                />
                {errorMessage && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {errorMessage}
                  </div>
                )}
                <Button onClick={addBulkWords} variant="outline" size="sm">
                  Add All Words
                </Button>
              </div>

              {/* Word List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Word List ({config.words.length} words)</Label>
                  {config.words.length > 0 && (
                    <Button
                      onClick={clearAllWords}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                  {config.words.map((word, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {word}
                      <button
                        onClick={() => removeWord(word)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {config.words.length > 0 && (
                  <p className="text-xs text-gray-500">
                    You have {config.words.length} unique words. With{" "}
                    {config.wordsPerPage} words/page →{" "}
                    {calculatePageCount(
                      config.words.length,
                      config.wordsPerPage
                    )}{" "}
                    pages
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </CardTitle>
              <CardDescription>
                Customize your word search puzzle settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Grid Size */}
              <div className="space-y-2">
                <Label>
                  Grid Size: {config.gridSize}x{config.gridSize}
                </Label>
                <Slider
                  value={[config.gridSize]}
                  onValueChange={(value) =>
                    onConfigChange({ ...config, gridSize: value[0] })
                  }
                  min={10}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={config.difficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") =>
                    onConfigChange({ ...config, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={config.language}
                  onValueChange={(value) =>
                    onConfigChange({ ...config, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Words Per Page */}
              <div className="space-y-2">
                <Label>Words per Page</Label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.wordsPerPage}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    onConfigChange({
                      ...config,
                      wordsPerPage: value,
                      pageCount: calculatePageCount(config.words.length, value),
                    });
                  }}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Pages will be calculated automatically:{" "}
                  {calculatePageCount(config.words.length, config.wordsPerPage)}{" "}
                  pages
                </p>
              </div>

              {/* Word Distribution */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="distributeWords"
                    checked={config.distributeWords}
                    onCheckedChange={(checked) =>
                      onConfigChange({
                        ...config,
                        distributeWords: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="distributeWords">
                    Distribute unique words across pages
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  {config.distributeWords
                    ? `${
                        config.words.length
                      } unique words will be distributed across ${Math.min(
                        config.pageCount,
                        Math.ceil(config.words.length / config.wordsPerPage)
                      )} pages (${
                        config.wordsPerPage
                      } words/page). Each word appears only once.`
                    : `All ${config.words.length} words will be repeated on each page`}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showWordList"
                    checked={config.showWordList}
                    onCheckedChange={(checked) =>
                      onConfigChange({
                        ...config,
                        showWordList: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="showWordList">Show Word List</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowDiagonal"
                    checked={config.allowDiagonal}
                    onCheckedChange={(checked) =>
                      onConfigChange({
                        ...config,
                        allowDiagonal: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="allowDiagonal">Allow Diagonal Words</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowBackward"
                    checked={config.allowBackward}
                    onCheckedChange={(checked) =>
                      onConfigChange({
                        ...config,
                        allowBackward: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="allowBackward">Allow Backward Words</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showAnswersInGrid"
                    checked={config.showAnswersInGrid}
                    onCheckedChange={(checked) =>
                      onConfigChange({
                        ...config,
                        showAnswersInGrid: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="showAnswersInGrid">
                    Show Answers (highlighted background)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

