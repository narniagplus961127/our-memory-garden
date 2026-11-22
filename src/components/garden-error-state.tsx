"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/button";

export function GardenErrorState({
  retry,
  admin = false,
}: {
  retry: () => void;
  admin?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [attempted, setAttempted] = useState(false);
  return (
    <main className="garden-error-state">
      <div className="garden-error-card" role="alert">
        <p className="eyebrow">Our Memory Garden</p>
        <h1>
          {admin ? "The dashboard needs a moment" : "Our garden needs a moment"}
        </h1>
        <p>
          We couldn’t load this part of the garden. Please try again in a
          moment.
        </p>
        {admin && (
          <p className="muted">
            If you were editing, keep the original editor tab open until your
            changes are saved. Reopen the same page to check for a recoverable
            draft.
          </p>
        )}
        <div className="actions">
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setAttempted(true);
              startTransition(() => retry());
            }}
          >
            {pending ? "Trying again…" : "Try again"}
          </Button>
          <Button asChild variant="outline">
            <a href={admin ? "/admin/pages" : "/"}>
              {admin ? "Back to pages" : "Back to our garden"}
            </a>
          </Button>
        </div>
        {attempted && !pending && (
          <p className="muted" role="status">
            Still having trouble? Wait a little, then try again.
          </p>
        )}
      </div>
    </main>
  );
}
