"use client";

import { useEffect, useState } from "react";

type Phase = "hidden" | "covered" | "revealing";

export default function TransitionReveal() {
  // Read sessionStorage synchronously on first render so panels are
  // covering the screen from the very first paint — no flash.
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === "undefined") return "hidden";
    if (sessionStorage.getItem("doReveal") === "1") {
      sessionStorage.removeItem("doReveal");
      return "covered";
    }
    return "hidden";
  });

  useEffect(() => {
    if (phase !== "covered") return;
    // Two rAFs ensure the browser has painted the covered state before
    // we add the reveal animation class.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("revealing"));
    });
  }, [phase]);

  if (phase === "hidden") return null;

  const cls =
    phase === "covered" ? "transition-overlay covered" : "transition-overlay reveal";

  return (
    <div className={cls} style={{ pointerEvents: "none" }}>
      <div className="transition-panel transition-panel--left" />
      <div className="transition-panel transition-panel--right" />
    </div>
  );
}
