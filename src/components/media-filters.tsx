"use client";
import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  emptyMediaFilters,
  type MediaFilters as Filters,
} from "@/lib/media-filters";

function EventFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [options, setOptions] = useState<{ id: string; title: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const timer = setTimeout(() => {
      fetch("/api/media?view=events&search=" + encodeURIComponent(search), {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok)
            throw new Error(
              "Could not load pages. Try opening this list again.",
            );
          return response.json();
        })
        .then((data) => {
          if (!controller.signal.aborted) setOptions(data);
        })
        .catch((cause) => {
          if (!controller.signal.aborted) setError(cause.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, search]);
  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-sm font-medium">Page / event</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            aria-label="Filter photos by page or event"
          >
            <span className="truncate">{value ? selected : "All pages"}</span>
            <ChevronDown className="size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
        style={{ zIndex: 150 }}
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))]"
        >
          <Input
            type="search"
            aria-label="Find page or event"
            placeholder="Find a page or event"
            value={search}
            maxLength={200}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="mt-3 max-h-60 overflow-y-auto" aria-busy={busy}>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              All pages
            </Button>
            {busy ? (
              <p role="status" className="p-2 text-sm">
                Loading pages…
              </p>
            ) : error ? (
              <p role="alert" className="p-2 text-sm">
                {error}
              </p>
            ) : (
              options.map((option) => (
                <Button
                  key={option.id}
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal text-start"
                  aria-pressed={value === option.id}
                  onClick={() => {
                    setSelected(option.title);
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  {option.title}
                </Button>
              ))
            )}
            {!busy && !error && !options.length && (
              <p className="p-2 text-sm text-muted-foreground">
                No matching pages with photos.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MediaFilterControls({
  value,
  onChange,
  grouped,
  onGroupChange,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
  grouped?: boolean;
  onGroupChange?: (value: boolean) => void;
}) {
  const id = useId();
  const changed = Object.entries(value).some(
    ([key, v]) => v !== emptyMediaFilters[key as keyof Filters],
  );
  return (
    <div className="mb-6 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="grid gap-2">
        <Label htmlFor={id + "-usage"}>Photo usage</Label>
        <NativeSelect
          id={id + "-usage"}
          value={value.usage}
          onChange={(event) =>
            onChange({
              ...value,
              usage: event.target.value as Filters["usage"],
            })
          }
        >
          {[
            ["all", "All photos"],
            ["unused", "Unused photos"],
            ["used", "Used on a page"],
            ["public", "Publicly accessible"],
            ["private", "Private photos"],
          ].map(([key, label]) => (
            <NativeSelectOption key={key} value={key}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <EventFilter
        value={value.pageId}
        onChange={(pageId) => onChange({ ...value, pageId })}
      />
      <div className="grid gap-2">
        <Label htmlFor={id + "-from"}>Uploaded from (UTC)</Label>
        <Input
          id={id + "-from"}
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id + "-to"}>Uploaded until (UTC)</Label>
        <Input
          id={id + "-to"}
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
      </div>
      {onGroupChange && (
        <div className="grid gap-2">
          <Label htmlFor={id + "-group"}>Group photos</Label>
          <NativeSelect
            id={id + "-group"}
            value={grouped ? "month" : "none"}
            onChange={(event) => onGroupChange(event.target.value === "month")}
          >
            <NativeSelectOption value="none">No grouping</NativeSelectOption>
            <NativeSelectOption value="month">Upload month</NativeSelectOption>
          </NativeSelect>
        </div>
      )}
      {changed && (
        <Button variant="outline" onClick={() => onChange(emptyMediaFilters)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
