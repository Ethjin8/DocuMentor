"use client";

import { useEffect, useRef } from "react";
import type { VoiceState } from "@/lib/gemini-live";

interface Props {
  voiceState: VoiceState;
  analyser: AnalyserNode | null;
}

const ARC_COLOR_IDLE = "#d1d5db";
const ARC_COLOR_ACTIVE = "#2563eb";
const ARC_COLOR_LISTENING = "#ef4444";
const ARC_COLOR_SPEAKING = "#2563eb";

function getArcColor(state: VoiceState): string {
  switch (state) {
    case "listening": return ARC_COLOR_LISTENING;
    case "speaking": return ARC_COLOR_SPEAKING;
    case "connecting":
    case "thinking": return ARC_COLOR_ACTIVE;
    default: return ARC_COLOR_IDLE;
  }
}

function getAmplitude(analyser: AnalyserNode | null): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

export default function WaveformArcs({ voiceState, analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const smoothAmplitudeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 240;
    const H = 120;
    canvas.width = W * 2; // retina
    canvas.height = H * 2;
    ctx.scale(2, 2);

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      const isActive = voiceState === "listening" || voiceState === "speaking";
      const rawAmp = isActive ? getAmplitude(analyser) : 0;

      // Smooth the amplitude for fluid animation
      const smooth = smoothAmplitudeRef.current;
      smoothAmplitudeRef.current = smooth + (rawAmp - smooth) * 0.15;
      const amp = smoothAmplitudeRef.current;

      const color = getArcColor(voiceState);
      const centerX = W / 2;
      const centerY = H / 2;
      const baseOffset = 40; // distance from center to arc

      // Animate: arcs spread based on amplitude
      const spread = isActive ? amp * 18 : 0;

      // Thinking: converging animation
      const thinkingOffset = voiceState === "thinking"
        ? Math.sin(Date.now() / 400) * 6
        : 0;

      // Connecting: gentle pulse
      const connectPulse = voiceState === "connecting"
        ? Math.sin(Date.now() / 600) * 0.3 + 0.7
        : 1;

      const opacity = voiceState === "idle" ? 0.5 : connectPulse;
      ctx!.globalAlpha = opacity;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 2.5;
      ctx!.lineCap = "round";

      // Number of arc segments for waveform effect
      const segments = 8;
      const arcHeight = 50;

      // Left arc — curves like "("
      ctx!.beginPath();
      const leftX = centerX - baseOffset - spread + thinkingOffset;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = centerY - arcHeight / 2 + t * arcHeight;
        const segAmp = isActive ? getSegmentAmplitude(analyser, i, segments) * 10 : 0;
        const curve = Math.sin(t * Math.PI) * 14 + segAmp;
        const x = leftX - curve;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      // Right arc — curves like ")"
      ctx!.beginPath();
      const rightX = centerX + baseOffset + spread - thinkingOffset;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = centerY - arcHeight / 2 + t * arcHeight;
        const segAmp = isActive ? getSegmentAmplitude(analyser, i, segments) * 10 : 0;
        const curve = Math.sin(t * Math.PI) * 14 + segAmp;
        const x = rightX + curve;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();

      ctx!.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [voiceState, analyser]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 240, height: 120, pointerEvents: "none" }}
    />
  );
}

/** Get amplitude for a specific segment from frequency data for waveform shape */
function getSegmentAmplitude(analyser: AnalyserNode | null, segment: number, totalSegments: number): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const binStart = Math.floor((segment / totalSegments) * data.length);
  const binEnd = Math.floor(((segment + 1) / totalSegments) * data.length);
  let sum = 0;
  for (let i = binStart; i < binEnd; i++) {
    sum += data[i];
  }
  const avg = sum / (binEnd - binStart || 1);
  return avg / 255;
}
