"use client";

import * as React from "react";
import { CheckCircle2, Sparkles, Upload } from "lucide-react";

import { DocumentSelector } from "@/components/DocumentSelector";
import { LanguageSelect } from "@/components/LanguageSelect";
import { LessonMapLink } from "@/components/LessonMapLink";
import { ModeToggle } from "@/components/ModeToggle";
import { PageNavSelect } from "@/components/PageNavSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import { UI_TEXT, type AppLanguage } from "@/lib/i18n";
import { APP_NAME } from "@/lib/constants";
import type { ParsedDocument } from "@/types/chat";

type SidebarProps = {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  documents: ParsedDocument[];
  selectedBuiltInIds: string[];
  onBuiltInChange: (ids: string[]) => void;
  useUploadedDocument: boolean;
  onUseUploadedChange: (value: boolean) => void;
  hasUploadedDocument: boolean;
  uploadedFileNames: string[];
  isUploading: boolean;
  onUpload: (files: File[]) => Promise<void>;
};

export function Sidebar({
  language,
  onLanguageChange,
  documents,
  selectedBuiltInIds,
  onBuiltInChange,
  useUploadedDocument,
  onUseUploadedChange,
  hasUploadedDocument,
  uploadedFileNames,
  isUploading,
  onUpload,
}: SidebarProps) {
  const t = UI_TEXT[language];
  const displayTitle = (id: string, title: string) =>
    language === "pt-BR" && id === "bncc" ? "Base Nacional Comum Curricular" : title;
  const hasUpload = documents.length > 0;
  const selectedBuiltIns = BUILT_IN_DOCUMENTS.filter((d) => selectedBuiltInIds.includes(d.id));
  const activeSourceCount =
    selectedBuiltIns.length + (useUploadedDocument && hasUpload ? 1 : 0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    await onUpload(files);
  }

  return (
    <aside className="flex h-auto max-h-[45vh] w-full shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-background p-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:h-screen lg:max-h-none lg:w-[calc(var(--spacing)*100)]">
      <div className="space-y-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
        </div>
        <PageNavSelect language={language} />
      </div>

      <DocumentSelector
        language={language}
        selectedBuiltInIds={selectedBuiltInIds}
        onBuiltInChange={onBuiltInChange}
        useUploadedDocument={useUploadedDocument}
        onUseUploadedChange={onUseUploadedChange}
        hasUploadedDocument={hasUploadedDocument}
        uploadedFileNames={uploadedFileNames}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="pb-2 pt-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4" />
            {t.sidebarUploadTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <p className="text-xs text-muted-foreground">
            {t.sidebarUploadHelp}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full justify-center"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? t.sidebarUploading : t.sidebarChooseFiles}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={handlePickFiles}
          />
        </CardContent>
      </Card>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="pb-2 pt-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            {t.sidebarActiveSources}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {activeSourceCount > 0 ? (
            <>
              <Badge variant="success">
                {activeSourceCount}{" "}
                {language === "pt-BR"
                  ? `fonte${activeSourceCount === 1 ? "" : "s"} ${t.sidebarSourcesSelected}`
                  : `source${activeSourceCount === 1 ? "" : "s"} ${t.sidebarSourcesSelected}`}
              </Badge>
              <ul className="space-y-2 text-sm">
                {selectedBuiltIns.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-md bg-background/40 px-2 py-1.5 text-xs font-medium"
                  >
                    {displayTitle(doc.id, doc.title)}
                  </li>
                ))}
                {useUploadedDocument && hasUpload && (
                  <li className="rounded-md bg-background/40 px-2 py-1.5 text-xs font-medium">
                    {uploadedFileNames.length > 0
                      ? uploadedFileNames.length === 1
                        ? uploadedFileNames[0]
                        : `${t.sidebarUploads} (${uploadedFileNames.length}): ${uploadedFileNames.join(", ")}`
                      : t.sidebarUploadedDocument}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.sidebarSelectDocumentHint}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-auto flex w-full items-center justify-between pt-2">
        <LanguageSelect value={language} onChange={onLanguageChange} />
        <div className="flex items-center gap-2">
          <LessonMapLink language={language} />
          <ModeToggle language={language} />
        </div>
      </div>
    </aside>
  );
}
