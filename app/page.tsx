"use client";

import { useState, ChangeEvent, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Smartphone,
  THEMES,
  DEFAULT_THEME,
  type ThemeName,
  type PhoneColors,
} from "./components/Smartphone";
import { Bounds, Center, Environment, OrbitControls } from "@react-three/drei";

// ---------------------------------------------------------------------------
// Temas para exibição no painel
// ---------------------------------------------------------------------------
const THEME_OPTIONS: { id: ThemeName; label: string; preview: string }[] = [
  { id: "metallic", label: "Cinza Metálico", preview: "#8A8A8E" },
  { id: "black", label: "Preto", preview: "#1C1C1E" },
  { id: "white", label: "Branco", preview: "#F5F5F7" },
  { id: "gold", label: "Dourado", preview: "#C9A84C" },
  { id: "space-blue", label: "Azul Espacial", preview: "#1B3A5C" },
];

// ---------------------------------------------------------------------------
// ColorRow — picker + input hex
// ---------------------------------------------------------------------------
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [inputVal, setInputVal] = useState(value);

  const handleHexInput = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputVal(v);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v)) onChange(v);
  };

  const handleColorPicker = (e: ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    onChange(e.target.value);
  };

  if (inputVal !== value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
    setInputVal(value);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-neutral-400 text-xs w-20 shrink-0">{label}</span>
      <label className="relative w-8 h-8 rounded-md overflow-hidden border border-neutral-600 cursor-pointer shrink-0 hover:border-neutral-400 transition">
        <input
          type="color"
          value={value}
          onChange={handleColorPicker}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </label>
      <input
        type="text"
        value={inputVal}
        onChange={handleHexInput}
        maxLength={7}
        placeholder="#000000"
        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-neutral-500 transition"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  const [uploadedImage, setUploadedImage] =
    useState<string>("/placeholder.png");
  const [activeTheme, setActiveTheme] = useState<ThemeName>(DEFAULT_THEME);
  const [colors, setColors] = useState<PhoneColors>(THEMES[DEFAULT_THEME]);

  // Dimensões calibradas do mesh da tela
  const screenW = 220;
  const screenH = 470;

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new window.Image();
    img.onload = () => {
      // Recorta para a proporção exata do mesh antes de passar ao Three.js
      const targetRatio = screenW / screenH;
      const imgRatio = img.width / img.height;

      let srcX = 0,
        srcY = 0,
        srcW = img.width,
        srcH = img.height;
      if (imgRatio > targetRatio) {
        srcW = img.height * targetRatio;
        srcX = (img.width - srcW) / 2;
      } else {
        srcH = img.width / targetRatio;
        srcY = (img.height - srcH) / 2;
      }

      // Limita a 2048px no lado maior para compatibilidade com WebGL
      const MAX = 2048;
      const scale = Math.min(1, MAX / Math.max(srcW, srcH));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(srcW * scale);
      canvas.height = Math.round(srcH * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      setUploadedImage(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = URL.createObjectURL(file);
  };

  const applyTheme = (themeId: ThemeName) => {
    setActiveTheme(themeId);
    setColors(THEMES[themeId]);
  };

  const updateColor = (part: keyof PhoneColors, hex: string) => {
    setActiveTheme("" as ThemeName);
    setColors((prev) => ({ ...prev, [part]: hex }));
  };

  return (
    <main className="min-h-screen bg-white text-white relative flex">
      {/* ── ÁREA 3D ── */}
      <div className="flex-1 h-screen">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ preserveDrawingBuffer: true }}
          style={{ background: "#ffffff" }}
        >
          <Environment preset="studio" />
          <directionalLight position={[0, 4, 3]} intensity={1.2} />

          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.2}>
              <Center>
                <Smartphone
                  imageUrl={uploadedImage}
                  rotation={[0, Math.PI, 0]}
                  bodyColor={colors.body}
                  buttonsColor={colors.buttons}
                  screenPosition={[-125, 315, -195]}
                  screenSize={[screenW, screenH]}
                />
              </Center>
            </Bounds>
          </Suspense>

          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>

      {/* ── PAINEL DIREITO ── */}
      <aside className="w-72 h-screen bg-neutral-900 border-l border-neutral-800 flex flex-col overflow-y-auto shrink-0">
        <div className="px-5 py-4 border-b border-neutral-800">
          <h1 className="text-sm font-semibold text-white tracking-wide">
            Mockup Studio
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Personalize seu mockup
          </p>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          {/* Upload */}
          <section>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
              Tela do App
            </p>
            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-800/50 hover:bg-neutral-800 cursor-pointer transition text-sm text-neutral-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-neutral-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4"
                />
              </svg>
              Upload imagem
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-neutral-500 text-center mt-2 leading-relaxed">
              Resolução recomendada:{" "}
              <span className="text-neutral-400">1290 × 2755 px</span>
              <br />
              Proporção 9:19.3 · PNG ou JPG
              <br />
              <span className="text-yellow-600/80">
                Sem sombras ou bordas na imagem
              </span>
            </p>
          </section>

          {/* Temas */}
          <section>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
              Temas
            </p>
            <div className="grid grid-cols-5 gap-2">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme.id)}
                  title={theme.label}
                  className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition ${
                    activeTheme === theme.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-neutral-700 hover:border-neutral-500 bg-transparent"
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border border-white/10 shadow-inner"
                    style={{ backgroundColor: theme.preview }}
                  />
                  <span className="text-[9px] text-neutral-400 leading-tight text-center">
                    {theme.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Cores customizadas */}
          <section>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
              Cores customizadas
            </p>
            <div className="flex flex-col gap-3">
              <ColorRow
                label="Corpo"
                value={colors.body}
                onChange={(hex) => updateColor("body", hex)}
              />
              <ColorRow
                label="Botões"
                value={colors.buttons}
                onChange={(hex) => updateColor("buttons", hex)}
              />
            </div>
          </section>
        </div>
      </aside>
    </main>
  );
}
