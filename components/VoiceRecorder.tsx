"use client";

import { useState, useRef, useMemo } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

export default function VoiceRecorder({ onTranscription }: { onTranscription: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Stable animation heights — avoid Math.random() in render (causes flickering)
  const barHeights = useMemo(() => [10, 16, 8, 14], []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access is required for voice input.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        onTranscription(data.text);
      } else {
        console.error("Transcription Failed");
      }
    } catch (e) {
      console.error("Error during transcription:", e);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isTranscribing ? (
        <div className="flex items-center gap-2 text-[#00ff88] text-[10px] font-bold uppercase tracking-widest animate-pulse">
          <Loader2 className="animate-spin" size={14} />
          Processing Voice...
        </div>
      ) : (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-[10px] font-bold uppercase tracking-widest transition-all ${
            isRecording 
              ? 'bg-[#ff444422] text-[#ff4444] border border-[#ff444444] animate-pulse' 
              : 'bg-[#00ff8811] text-[#00ff88] border border-[#00ff8822] hover:bg-[#00ff8822]'
          }`}
        >
          {isRecording ? <Square size={12} fill="currentColor" /> : <Mic size={12} />}
          {isRecording ? "Stop Recording" : "Voice Input"}
        </button>
      )}
      
      {isRecording && (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="w-0.5 bg-[#ff4444] rounded-full animate-bounce" 
              style={{ 
                height: `${barHeights[i - 1]}px`, 
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
