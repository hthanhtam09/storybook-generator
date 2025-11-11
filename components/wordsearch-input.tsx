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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Settings,
  Trash2,
  BookOpen,
  Image as ImageIcon,
  Upload,
  Wand2,
  Loader2,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ColorPicker } from "@/components/color-picker";
import type {
  WordSearchConfig,
  TopicVocabulary,
} from "@/lib/wordsearch-config";

interface WordSearchInputProps {
  config: WordSearchConfig;
  onConfigChange: (config: WordSearchConfig) => void;
}

export function WordSearchInput({
  config,
  onConfigChange,
}: WordSearchInputProps) {
  const { toast } = useToast();
  const [newTopic, setNewTopic] = useState("");
  const [newTopicWords, setNewTopicWords] = useState("");
  const [isGeneratingIntroduction, setIsGeneratingIntroduction] =
    useState(false);
  const [isGeneratingIntroPrompt, setIsGeneratingIntroPrompt] = useState(false);
  const [introPrompt, setIntroPrompt] = useState<string>("");

  // Helper function to safely calculate page count
  const calculatePageCount = (wordCount: number, wordsPerPage: number) => {
    if (!wordCount || wordCount <= 0) return 1;
    if (!wordsPerPage || wordsPerPage <= 0) return 1;
    return Math.ceil(wordCount / wordsPerPage);
  };

  // Helper function to sync words array from topics
  const syncWordsFromTopics = (topics: TopicVocabulary[]): string[] => {
    const allWords: string[] = [];
    topics.forEach((topic) => {
      allWords.push(...topic.words);
    });
    return [...new Set(allWords)]; // Remove duplicates
  };

  // Update config with topics and sync words
  const updateConfigWithTopics = (topics: TopicVocabulary[]) => {
    const allWords = syncWordsFromTopics(topics);
    // When using topics, pageCount = number of topics (each topic gets one grid)
    const pageCount = topics.length;
    onConfigChange({
      ...config,
      topics,
      words: allWords,
      pageCount: pageCount > 0 ? pageCount : 1,
    });
  };

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic name.",
        variant: "destructive",
      });
      return;
    }

    const words = newTopicWords
      .split(/[,;\n]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one vocabulary word.",
        variant: "destructive",
      });
      return;
    }

    const uniqueWords = [...new Set(words)];
    const newTopics = [
      ...config.topics,
      { topic: newTopic.trim(), words: uniqueWords },
    ];

    updateConfigWithTopics(newTopics);
    setNewTopic("");
    setNewTopicWords("");

    toast({
      title: "Success!",
      description: `Added topic "${newTopic.trim()}" with ${
        uniqueWords.length
      } vocabulary words.`,
    });
  };

  const handleRemoveTopic = (index: number) => {
    const newTopics = config.topics.filter((_, i) => i !== index);
    updateConfigWithTopics(newTopics);

    toast({
      title: "Success!",
      description: `Removed topic "${config.topics[index].topic}".`,
    });
  };

  const handleRemoveWordFromTopic = (topicIndex: number, word: string) => {
    const newTopics = [...config.topics];
    newTopics[topicIndex].words = newTopics[topicIndex].words.filter(
      (w) => w !== word
    );

    // Remove topic if no words left
    if (newTopics[topicIndex].words.length === 0) {
      handleRemoveTopic(topicIndex);
      return;
    }

    updateConfigWithTopics(newTopics);
  };

  const handleAddWordToTopic = (topicIndex: number, word: string) => {
    if (!word.trim()) return;

    const newTopics = [...config.topics];
    if (!newTopics[topicIndex].words.includes(word.trim())) {
      newTopics[topicIndex].words.push(word.trim());
      updateConfigWithTopics(newTopics);
    }
  };

  const handleGenerateIntroduction = async () => {
    if (!config.topics.length) {
      toast({
        title: "Topics Required",
        description:
          "Add at least one topic before generating an introduction with AI.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingIntroduction(true);
    toast({
      title: "Generating Introduction",
      description: "Please wait while we craft an introduction with AI.",
    });

    try {
      const response = await fetch("/api/wordsearch/introduction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topics: config.topics,
          language: config.language,
          theme: config.theme,
          gridSize: config.gridSize,
          introductionTitle: config.introductionTitle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        toast({
          title: "Generation Failed",
          description:
            errorData?.error ||
            "Unable to generate introduction. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();

      if (data.success && data.content) {
        onConfigChange({
          ...config,
          introduction: data.content,
        });
        toast({
          title: "Introduction Generated",
          description: "We added the AI-generated introduction to your book.",
        });
        return;
      }

      toast({
        title: "Generation Failed",
        description:
          data.error ||
          "AI did not return content. Please try generating again shortly.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Introduction generation error:", error);
      toast({
        title: "Network Error",
        description:
          "We could not reach the AI service. Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIntroduction(false);
    }
  };

  const handleGenerateIntroPrompt = async () => {
    if (!config.topics.length) {
      toast({
        title: "Topics Required",
        description: "Add at least one topic to generate the intro prompt.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingIntroPrompt(true);
    try {
      const response = await fetch("/api/wordsearch/introduction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topics: config.topics,
          language: config.language,
          theme: config.theme,
          gridSize: config.gridSize,
          introductionTitle: config.introductionTitle,
          returnPrompt: true,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data?.prompt) {
        setIntroPrompt(data.prompt as string);
        toast({
          title: "Prompt Generated",
          description: "You can copy and use this prompt if AI fails.",
        });
        return;
      }
      toast({
        title: "Failed to Generate Prompt",
        description:
          data?.error || "Unable to generate prompt. Please try again.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Intro prompt generation error:", error);
      toast({
        title: "Network Error",
        description: "Could not generate prompt. Check connection and retry.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingIntroPrompt(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!introPrompt) return;
    try {
      await navigator.clipboard.writeText(introPrompt);
      toast({
        title: "Copied",
        description: "Prompt copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please copy manually.",
        variant: "destructive",
      });
    }
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
          {/* Topic & Vocabulary Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Add Vocabulary by Topic
              </CardTitle>
              <CardDescription>
                Add vocabulary organized by topic. Each topic will appear as a
                title in the word search.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Topic */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label>Topic (Chủ đề)</Label>
                  <Input
                    placeholder="e.g., Animals, Colors, Food..."
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vocabulary (Từ vựng)</Label>
                  <Textarea
                    placeholder="cat, dog, bird&#10;fish, rabbit"
                    value={newTopicWords}
                    onChange={(e) => setNewTopicWords(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate words by comma, semicolon, or new line
                  </p>
                </div>
                <Button onClick={handleAddTopic} variant="default" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Topic
                </Button>
              </div>

              {/* Existing Topics */}
              {config.topics.length > 0 && (
                <div className="space-y-3">
                  <Label>Topics ({config.topics.length})</Label>
                  {config.topics.map((topic, topicIndex) => (
                    <Card key={topicIndex} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">
                            {topic.topic}
                          </CardTitle>
                          <Button
                            onClick={() => handleRemoveTopic(topicIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardDescription>
                          {topic.words.length} vocabulary words
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {topic.words.map((word, wordIndex) => (
                            <Badge
                              key={wordIndex}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {word}
                              <button
                                onClick={() =>
                                  handleRemoveWordFromTopic(topicIndex, word)
                                }
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Introduction Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Introduction (Optional)
              </CardTitle>
              <CardDescription>
                Add an introduction text that will appear on the introduction
                page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Introduction Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="introduction-title">Introduction Title</Label>
                </div>
                <Input
                  id="introduction-title"
                  placeholder="e.g., Learn English with Fun Word Searches"
                  value={config.introductionTitle || ""}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      introductionTitle: e.target.value,
                    })
                  }
                  aria-label="Introduction title"
                />
                <p className="text-xs text-muted-foreground">
                  This title will be included at the start of the introduction
                  to clarify subject and context.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Introduction Text</Label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateIntroduction}
                    disabled={isGeneratingIntroduction}
                    aria-label="Generate introduction with AI"
                    className="flex items-center gap-1 text-xs"
                  >
                    {isGeneratingIntroduction ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  placeholder="Enter introduction text for the introduction page. This will appear after the table of contents."
                  value={config.introduction || ""}
                  onChange={(e) =>
                    onConfigChange({ ...config, introduction: e.target.value })
                  }
                  rows={6}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {config.introduction?.length || 0} characters. Leave empty to
                  use default introduction.
                </p>
              </div>

              {/* Fallback: Generate Intro Prompt */}
              <div className="space-y-2 p-3 border rounded-md">
                <div className="flex items-center justify-between gap-2">
                  <Label>Intro Prompt (Fallback)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateIntroPrompt}
                      disabled={isGeneratingIntroPrompt}
                      aria-label="Generate intro prompt"
                      className="flex items-center gap-1 text-xs"
                    >
                      {isGeneratingIntroPrompt ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyPrompt}
                      disabled={!introPrompt}
                      aria-label="Copy intro prompt"
                      className="flex items-center gap-1 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder="Click Generate Prompt to preview the exact prompt. You can copy it if AI fails."
                  value={introPrompt}
                  onChange={(e) => setIntroPrompt(e.target.value)}
                  rows={5}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use this prompt in your preferred AI tool if the built-in AI
                  is unavailable.
                </p>
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
                  max={17}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Recommended: 10-17 for best display.
                </p>
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <ColorPicker
                  label="Border & Title Color"
                  value={config.accentColor}
                  onChange={(color) =>
                    onConfigChange({ ...config, accentColor: color })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Choose a color for border and title. Background colors remain
                  unchanged.
                </p>
                {config.accentColor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        accentColor: undefined,
                      })
                    }
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reset Color
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cover Image Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Cover Image (Optional)
              </CardTitle>
              <CardDescription>
                Add a cover image for the first page of the PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    onClick={() =>
                      onConfigChange({ ...config, coverImage: undefined })
                    }
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file type
                        if (!file.type.match(/^image\/(png|jpe?g)$/)) {
                          toast({
                            title: "Error",
                            description:
                              "Only PNG and JPG files are supported.",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Validate file size (5MB max for cover)
                        if (file.size > 5 * 1024 * 1024) {
                          toast({
                            title: "Error",
                            description: "File size must be less than 5MB.",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Convert to base64
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const base64 = e.target?.result as string;
                          onConfigChange({ ...config, coverImage: base64 });
                        };
                        reader.onerror = () => {
                          toast({
                            title: "Error",
                            description: "Failed to read image file.",
                            variant: "destructive",
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                Cover image will appear on the first page. PNG or JPG, max 5MB.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
