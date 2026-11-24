"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Upload, X } from "lucide-react";
import {
  PhotoUploadQueue,
  emptyPhotoUploads,
  type PhotoUploadItem,
} from "@/lib/photo-upload-queue";
import { photoUploadTransport } from "@/lib/photo-upload-transport";
import { logoutSignal } from "@/lib/session-events";
import { Button } from "./ui/button";
import { Modal } from "./modal";
import { Toast } from "./toast";
import styles from "./photo-uploads.module.css";

const QueueContext = createContext<PhotoUploadQueue | null>(null);
const AccountContext = createContext<string | null>(null);
const ControlsContext = createContext<{
  show: () => void;
  expand: () => void;
} | null>(null);
export function usePhotoUploadQueue() {
  const queue = useContext(QueueContext);
  if (!queue) throw new Error("Photo upload provider is missing.");
  return queue;
}
export function usePhotoUploadActions() {
  const queue = usePhotoUploadQueue(),
    accountId = useContext(AccountContext),
    controls = useContext(ControlsContext)!;
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return {
    ready: hydrated && Boolean(accountId),
    enqueue: (files: File[]) => {
      if (!accountId) return;
      queue.enqueue(accountId, files);
      controls.expand();
    },
    show: controls.show,
  };
}
export function useReadyPhotoRevision() {
  const queue = usePhotoUploadQueue();
  return useSyncExternalStore(queue.subscribe, queue.getReadyRevision, () => 0);
}
export function useHasPhotoUploads() {
  const queue = usePhotoUploadQueue();
  return useSyncExternalStore(
    queue.subscribe,
    () => queue.getSnapshot().items.length > 0,
    () => false,
  );
}
export function PhotoUploadAccount({
  accountId,
  children,
}: {
  accountId: string;
  children: ReactNode;
}) {
  const queue = usePhotoUploadQueue();
  useEffect(() => queue.bindAccount(accountId), [queue, accountId]);
  return (
    <AccountContext.Provider value={accountId}>
      {children}
    </AccountContext.Provider>
  );
}
function useSnapshot(queue: PhotoUploadQueue) {
  return useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    emptyPhotoUploads,
  );
}

