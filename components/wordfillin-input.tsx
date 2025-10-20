"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import type { WordFillInConfig, WordFillInPage } from "@/lib/types";

interface WordFillInInputProps {
  onPuzzlesChange: (puzzles: WordFillInPage[]) => void;
}

export function WordFillInInput({ onPuzzlesChange }: WordFillInInputProps) {
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [pages, setPages] = useState(1);
  const [gridSize, setGridSize] = useState(15);
  const [puzzles, setPuzzles] = useState<WordFillInPage[]>([]);

  const handleAddWord = () => {
    const trimmedInput = newWord.trim();
    if (!trimmedInput) return;

    // Split by comma and process each word
    const newWords = trimmedInput
      .split(",")
      .map((word) => word.trim().toUpperCase())
      .filter((word) => word.length > 0 && !words.includes(word));

    if (newWords.length > 0) {
      setWords((prev) => [...prev, ...newWords]);
      setNewWord("");

      // Show notification for multiple words added
      if (newWords.length > 1) {
        console.log(`Đã thêm ${newWords.length} từ: ${newWords.join(", ")}`);
      }
    }
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setWords((prev) => prev.filter((word) => word !== wordToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddWord();
    }
  };

  const handleGeneratePuzzles = async () => {
    if (words.length === 0) return;

    try {
      const config: WordFillInConfig = {
        words,
        pages,
        gridSize,
        showAnswers: false,
      };

      // Import the generator dynamically to avoid SSR issues
      const { WordFillInGenerator } = await import(
        "@/lib/wordfillin-generator"
      );
      const generatedPuzzles = WordFillInGenerator.generatePuzzles(config);

      setPuzzles(generatedPuzzles);
      onPuzzlesChange(generatedPuzzles);
    } catch (error) {
      console.error("Error generating puzzles:", error);
    }
  };

  const handleClearAll = () => {
    setWords([]);
    setPuzzles([]);
    onPuzzlesChange([]);
  };

  const wordsPerPage = Math.ceil(words.length / pages);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="space-y-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Cấu hình Word Fill-in Puzzle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pages">Số trang</Label>
                <Input
                  id="pages"
                  type="number"
                  min="1"
                  max="20"
                  value={pages}
                  onChange={(e) =>
                    setPages(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gridSize">Kích thước lưới</Label>
                <Input
                  id="gridSize"
                  type="number"
                  min="10"
                  max="25"
                  value={gridSize}
                  onChange={(e) =>
                    setGridSize(
                      Math.max(10, Math.min(25, parseInt(e.target.value) || 15))
                    )
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleGeneratePuzzles}
                disabled={words.length === 0}
              >
                Tạo Puzzle
              </Button>
              <Button variant="outline" onClick={handleClearAll}>
                Xóa tất cả
              </Button>
            </div>

            {words.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Tổng số từ: {words.length} | Từ mỗi trang: {wordsPerPage} | Số
                trang: {pages} | Từ còn lại: {words.length % pages}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Word Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nhập từ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                💡 <strong>Mẹo:</strong> Bạn có thể nhập nhiều từ cùng lúc, cách
                nhau bởi dấu phẩy (,)
              </p>
              <p>
                Ví dụ:{" "}
                <code className="bg-muted px-1 rounded">
                  CAT, DOG, BIRD, FISH
                </code>
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập từ mới (cách nhau bởi dấu phẩy): CAT, DOG, BIRD..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleAddWord} disabled={!newWord.trim()}>
                Thêm
              </Button>
            </div>

            {words.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Danh sách từ ({words.length})</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWords([])}
                      className="text-destructive hover:text-destructive"
                    >
                      Xóa tất cả
                    </Button>
                  </div>
                  <ScrollArea className="h-32 w-full rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                      {words.map((word, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {word}
                          <button
                            onClick={() => handleRemoveWord(word)}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Generated Puzzles Summary */}
        {puzzles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Puzzle đã tạo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {puzzles.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>Trang {page.pageNumber}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {page.puzzle.words.length} từ
                      </Badge>
                      <Badge variant="outline">
                        {page.puzzle.grid.length}x{page.puzzle.grid[0].length}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
