"use client";

import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_DOCUMENTS } from "@/lib/constants";
import type { ParsedDocument } from "@/types/chat";

type UploadBoxProps = {
  documents: ParsedDocument[];
  isUploading: boolean;
  error: string | null;
  onUpload: (files: File[]) => Promise<void>;
};

export function UploadBox({ documents, isUploading, error, onUpload }: UploadBoxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const slotsLeft = MAX_DOCUMENTS - documents.length;
  const canAddMore = slotsLeft > 0;

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    await onUpload(files);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload curriculum documents</CardTitle>
        <CardDescription>
          Optional session upload · PDF, DOCX, or TXT · max 10MB each · up to {MAX_DOCUMENTS}{" "}
          files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background p-6 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            if (!canAddMore || isUploading) return;
            await handleFiles(e.dataTransfer.files);
          }}
        >
          <FileUp className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Drag and drop files here</p>
            <p className="text-xs text-muted-foreground">
              {canAddMore
                ? `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} remaining`
                : "Document limit reached"}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading || !canAddMore}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" />
                Parsing…
              </>
            ) : (
              "Choose files"
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={async (e) => {
              if (e.target.files) await handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {documents.length > 0 && !error && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              {documents.length} document{documents.length === 1 ? "" : "s"} ready
            </p>
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-all text-xs opacity-90">{doc.fileName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
