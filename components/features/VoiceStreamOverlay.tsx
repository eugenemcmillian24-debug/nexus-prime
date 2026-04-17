"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Mic, Square, Loader2, Zap, X, Brain } from "lucide-react";

interface VoiceStreamOverlayProps {
  projectId: string;
  currentFile: { path: string; content: string } | null;
  onCodeApplied: (newCode: string) => void;
  onClose: () => void;
}

export default function VoiceStreamOverlay({ 
  projectId, 
  currentFile, 
  onCodeApplied, 
  onClose 
}: VoiceStreamOverlayProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "transcribing" | "applying" | "success" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const barHeights = useMemo(() => [20, 40, 15, 30, 25, 45, 10, 35], []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceCommand(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus("listening");
      setTranscript("");
    } catch (err) {
      setErrorMessage("Microphone access denied.");
      setStatus("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceCommand = async (blob: Blob) => {
    setStatus("transcribing");
    try {
      // 1. Transcribe
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { text } = await transcribeRes.json();
      setTranscript(text);

      // 2. Apply Edit
      if (!currentFile) throw new Error("No active file to edit.");
      setStatus("applying");
      const editRes = await fetch('/api/agent/voice-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          fileContent: currentFile.content,
          voiceCommand: text
        }),
      });

      if (!editRes.ok) throw new Error("AI failed to interpret command.");
      const { updatedCode } = await editRes.json();
      
      onCodeApplied(updatedCode);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e: any) {
      setErrorMessage(e.message);
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="max-w-lg w-full bg-[#0a0a0a] border border-[#1a1a1a] p-10 space-y-8 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-[#444] hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
            isRecording ? "bg-[#ff444411] border-2 border-[#ff444444] animate-pulse" : "bg-[#00ff8811] border-2 border-[#00ff8844]"
          }`}>
            <Brain size={40} className={isRecording ? "text-[#ff4444]" : "text-[#00ff88]"} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-white">Nexus Voice-Stream</h2>
            <p className="text-[10px] text-[#444] uppercase tracking-widest">Real-time Multi-Agent Code Manipulation</p>
          </div>

          {/* Visualizer */}
          {isRecording && (
            <div className="flex items-end gap-1 h-12">
              {barHeights.map((h, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-[#ff4444] rounded-t-sm animate-bounce" 
                  style={{ height: `${h}px`, animationDelay: `${i * 0.05}s` }} 
                />
              ))}
            </div>
          )}

          {/* Status Display */}
          <div className="w-full min-h-[60px] flex flex-col items-center justify-center">
            {status === "idle" && (
              <p className="text-xs text-[#525252] uppercase tracking-widest">Hold "V" or Click Mic to Start Command</p>
            )}
            {status === "listening" && (
              <p className="text-xs text-[#ff4444] font-bold uppercase tracking-widest">Listening for Instructions...</p>
            )}
            {status === "transcribing" && (
              <div className="flex items-center gap-3 text-[#00ff88]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Decoding Audio Stream...</span>
              </div>
            )}
            {status === "applying" && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-3 text-[#00ff88]">
                  <Zap size={16} className="animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Synthesizing Code Refinement...</span>
                </div>
                <p className="text-[10px] text-[#444] italic">"{transcript}"</p>
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center gap-3 text-[#00ff88]">
                <Zap size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Modification Applied Successfully</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-3 text-[#ef4444]">
                <X size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{errorMessage}</span>
              </div>
            )}
          </div>

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={`w-full py-5 font-bold uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-4 transition-all ${
              isRecording 
                ? "bg-[#ff4444] text-black" 
                : "bg-[#00ff88] text-black hover:bg-[#00cc6d]"
            }`}
          >
            {isRecording ? <Square size={16} fill="black" /> : <Mic size={16} />}
            {isRecording ? "Release to Execute" : "Hold to Record Command"}
          </button>
        </div>

        <div className="pt-4 border-t border-[#1a1a1a] flex justify-between items-center text-[8px] text-[#222] uppercase tracking-[0.4em]">
          <span>Neural Engine Active</span>
          <span>© 2026 NEXUS PRIME</span>
        </div>
      </div>
    </div>
  );
}