function UploadLifecycle({ queue }: { queue: PhotoUploadQueue }) {
  const snapshot = useSnapshot(queue),
    router = useRouter();
  useEffect(() => {
    if (!snapshot.unfinished) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!queue.getSnapshot().unfinished) return;
      event.preventDefault();
      event.returnValue = "";
    };
    // Plain links in rendered page content must also keep this tab's queue alive.
    const navigate = (event: MouseEvent) => {
      if (!queue.getSnapshot().unfinished) return;
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const url = new URL(anchor.href);
      if (
        url.origin !== location.origin ||
        url.pathname.startsWith("/api/") ||
        (url.pathname === location.pathname &&
          url.search === location.search &&
          url.hash)
      )
        return;
      event.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate);
    };
  }, [queue, router, snapshot.unfinished]);
  useEffect(() => {
    const local = (event: Event) =>
      queue.stop((event as CustomEvent<string>).detail);
    const otherTab = (event: StorageEvent) => {
      if (event.key !== logoutSignal || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue);
        if (typeof value.accountId === "string")
          queue.stop(
            value.accountId,
            "Uploads stopped because you signed out in another tab. Photos already uploaded remain in the library.",
          );
      } catch {}
    };
    window.addEventListener(logoutSignal, local);
    window.addEventListener("storage", otherTab);
    return () => {
      window.removeEventListener(logoutSignal, local);
      window.removeEventListener("storage", otherTab);
    };
  }, [queue]);
  return null;
}
function UploadItems({
  queue,
  items,
}: {
  queue: PhotoUploadQueue;
  items: PhotoUploadItem[];
}) {
  const [limit, setLimit] = useState(50);
  const ranked = [
    "Checking",
    "Reusing",
    "Uploading",
    "Processing",
    "Duplicate",
    "Error",
    "Waiting",
    "Queued",
    "Ready",
    "Cancelled",
  ].flatMap((state) => items.filter((item) => item.state === state));
  return (
    <>
      <ul className={styles.items} aria-label="Upload progress">
        {ranked.slice(0, limit).map((item) => (
          <li key={item.id}>
            <div className={styles.fileHeading}>
              <strong title={item.name}>{item.name}</strong>
              <span role="status">
                {item.state === "Ready" ? (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    {item.reused ? "Reused" : "Ready"}
                  </>
                ) : item.state === "Duplicate" ? (
                  "Already in library"
                ) : item.state === "Checking" ? (
                  "Checking for duplicates"
                ) : item.state === "Waiting" ? (
                  "Waiting for identical photo"
                ) : (
                  item.state
                )}
              </span>
            </div>
            {item.state === "Duplicate" && (
              <>
                <p className={styles.help}>
                  Identical to {item.duplicateName}. Reuse it to avoid uploading
                  another copy.
                </p>
                <div className={styles.rowActions}>
                  <Button
                    size="sm"
                    variant="primary"
                    aria-label={"Use existing photo for " + item.name}
                    onClick={() => queue.resolveDuplicate(item.id, true)}
                  >
                    Use existing photo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={"Upload another copy of " + item.name}
                    onClick={() => queue.resolveDuplicate(item.id, false)}
                  >
                    Upload another copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={"Skip duplicate " + item.name}
                    onClick={() => queue.remove(item.id)}
                  >
                    Skip
                  </Button>
                </div>
              </>
            )}
            {item.state === "Uploading" && (
              <progress
                value={item.progress}
                max={100}
                aria-label={"Uploading " + item.name}
              />
            )}
            {item.error && (
              <p role="alert" className={styles.error}>
                {item.error}
              </p>
            )}
            {item.state === "Error" && (
              <div className={styles.rowActions}>
                {item.retryable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => queue.retry(item.id)}
                    aria-label={"Retry " + item.name}
                  >
                    Retry
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => queue.remove(item.id)}
                  aria-label={"Remove failed " + item.name}
                >
                  Remove failed
                </Button>
              </div>
            )}
            {item.state === "Queued" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => queue.remove(item.id)}
                aria-label={"Cancel " + item.name}
              >
                Cancel
              </Button>
            )}
          </li>
        ))}
      </ul>
      {items.length > limit && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLimit((value) => value + 50)}
        >
          Show more uploads
        </Button>
      )}
    </>
  );
}
function UploadInterface({
  queue,
  open,
  minimized,
  setOpen,
  setMinimized,
}: {
  queue: PhotoUploadQueue;
  open: boolean;
  minimized: boolean;
  setOpen: (open: boolean) => void;
  setMinimized: (value: boolean) => void;
}) {
  const snapshot = useSnapshot(queue),
    path = usePathname();
  const [notice, setNotice] = useState("");
  const panelRef = useRef<HTMLElement | null>(null),
    previousPath = useRef(path);
  useEffect(() => {
    if (previousPath.current !== path) {
      previousPath.current = path;
      setMinimized(true);
    }
  }, [path, setMinimized]);
  useEffect(() => {
    const root = document.documentElement,
      panel = panelRef.current;
    if (!panel || !path.startsWith("/admin")) {
      root.style.removeProperty("--photo-upload-panel-height");
      return;
    }
    const measure = () =>
      root.style.setProperty(
        "--photo-upload-panel-height",
        panel.getBoundingClientRect().height + "px",
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--photo-upload-panel-height");
    };
  }, [path, open, snapshot.items.length, minimized]);
  const notified = useRef(snapshot.settledRevision);
  useEffect(() => {
    if (snapshot.settledRevision === notified.current) return;
    notified.current = snapshot.settledRevision;
    if (snapshot.duplicates) setMinimized(false);
    else if (!snapshot.failed) setMinimized(true);
    const count = snapshot.ready;
    const reused = snapshot.items.some((item) => item.reused);
    setNotice(
      snapshot.duplicates
        ? `${snapshot.duplicates} identical ${snapshot.duplicates === 1 ? "photo is" : "photos are"} already in the library. Choose whether to reuse or upload another copy.`
        : snapshot.failed
          ? `${count} ${count === 1 ? "photo" : "photos"} ${reused ? "ready" : "uploaded"}. ${snapshot.failed} ${snapshot.failed === 1 ? "file needs" : "files need"} attention.`
          : count
            ? `${count} ${count === 1 ? "photo" : "photos"} ${reused ? "ready" : "uploaded"}.`
            : "Queued uploads cancelled.",
    );
  }, [
    snapshot.settledRevision,
    snapshot.ready,
    snapshot.failed,
    snapshot.duplicates,
  ]);
  useEffect(() => {
    if (snapshot.sessionMessage) setNotice(snapshot.sessionMessage);
  }, [snapshot.sessionMessage]);
  if (/^\/(login|invite|forgot-password|reset-password)(\/|$)/.test(path))
    return null;
  const reused = snapshot.items.some((item) => item.reused);
  const label =
    snapshot.duplicates && !snapshot.pending
      ? `${snapshot.duplicates} identical ${snapshot.duplicates === 1 ? "photo" : "photos"} found`
      : snapshot.pending
        ? `${snapshot.ready} of ${snapshot.items.length} ${reused ? "ready" : "uploaded"}`
        : snapshot.failed
          ? `${snapshot.ready} uploaded · ${snapshot.failed} failed`
          : snapshot.ready
            ? `${snapshot.ready} ${snapshot.ready === 1 ? "photo" : "photos"} ${reused ? "ready" : "uploaded"}`
            : "Uploads cancelled";
  const actions = (
    <div className={styles.actions}>
      {snapshot.duplicates > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => queue.reuseDuplicates()}
        >
          Reuse all identical photos
        </Button>
      )}
      {snapshot.queued > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => queue.cancelQueued()}
        >
          Cancel queued
        </Button>
      )}
      {snapshot.items.some(
        (item) => item.state === "Error" && item.retryable,
      ) && (
        <Button size="sm" variant="outline" onClick={() => queue.retryFailed()}>
          Retry failed
        </Button>
      )}
      {snapshot.items.some((item) =>
        ["Ready", "Cancelled"].includes(item.state),
      ) && (
        <Button size="sm" variant="ghost" onClick={() => queue.clearFinished()}>
          Clear finished
        </Button>
      )}
    </div>
  );
  return (
    <>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      {snapshot.items.length > 0 && !open && (
        <section
          ref={panelRef}
          className={
            styles.panel +
            (path.startsWith("/admin") ? "" : " " + styles.publicPanel)
          }
          aria-label="Photo uploads"
        >
          <div className={styles.heading}>
            <Upload className="size-4 shrink-0" aria-hidden="true" />
            <h2>{label}</h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label={
                minimized ? "Expand upload panel" : "Minimize upload panel"
              }
              aria-expanded={!minimized}
              onClick={() => setMinimized(!minimized)}
            >
              {minimized ? <ChevronUp /> : <ChevronDown />}
            </Button>
            {!snapshot.unfinished && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Dismiss finished uploads"
                onClick={() => {
                  for (const item of snapshot.items) queue.remove(item.id);
                }}
              >
                <X />
              </Button>
            )}
          </div>
          {!minimized && (
            <>
              <p className={styles.help}>
                Uploads continue as you browse. Keep this tab open.
              </p>
              <UploadItems queue={queue} items={snapshot.items} />
              {actions}
            </>
          )}
          {minimized && (
            <Button
              className={styles.view}
              size="sm"
              variant="ghost"
              onClick={() => setOpen(true)}
            >
              View upload progress
            </Button>
          )}
        </section>
      )}
      {open && (
        <Modal
          title="Photo uploads"
          description="Uploads continue when you close this popup or browse other pages. Keep this browser tab open until they finish."
          onClose={() => setOpen(false)}
          className="upload-activity-dialog"
          footer={
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          }
        >
          <div className={styles.activity}>
            <p role="status">
              {snapshot.items.length ? label : "No uploads in this tab."}
            </p>
            <UploadItems queue={queue} items={snapshot.items} />
            {actions}
          </div>
        </Modal>
      )}
    </>
  );
}
export function PhotoUploadProvider({ children }: { children: ReactNode }) {
  const [queue] = useState(() => new PhotoUploadQueue(photoUploadTransport));
  const [open, setOpen] = useState(false),
    [minimized, setMinimized] = useState(false);
  const controls = useMemo(
    () => ({ show: () => setOpen(true), expand: () => setMinimized(false) }),
    [],
  );
  return (
    <QueueContext.Provider value={queue}>
      <ControlsContext.Provider value={controls}>
        {children}
        <UploadLifecycle queue={queue} />
        <UploadInterface
          queue={queue}
          open={open}
          minimized={minimized}
          setOpen={setOpen}
          setMinimized={setMinimized}
        />
      </ControlsContext.Provider>
    </QueueContext.Provider>
  );
}
