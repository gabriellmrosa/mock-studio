"use client";

import { useState, ChangeEvent } from "react";

export default function Home() {
  // Estado para guardar a URL local da imagem que o usuário subir
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Função para lidar com o upload do arquivo
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Cria uma URL temporária no navegador para a imagem
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
    }
  };

  // Função para limpar a imagem e recomeçar
  const handleReset = () => {
    setUploadedImage(null);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Mockup <span className="text-blue-500">Studio</span>
        </h1>

        {!uploadedImage ? (
          // --- ESTADO 1: ÁREA DE UPLOAD ---
          <div className="border-2 border-dashed border-neutral-700 rounded-xl p-12 flex flex-col items-center justify-center bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors cursor-pointer group relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-4 pointer-events-none">
              <div className="bg-neutral-800 p-4 rounded-full inline-block group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium">
                Clique ou arraste a tela do seu app aqui
              </p>
              <p className="text-sm text-neutral-400">
                Suporta PNG, JPG e WebP
              </p>
            </div>
          </div>
        ) : (
          // --- ESTADO 2: PREPARAÇÃO PARA O 3D ---
          <div className="flex flex-col items-center space-y-6">
            <div className="w-full h-[600px] border border-neutral-800 rounded-xl bg-neutral-900 flex items-center justify-center relative overflow-hidden">
              {/* No futuro, o Canvas do Three.js vai entrar aqui! */}
              {/* Por enquanto, vamos só mostrar a imagem para confirmar que funcionou */}
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-8 z-10">
                <p className="text-neutral-400">
                  Preview da imagem carregada (Em breve no 3D!):
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage}
                  alt="Sua UI"
                  className="max-h-64 rounded-lg shadow-xl border border-neutral-700"
                />
              </div>
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-medium transition-colors"
            >
              Escolher outra imagem
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
