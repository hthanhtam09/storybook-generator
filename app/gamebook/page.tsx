"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { GameBookInput } from "@/components/gamebook-input";
import { GameBookPreview } from "@/components/gamebook-preview";
import { Toaster } from "@/components/ui/toaster";
import type { GameBookConfig } from "@/lib/types";

export default function GameBookPage() {
  const [config, setConfig] = useState<GameBookConfig>({
    wordSearches: [],
    crosswords: [],
    logicPuzzles: [],
    spotTheDifferences: [],
    sudokus: [],
    alphabetTrivias: [],
    matchingGames: [],
    wordScrambles: [],
    mazes: [],
    cryptograms: [],
    nameThatCities: [],
    fallenPhrases: [],
  });

  const handleConfigChange = (newConfig: GameBookConfig) => {
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
            <GameBookInput
              config={config}
              onConfigChange={handleConfigChange}
            />
          </div>
          <div className="w-1/2">
            <GameBookPreview
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

