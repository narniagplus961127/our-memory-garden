"use client";

import { Copy, ExternalLink, History, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { GardenPage } from "@/lib/pages";
import { CreateTemplate } from "./create-template";
import { TrashAction } from "./page-recovery";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function EditorPageActions({
  page,
  contentSaved,
  detailsSaved,
  getVersion,
}: {
  page: GardenPage;
  contentSaved: boolean;
  detailsSaved: boolean;
  getVersion: () => number;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const canDelete = contentSaved && detailsSaved && !page.is_homepage;

  return (
    <>
      <CreateTemplate
        source={{
          pageId: page.id,
          title: page.title,
          saved: contentSaved,
          version: getVersion,
        }}
        returnFocus={trigger}
        renderTrigger={(openTemplate) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={trigger}
                type="button"
                variant="outline"
                size="icon"
                className="editor-page-actions"
                aria-label="Page actions"
                title="Page actions"
              >
                <Settings aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="w-52"
              onCloseAutoFocus={(event) => {
                if (openingDialog.current) event.preventDefault();
                openingDialog.current = false;
              }}
            >
              <DropdownMenuItem asChild className="min-h-11">
                <a
                  href={page.is_homepage ? "/" : "/p/" + page.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View page (opens in a new tab)"
                >
                  <ExternalLink aria-hidden="true" />
                  View page
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-11">
                <Link href={"/admin/pages/" + page.id + "/history"}>
                  <History aria-hidden="true" />
                  History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11"
                disabled={!contentSaved}
                onSelect={() => {
                  openingDialog.current = true;
                  openTemplate();
                }}
              >
                <Copy aria-hidden="true" />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="min-h-11"
                variant="destructive"
                disabled={!canDelete}
                onSelect={() => {
                  openingDialog.current = true;
                  setTrashOpen(true);
                }}
              >
                <Trash2 aria-hidden="true" />
                Delete page
              </DropdownMenuItem>
              {page.is_homepage ? (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Choose another homepage before deleting this page.
                </DropdownMenuLabel>
              ) : !canDelete ? (
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Finish saving your changes to use unavailable actions.
                </DropdownMenuLabel>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      {trashOpen && (
        <TrashAction
          page={page}
          disabled={!canDelete}
          editor={{ onClose: () => setTrashOpen(false), returnFocus: trigger }}
        />
      )}
    </>
  );
}
