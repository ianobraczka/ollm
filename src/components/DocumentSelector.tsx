"use client";

import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import { cn } from "@/lib/utils";

type DocumentSelectorProps = {
  selectedBuiltInIds: string[];
  onBuiltInChange: (ids: string[]) => void;
  useUploadedDocument: boolean;
  onUseUploadedChange: (value: boolean) => void;
  hasUploadedDocument: boolean;
  uploadedFileNames: string[];
};

function toggleId(ids: string[], id: string, checked: boolean): string[] {
  if (checked) return ids.includes(id) ? ids : [...ids, id];
  return ids.filter((x) => x !== id);
}

export function DocumentSelector({
  selectedBuiltInIds,
  onBuiltInChange,
  useUploadedDocument,
  onUseUploadedChange,
  hasUploadedDocument,
  uploadedFileNames,
}: DocumentSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Reference documents
        </CardTitle>
        <CardDescription>
          Choose which sources Gemini may use. Only selected documents are sent to the model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="sr-only">Built-in reference documents</legend>
          {BUILT_IN_DOCUMENTS.map((doc) => {
            const checked = selectedBuiltInIds.includes(doc.id);
            return (
              <label
                key={doc.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border border-border p-3 transition-colors",
                  checked && "border-primary/40 bg-primary/5",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  checked={checked}
                  onChange={(e) =>
                    onBuiltInChange(toggleId(selectedBuiltInIds, doc.id, e.target.checked))
                  }
                />
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-medium">{doc.title}</span>
                  <span className="block text-xs text-muted-foreground">{doc.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {hasUploadedDocument && (
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border border-dashed border-border p-3 transition-colors",
              useUploadedDocument && "border-primary/40 bg-primary/5",
            )}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
              checked={useUploadedDocument}
              onChange={(e) => onUseUploadedChange(e.target.checked)}
            />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium">
                {uploadedFileNames.length > 0
                  ? uploadedFileNames.length === 1
                    ? uploadedFileNames[0]
                    : `Uploads (${uploadedFileNames.length})`
                  : "Uploaded document"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Uploaded document · Session-only
              </span>
            </span>
          </label>
        )}

        {!hasUploadedDocument && (
          <p className="text-xs text-muted-foreground">
            Upload a PDF, DOCX, or TXT below to include your own document as an optional source.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
