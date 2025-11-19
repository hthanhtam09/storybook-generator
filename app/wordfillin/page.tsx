"use client";

import { useCallback, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Download, RefreshCw, Upload, X } from "lucide-react";
import type { WordFillInPage } from "@/lib/types";
import { WordFillInGenerator } from "@/lib/wordfillin-generator";

const GRID_SIZE = 15;

const chunkPuzzles = (pages: WordFillInPage[]): WordFillInPage[][] => {
  if (!pages.length) return [];
  const chunks: WordFillInPage[][] = [];
  for (let index = 0; index < pages.length; index += 2) {
    chunks.push(pages.slice(index, index + 2));
  }
  return chunks;
};

interface TopicVocabulary {
  topic: string;
  words: string[];
}

export default function WordFillInPage() {
  const [topics, setTopics] = useState<TopicVocabulary[]>([]);
  const [puzzles, setPuzzles] = useState<WordFillInPage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportError, setBulkImportError] = useState("");

  // Calculate total words from all topics
  const wordList = useMemo(() => {
    const allWords: string[] = [];
    for (const topic of topics) {
      for (const word of topic.words) {
        if (!allWords.includes(word)) {
          allWords.push(word);
        }
      }
    }
    return allWords;
  }, [topics]);

  const groupedPuzzles = useMemo(() => chunkPuzzles(puzzles), [puzzles]);

  const handleClearWords = useCallback(() => {
    setTopics([]);
    setPuzzles([]);
  }, []);

  // Parse bulk import text (format: Topic X: Name\nword1, word2, ...)
  const parseBulkImport = useCallback(
    (
      text: string
    ): {
      topics: TopicVocabulary[];
      errors: string[];
    } => {
      const topics: TopicVocabulary[] = [];
      const errors: string[] = [];

      const lines = text.split("\n").map((line) => line.trim());

      let currentTopic: TopicVocabulary | null = null;
      let currentWords: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line) continue;

        // Check if line is a topic header (format: "Topic X: Topic Name")
        const topicRegex = /^Topic\s+\d+:\s*(.+)$/i;
        const topicMatch = topicRegex.exec(line);
        if (topicMatch) {
          // Save previous topic if exists
          if (currentTopic && currentWords.length > 0) {
            currentTopic.words = currentWords;
            topics.push(currentTopic);
          } else if (currentTopic && currentWords.length === 0) {
            errors.push(`Topic "${currentTopic.topic}" has no words`);
          }

          // Start new topic
          const topicName = topicMatch[1].trim();
          if (!topicName) {
            errors.push(`Topic at line ${i + 1} has no name`);
            currentTopic = null;
            currentWords = [];
            continue;
          }

          currentTopic = { topic: topicName, words: [] };
          currentWords = [];
        } else if (currentTopic) {
          // This is a word line - split by comma
          const words = line
            .split(",")
            .map((w) => w.trim().toUpperCase())
            .filter((w) => w.length > 0);

          currentWords.push(...words);
        } else {
          // Line doesn't match topic format and no current topic
          if (line.length > 0) {
            errors.push(
              `Line ${i + 1}: "${line}" - Expected topic header (Topic X: Name)`
            );
          }
        }
      }

      // Save last topic if exists
      if (currentTopic) {
        if (currentWords.length > 0) {
          currentTopic.words = currentWords;
          topics.push(currentTopic);
        } else {
          errors.push(`Topic "${currentTopic.topic}" has no words`);
        }
      }

      return { topics, errors };
    },
    []
  );

  // Handle bulk import
  const handleBulkImport = useCallback(() => {
    if (!bulkImportText.trim()) {
      setBulkImportError("Vui lòng nhập nội dung để import");
      return;
    }

    setBulkImportError("");

    const { topics: parsedTopics, errors } = parseBulkImport(bulkImportText);

    // Show errors if any
    if (errors.length > 0) {
      const errorList = errors.map((e, i) => `${i + 1}. ${e}`).join("\n");
      setBulkImportError(`Lỗi định dạng:\n${errorList}`);
      return;
    }

    if (parsedTopics.length === 0) {
      setBulkImportError(
        "Không tìm thấy topic nào. Vui lòng kiểm tra định dạng."
      );
      return;
    }

    // Update topics (each topic = 1 game)
    setTopics(parsedTopics);

    // Clear bulk import text
    setBulkImportText("");
    setBulkImportError("");
  }, [bulkImportText, parseBulkImport]);

  const handleGeneratePuzzles = useCallback(() => {
    if (!topics.length) return;
    setIsGenerating(true);

    try {
      // Generate 1 puzzle for each topic
      const generated: WordFillInPage[] = [];
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const topicPuzzles = WordFillInGenerator.generatePuzzles({
          words: topic.words,
          pages: 1, // 1 puzzle per topic
          gridSize: GRID_SIZE,
          showAnswers: false,
        });
        // Update page number to match topic index
        if (topicPuzzles.length > 0) {
          topicPuzzles[0].pageNumber = i + 1;
          generated.push(topicPuzzles[0]);
        }
      }
      setPuzzles(generated);
    } catch (error) {
      console.error("Failed to generate puzzles", error);
    } finally {
      setIsGenerating(false);
    }
  }, [topics]);

  const handleDownload = useCallback(async () => {
    if (!puzzles.length) return;
    setIsDownloading(true);

    try {
      const response = await fetch("/api/wordfillin/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ puzzles }),
      });

      if (!response.ok) {
        console.error("Failed to download puzzles");
        return;
      }

      const blob = await response.blob();
      const blobUrl = globalThis.URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `word-fill-in-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      globalThis.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      globalThis.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error", error);
    } finally {
      setIsDownloading(false);
    }
  }, [puzzles]);

  const renderGridCell = (
    cell: WordFillInPage["puzzle"]["grid"][number][number],
    key: string
  ) => {
    if (cell.isBlack) {
      return (
        <div
          key={key}
          role="gridcell"
          aria-label="Ô đen"
          className="size-7 border border-foreground/30 bg-foreground"
        />
      );
    }

    return (
      <div
        key={key}
        role="gridcell"
        aria-label="Ô trắng"
        className="size-7 border border-foreground/20 bg-background"
      />
    );
  };

  // Group words by length and sort
  const groupWordsByLength = useCallback((words: string[]) => {
    // Sort words by length (shortest first)
    const sorted = [...words].sort((a, b) => a.length - b.length);

    // Group by length
    const groups: Array<{ length: number; words: string[] }> = [];
    let currentLength = 0;
    let currentGroup: string[] = [];

    for (const word of sorted) {
      if (word.length === currentLength) {
        currentGroup.push(word);
      } else {
        // Save previous group if exists
        if (currentGroup.length > 0) {
          groups.push({ length: currentLength, words: currentGroup });
        }
        // Start new group
        currentLength = word.length;
        currentGroup = [word];
      }
    }

    // Save last group
    if (currentGroup.length > 0) {
      groups.push({ length: currentLength, words: currentGroup });
    }

    return groups;
  }, []);

  const renderPuzzleCard = (page: WordFillInPage) => {
    const { puzzle } = page;
    const rowCount = puzzle.grid.length || GRID_SIZE;
    const columnCount = puzzle.grid[0]?.length || GRID_SIZE;
    const wordGroups = groupWordsByLength(puzzle.wordList);

    return (
      <Card
        key={puzzle.id}
        className="flex flex-col border border-border shadow-sm"
      >
        <CardHeader className="space-y-1 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Puzzle #{page.pageNumber}
            </CardTitle>
            <Badge variant="outline" className="text-xs uppercase">
              {rowCount}x{columnCount} Grid
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{puzzle.words.length} words placed</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{puzzle.grid.length} rows</span>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6 py-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium uppercase tracking-wide">
                Word List
              </p>
              <Badge variant="secondary" className="text-xs">
                {puzzle.wordList.length} terms
              </Badge>
            </div>
            <ScrollArea className="h-56 rounded border border-border bg-background/50">
              <div className="space-y-3 p-3">
                {wordGroups.map((group) => (
                  <div key={group.length} className="space-y-2">
                    <div className="rounded-md bg-primary/10 px-2 py-1 text-center text-xs font-bold uppercase tracking-wide text-primary">
                      {group.length} {group.length === 1 ? "letter" : "letters"}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.words.map((word) => (
                        <span
                          key={word}
                          className="rounded border border-border px-2 py-1 text-center text-xs font-semibold tracking-wide text-foreground"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium uppercase tracking-wide">
              Game Grid
            </p>
            <div
              role="grid"
              aria-label={`Lưới trò chơi ${columnCount} cột ${rowCount} hàng cho Puzzle ${page.pageNumber}`}
              className="w-fit border-2 border-border bg-muted/40 p-1"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                gap: "2px",
              }}
            >
              {puzzle.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) =>
                  renderGridCell(cell, `${rowIndex}-${colIndex}`)
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />

      <div className="border-b border-border bg-background px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Word Fill-in Puzzle Lab
            </h1>
            <p className="text-sm text-muted-foreground">
              Bố cục giống Word Search: mỗi trang có 2 trò chơi xếp trên dưới,
              mỗi trò gồm danh sách từ bên trái và lưới 15x15 bên phải.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!puzzles.length || isDownloading}
            aria-label="Tải PDF word fill-in"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Đang tải..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        <section className="w-full max-w-sm shrink-0 rounded-xl border border-border bg-background shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4" />
              Trình tạo Word Fill-in
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Nhập danh sách từ, hệ thống tự động gom nhóm và dựng lưới 15x15.
            </p>
          </div>

          <div className="space-y-6 px-5 py-6">
            {/* Bulk Import Section */}
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-import" className="text-xs uppercase">
                  Import theo Topic (giống Word Search)
                </Label>
                <Textarea
                  id="bulk-import"
                  placeholder={`Topic 1: Christmas Trees

fir, pine, spruce, evergreen, tannenbaum, branches, needles, trunk, star, angel, garland, ribbon, ornament, bauble, bulb, icicle, light, strand, plug, socket, stand, water, roots, sap, resin, bark, cone, seed, foliage, canopy, silhouette, glow, sparkle, shimmer, twinkle, decorate

Topic 2: Santa Claus

santa, claus, jolly, red, suit, white, beard, hat, pom-pom, belt, buckle, boots, sack, bag, ho-ho-ho, laugh, chimney, roof, sleigh, reindeer, elf, helper, workshop, north, pole, cookies, milk, list, naughty, nice, deliver, visit, midnight, magic`}
                  value={bulkImportText}
                  onChange={(event) => {
                    setBulkImportText(event.target.value);
                    setBulkImportError("");
                  }}
                  rows={8}
                  className="font-mono text-sm"
                />
                {bulkImportError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive whitespace-pre-wrap">
                      {bulkImportError}
                    </p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleBulkImport}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-1" />
                Import Topics
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Số topic</span>
                <span>{topics.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tổng số từ</span>
                <span>{wordList.length}</span>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleGeneratePuzzles}
                  disabled={!topics.length || isGenerating}
                >
                  {isGenerating ? "Đang tạo..." : "Tạo Puzzle"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearWords}
                  aria-label="Xóa toàn bộ danh sách"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-sm">
          {puzzles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-lg font-semibold">Chưa có puzzle</p>
              <p className="text-sm">
                Thêm từ và nhấn &ldquo;Tạo Puzzle&rdquo; để xem bố cục 2 trò
                chơi/mỗi trang.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedPuzzles.map((pagePair, index) => {
                const groupKey =
                  pagePair.map((page) => page.puzzle.id).join("-") ||
                  `page-group-${index}`;

                return (
                  <div key={groupKey} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Trang xem trước {index + 1}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        2 puzzles
                      </Badge>
                    </div>
                    <div className="space-y-6">
                      {pagePair.map((page) => renderPuzzleCard(page))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
