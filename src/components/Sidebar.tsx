"use client";

import { FileText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";

type SidebarProps = {
  fileName: string | null;
  hasDocument: boolean;
};

export function Sidebar({ fileName, hasDocument }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col gap-4 border-r border-border bg-muted/30 p-4 lg:w-72 lg:shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground">OLLM · session-only MVP</p>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Uploaded document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasDocument && fileName ? (
            <>
              <p className="break-all text-sm font-medium">{fileName}</p>
              <Badge variant="success">Ready for chat</Badge>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No document yet. Upload a PDF, DOCX, or TXT to begin.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Files are parsed in memory for this browser session only. Nothing is saved to a
            database.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
