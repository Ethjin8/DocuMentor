"use client";

import { useEffect, useState } from "react";

type Phase = "hidden" | "covered" | "revealing";

export default function TransitionReveal() {
  const [phase, setPhase] = useState<Phase>("covered");
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("doReveal") === "1") {
      sessionStorage.removeItem("doReveal");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("revealing"));
      });
    } else {
      setPhase("hidden");
    }
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    const timer = setTimeout(() => setPhase("hidden"), 750);
    return () => clearTimeout(timer);
  }, [phase]);

  // Show loading dot if stuck in covered state for 400ms+
  useEffect(() => {
    if (phase !== "covered") {
      setShowLoader(false);
      return;
    }
    const timer = setTimeout(() => setShowLoader(true), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  const cls =
    phase === "covered" ? "transition-overlay covered" : "transition-overlay reveal";

  return (
    <div className={cls} style={{ pointerEvents: "none" }}>
      <div className="transition-panel transition-panel--left" />
      <div className="transition-panel transition-panel--right" />
      {showLoader && <div className="transition-loader" />}
    </div>
  );
}
