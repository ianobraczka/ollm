"use client";

import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DocumentSelectorProps = {
  language: AppLanguage;
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
  language,
  selectedBuiltInIds,
  onBuiltInChange,
  useUploadedDocument,
  onUseUploadedChange,
  hasUploadedDocument,
  uploadedFileNames,
}: DocumentSelectorProps) {
  const t = UI_TEXT[language];
  const displayDescription = (id: string, description: string) =>
    language === "pt-BR" && id === "bncc"
      ? "Base Nacional Comum Curricular do Brasil."
      : description;

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          {t.docSelectorTitle}
        </CardTitle>
        <CardDescription>
          {t.docSelectorDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="sr-only">{t.docSelectorBuiltInLegend}</legend>
          {BUILT_IN_DOCUMENTS.map((doc) => {
            const checked = selectedBuiltInIds.includes(doc.id);
            return (
              <label
                key={doc.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg bg-background/40 p-3 transition-colors hover:bg-background/60",
                  checked && "bg-primary/10",
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
                  <span className="block text-xs text-muted-foreground">
                    {displayDescription(doc.id, doc.description)}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {hasUploadedDocument && (
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg bg-background/40 p-3 transition-colors hover:bg-background/60",
              useUploadedDocument && "bg-primary/10",
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
                {t.docSelectorUploadSession}
              </span>
            </span>
          </label>
        )}

        {!hasUploadedDocument && (
          <p className="text-xs text-muted-foreground">
            {t.docSelectorUploadHint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
