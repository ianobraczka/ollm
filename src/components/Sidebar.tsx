"use client";

import * as React from "react";
import { CheckCircle2, Upload } from "lucide-react";

import { DocumentSelector } from "@/components/DocumentSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import type { ParsedDocument } from "@/types/chat";

type SidebarProps = {
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
    <aside className="flex h-full w-full flex-col gap-4 border-r border-border bg-muted/30 p-4 lg:w-[calc(var(--spacing)*100)] lg:shrink-0">
      <DocumentSelector
        selectedBuiltInIds={selectedBuiltInIds}
        onBuiltInChange={onBuiltInChange}
        useUploadedDocument={useUploadedDocument}
        onUseUploadedChange={onUseUploadedChange}
        hasUploadedDocument={hasUploadedDocument}
        uploadedFileNames={uploadedFileNames}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Upload (optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Add a temporary PDF, DOCX, or TXT for this session.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading…" : "Choose file(s)"}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4" />
            Active sources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeSourceCount > 0 ? (
            <>
              <Badge variant="success">
                {activeSourceCount} source{activeSourceCount === 1 ? "" : "s"} selected
              </Badge>
              <ul className="space-y-2 text-sm">
                {selectedBuiltIns.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium"
                  >
                    {doc.title}
                  </li>
                ))}
                {useUploadedDocument && hasUpload && (
                  <li className="rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium">
                    {uploadedFileNames.length > 0
                      ? uploadedFileNames.length === 1
                        ? uploadedFileNames[0]
                        : `Uploads (${uploadedFileNames.length}): ${uploadedFileNames.join(", ")}`
                      : "Uploaded document"}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select at least one reference document to enable chat.
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
