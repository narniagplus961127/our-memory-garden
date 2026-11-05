"use client";
import { createElement, useEffect, useRef, type HTMLAttributes } from "react";
export function AnimatedBlock({
  as = "div",
  animation = "fade-in",
  editing = false,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: "div" | "figure" | "header" | "section";
  animation?: "none" | "fade-in";
  editing?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || editing || animation === "none") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reveal = () => {
      element.dataset.motion = "enter";
    };
    const box = element.getBoundingClientRect();
    if (
      (box.top < window.innerHeight && box.bottom > 0) ||
      !("IntersectionObserver" in window)
    ) {
      reveal();
      return;
    }
    element.dataset.motion = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(element);
    element.addEventListener("focusin", reveal);
    return () => {
      observer.disconnect();
      element.removeEventListener("focusin", reveal);
      delete element.dataset.motion;
    };
  }, [animation, editing]);
  return createElement(as, {
    ...props,
    ref,
    "data-animation": editing ? "none" : animation,
  });
}
