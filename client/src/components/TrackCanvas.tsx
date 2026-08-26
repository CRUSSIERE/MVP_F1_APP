import { useEffect, useRef } from "react";
import { computeBounds, type Point } from "../lib/trackPath";
import type { Driver } from "../types/openf1";

const CANVAS_W = 1280;
const CANVAS_H = 800;
const PADDING = 64;
const HIT_RADIUS_PX = 18;
const TRAIL_LENGTH = 16;
const TRAIL_MIN_DISTANCE = 0.5;

interface Props {
  trackPath: Point[];
  drivers: Driver[];
  positions: Record<number, Point>;
  selectedDriver: number | null;
  onSelectDriver: (driverNumber: number | null) => void;
}

function makeTransform(bounds: ReturnType<typeof computeBounds>) {
  if (!bounds) return (_p: Point) => ({ px: CANVAS_W / 2, py: CANVAS_H / 2 });
  const dataW = bounds.maxX - bounds.minX || 1;
  const dataH = bounds.maxY - bounds.minY || 1;
  const scale = Math.min((CANVAS_W - PADDING * 2) / dataW, (CANVAS_H - PADDING * 2) / dataH);
  const drawW = dataW * scale;
  const drawH = dataH * scale;
  const offsetX = (CANVAS_W - drawW) / 2;
  const offsetY = (CANVAS_H - drawH) / 2;
  return (p: Point) => ({
    px: offsetX + (p.x - bounds.minX) * scale,
    py: CANVAS_H - (offsetY + (p.y - bounds.minY) * scale),
  });
}

export default function TrackCanvas({ trackPath, drivers, positions, selectedDriver, onSelectDriver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef(makeTransform(computeBounds(trackPath)));
  const trailsRef = useRef<Map<number, Point[]>>(new Map());

  useEffect(() => {
    transformRef.current = makeTransform(computeBounds(trackPath));
    trailsRef.current.clear();
  }, [trackPath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const transform = transformRef.current;

    // Background: soft vignette instead of flat black for depth.
    const bg = ctx.createRadialGradient(
      CANVAS_W / 2,
      CANVAS_H / 2,
      0,
      CANVAS_W / 2,
      CANVAS_H / 2,
      Math.max(CANVAS_W, CANVAS_H) / 1.3
    );
    bg.addColorStop(0, "#131316");
    bg.addColorStop(1, "#08080a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (trackPath.length > 1) {
      ctx.strokeStyle = "#3a3a42";
      ctx.lineWidth = 22;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      trackPath.forEach((p, i) => {
        const { px, py } = transform(p);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.strokeStyle = "#232328";
      ctx.lineWidth = 18;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/finish marker at the first sampled point.
      const start = transform(trackPath[0]);
      ctx.save();
      ctx.fillStyle = "#e10600";
      ctx.beginPath();
      ctx.arc(start.px, start.py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Update + draw fading trails behind each car for a sense of motion.
    for (const driver of drivers) {
      const pos = positions[driver.driver_number];
      if (!pos) continue;
      let trail = trailsRef.current.get(driver.driver_number);
      if (!trail) {
        trail = [];
        trailsRef.current.set(driver.driver_number, trail);
      }
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) > TRAIL_MIN_DISTANCE) {
        trail.push(pos);
        if (trail.length > TRAIL_LENGTH) trail.shift();
      }

      if (trail.length > 1) {
        const color = driver.team_colour ? `#${driver.team_colour}` : "#999999";
        for (let i = 1; i < trail.length; i++) {
          const alpha = (i / trail.length) * 0.35;
          const a = transform(trail[i - 1]);
          const b = transform(trail[i]);
          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    for (const driver of drivers) {
      const pos = positions[driver.driver_number];
      if (!pos) continue;
      const { px, py } = transform(pos);
      const isSelected = driver.driver_number === selectedDriver;
      const color = driver.team_colour ? `#${driver.team_colour}` : "#e5e7eb";

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(225,6,0,0.18)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 11 : 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(0,0,0,0.5)";
      ctx.stroke();

      ctx.font = isSelected ? "bold 13px sans-serif" : "bold 11px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 3;
      ctx.fillText(String(driver.driver_number), px, py - (isSelected ? 18 : 14));
      ctx.shadowBlur = 0;
    }
  }, [trackPath, drivers, positions, selectedDriver]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const transform = transformRef.current;

    let closestDriver: number | null = null;
    let closestDist = Infinity;
    for (const driver of drivers) {
      const pos = positions[driver.driver_number];
      if (!pos) continue;
      const { px, py } = transform(pos);
      const dist = Math.hypot(px - clickX, py - clickY);
      if (dist < closestDist) {
        closestDist = dist;
        closestDriver = driver.driver_number;
      }
    }

    onSelectDriver(closestDist <= HIT_RADIUS_PX ? closestDriver : null);
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={handleClick}
      className="w-full h-auto rounded-xl border border-neutral-800 cursor-pointer bg-black shadow-lg"
    />
  );
}
