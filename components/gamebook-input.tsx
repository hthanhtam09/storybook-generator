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
import { Badge } from "@/components/ui/badge";
import {
  X,
  Plus,
  Trash2,
  BookOpen,
  Image as ImageIcon,
  Upload,
  Gamepad2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ColorPicker } from "@/components/color-picker";
import type { GameBookConfig } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WordSearchGenerator } from "@/lib/wordsearch";

interface GameBookInputProps {
  config: GameBookConfig;
  onConfigChange: (config: GameBookConfig) => void;
}

export function GameBookInput({ config, onConfigChange }: GameBookInputProps) {
  const { toast } = useToast();
  const [wordSearchBulkImportText, setWordSearchBulkImportText] = useState("");
  const [wordSearchBulkImportError, setWordSearchBulkImportError] =
    useState("");
  const [crosswordBulkImportText, setCrosswordBulkImportText] = useState("");
  const [crosswordBulkImportError, setCrosswordBulkImportError] = useState("");

  const updateConfig = (updates: Partial<GameBookConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  // Word Search handlers
  const handleAddWordSearch = () => {
    updateConfig({
      wordSearches: [
        ...config.wordSearches,
        { words: [], gridSize: 15, title: "" },
      ],
    });
  };

  const handleRemoveWordSearch = (index: number) => {
    updateConfig({
      wordSearches: config.wordSearches.filter((_, i) => i !== index),
    });
  };

  const handleUpdateWordSearch = (
    index: number,
    updates: Partial<GameBookConfig["wordSearches"][0]>
  ) => {
    const newWordSearches = [...config.wordSearches];
    newWordSearches[index] = { ...newWordSearches[index], ...updates };
    updateConfig({ wordSearches: newWordSearches });
  };

  // Parse bulk import for Word Searches
  const parseWordSearchBulkImport = (
    text: string
  ): {
    wordSearches: GameBookConfig["wordSearches"];
    errors: string[];
  } => {
    const wordSearches: GameBookConfig["wordSearches"] = [];
    const errors: string[] = [];

    const lines = text.split("\n").map((line) => line.trim());
    let currentWordSearch: GameBookConfig["wordSearches"][0] | null = null;
    let currentWords: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check if line is a topic header (format: "Topic X: Title" or "Word Search X: Title")
      const topicMatch = line.match(/^(?:Topic|Word\s+Search)\s+\d+:\s*(.+)$/i);
      if (topicMatch) {
        // Save previous word search if exists
        if (currentWordSearch && currentWords.length > 0) {
          currentWordSearch.words = currentWords;
          wordSearches.push(currentWordSearch);
        } else if (currentWordSearch && currentWords.length === 0) {
          errors.push(`Word Search "${currentWordSearch.title}" has no words`);
        }

        // Start new word search
        const title = topicMatch[1].trim();
        if (!title) {
          errors.push(`Word Search at line ${i + 1} has no title`);
          currentWordSearch = null;
          currentWords = [];
          continue;
        }

        currentWordSearch = { title, words: [], gridSize: 15 };
        currentWords = [];
      } else if (currentWordSearch) {
        // This is a word line - split by comma
        const words = line
          .split(",")
          .map((w) => w.trim())
          .filter((w) => w.length > 0);
        currentWords.push(...words);
      } else {
        if (line.length > 0) {
          errors.push(
            `Line ${
              i + 1
            }: "${line}" - Expected header (Topic X: Title or Word Search X: Title)`
          );
        }
      }
    }

    // Save last word search if exists
    if (currentWordSearch) {
      if (currentWords.length > 0) {
        currentWordSearch.words = currentWords;
        wordSearches.push(currentWordSearch);
      } else {
        errors.push(`Word Search "${currentWordSearch.title}" has no words`);
      }
    }

    return { wordSearches, errors };
  };

  // Handle bulk import for Word Searches
  const handleWordSearchBulkImport = () => {
    if (!wordSearchBulkImportText.trim()) {
      setWordSearchBulkImportError("Vui lòng nhập nội dung để import");
      return;
    }

    setWordSearchBulkImportError("");
    const { wordSearches, errors } = parseWordSearchBulkImport(
      wordSearchBulkImportText
    );

    if (errors.length > 0) {
      setWordSearchBulkImportError(
        `Lỗi định dạng:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`
      );
      return;
    }

    if (wordSearches.length === 0) {
      setWordSearchBulkImportError(
        "Không tìm thấy word search nào. Vui lòng kiểm tra định dạng."
      );
      return;
    }

    // Generate grid for each word search to filter out words that can't be placed
    const wordSearchGenerator = new WordSearchGenerator(true, true);
    const validatedWordSearches = wordSearches.map((ws) => {
      // Generate grid multiple times to get the best result (most words placed)
      // Try many times to ensure we place as many words as possible
      let bestGrid = wordSearchGenerator.generate(ws.words, ws.gridSize);
      for (let i = 0; i < 50; i++) {
        const grid = wordSearchGenerator.generate(ws.words, ws.gridSize);
        if (grid.words.length > bestGrid.words.length) {
          bestGrid = grid;
        }
        // If we've placed all words, no need to continue
        if (bestGrid.words.length >= ws.words.length) {
          break;
        }
      }

      // Get only words that were actually placed in the grid (from grid.words directly)
      // This ensures we save exactly what was placed, not what we filtered
      const placedWords = bestGrid.words.map((w: any) => w.word);

      return {
        ...ws,
        words: placedWords, // Only keep words that were placed in grid (exact match)
      };
    });

    // Filter out word searches with no placed words
    const validWordSearches = validatedWordSearches.filter(
      (ws) => ws.words.length > 0
    );

    if (validWordSearches.length === 0) {
      setWordSearchBulkImportError(
        "Không có từ nào có thể đặt vào grid. Vui lòng kiểm tra lại từ vựng hoặc tăng grid size."
      );
      return;
    }

    updateConfig({
      wordSearches: [...config.wordSearches, ...validWordSearches],
    });

    const totalWords = validWordSearches.reduce(
      (sum, ws) => sum + ws.words.length,
      0
    );

    const skippedCount = wordSearches.length - validWordSearches.length;
    const skippedWords =
      wordSearches.reduce((sum, ws) => sum + ws.words.length, 0) - totalWords;

    setWordSearchBulkImportText("");
    setWordSearchBulkImportError("");

    let description = `Đã import ${validWordSearches.length} word search với tổng ${totalWords} từ đã đặt vào grid.`;
    if (skippedCount > 0 || skippedWords > 0) {
      description += ` Đã bỏ qua ${skippedCount} word search và ${skippedWords} từ không thể đặt vào grid.`;
    }

    toast({
      title: "Thành công!",
      description,
    });
  };

  // Crossword handlers
  const handleAddCrossword = () => {
    updateConfig({
      crosswords: [
        ...config.crosswords,
        { clues: [], gridSize: 15, title: "" },
      ],
    });
  };

  const handleRemoveCrossword = (index: number) => {
    updateConfig({
      crosswords: config.crosswords.filter((_, i) => i !== index),
    });
  };

  const handleUpdateCrossword = (
    index: number,
    updates: Partial<GameBookConfig["crosswords"][0]>
  ) => {
    const newCrosswords = [...config.crosswords];
    newCrosswords[index] = { ...newCrosswords[index], ...updates };
    updateConfig({ crosswords: newCrosswords });
  };

  // Parse bulk import for Crosswords
  const parseCrosswordBulkImport = (
    text: string
  ): {
    crosswords: GameBookConfig["crosswords"];
    errors: string[];
  } => {
    const crosswords: GameBookConfig["crosswords"] = [];
    const errors: string[] = [];

    const lines = text.split("\n").map((line) => line.trim());
    let currentCrossword: GameBookConfig["crosswords"][0] | null = null;
    let currentClues: GameBookConfig["crosswords"][0]["clues"] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check if line is a crossword header (format: "Crossword X: Title" or "Topic X: Title")
      const crosswordMatch = line.match(/^(?:Crossword|Topic)\s+\d+:\s*(.+)$/i);
      if (crosswordMatch) {
        // Save previous crossword if exists
        if (currentCrossword && currentClues.length > 0) {
          currentCrossword.clues = currentClues;
          crosswords.push(currentCrossword);
        } else if (currentCrossword && currentClues.length === 0) {
          errors.push(`Crossword "${currentCrossword.title}" has no clues`);
        }

        // Start new crossword
        const title = crosswordMatch[1].trim();
        if (!title) {
          errors.push(`Crossword at line ${i + 1} has no title`);
          currentCrossword = null;
          currentClues = [];
          continue;
        }

        currentCrossword = { title, clues: [], gridSize: 15 };
        currentClues = [];
      } else if (currentCrossword) {
        // This is a clue line - format: number|direction|clue|answer
        const parts = line.split("|");
        if (parts.length === 4) {
          const clue = {
            number: parseInt(parts[0].trim()) || 0,
            direction: parts[1].trim().toLowerCase() as "across" | "down",
            clue: parts[2].trim(),
            answer: parts[3].trim(),
            row: 0,
            col: 0,
          };
          if (clue.direction === "across" || clue.direction === "down") {
            currentClues.push(clue);
          } else {
            errors.push(
              `Line ${i + 1}: Invalid direction. Must be "across" or "down"`
            );
          }
        } else if (line.length > 0) {
          errors.push(
            `Line ${
              i + 1
            }: Invalid format. Expected: number|direction|clue|answer`
          );
        }
      } else {
        if (line.length > 0) {
          errors.push(
            `Line ${
              i + 1
            }: "${line}" - Expected header (Crossword X: Title or Topic X: Title)`
          );
        }
      }
    }

    // Save last crossword if exists
    if (currentCrossword) {
      if (currentClues.length > 0) {
        currentCrossword.clues = currentClues;
        crosswords.push(currentCrossword);
      } else {
        errors.push(`Crossword "${currentCrossword.title}" has no clues`);
      }
    }

    return { crosswords, errors };
  };

  // Handle bulk import for Crosswords
  const handleCrosswordBulkImport = async () => {
    if (!crosswordBulkImportText.trim()) {
      setCrosswordBulkImportError("Vui lòng nhập nội dung để import");
      return;
    }

    setCrosswordBulkImportError("");
    const { crosswords, errors } = parseCrosswordBulkImport(
      crosswordBulkImportText
    );

    if (errors.length > 0) {
      setCrosswordBulkImportError(
        `Lỗi định dạng:\n${errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`
      );
      return;
    }

    if (crosswords.length === 0) {
      setCrosswordBulkImportError(
        "Không tìm thấy crossword nào. Vui lòng kiểm tra định dạng."
      );
      return;
    }

    // Generate positions for clues using CrosswordGenerator
    const { CrosswordGenerator } = await import("@/lib/crossword");
    const generatedCrosswords = crosswords.map((crossword) => {
      const generator = new CrosswordGenerator(crossword.gridSize);
      const cluesWithoutPosition = crossword.clues.map((clue) => ({
        number: clue.number,
        clue: clue.clue,
        answer: clue.answer,
        direction: clue.direction,
      }));
      const result = generator.generate(cluesWithoutPosition);
      return {
        ...crossword,
        clues: result.clues,
      };
    });

    updateConfig({
      crosswords: [...config.crosswords, ...generatedCrosswords],
    });

    const totalClues = generatedCrosswords.reduce(
      (sum, cw) => sum + cw.clues.length,
      0
    );

    setCrosswordBulkImportText("");
    setCrosswordBulkImportError("");

    toast({
      title: "Thành công!",
      description: `Đã import ${generatedCrosswords.length} crossword với tổng ${totalClues} clues đã được đặt vào grid.`,
    });
  };

  // Logic Puzzle handlers
  const handleAddLogicPuzzle = () => {
    updateConfig({
      logicPuzzles: [
        ...config.logicPuzzles,
        { title: "", description: "", clues: [] },
      ],
    });
  };

  const handleRemoveLogicPuzzle = (index: number) => {
    updateConfig({
      logicPuzzles: config.logicPuzzles.filter((_, i) => i !== index),
    });
  };

  // Spot the Difference handlers
  const handleAddSpotTheDifference = () => {
    updateConfig({
      spotTheDifferences: [
        ...config.spotTheDifferences,
        { title: "", differences: [] },
      ],
    });
  };

  const handleRemoveSpotTheDifference = (index: number) => {
    updateConfig({
      spotTheDifferences: config.spotTheDifferences.filter(
        (_, i) => i !== index
      ),
    });
  };

  // Sudoku handlers
  const handleAddSudoku = () => {
    const emptyGrid = Array(9)
      .fill(null)
      .map(() => Array(9).fill(0));
    updateConfig({
      sudokus: [
        ...config.sudokus,
        { grid: emptyGrid, solution: emptyGrid, difficulty: "medium" },
      ],
    });
  };

  const handleRemoveSudoku = (index: number) => {
    updateConfig({
      sudokus: config.sudokus.filter((_, i) => i !== index),
    });
  };

  // Alphabet Trivia handlers
  const handleAddAlphabetTrivia = () => {
    updateConfig({
      alphabetTrivias: [...config.alphabetTrivias, { questions: [] }],
    });
  };

  const handleRemoveAlphabetTrivia = (index: number) => {
    updateConfig({
      alphabetTrivias: config.alphabetTrivias.filter((_, i) => i !== index),
    });
  };

  // Matching Game handlers
  const handleAddMatchingGame = () => {
    updateConfig({
      matchingGames: [...config.matchingGames, { title: "", pairs: [] }],
    });
  };

  const handleRemoveMatchingGame = (index: number) => {
    updateConfig({
      matchingGames: config.matchingGames.filter((_, i) => i !== index),
    });
  };

  // Word Scramble handlers
  const handleAddWordScramble = () => {
    updateConfig({
      wordScrambles: [
        ...config.wordScrambles,
        { scrambled: "", answer: "", hint: "" },
      ],
    });
  };

  const handleRemoveWordScramble = (index: number) => {
    updateConfig({
      wordScrambles: config.wordScrambles.filter((_, i) => i !== index),
    });
  };

  // Maze handlers
  const handleAddMaze = () => {
    const emptyGrid = Array(20)
      .fill(null)
      .map(() => Array(20).fill(0));
    updateConfig({
      mazes: [
        ...config.mazes,
        {
          title: "",
          grid: emptyGrid,
          start: { row: 0, col: 0 },
          end: { row: 19, col: 19 },
        },
      ],
    });
  };

  const handleRemoveMaze = (index: number) => {
    updateConfig({
      mazes: config.mazes.filter((_, i) => i !== index),
    });
  };

  // Cryptogram handlers
  const handleAddCryptogram = () => {
    updateConfig({
      cryptograms: [
        ...config.cryptograms,
        { encrypted: "", decrypted: "", hint: "" },
      ],
    });
  };

  const handleRemoveCryptogram = (index: number) => {
    updateConfig({
      cryptograms: config.cryptograms.filter((_, i) => i !== index),
    });
  };

  // Name That City handlers
  const handleAddNameThatCity = () => {
    updateConfig({
      nameThatCities: [...config.nameThatCities, { clues: [], answer: "" }],
    });
  };

  const handleRemoveNameThatCity = (index: number) => {
    updateConfig({
      nameThatCities: config.nameThatCities.filter((_, i) => i !== index),
    });
  };

  // Fallen Phrase handlers
  const handleAddFallenPhrase = () => {
    updateConfig({
      fallenPhrases: [
        ...config.fallenPhrases,
        { title: "", phrase: "", grid: [], wordList: [] },
      ],
    });
  };

  const handleRemoveFallenPhrase = (index: number) => {
    updateConfig({
      fallenPhrases: config.fallenPhrases.filter((_, i) => i !== index),
    });
  };

  // Cover image handler
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(png|jpe?g)$/)) {
        toast({
          title: "Error",
          description: "Only PNG and JPG files are supported.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        updateConfig({ coverImage: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Game Book Generator</h2>
          <p className="text-sm text-muted-foreground">
            Create a book with multiple puzzle games (8.5 x 11 inch PDF)
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Book Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Book Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="book-title">Book Title</Label>
                <Input
                  id="book-title"
                  placeholder="e.g., Fun Puzzle Book"
                  value={config.title || ""}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <ColorPicker
                  label="Accent Color"
                  value={config.accentColor}
                  onChange={(color) => updateConfig({ accentColor: color })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cover Image (Optional)</Label>
                {config.coverImage ? (
                  <div className="relative group">
                    <div className="aspect-[8.5/11] overflow-hidden rounded-lg border-2 border-border bg-muted">
                      <img
                        src={config.coverImage}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => updateConfig({ coverImage: undefined })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex aspect-[8.5/11] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary hover:bg-primary/5">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Upload Cover Image
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg"
                      onChange={handleCoverImageChange}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Games Accordion */}
          <Accordion type="multiple" className="w-full">
            {/* Word Searches */}
            <AccordionItem value="word-searches">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Word Searches ({config.wordSearches.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* Bulk Import */}
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Textarea
                          placeholder={`Topic 1: Christmas Trees

fir, pine, spruce, evergreen, tannenbaum, branches, needles, trunk, star, angel, garland, ribbon, ornament, bauble, bulb, icicle, light, strand, plug, socket, stand, water, roots, sap, resin, bark, cone, seed, foliage, canopy, silhouette, glow, sparkle, shimmer, twinkle, decorate

Topic 2: Santa Claus

santa, claus, jolly, red, suit, white, beard, hat, pom-pom, belt, buckle, boots, sack, bag, ho-ho-ho, laugh, chimney, roof, sleigh, reindeer, elf, helper, workshop, north, pole, cookies, milk, list, naughty, nice, deliver, visit, midnight, magic`}
                          value={wordSearchBulkImportText}
                          onChange={(e) => {
                            setWordSearchBulkImportText(e.target.value);
                            setWordSearchBulkImportError("");
                          }}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        {wordSearchBulkImportError && (
                          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive whitespace-pre-wrap">
                              {wordSearchBulkImportError}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleWordSearchBulkImport}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Import Word Searches
                      </Button>
                    </div>

                    {config.wordSearches.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">
                            Topics ({config.wordSearches.length})
                          </Label>
                        </div>
                        {config.wordSearches.map((ws, index) => {
                          // Display exact words count from config (already filtered during import)
                          // Don't generate grid again as it may differ from PDF generation
                          const wordsCount = ws.words.length;

                          return (
                            <Card key={index} className="border">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-base font-semibold">
                                    {ws.title || `Topic ${index + 1}`}
                                  </CardTitle>
                                  <Badge variant="secondary">
                                    {wordsCount}{" "}
                                    {wordsCount === 1 ? "word" : "words"}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {ws.words
                                    .slice(0, 20)
                                    .map((word, wordIndex) => (
                                      <Badge
                                        key={wordIndex}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {word}
                                      </Badge>
                                    ))}
                                  {ws.words.length > 20 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{ws.words.length - 20} more
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Crosswords */}
            <AccordionItem value="crosswords">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Crosswords ({config.crosswords.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* Bulk Import */}
                    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Textarea
                          placeholder={`Topic 1: Animals

1|across|A large cat|TIGER
2|down|King of the jungle|LION
3|across|Fastest land animal|CHEETAH

Topic 2: Fruits

1|across|Red fruit|APPLE
2|down|Yellow fruit|BANANA
3|across|Orange fruit|ORANGE`}
                          value={crosswordBulkImportText}
                          onChange={(e) => {
                            setCrosswordBulkImportText(e.target.value);
                            setCrosswordBulkImportError("");
                          }}
                          rows={10}
                          className="font-mono text-sm"
                        />
                        {crosswordBulkImportError && (
                          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive whitespace-pre-wrap">
                              {crosswordBulkImportError}
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleCrosswordBulkImport}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Import Crosswords
                      </Button>
                    </div>

                    {config.crosswords.map((cw, index) => {
                      // Count clues by direction
                      const acrossCount = cw.clues.filter(
                        (c) => c.direction === "across"
                      ).length;
                      const downCount = cw.clues.filter(
                        (c) => c.direction === "down"
                      ).length;
                      const totalClues = cw.clues.length;

                      return (
                        <Card key={index} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-semibold">
                                {cw.title || `Crossword ${index + 1}`}
                              </CardTitle>
                              <Badge variant="secondary">
                                {totalClues}{" "}
                                {totalClues === 1 ? "clue" : "clues"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-4">
                                <div>
                                  <span className="font-medium">
                                    Grid Size:
                                  </span>{" "}
                                  {cw.gridSize}x{cw.gridSize}
                                </div>
                                <div>
                                  <span className="font-medium">Across:</span>{" "}
                                  {acrossCount}
                                </div>
                                <div>
                                  <span className="font-medium">Down:</span>{" "}
                                  {downCount}
                                </div>
                              </div>
                              {cw.clues.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs font-medium text-muted-foreground mb-2">
                                    All Clues ({cw.clues.length}):
                                  </div>
                                  <div className="space-y-1 max-h-64 overflow-y-auto border rounded p-2">
                                    {cw.clues
                                      .sort((a, b) => {
                                        // Sort by direction first (across then down), then by number
                                        if (a.direction !== b.direction) {
                                          return a.direction === "across"
                                            ? -1
                                            : 1;
                                        }
                                        return a.number - b.number;
                                      })
                                      .map((clue, clueIndex) => (
                                        <div
                                          key={clueIndex}
                                          className="text-xs p-2 bg-muted rounded"
                                        >
                                          <span className="font-semibold">
                                            {clue.number}
                                            {clue.direction === "across"
                                              ? "A"
                                              : "D"}
                                            :
                                          </span>{" "}
                                          {clue.clue}{" "}
                                          <span className="text-muted-foreground">
                                            ({clue.answer})
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Logic Puzzles */}
            <AccordionItem value="logic-puzzles">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Logic Puzzles ({config.logicPuzzles.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.logicPuzzles.map((lp, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Logic Puzzle {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveLogicPuzzle(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={lp.title}
                              onChange={(e) => {
                                const newPuzzles = [...config.logicPuzzles];
                                newPuzzles[index].title = e.target.value;
                                updateConfig({ logicPuzzles: newPuzzles });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={lp.description}
                              onChange={(e) => {
                                const newPuzzles = [...config.logicPuzzles];
                                newPuzzles[index].description = e.target.value;
                                updateConfig({ logicPuzzles: newPuzzles });
                              }}
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Clues (one per line)</Label>
                            <Textarea
                              value={lp.clues.join("\n")}
                              onChange={(e) => {
                                const newPuzzles = [...config.logicPuzzles];
                                newPuzzles[index].clues = e.target.value
                                  .split("\n")
                                  .filter((c) => c.trim().length > 0);
                                updateConfig({ logicPuzzles: newPuzzles });
                              }}
                              rows={5}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddLogicPuzzle}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Logic Puzzle
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Spot the Difference */}
            <AccordionItem value="spot-difference">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Spot the Difference ({config.spotTheDifferences.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.spotTheDifferences.map((std, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Spot the Difference {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() =>
                                handleRemoveSpotTheDifference(index)
                              }
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={std.title}
                              onChange={(e) => {
                                const newSTDs = [...config.spotTheDifferences];
                                newSTDs[index].title = e.target.value;
                                updateConfig({ spotTheDifferences: newSTDs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Image 1</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const newSTDs = [
                                      ...config.spotTheDifferences,
                                    ];
                                    newSTDs[index].image1 = ev.target
                                      ?.result as string;
                                    updateConfig({
                                      spotTheDifferences: newSTDs,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Image 2</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const newSTDs = [
                                      ...config.spotTheDifferences,
                                    ];
                                    newSTDs[index].image2 = ev.target
                                      ?.result as string;
                                    updateConfig({
                                      spotTheDifferences: newSTDs,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddSpotTheDifference}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Spot the Difference
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Sudoku */}
            <AccordionItem value="sudoku">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Sudoku ({config.sudokus.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.sudokus.map((sudoku, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Sudoku {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveSudoku(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <select
                              value={sudoku.difficulty}
                              onChange={(e) => {
                                const newSudokus = [...config.sudokus];
                                newSudokus[index].difficulty = e.target
                                  .value as "easy" | "medium" | "hard";
                                updateConfig({ sudokus: newSudokus });
                              }}
                              className="w-full p-2 border rounded"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Grid (9x9, comma-separated rows, 0 for empty)
                            </Label>
                            <Textarea
                              placeholder="5,3,0,0,7,0,0,0,0
6,0,0,1,9,5,0,0,0
..."
                              value={sudoku.grid
                                .map((row) => row.join(","))
                                .join("\n")}
                              onChange={(e) => {
                                const rows = e.target.value.split("\n");
                                const grid = rows
                                  .map((row) =>
                                    row
                                      .split(",")
                                      .map((n) => parseInt(n.trim()) || 0)
                                  )
                                  .filter((row) => row.length === 9)
                                  .slice(0, 9);
                                while (grid.length < 9) {
                                  grid.push(Array(9).fill(0));
                                }
                                const newSudokus = [...config.sudokus];
                                newSudokus[index].grid = grid;
                                updateConfig({ sudokus: newSudokus });
                              }}
                              rows={9}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddSudoku}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Sudoku
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Alphabet Trivia */}
            <AccordionItem value="alphabet-trivia">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Alphabet Trivia ({config.alphabetTrivias.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.alphabetTrivias.map((at, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Alphabet Trivia {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveAlphabetTrivia(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>
                              Questions (format: letter|question|answer, one per
                              line)
                            </Label>
                            <Textarea
                              placeholder={`A|What is the capital of France?|Paris
B|What is 2+2?|4`}
                              value={at.questions
                                .map(
                                  (q) => `${q.letter}|${q.question}|${q.answer}`
                                )
                                .join("\n")}
                              onChange={(e) => {
                                const lines = e.target.value.split("\n");
                                const questions = lines
                                  .map((line) => {
                                    const parts = line.split("|");
                                    if (parts.length === 3) {
                                      return {
                                        letter: parts[0].trim(),
                                        question: parts[1].trim(),
                                        answer: parts[2].trim(),
                                      };
                                    }
                                    return null;
                                  })
                                  .filter((q) => q !== null) as any;
                                const newATs = [...config.alphabetTrivias];
                                newATs[index].questions = questions;
                                updateConfig({ alphabetTrivias: newATs });
                              }}
                              rows={5}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddAlphabetTrivia}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Alphabet Trivia
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Matching Games */}
            <AccordionItem value="matching-games">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Matching Games ({config.matchingGames.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.matchingGames.map((mg, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Matching Game {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveMatchingGame(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={mg.title}
                              onChange={(e) => {
                                const newMGs = [...config.matchingGames];
                                newMGs[index].title = e.target.value;
                                updateConfig({ matchingGames: newMGs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>
                              Pairs (format: left|right, one per line)
                            </Label>
                            <Textarea
                              placeholder={`Apple|Red
Banana|Yellow`}
                              value={mg.pairs
                                .map((p) => `${p.left}|${p.right}`)
                                .join("\n")}
                              onChange={(e) => {
                                const lines = e.target.value.split("\n");
                                const pairs = lines
                                  .map((line) => {
                                    const parts = line.split("|");
                                    if (parts.length === 2) {
                                      return {
                                        left: parts[0].trim(),
                                        right: parts[1].trim(),
                                      };
                                    }
                                    return null;
                                  })
                                  .filter((p) => p !== null) as any;
                                const newMGs = [...config.matchingGames];
                                newMGs[index].pairs = pairs;
                                updateConfig({ matchingGames: newMGs });
                              }}
                              rows={5}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddMatchingGame}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Matching Game
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Word Scrambles */}
            <AccordionItem value="word-scrambles">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Word Scrambles ({config.wordScrambles.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.wordScrambles.map((ws, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Word Scramble {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveWordScramble(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Scrambled Word</Label>
                            <Input
                              value={ws.scrambled}
                              onChange={(e) => {
                                const newWSs = [...config.wordScrambles];
                                newWSs[index].scrambled = e.target.value;
                                updateConfig({ wordScrambles: newWSs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Answer</Label>
                            <Input
                              value={ws.answer}
                              onChange={(e) => {
                                const newWSs = [...config.wordScrambles];
                                newWSs[index].answer = e.target.value;
                                updateConfig({ wordScrambles: newWSs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hint (Optional)</Label>
                            <Input
                              value={ws.hint || ""}
                              onChange={(e) => {
                                const newWSs = [...config.wordScrambles];
                                newWSs[index].hint = e.target.value;
                                updateConfig({ wordScrambles: newWSs });
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddWordScramble}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Word Scramble
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Mazes */}
            <AccordionItem value="mazes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Mazes ({config.mazes.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.mazes.map((maze, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Maze {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveMaze(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={maze.title}
                              onChange={(e) => {
                                const newMazes = [...config.mazes];
                                newMazes[index].title = e.target.value;
                                updateConfig({ mazes: newMazes });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Start Position (row, col)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Row"
                                value={maze.start.row}
                                onChange={(e) => {
                                  const newMazes = [...config.mazes];
                                  newMazes[index].start.row =
                                    parseInt(e.target.value) || 0;
                                  updateConfig({ mazes: newMazes });
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Col"
                                value={maze.start.col}
                                onChange={(e) => {
                                  const newMazes = [...config.mazes];
                                  newMazes[index].start.col =
                                    parseInt(e.target.value) || 0;
                                  updateConfig({ mazes: newMazes });
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>End Position (row, col)</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Row"
                                value={maze.end.row}
                                onChange={(e) => {
                                  const newMazes = [...config.mazes];
                                  newMazes[index].end.row =
                                    parseInt(e.target.value) || 0;
                                  updateConfig({ mazes: newMazes });
                                }}
                              />
                              <Input
                                type="number"
                                placeholder="Col"
                                value={maze.end.col}
                                onChange={(e) => {
                                  const newMazes = [...config.mazes];
                                  newMazes[index].end.col =
                                    parseInt(e.target.value) || 0;
                                  updateConfig({ mazes: newMazes });
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddMaze}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Maze
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Cryptograms */}
            <AccordionItem value="cryptograms">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Cryptograms ({config.cryptograms.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.cryptograms.map((cg, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Cryptogram {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveCryptogram(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Encrypted Text</Label>
                            <Textarea
                              value={cg.encrypted}
                              onChange={(e) => {
                                const newCGs = [...config.cryptograms];
                                newCGs[index].encrypted = e.target.value;
                                updateConfig({ cryptograms: newCGs });
                              }}
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Decrypted Text</Label>
                            <Textarea
                              value={cg.decrypted}
                              onChange={(e) => {
                                const newCGs = [...config.cryptograms];
                                newCGs[index].decrypted = e.target.value;
                                updateConfig({ cryptograms: newCGs });
                              }}
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hint (Optional)</Label>
                            <Input
                              value={cg.hint || ""}
                              onChange={(e) => {
                                const newCGs = [...config.cryptograms];
                                newCGs[index].hint = e.target.value;
                                updateConfig({ cryptograms: newCGs });
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddCryptogram}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Cryptogram
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Name That City */}
            <AccordionItem value="name-that-city">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Name That City ({config.nameThatCities.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.nameThatCities.map((ntc, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Name That City {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveNameThatCity(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Clues (one per line)</Label>
                            <Textarea
                              value={ntc.clues.join("\n")}
                              onChange={(e) => {
                                const newNTCs = [...config.nameThatCities];
                                newNTCs[index].clues = e.target.value
                                  .split("\n")
                                  .filter((c) => c.trim().length > 0);
                                updateConfig({ nameThatCities: newNTCs });
                              }}
                              rows={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Answer</Label>
                            <Input
                              value={ntc.answer}
                              onChange={(e) => {
                                const newNTCs = [...config.nameThatCities];
                                newNTCs[index].answer = e.target.value;
                                updateConfig({ nameThatCities: newNTCs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Image (Optional)</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const newNTCs = [...config.nameThatCities];
                                    newNTCs[index].image = ev.target
                                      ?.result as string;
                                    updateConfig({ nameThatCities: newNTCs });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddNameThatCity}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Name That City
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            {/* Fallen Phrases */}
            <AccordionItem value="fallen-phrases">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Fallen Phrases ({config.fallenPhrases.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {config.fallenPhrases.map((fp, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Fallen Phrase {index + 1}
                            </CardTitle>
                            <Button
                              onClick={() => handleRemoveFallenPhrase(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={fp.title}
                              onChange={(e) => {
                                const newFPs = [...config.fallenPhrases];
                                newFPs[index].title = e.target.value;
                                updateConfig({ fallenPhrases: newFPs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phrase</Label>
                            <Input
                              value={fp.phrase}
                              onChange={(e) => {
                                const newFPs = [...config.fallenPhrases];
                                newFPs[index].phrase = e.target.value;
                                updateConfig({ fallenPhrases: newFPs });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Word List (comma-separated)</Label>
                            <Input
                              value={fp.wordList.join(", ")}
                              onChange={(e) => {
                                const newFPs = [...config.fallenPhrases];
                                newFPs[index].wordList = e.target.value
                                  .split(",")
                                  .map((w) => w.trim())
                                  .filter((w) => w.length > 0);
                                updateConfig({ fallenPhrases: newFPs });
                              }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button
                      onClick={handleAddFallenPhrase}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Fallen Phrase
                    </Button>
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
