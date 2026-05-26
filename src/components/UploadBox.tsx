"use client";

import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
type UploadBoxProps = {
  fileName: string | null;
  isUploading: boolean;
  error: string | null;
  onUpload: (file: File) => Promise<void>;
};

export function UploadBox({ fileName, isUploading, error, onUpload }: UploadBoxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    await onUpload(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload curriculum document</CardTitle>
        <CardDescription>
          PDF, DOCX, or TXT · max 10MB · parsed in this session only
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background p-6 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) await handleFile(file);
          }}
        >
          <FileUp className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Drag and drop a file here</p>
            <p className="text-xs text-muted-foreground">or choose a file from your computer</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" />
                Parsing…
              </>
            ) : (
              "Choose file"
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {fileName && !error && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Upload successful</p>
              <p className="break-all text-xs opacity-90">{fileName}</p>
            </div>
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
