"use client";

import type React from "react";

import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TemplateFile, TemplateParsedStylesSummary } from "@/lib/types";
import { parseDocxStyles, resolveDefaults } from "@/lib/docx-style-reader";

interface TemplateUploadProps {
  template?: TemplateFile | null;
  onTemplateChange: (template: TemplateFile | null) => void;
}

export function TemplateUpload({
  template: initialTemplate,
  onTemplateChange,
}: TemplateUploadProps) {
  const [template, setTemplate] = useState<TemplateFile | null>(
    initialTemplate || null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [styleSummary, setStyleSummary] =
    useState<TemplateParsedStylesSummary | null>(null);
  const [styleDetails, setStyleDetails] = useState<
    | {
        id: string;
        name?: string;
        type: string;
        font?: string;
        sizePt?: number;
        beforePt?: number;
        afterPt?: number;
      }[]
    | null
  >(null);

  useEffect(() => {
    setTemplate(initialTemplate || null);
  }, [initialTemplate]);

  const handleFile = useCallback(
    (file: File) => {
      // Validate file type
      if (!file.name.endsWith(".docx")) {
        alert("Please upload a .docx file");
        return;
      }

      const templateFile: TemplateFile = {
        file,
        name: file.name,
        uploadedAt: new Date(),
      };

      setTemplate(templateFile);
      onTemplateChange(templateFile);
      (async () => {
        try {
          const parsed = await parseDocxStyles(file);
          const resolved = resolveDefaults(parsed);
          const summary: TemplateParsedStylesSummary = {
            defaultFontFamily: resolved.run?.fontFamily,
            defaultFontSizePt: resolved.run?.fontSizePt,
            defaultParagraphBeforePt: resolved.paragraph?.spacing?.beforePt,
            defaultParagraphAfterPt: resolved.paragraph?.spacing?.afterPt,
          };
          setStyleSummary(summary);
          const details = parsed.namedStyles.map((s) => ({
            id: s.styleId,
            name: s.name,
            type: s.type,
            font: s.run?.fontFamily,
            sizePt: s.run?.fontSizePt,
            beforePt: s.paragraph?.spacing?.beforePt,
            afterPt: s.paragraph?.spacing?.afterPt,
          }));
          setStyleDetails(details);
        } catch (err) {
          console.error("Failed to parse DOCX styles", err);
          setStyleSummary(null);
          setStyleDetails(null);
        }
      })();
    },
    [onTemplateChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setTemplate(null);
    onTemplateChange(null);
  }, [onTemplateChange]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Template File</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a DOCX template file. Your new content will be applied to this
          template while preserving its formatting.
        </p>
      </div>

      {!template ? (
        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-foreground mb-2">
              Drop your DOCX template here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or click to browse
            </p>
            <input
              type="file"
              accept=".docx"
              onChange={handleFileInput}
              className="hidden"
              id="template-upload"
            />
            <Button asChild variant="outline" size="sm">
              <label htmlFor="template-upload" className="cursor-pointer">
                Select Template
              </label>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-primary/50 bg-primary/5">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {template.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {template.uploadedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <Button variant="ghost" size="sm" onClick={handleRemove}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {template && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-sm text-blue-400">
            <strong>Note:</strong> Your new story content will be applied to
            this template. The template's formatting, styles, and structure will
            be preserved.
          </p>
        </div>
      )}

      {styleSummary && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
          <p className="text-sm text-emerald-400">
            <strong>Template Styles:</strong> Font{" "}
            {styleSummary.defaultFontFamily || "(default)"}
            {styleSummary.defaultFontSizePt
              ? ` · ${styleSummary.defaultFontSizePt}pt`
              : ""}
            {typeof styleSummary.defaultParagraphBeforePt === "number" ||
            typeof styleSummary.defaultParagraphAfterPt === "number"
              ? ` · Spacing(before/after): ${
                  styleSummary.defaultParagraphBeforePt ?? "-"
                }/${styleSummary.defaultParagraphAfterPt ?? "-"} pt`
              : ""}
          </p>
        </div>
      )}

      {styleDetails && styleDetails.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-foreground mb-2">
            <strong>Detected Styles</strong>
          </p>
          <div className="max-h-60 overflow-auto space-y-1">
            {styleDetails.map((s) => (
              <div key={s.id} className="text-xs text-muted-foreground">
                {s.name ? `${s.name} (${s.id})` : s.id} · {s.type}
                {s.font ? ` · ${s.font}` : ""}
                {typeof s.sizePt === "number" ? ` · ${s.sizePt}pt` : ""}
                {typeof s.beforePt === "number" || typeof s.afterPt === "number"
                  ? ` · spacing ${s.beforePt ?? "-"} / ${s.afterPt ?? "-"} pt`
                  : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
