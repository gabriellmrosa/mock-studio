"use client";

import { useState, ChangeEvent, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Smartphone } from "./components/Smartphone";
import { Bounds, Center, OrbitControls } from "@react-three/drei";

export default function Home() {
  const [uploadedImage, setUploadedImage] =
    useState<string>("/placeholder.png");
  const [modelScale, setModelScale] = useState(0.009); // Escala inicial que você usava

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white relative">
      {/* BOTÃO UPLOAD */}
      <label className="absolute top-6 right-6 z-20 bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-lg cursor-pointer transition">
        Upload imagem
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>

      {/* CONTROLE DE ESCALA GLOBAL */}
      <div className="absolute left-6 bottom-6 bg-black/70 p-4 rounded-xl z-50 text-sm shadow-lg border border-neutral-800">
        <label className="flex flex-col gap-3">
          <span className="font-medium text-neutral-300">
            Tamanho do Mockup
          </span>
          <input
            type="range"
            min="0.004"
            max="0.015"
            step="0.0005"
            value={modelScale}
            onChange={(e) => setModelScale(parseFloat(e.target.value))}
            className="cursor-pointer accent-blue-500"
          />
        </label>
      </div>

      {/* AREA 3D FULL */}
      <div className="w-full h-screen">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          // Correção do preserveDrawingBuffer (agora dentro de gl)
          gl={{ preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={1} />
          <directionalLight position={[2, 3, 4]} intensity={2} />

          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.2}>
              <Center>
                <Smartphone
                  imageUrl={uploadedImage}
                  scale={modelScale}
                  rotation={[0, Math.PI, 0]}
                  // screenPosition, screenSize e screenRotation agora têm valores padrão dentro do componente
                />
              </Center>
            </Bounds>
          </Suspense>

          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>
    </main>
  );
}
