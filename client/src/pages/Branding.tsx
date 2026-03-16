import { useEffect, useRef } from "react";

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  const s = size;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.32, cy - s * 0.1);
  ctx.lineTo(cx, cy + s * 0.55);
  ctx.lineTo(cx - s * 0.32, cy - s * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - s * 0.18, cy - s * 0.38);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.38);
  ctx.lineTo(cx + s * 0.08, cy - s * 0.15);
  ctx.lineTo(cx - s * 0.08, cy - s * 0.15);
  ctx.closePath();
  ctx.fillStyle = "rgba(245,243,239,0.12)";
  ctx.fill();

  ctx.strokeStyle = "rgba(245,243,239,0.15)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.55);
  ctx.lineTo(cx, cy + s * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.25, cy - s * 0.2);
  ctx.stroke();
}

function ProfilePicture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 400;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = "#f5f3ef";
    ctx.fillRect(0, 0, w, h);

    const r = 24;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.clip();
    ctx.fillStyle = "#f5f3ef";
    ctx.fillRect(0, 0, w, h);

    drawDiamond(ctx, w / 2, h * 0.4, 120, "#3d1a22");

    ctx.font = "600 28px 'Inter', sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillStyle = "#3d1a22";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("BRIARWOOD", w / 2 + 3, h * 0.72);
  }, []);

  return (
    <div>
      <h3 className="text-sm font-medium mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
        Profile Picture (400 x 400)
      </h3>
      <canvas ref={canvasRef} className="border border-[#e8e2d9] max-w-[300px]" style={{ width: 300, height: 300 }} />
      <button
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const link = document.createElement("a");
          link.download = "briarwood-profile-400x400.png";
          link.href = canvas.toDataURL("image/png");
          link.click();
        }}
        className="mt-3 block bg-[#1a1a1a] text-[#f5f3ef] px-4 py-2 text-sm hover:bg-[#333] transition-colors"
        data-testid="button-download-profile"
      >
        Download Profile Picture
      </button>
    </div>
  );
}

function BannerImage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 1500;
    const h = 500;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = "#3d1a22";
    ctx.fillRect(0, 0, w, h);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.globalAlpha = 0.25;
      const pattern = ctx.createPattern(img, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalAlpha = 1;

      drawDiamond(ctx, w / 2, h * 0.33, 70, "#f5f3ef");

      ctx.font = "500 22px 'Inter', sans-serif";
      ctx.letterSpacing = "8px";
      ctx.fillStyle = "rgba(245,243,239,0.85)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("BRIARWOOD", w / 2 + 4, h * 0.56);

      ctx.font = "400 11px 'Inter', sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillStyle = "rgba(245,243,239,0.35)";
      ctx.fillText("INTEGRAL OS & PRIVATE API FOR THE PHYSICAL ECONOMY", w / 2 + 2, h * 0.68);
    };
    img.src = "/pinstripe.jpeg";
  }, []);

  return (
    <div>
      <h3 className="text-sm font-medium mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
        Twitter Banner (1500 x 500)
      </h3>
      <canvas ref={canvasRef} className="border border-[#e8e2d9] w-full" style={{ maxWidth: 750, height: "auto", aspectRatio: "3/1" }} />
      <button
        onClick={() => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const link = document.createElement("a");
          link.download = "briarwood-banner-1500x500.png";
          link.href = canvas.toDataURL("image/png");
          link.click();
        }}
        className="mt-3 block bg-[#1a1a1a] text-[#f5f3ef] px-4 py-2 text-sm hover:bg-[#333] transition-colors"
        data-testid="button-download-banner"
      >
        Download Banner
      </button>
    </div>
  );
}

export default function Branding() {
  return (
    <div className="bg-[#FAF8F5] min-h-screen text-[#1a1a1a] py-20" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[900px] mx-auto px-6 sm:px-10">
        <h1
          className="text-2xl tracking-tight mb-2"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Briarwood Brand Assets
        </h1>
        <p className="text-sm text-[#888] mb-12">Download for Twitter / X</p>

        <div className="space-y-16">
          <ProfilePicture />
          <BannerImage />
        </div>
      </div>
    </div>
  );
}
