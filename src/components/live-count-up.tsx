"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  countUpParts,
  defaultCountUpDate,
  type CountUpDigitMotion,
  type CountUpFormat,
  type CountUpLanguage,
} from "@/lib/live-count-up";

export type LiveCountUpProps = {
  heading?: string;
  startDate?: string;
  startTime?: string;
  countFormat?: CountUpFormat;
  countLanguage?: CountUpLanguage;
  showClock?: boolean;
  showStartCaption?: boolean;
  startCaption?: string;
  digitMotion?: CountUpDigitMotion;
  digitSize?: number;
  digitColor?: string;
  align?: "left" | "center" | "right";
};

function Digits({
  value,
  previous,
  animate,
}: {
  value: string;
  previous: string;
  animate: boolean;
}) {
  return (
    <span className="count-up-digits" aria-hidden="true">
      {[...value].map((digit, index) => {
        const position = value.length - index;
        const changed = animate && digit !== previous.at(-position);
        return (
          <span className="count-up-digit" key={position}>
            <span
              key={digit}
              className={changed ? "count-up-digit-enter" : undefined}
            >
              {digit}
            </span>
          </span>
        );
      })}
    </span>
  );
}

const chineseUnits = {
  years: "年",
  months: "个月",
  days: "天",
  totalDays: "天",
  hours: "小时",
  minutes: "分钟",
  seconds: "秒",
};
const englishUnits = {
  years: "year",
  months: "month",
  days: "day",
  totalDays: "day",
  hours: "hour",
  minutes: "minute",
  seconds: "second",
};

const startDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function LiveCountUp({
  heading = "我们在一起的时间",
  startDate = defaultCountUpDate,
  startTime = "00:00",
  countFormat = "calendar",
  countLanguage = "zh",
  showClock = true,
  showStartCaption = true,
  startCaption,
  digitMotion = "roll",
  digitSize,
  digitColor,
  align = "center",
}: LiveCountUpProps) {
  const [tick, setTick] = useState<{ now: number; previous: number } | null>(
    null,
  );
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function update() {
      const now = Date.now();
      setTick((last) => ({ now, previous: last?.now ?? now }));
      timeout = setTimeout(update, 1000 - (now % 1000));
    }
    update();
    return () => clearTimeout(timeout);
  }, []);

  const parts = tick && countUpParts(startDate, startTime || "00:00", tick.now);
  const previous =
    tick && countUpParts(startDate, startTime || "00:00", tick.previous);
  const dateUnits =
    countFormat === "calendar"
      ? (["years", "months", "days"] as const)
      : (["totalDays"] as const);
  const caption =
    startCaption?.trim() ||
    "Since " + startDateFormatter.format(new Date(startDate + "T00:00:00Z"));

  function unit(key: keyof typeof englishUnits, digits = 1) {
    const value = parts?.[key];
    const label =
      countLanguage === "zh"
        ? chineseUnits[key]
        : englishUnits[key] + (value === 1 ? "" : "s");
    const display =
      value === undefined
        ? "–".repeat(digits)
        : String(value).padStart(digits, "0");
    const before =
      previous === null ? display : String(previous[key]).padStart(digits, "0");
    return (
      <span key={key} className="count-up-unit">
        <span className="sr-only">{value !== undefined && value + " "}</span>
        <Digits
          value={display}
          previous={before}
          animate={digitMotion === "roll"}
        />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div
      className="count-up"
      lang={countLanguage === "zh" ? "zh-Hans" : "en"}
      data-align={align}
      style={
        {
          "--count-up-size": digitSize ? digitSize + "px" : undefined,
          "--count-up-colour": digitColor || undefined,
        } as CSSProperties
      }
    >
      {heading.trim() && <h2 className="count-up-heading">{heading}</h2>}
      <div className="count-up-row">{dateUnits.map((key) => unit(key))}</div>
      {showClock && (
        <div className="count-up-row count-up-clock">
          {unit("hours", 2)}
          {unit("minutes", 2)}
          {unit("seconds", 2)}
        </div>
      )}
      {showStartCaption && (
        <small
          className="count-up-caption"
          lang={startCaption?.trim() ? undefined : "en"}
        >
          {caption}
        </small>
      )}
    </div>
  );
}
