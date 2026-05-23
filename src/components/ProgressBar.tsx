import React, { useState, useEffect } from "react";
import { Sparkles, Brain, Image, Mic, Clapperboard, Loader2 } from "lucide-react";

interface ProgressBarProps {
  currentStage: number; // 0 to 4
}

const STAGES = [
  { id: 0, label: "Extracting core textbook concepts...", icon: Brain, detail: "Parsing PDF structure & isolating major key insights" },
  { id: 1, label: "Generating visual infographics...", icon: Image, detail: "Designing cinematic learning illustrations for each slide" },
  { id: 2, label: "Creating narrated revision script...", icon: Mic, detail: "Synthesizing conversational expert voices with high-yield pointers" },
  { id: 3, label: "Rendering final revision reel...", icon: Clapperboard, detail: "Blending transitions, subtitles, Ken Burns pacing & sync" }
];

const REASSURING_MESSAGES = [
  "Revize summarizes textbook chapters by isolating core bold learning points perfectly optimized for exam cramming.",
  "Did you know? Visual infographics dramatically increase study retention rates compared to standard textbook prose by 65%.",
  "Your revision reel slides are strictly limited to peak cognitive memory sizes—avoiding information overload.",
  "Great revision reels use active recall. Try saying the answers to yourself while watching the final revision reel!",
  "Each slide generates custom bespoke visual illustrations based of their exam concepts—providing high contextual clarity."
];

export default function ProgressBar({ currentStage }: ProgressBarProps) {
  const [tipsIndex, setTipsIndex] = useState(0);

  // Cycle tips every 4 seconds to keep users engaged!
  useEffect(() => {
    const timer = setInterval(() => {
      setTipsIndex((prev) => (prev + 1) % REASSURING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const progressPercentage = Math.round(((currentStage + 1) / STAGES.length) * 100);

  return (
    <div className="w-full max-w-xl mx-auto glass-card p-6 md:p-8 rounded-2xl flex flex-col items-center justify-center space-y-6 md:space-y-8" id="progress-bar-container">
      <div className="text-center space-y-2">
        <div className="inline-block p-3 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 animate-spin mb-2">
          <Loader2 className="w-8 h-8" />
        </div>
        <h3 className="font-display font-bold text-lg text-white">Synthesizing Revision Reel...</h3>
        <p className="text-xs text-slate-400 font-mono">EST: Under 45 seconds • Progress {progressPercentage}%</p>
      </div>

      {/* Progress slider bar */}
      <div className="w-full bg-slate-905 bg-slate-900/80 rounded-full h-2 overflow-hidden border border-slate-800">
        <div 
          className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-700 ease-out shimmer-bar"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stages list */}
      <div className="w-full space-y-3.5 pt-2">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isDone = currentStage > stage.id;
          const isActive = currentStage === stage.id;
          const isPending = currentStage < stage.id;

          return (
            <div 
              key={stage.id} 
              className={`flex items-start gap-4 p-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? "bg-slate-800/40 border border-white/5 shadow-inner" 
                  : "opacity-40"
              }`}
            >
              <div className={`mt-0.5 p-2 rounded-lg flex items-center justify-center ${
                isDone 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : isActive 
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                  : "bg-slate-950/40 text-slate-400 border border-transparent"
              }`}>
                {isDone ? (
                  <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
                )}
              </div>
              <div className="space-y-0.5">
                <span className={`text-sm font-medium leading-relaxed ${
                  isDone 
                    ? "text-emerald-400 font-semibold line-through" 
                    : isActive 
                    ? "text-slate-100 font-semibold" 
                    : "text-slate-300"
                }`}>
                  {stage.label}
                </span>
                {isActive && (
                  <p className="text-xs text-slate-400 font-serif leading-normal animate-fade-in">
                    {stage.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Engaging slide prompt box */}
      <div className="w-full bg-slate-950/40 p-4 border border-white/5 rounded-xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-[10px] font-mono tracking-widest uppercase text-yellow-400 block font-semibold">Active Revision Tip</span>
          <p className="text-xs text-slate-300 leading-normal italic font-sans">
            "{REASSURING_MESSAGES[tipsIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
}
