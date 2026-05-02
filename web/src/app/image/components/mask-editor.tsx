"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eraser, Paintbrush, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MaskEditorProps = {
  imageDataUrl: string;
  onConfirm: (maskDataUrl: string) => void;
  onCancel: () => void;
};

export function MaskEditor({ imageDataUrl, onConfirm, onCancel }: MaskEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [brushSize, setBrushSize] = useState(40);
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 加载图片到 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const img = new Image();
    img.onload = () => {
      const maxW = containerRef.current?.clientWidth || 800;
      const maxH = window.innerHeight * 0.6;
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);

      canvas.width = w;
      canvas.height = h;
      maskCanvas.width = w;
      maskCanvas.height = h;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      // mask 初始全透明
      const mCtx = maskCanvas.getContext("2d")!;
      mCtx.clearRect(0, 0, w, h);

      setImgSize({ w, h });
      setScale(ratio);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const draw = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const mCtx = maskCanvasRef.current?.getContext("2d");
    if (!mCtx) return;

    mCtx.globalCompositeOperation = tool === "brush" ? "source-over" : "destination-out";
    mCtx.strokeStyle = "rgba(220,50,50,0.85)";
    mCtx.lineWidth = brushSize;
    mCtx.lineCap = "round";
    mCtx.lineJoin = "round";
    mCtx.beginPath();
    mCtx.moveTo(from.x, from.y);
    mCtx.lineTo(to.x, to.y);
    mCtx.stroke();
  }, [tool, brushSize]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;
    draw(pos, pos);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    // 更新光标预览位置（相对于 canvas 元素的 CSS 像素）
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setCursorPos({ x: clientX - rect.left, y: clientY - rect.top });
    }
    if (!isDrawing || !lastPos.current) return;
    const pos = getPos(e);
    draw(lastPos.current, pos);
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleClear = () => {
    const mCtx = maskCanvasRef.current?.getContext("2d");
    if (!mCtx || !maskCanvasRef.current) return;
    mCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
  };

  const handleConfirm = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // OpenAI mask 格式：透明区域=要修改，黑色不透明=保留
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = maskCanvas.width;
    outputCanvas.height = maskCanvas.height;
    const ctx = outputCanvas.getContext("2d")!;

    // 先填黑色不透明（保留区域）
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // 把用户涂抹的区域变为透明（修改区域）
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(maskCanvas, 0, 0);

    onConfirm(outputCanvas.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-stone-500"
          onClick={onCancel}
        >
          <ArrowLeft className="size-4" />
          返回
        </Button>
        <div className="h-5 w-px bg-stone-200" />
        <Button
          variant={tool === "brush" ? "default" : "outline"}
          size="sm"
          className={cn("gap-1", tool === "brush" && "bg-stone-950 text-white")}
          onClick={() => setTool("brush")}
        >
          <Paintbrush className="size-4" />
          画笔
        </Button>
        <Button
          variant={tool === "eraser" ? "default" : "outline"}
          size="sm"
          className={cn("gap-1", tool === "eraser" && "bg-stone-950 text-white")}
          onClick={() => setTool("eraser")}
        >
          <Eraser className="size-4" />
          橡皮
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1">
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setBrushSize(s => Math.max(5, s - 10))}>
            <ZoomOut className="size-3.5" />
          </Button>
          <span className="w-8 text-center text-xs font-medium text-stone-700">{brushSize}</span>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setBrushSize(s => Math.min(120, s + 10))}>
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={handleClear}>
          <RotateCcw className="size-4" />
          清除
        </Button>
        <Button
          size="sm"
          className="ml-auto bg-stone-950 text-white hover:bg-stone-800"
          onClick={handleConfirm}
        >
          确认选区
        </Button>
      </div>

      {/* 提示 */}
      <p className="text-xs text-stone-400">在图片上涂抹需要修改的区域（白色高亮），然后点击「确认选区」</p>

      {/* Canvas 区域 */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100"
        style={{ cursor: "none" }}
        onMouseLeave={() => setCursorPos(null)}
      >
        {/* 原图 */}
        <canvas ref={canvasRef} className="block max-w-full" style={{ display: "block" }} />
        {/* mask 叠加层，CSS尺寸跟原图canvas完全一致 */}
        <canvas
          ref={maskCanvasRef}
          className="absolute inset-0 opacity-50"
          style={{ width: imgSize.w, height: imgSize.h, maxWidth: "100%" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {/* 笔触大小预览圆 */}
        {cursorPos && canvasRef.current && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-red-400"
            style={{
              width: brushSize * (canvasRef.current.getBoundingClientRect().width / canvasRef.current.width),
              height: brushSize * (canvasRef.current.getBoundingClientRect().width / canvasRef.current.width),
              left: cursorPos.x,
              top: cursorPos.y,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
              opacity: tool === "eraser" ? 0.6 : 0.9,
            }}
          />
        )}
      </div>
    </div>
  );
}
