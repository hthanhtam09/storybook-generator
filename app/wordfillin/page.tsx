"use client";

import { useState } from "react";
import { WordFillInInput } from "@/components/wordfillin-input";
import { WordFillInPreview } from "@/components/wordfillin-preview";
import type { WordFillInPage } from "@/lib/types";
import { Header } from "@/components/header";

export default function WordFillInPage() {
  const [puzzles, setPuzzles] = useState<WordFillInPage[]>([]);

  const handlePuzzlesChange = (newPuzzles: WordFillInPage[]) => {
    setPuzzles(newPuzzles);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <Header />
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold">Word Fill-in Puzzle Generator</h1>
        <p className="text-muted-foreground">
          Tạo puzzle từ vựng với ô đen và ô trắng ngẫu nhiên
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-border">
          <WordFillInInput onPuzzlesChange={handlePuzzlesChange} />
        </div>
        <div className="w-1/2">
          <WordFillInPreview puzzles={puzzles} />
        </div>
      </div>
    </div>
  );
}
