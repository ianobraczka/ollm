"use client";

import { CheckCircle2, FileText, Sparkles, X } from "lucide-react";

import { DocumentSelector } from "@/components/DocumentSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BUILT_IN_DOCUMENTS } from "@/lib/builtInDocuments";
import { APP_NAME, MAX_DOCUMENTS } from "@/lib/constants";
import type { ParsedDocument } from "@/types/chat";

type SidebarProps = {
  documents: ParsedDocument[];
  selectedBuiltInIds: string[];
  onBuiltInChange: (ids: string[]) => void;
  useUploadedDocument: boolean;
  onUseUploadedChange: (value: boolean) => void;
  hasUploadedDocument: boolean;
  uploadedFileNames: string[];
  onRemove: (id: string) => void;
};

export function Sidebar({
  documents,
  selectedBuiltInIds,
  onBuiltInChange,
  useUploadedDocument,
  onUseUploadedChange,
  hasUploadedDocument,
  uploadedFileNames,
  onRemove,
}: SidebarProps) {
  const hasUpload = documents.length > 0;
  const selectedBuiltIns = BUILT_IN_DOCUMENTS.filter((d) => selectedBuiltInIds.includes(d.id));
  const activeSourceCount =
    selectedBuiltIns.length + (useUploadedDocument && hasUpload ? 1 : 0);

  return (
    <aside className="flex h-full w-full flex-col gap-4 border-r border-border bg-muted/30 p-4 lg:w-72 lg:shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">OLLM · session uploads only</p>
        </div>
      </div>

      <Separator />

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
                    Uploaded document
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Session uploads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasUpload ? (
            <>
              <Badge variant="secondary">
                {documents.length} / {MAX_DOCUMENTS} in memory
              </Badge>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-start gap-2 rounded-md border border-border bg-background p-2"
                  >
                    <p className="min-w-0 flex-1 break-all text-xs font-medium">{doc.fileName}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={`Remove ${doc.fileName}`}
                      onClick={() => onRemove(doc.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Optional: upload up to {MAX_DOCUMENTS} files (PDF, DOCX, TXT).
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Built-in frameworks ship with the app. Uploads are not saved to a database.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
