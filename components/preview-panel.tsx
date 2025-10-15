"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import type { Story, BookMetadata, ImageFile, TemplateFile } from "@/lib/types";

interface PreviewPanelProps {
  stories: Story[];
  metadata: BookMetadata | null;
  images: ImageFile[];
  template: TemplateFile | null;
  onExportSuccess?: () => void;
}

export function PreviewPanel({
  stories,
  metadata,
  images,
  template,
  onExportSuccess,
}: PreviewPanelProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [fullImagePreview, setFullImagePreview] = useState<string | null>(null);

  const canExport = stories.length > 0 && metadata !== null;

  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 150));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  useEffect(() => {
    if (metadata?.fullPageImage) {
      const url = URL.createObjectURL(metadata.fullPageImage);
      setFullImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setFullImagePreview(null);
  }, [metadata?.fullPageImage]);

  const totalPages = metadata
    ? 3 + stories.length + (metadata.fullPageImage ? 1 : 0)
    : 1;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">
              Document Preview
            </h3>
            {stories.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {stories.length} {stories.length === 1 ? "story" : "stories"}
              </Badge>
            )}
            {template && (
              <Badge variant="secondary" className="text-xs">
                Using Template
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={zoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={zoomIn}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="mx-2 h-4 w-px bg-border" />
            <ExportButton
              stories={stories}
              metadata={metadata}
              images={images}
              template={template}
              disabled={!canExport}
              onExportSuccess={onExportSuccess}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="flex min-h-full items-start justify-center p-6">
          <Card
            className="mx-auto w-full max-w-3xl p-8 shadow-lg transition-transform"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
          >
            {metadata && stories.length > 0 ? (
              <div className="space-y-8">
                {/* Full Page Image (if provided) */}
                {fullImagePreview && (
                  <div className="space-y-2">
                    <AspectRatio ratio={6 / 9}>
                      <img
                        src={fullImagePreview}
                        alt="Full page"
                        className="h-full w-full rounded-lg border border-border object-cover"
                      />
                    </AspectRatio>
                  </div>
                )}
                {/* Cover Page */}
                <div className="space-y-6 text-center">
                  <h1 className="text-4xl font-bold text-foreground">
                    {metadata.title}
                  </h1>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      © {metadata.copyrightYear} {metadata.publisher}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Published in {metadata.publicationLocation}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      By {metadata.author}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Table of Contents */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Table of Contents
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Introduction</span>
                      <span className="text-muted-foreground">1</span>
                    </div>
                    <div className="flex justify-between">
                      <span>How to Use This Book</span>
                      <span className="text-muted-foreground">2</span>
                    </div>
                    {stories.map((story, index) => (
                      <div key={story.number} className="flex justify-between">
                        <span>{story.titleOriginal}</span>
                        <span className="text-muted-foreground">
                          {3 + index}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span>Answers</span>
                      <span className="text-muted-foreground">
                        {3 + stories.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Conclusion</span>
                      <span className="text-muted-foreground">
                        {4 + stories.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Introduction */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Introduction
                  </h2>
                  <div className="space-y-2 text-sm leading-relaxed text-foreground">
                    {metadata.introduction
                      .split("\n")
                      .map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* How to Use This Book */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    How to Use This Book
                  </h2>
                  <div className="space-y-2 text-sm leading-relaxed text-foreground">
                    {metadata.howToUse.split("\n").map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {stories.slice(0, 2).map((story) => {
                  const image = images.find(
                    (img) => img.number === story.number
                  );
                  return (
                    <div key={story.number} className="space-y-4">
                      <h2 className="text-xl font-bold text-foreground">
                        Story {story.number}
                      </h2>
                      <h3 className="text-lg font-bold text-foreground">
                        {story.titleOriginal}
                      </h3>
                      <p className="text-lg font-bold text-foreground">
                        ( {story.titleTranslated} )
                      </p>

                      {image && (
                        <div className="flex justify-center">
                          <img
                            src={image.preview || "/placeholder.svg"}
                            alt={`Story ${story.number}`}
                            className="h-64 w-auto rounded-lg border border-border object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">
                          Vocabulary
                        </h3>
                        <ol className="space-y-1 text-sm text-foreground">
                          {story.vocabulary.map((word, index) => (
                            <li key={index}>
                              {index + 1}. {word.word} → /{word.ipa}/ →{" "}
                              {word.pronunciation} → {word.translation}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {story.titleOriginal}
                        </h3>
                        <div className="space-y-2 text-sm leading-relaxed text-foreground">
                          {story.textOriginal.split("\n").map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                        </div>
                        <p className="text-sm text-foreground">Fin.</p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {story.titleTranslated}
                        </h3>
                        <div className="space-y-2 text-sm leading-relaxed text-foreground">
                          {story.textTranslated
                            .split("\n")
                            .map((line, index) => (
                              <p key={index}>{line}</p>
                            ))}
                        </div>
                        <p className="text-sm text-foreground">The end.</p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-semibold text-foreground">
                          Comprehension Questions
                        </h3>
                        <div className="space-y-3 text-sm">
                          {story.questions.map((question) => (
                            <div key={question.number} className="space-y-1">
                              <p className="font-medium">
                                {question.number}. {question.questionOriginal} /{" "}
                                {question.questionTranslated}
                              </p>
                              {question.options.map((option) => (
                                <p key={option.letter} className="ml-4">
                                  {option.letter}) {option.textOriginal} /{" "}
                                  {option.textTranslated}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border" />
                    </div>
                  );
                })}

                {stories.length > 2 && (
                  <div className="rounded-lg bg-muted/50 p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      ... and {stories.length - 2} more{" "}
                      {stories.length - 2 === 1 ? "story" : "stories"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Export to see the complete document
                    </p>
                  </div>
                )}

                <div className="border-t border-border" />

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Answers
                  </h2>
                  <div className="space-y-2 text-sm">
                    {stories.slice(0, 2).map((story) => (
                      <p key={story.number}>
                        {story.titleOriginal}: {story.answers.join(" - ")}
                      </p>
                    ))}
                    {stories.length > 2 && (
                      <p className="text-muted-foreground">
                        ... and answers for {stories.length - 2} more stories
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Conclusion */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    Conclusion
                  </h2>
                  <div className="space-y-2 text-sm leading-relaxed text-foreground">
                    {metadata.conclusion.split("\n").map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-foreground">
                    No content yet
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add stories and metadata to see a preview of your document
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Page Navigation */}
      {metadata && stories.length > 0 && (
        <div className="border-t border-border px-6 py-3">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
