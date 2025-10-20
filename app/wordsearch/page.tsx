"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { WordSearchInput } from "@/components/wordsearch-input";
import { WordSearchPreview } from "@/components/wordsearch-preview";
import { Toaster } from "@/components/ui/toaster";
import type { WordSearchConfig } from "@/lib/wordsearch-config";

export default function WordSearchPage() {
  const [config, setConfig] = useState<WordSearchConfig>({
    words: [],
    gridSize: 15,
    difficulty: "medium",
    language: "en",
    theme: "classic",
    showWordList: true,
    allowDiagonal: true,
    allowBackward: false,
    pageCount: 1,
    wordsPerPage: 10,
    distributeWords: true,
    showAnswersInGrid: false,
  });

  const handleConfigChange = (newConfig: WordSearchConfig) => {
    setConfig(newConfig);
  };

  const handleExportSuccess = () => {
    // Could add success feedback here if needed
  };

  return (
    <>
      <div className="flex h-screen flex-col">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-border">
            <WordSearchInput
              config={config}
              onConfigChange={handleConfigChange}
            />
          </div>
          <div className="w-1/2">
            <WordSearchPreview
              config={config}
              onExportSuccess={handleExportSuccess}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
