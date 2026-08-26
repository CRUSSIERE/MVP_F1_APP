import { useEffect, useRef } from "react";
import { computeBounds, type Point } from "../lib/trackPath";
import type { Driver } from "../types/openf1";

const CANVAS_W = 960;
const CANVAS_H = 620;
const PADDING = 48;
const HIT_RADIUS_PX = 14;

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

  useEffect(() => {
    transformRef.current = makeTransform(computeBounds(trackPath));
  }, [trackPath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const transform = transformRef.current;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (trackPath.length > 1) {
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 10;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      trackPath.forEach((p, i) => {
        const { px, py } = transform(p);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.strokeStyle = "#f3f4f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const driver of drivers) {
      const pos = positions[driver.driver_number];
      if (!pos) continue;
      const { px, py } = transform(pos);
      const isSelected = driver.driver_number === selectedDriver;

      ctx.beginPath();
      ctx.arc(px, py, isSelected ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = driver.team_colour ? `#${driver.team_colour}` : "#e5e7eb";
      ctx.fill();
      if (isSelected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }

      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(String(driver.driver_number), px, py - 12);
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
      className="w-full h-auto rounded-lg border border-neutral-800 cursor-pointer bg-black"
    />
  );
}
