"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, X, UploadCloud } from "lucide-react";
import Image from "next/image";

export default function ScreenshotUpload({ onUpload }: { onUpload: (base64: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="flex items-center gap-3">
      {!preview ? (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-[10px] font-bold uppercase tracking-widest bg-[#00ff8811] text-[#00ff88] border border-[#00ff8822] hover:bg-[#00ff8822] cursor-pointer transition-all"
        >
          <UploadCloud size={12} />
          <span>Upload Screenshot</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      ) : (
        <div className="relative group">
          <Image
            src={preview}
            alt="Screenshot Preview"
            className="w-10 h-10 object-cover rounded-[2px] border border-[#00ff8844]"
          />
          <button
            onClick={() => {
              setPreview(null);
              onUpload(null);
            }}
            className="absolute -top-1 -right-1 bg-black border border-[#1a1a1a] rounded-full p-0.5 text-[#ff4444] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={8} />
          </button>
        </div>
      )}
    </div>
  );
}
