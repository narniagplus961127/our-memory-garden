"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { PhotoViewer, type ViewerPhoto } from "./photo-viewer";

export const SwiperPhotos = createContext<{
  register: (element: HTMLButtonElement, photo: ViewerPhoto) => () => void;
  open: (element: HTMLButtonElement) => boolean;
} | null>(null);

export function SwiperViewport({ children }: { children: ReactNode }) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const offsets = useRef([0]);
  const [navigation, setNavigation] = useState({ page: 0, count: 1 });
  const photoTriggers = useRef(new Map<HTMLButtonElement, ViewerPhoto>());
  const photoOpener = useRef<HTMLButtonElement | null>(null);
  const [gallery, setGallery] = useState<{
    photos: ViewerPhoto[];
    index: number;
  } | null>(null);

  const registerPhoto = useCallback(
    (element: HTMLButtonElement, photo: ViewerPhoto) => {
      photoTriggers.current.set(element, photo);
      return () => {
        photoTriggers.current.delete(element);
      };
    },
    [],
  );
  const openPhoto = useCallback((element: HTMLButtonElement) => {
    const track = viewport.current;
    const entries = [...photoTriggers.current].filter(([button]) =>
      track?.contains(button),
    );
    if (entries.length < 2) return false;
    // Use the rendered order, even if the slides have been reordered.
    entries.sort(([a], [b]) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });
    const index = entries.findIndex(([button]) => button === element);
    if (index < 0) return false;
    photoOpener.current = element;
    setGallery({ photos: entries.map(([, photo]) => photo), index });
    return true;
  }, []);
  const photos = useMemo(
    () => ({ register: registerPhoto, open: openPhoto }),
    [registerPhoto, openPhoto],
  );

  // Controls reveal a sliver of the next slide; remeasure after that change
  // even when the viewport's own size is unchanged.
  useEffect(() => {
    const element = viewport.current;
    const track = element?.firstElementChild;
    if (!element || !track) return;

    function updatePage() {
      const left = element!.scrollLeft;
      let page = 0;
      while (
        page + 1 < offsets.current.length &&
        left >= (offsets.current[page] + offsets.current[page + 1]) / 2
      )
        page++;
      const count = offsets.current.length;
      setNavigation((previous) =>
        previous.page === page && previous.count === count
          ? previous
          : { page, count },
      );
    }

    function measure() {
      const trackBox = track!.getBoundingClientRect();
      const slides = [...track!.children].filter(
        (slide) => slide.getClientRects().length > 0,
      );
      const perView =
        Number(getComputedStyle(track!).getPropertyValue("--swiper-count")) ||
        1;
      const maxLeft = Math.max(0, element!.scrollWidth - element!.clientWidth);
      const starts = [0];
      for (let index = perView; index < slides.length; index += perView) {
        const left = Math.min(
          maxLeft,
          slides[index].getBoundingClientRect().left - trackBox.left,
        );
        if (left - starts[starts.length - 1] > 1) starts.push(left);
      }
      offsets.current = starts;
      updatePage();
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const mutation = new MutationObserver(measure);
    mutation.observe(track, { childList: true });
    element.addEventListener("scroll", updatePage, { passive: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
      element.removeEventListener("scroll", updatePage);
    };
  }, [navigation.count]);

  const { page, count } = navigation;
  function go(index: number) {
    const left = offsets.current[Math.min(count - 1, Math.max(0, index))];
    viewport.current?.scrollTo({
      left,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <div className="garden-swiper-public" role="region" aria-label="Swiper">
      <div className="garden-swiper-rail" data-controls={count > 1}>
        {count > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="garden-swiper-previous"
            aria-label="Previous slides"
            aria-controls={id}
            disabled={page === 0}
            onClick={() => go(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        <div
          id={id}
          ref={viewport}
          className="garden-swiper-viewport"
          tabIndex={count > 1 ? 0 : undefined}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget || count < 2) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              go(page + (event.key === "ArrowLeft" ? -1 : 1));
            }
          }}
        >
          <SwiperPhotos.Provider value={photos}>
            {children}
          </SwiperPhotos.Provider>
        </div>
        {count > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="garden-swiper-next"
            aria-label="Next slides"
            aria-controls={id}
            disabled={page === count - 1}
            onClick={() => go(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
      </div>
      {count > 1 && (
        <nav
          className="garden-swiper-pagination"
          aria-label="Swiper pagination"
        >
          <span
            aria-live="polite"
            className={count <= 8 ? "sr-only" : undefined}
          >
            Page {page + 1} of {count}
          </span>
          {count <= 8 &&
            Array.from({ length: count }, (_, index) => (
              <button
                type="button"
                key={index}
                aria-label={"Go to page " + (index + 1)}
                aria-controls={id}
                aria-current={index === page ? "page" : undefined}
                onClick={() => go(index)}
              >
                <span aria-hidden="true" />
              </button>
            ))}
        </nav>
      )}
      {gallery && (
        <PhotoViewer
          label="Photo viewer"
          photo={gallery.photos[gallery.index]}
          trigger={photoOpener}
          onClose={() => setGallery(null)}
          navigation={{
            index: gallery.index,
            total: gallery.photos.length,
            canNext: gallery.index < gallery.photos.length - 1,
            onMove: (direction) =>
              setGallery((current) =>
                current
                  ? {
                      ...current,
                      index: Math.max(
                        0,
                        Math.min(
                          current.photos.length - 1,
                          current.index + direction,
                        ),
                      ),
                    }
                  : null,
              ),
          }}
        />
      )}
    </div>
  );
}
