"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { GardenPage } from "@/lib/pages";
import { categoryLabels, type Category } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";
import { PhotoPicker } from "./media-library";
import { detailsOf, type usePageDetails } from "./use-page-details";
export function PageDetails({
  page,
  visibility,
  save,
}: {
  page: GardenPage;
  visibility: GardenPage["visibility"];
  save: ReturnType<typeof usePageDetails>;
}) {
  const { details, change } = save;
  const [error, setError] = useState(""),
    [list, setList] = useState<Category[] | null>(null),
    [showComparison, setShowComparison] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) throw Error("Could not load categories. Reload to retry.");
        const categories = await r.json();
        if (!cancelled) setList(categories);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (save.comparison) setShowComparison(true);
  }, [save.comparison?.metadata_version]);
  const names = categoryLabels(list ?? []);
  const categoryName = (id: string) => names.get(id) ?? "Unavailable category";
  const choices = [...new Set([...names.keys(), ...details.categoryIds])].sort(
    (a, b) => categoryName(a).localeCompare(categoryName(b)),
  );
  return (
    <div className="page-details field">
      <div className="settings-field">
        <Label htmlFor="page-date">
          Page date <small>(optional)</small>
        </Label>
        <Input
          id="page-date"
          aria-label="Page date"
          type="date"
          min="0001-01-01"
          max="9999-12-31"
          value={details.date ?? ""}
          onChange={(e) => change({ date: e.target.value || null })}
        />
      </div>
      <div className="settings-field">
        <Label htmlFor="page-category">
          Page categories <small>(optional)</small>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              id="page-category"
              aria-label="Page categories"
              className="w-full justify-between"
              disabled={!list}
            >
              <span className="truncate">
                {error
                  ? "Categories unavailable"
                  : !list
                    ? "Loading categories…"
                    : details.categoryIds.length
                      ? details.categoryIds.map(categoryName).join(", ")
                      : "Choose categories"}
              </span>
              <ChevronDown aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label="Choose page categories"
            align="start"
            collisionPadding={12}
            className="w-(--radix-popover-trigger-width) max-w-[calc(100vw_-_24px)] max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-2"
          >
            {choices.length ? (
              choices.map((id) => (
                <label
                  key={id}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={details.categoryIds.includes(id)}
                    onChange={(event) =>
                      change({
                        categoryIds: event.target.checked
                          ? [...details.categoryIds, id]
                          : details.categoryIds.filter(
                              (selected) => selected !== id,
                            ),
                      })
                    }
                  />
                  <span className="min-w-0 break-words">
                    {categoryName(id)}
                  </span>
                </label>
              ))
            ) : (
              <p className="m-2 text-sm text-muted-foreground">
                Add categories in the Categories dashboard.
              </p>
            )}
          </PopoverContent>
        </Popover>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <div className="settings-field">
        <span className="field-label">
          Cover photo <small>(optional)</small>
        </span>
        <PhotoPicker
          hideLabel
          value={details.coverPhotoId ?? ""}
          onChange={(value) => change({ coverPhotoId: value || null })}
        />
      </div>
      <h3>Search and sharing</h3>
      {visibility === "private" && (
        <p className="muted">
          Private pages cannot be shared or indexed. Make this page public to
          edit its discovery settings.
        </p>
      )}
      <fieldset
        className="sharing-fields field"
        disabled={visibility !== "public"}
        aria-label="Search and sharing"
      >
        <div className="settings-field">
          <Label htmlFor="sharing-title">
            Sharing title <small>(optional)</small>
          </Label>
          <Input
            id="sharing-title"
            aria-label="Sharing title"
            maxLength={200}
            value={details.sharingTitle ?? ""}
            placeholder={page.title}
            onChange={(e) => change({ sharingTitle: e.target.value || null })}
          />
          <p className="muted">
            <small>Leave blank to use the page title.</small>
          </p>
        </div>
        <div className="settings-field">
          <Label htmlFor="sharing-description">
            Sharing description <small>(optional)</small>
          </Label>
          <Textarea
            id="sharing-description"
            aria-label="Sharing description"
            maxLength={2000}
            value={details.sharingDescription ?? ""}
            onChange={(e) =>
              change({ sharingDescription: e.target.value || null })
            }
          />
        </div>
        <div
          className="settings-field"
          role="group"
          aria-label="Sharing cover photo"
        >
          <span className="field-label">
            Sharing cover photo <small>(optional)</small>
          </span>
          <PhotoPicker
            label="Sharing cover photo"
            hideLabel
            value={details.sharingCoverPhotoId ?? ""}
            onChange={(value) => change({ sharingCoverPhotoId: value || null })}
          />
          <p className="muted">
            <small>
              Leave blank to use the page cover. A cover used on a public page
              is publicly accessible.
            </small>
          </p>
        </div>
        <div className="settings-field">
          <Label className="sharing-indexing" htmlFor="allow-indexing">
            <Input
              id="allow-indexing"
              type="checkbox"
              checked={details.allowIndexing}
              onChange={(e) => change({ allowIndexing: e.target.checked })}
            />
            Allow search indexing
          </Label>
          <p className="muted">
            <small>
              Search engines may take time to update. Turning indexing off does
              not make a public page private.
            </small>
          </p>
        </div>
      </fieldset>
      {save.copies.map((copy) => (
        <div className="editor-recovery-notice" key={copy.key}>
          <p>
            Another device copy of this page has unsaved details. Review one
            copy at a time; another tab may still be editing it.
          </p>
          <Button
            className="secondary"
            disabled={!save.canRecover}
            onClick={() => save.recover(copy.key)}
          >
            Recover details device copy
          </Button>
          <Button className="secondary" onClick={() => save.discard(copy.key)}>
            Discard details device copy
          </Button>
          {!save.canRecover && (
            <p className="muted">
              Save or resolve your current details before recovering another
              copy.
            </p>
          )}
        </div>
      ))}
      {save.comparison &&
        (showComparison ? (
          <div
            className="details-conflict"
            role="region"
            aria-label="Page details conflict"
          >
            <h3>Page details changed elsewhere</h3>
            <p>
              Compare your details with the saved details before choosing which
              to keep.
            </p>
            {[
              { label: "My details", value: details },
              { label: "Saved details", value: detailsOf(save.comparison) },
            ].map(({ label, value }) => (
              <div key={label}>
                <h4>{label}</h4>
                <p>
                  Date: {value.date ?? "No date"}
                  <br />
                  Sharing title: {value.sharingTitle ?? "Use page title"}
                  <br />
                  Sharing description:{" "}
                  {value.sharingDescription ?? "Use garden description"}
                  <br />
                  Search indexing: {value.allowIndexing ? "Allowed" : "Off"}
                  <br />
                  Categories:{" "}
                  {value.categoryIds.map(categoryName).join(", ") ||
                    "No categories"}
                </p>
                {value.sharingCoverPhotoId && (
                  <img
                    className="details-cover"
                    src={displayPhotoUrl(value.sharingCoverPhotoId)}
                    alt={label + " sharing cover"}
                  />
                )}
                {value.coverPhotoId ? (
                  <img
                    className="details-cover"
                    src={displayPhotoUrl(value.coverPhotoId)}
                    alt={label + " cover"}
                  />
                ) : (
                  <p>No cover photo</p>
                )}
              </div>
            ))}
            <div className="actions">
              <Button className="secondary" onClick={() => save.resolve(true)}>
                Keep my details
              </Button>
              <Button className="secondary" onClick={() => save.resolve(false)}>
                Use saved details
              </Button>
              <Button
                className="secondary"
                onClick={() => {
                  setShowComparison(false);
                  document.getElementById("page-date")?.focus();
                }}
              >
                Continue editing details
              </Button>
            </div>
          </div>
        ) : (
          <Button className="secondary" onClick={() => setShowComparison(true)}>
            Review details conflict
          </Button>
        ))}
      {save.recovered && (
        <p className="muted">
          Recovered page details are unsaved. Retry to save them.
        </p>
      )}
      {save.warning && <p role="status">{save.warning}</p>}
      {(save.error || save.recovered) && (
        <>
          {save.error && (
            <p role="alert" className="error">
              {save.error}
            </p>
          )}
          <Button className="secondary" onClick={save.retry}>
            Retry details
          </Button>
        </>
      )}
    </div>
  );
}
