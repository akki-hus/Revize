import React, { useState, useEffect } from "react";
import UploadForm from "./components/UploadForm";
import ProgressBar from "./components/ProgressBar";
import ReelPlayer from "./components/ReelPlayer";
import { Slide, GenerationResponse } from "./types";
import { Sparkles, Brain, GraduationCap, AlertCircle, RefreshCw, Layers } from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState<"upload" | "generating" | "player">("upload");
  const [currentStage, setCurrentStage] = useState(0);
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Progressive simulation of generations phases
  useEffect(() => {
    let timer: number | null = null;
    if (activeView === "generating") {
      setCurrentStage(0);
      
      const stagesTimeline = [
        { stage: 1, delay: 6000 },  // visual designing starts
        { stage: 2, delay: 15000 }, // TTS script voice starts
        { stage: 3, delay: 28000 }  // slideshow movie compilation starts
      ];

      stagesTimeline.forEach(({ stage, delay }) => {
        setTimeout(() => {
          setCurrentStage((prev) => Math.max(prev, stage));
        }, delay);
      });
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeView]);

  const handleGenerate = async (data: { file: File | null; textNotes: string; topic: string }) => {
    try {
      setError(null);
      setActiveView("generating");
      setCurrentStage(0);

      // Construct standard form data for transmission
      const formData = new FormData();
      if (data.file) {
        formData.append("pdfFile", data.file);
      }
      formData.append("textNotes", data.textNotes);
      formData.append("topic", data.topic);

      console.log("Triggering Revize summarization and media synthesis backend...");
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData
      });

      let result: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      }

      if (!response.ok) {
        const errorMsg = result?.error || `Server returned error (${response.status}): ${response.statusText || "Please wait a moment and try again."}`;
        throw new Error(errorMsg);
      }

      if (!result || !result.success) {
        throw new Error(result?.error || "Generation pipeline failed. Please check your text notes content or file size.");
      }

      // Generation successful! Update states
      setTopic(result.topic || data.topic || "Study Revision Review");
      setSlides(result.slides);
      setActiveView("player");
      
    } catch (err: any) {
      console.error("Pipeline failure:", err);
      setError(err.message || "An unexpected error occurred during synthesis.");
      setActiveView("upload");
    }
  };

  const handleReset = () => {
    setActiveView("upload");
    setSlides([]);
    setTopic("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col relative overflow-x-hidden font-sans">
      
      {/* Decorative futuristic backdrops elements */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* Primary navbar header */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px]">
              <div className="w-full h-full bg-[#070a13] rounded-xl flex items-center justify-center text-blue-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">REVIZE</span>
              <span className="text-[9px] font-mono tracking-widest text-blue-500 block uppercase font-bold">AI REVISION COGNITION</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GEMINI ACTIVE
            </span>
            <a 
              href="https://ai.studio/build" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-slate-300 hover:text-white font-mono bg-blue-600/20 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition-all font-semibold"
            >
              HACKATHON DEMO v1.0
            </a>
          </div>
        </div>
      </header>

      {/* Main Container screen elements */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-10 md:py-16 relative z-10 flex flex-col justify-center">
        
        {/* Top visual slogan headers */}
        {activeView === "upload" && (
          <div className="text-center space-y-4 mb-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              Revolutionize How You Study
            </div>
            
            <h1 className="font-display font-black text-3xl md:text-5xl text-white tracking-tight leading-tight">
              Transform study docs into <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">AI Revision Reels</span>
            </h1>
            
            <p className="text-slate-400 text-sm md:text-base leading-relaxed font-sans">
              Upload textbook PDFs, class slides, notes, or syllabus guides. Our neural pipeline condenses the material, designs infographic visual structures, crafts voice narratives, and compiles a short mobile learning reel.
            </p>
          </div>
        )}

        {/* Dynamic Display Error Block */}
        {error && (
          <div className="w-full max-w-2xl mx-auto mb-8 bg-rose-500/5 hover:bg-rose-500/10 transition-all border border-rose-500/20 p-5 rounded-2xl flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-display font-bold text-sm text-rose-300">Synthesis Pipeline Interrupted</span>
              <p className="text-xs text-slate-300 leading-normal font-sans">{error}</p>
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs text-rose-400 font-mono font-semibold underline hover:text-rose-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Sub-Views Rendering router */}
        <div className="w-full">
          {activeView === "upload" && (
            <UploadForm onGenerate={handleGenerate} isLoading={activeView === "generating"} />
          )}

          {activeView === "generating" && (
            <ProgressBar currentStage={currentStage} />
          )}

          {activeView === "player" && (
            <ReelPlayer topic={topic} slides={slides} onReset={handleReset} />
          )}
        </div>
      </main>

      {/* Footer Branding elements */}
      <footer className="relative z-10 py-6 border-t border-white/5 bg-slate-950/20 mt-12">
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs text-center sm:text-left font-mono">
          <div className="space-y-1">
            <p>© 2026 REVIZE AI Inc. • Powered by Google Gemini-3.5 and @google/genai.</p>
            <p className="text-[10px] text-slate-600 shrink-0">Bespoke neural infographics synced frame-by-frame instantly.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-slate-500 hover:text-slate-400">Security Encrypted</span>
            <span>•</span>
            <span className="text-slate-500 hover:text-slate-400">Standard Sandbox mode</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
