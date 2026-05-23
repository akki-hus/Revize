import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Download, ArrowLeft, ArrowRight, Brain, AlertCircle, RefreshCw } from "lucide-react";
import { Slide } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ReelPlayerProps {
  topic: string;
  slides: Slide[];
  onReset: () => void;
}

export default function ReelPlayer({ topic, slides, onReset }: ReelPlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Tracking active audio node
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  
  // Video compiler recording states
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compileStatus, setCompileStatus] = useState("");
  
  const currentSlide = slides[currentIdx];

  // Initialize or handle slide audio play
  useEffect(() => {
    // Stop existing audio & clear timelines
    stopCurrentPlayback();

    if (isPlaying) {
      playSlide(currentIdx);
    }

    return () => {
      stopCurrentPlayback();
    };
  }, [currentIdx, isPlaying]);

  const stopCurrentPlayback = () => {
    // Stop HTML Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Cancel SpeechSynthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Clear timers
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const playSlide = (idx: number) => {
    const slide = slides[idx];
    setProgress(0);

    // Silent caption playback matching pacing timer
    runDummyTimer(slide.duration || 20);
  };

  const playSpeechSynthesisFallback = (text: string, duration: number) => {
    if (!isPlaying) return;

    const synth = window.speechSynthesis;
    // Standard safety
    if (!synth) {
      runDummyTimer(duration);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = muted ? 0 : 1;
    utterance.rate = 1.05;

    // Use a clean English voice if available
    const voices = synth.getVoices();
    const cleanVoice = voices.find(v => v.lang.startsWith("en-") || v.name.includes("Google"));
    if (cleanVoice) utterance.voice = cleanVoice;

    synth.speak(utterance);

    // Track progression bar
    runDummyTimer(duration);

    utterance.onend = () => {
      handleSlideEnd();
    };
  };

  const runDummyTimer = (duration: number) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    const intervalStep = 100;
    const totalSteps = duration * 1000;
    let elapsed = 0;

    progressTimerRef.current = window.setInterval(() => {
      elapsed += intervalStep;
      const pct = Math.min((elapsed / totalSteps) * 100, 100);
      setProgress(pct);

      if (elapsed >= totalSteps) {
        handleSlideEnd();
      }
    }, intervalStep);
  };

  const handleSlideEnd = () => {
    stopCurrentPlayback();
    if (currentIdx < slides.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Reset slide back to start and pause
      setCurrentIdx(0);
      setIsPlaying(false);
      setProgress(0);
    }
  };

  const getShortsCaptionWords = (narration: string, progressPct: number) => {
    const rawWords = narration.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];
    const activeWordIdx = Math.floor((progressPct / 100) * rawWords.length);
    const clampedIdx = Math.max(0, Math.min(activeWordIdx, rawWords.length - 1));
    const startIdx = Math.max(0, clampedIdx - 1);
    const endIdx = Math.min(rawWords.length, clampedIdx + 2);
    return rawWords.slice(startIdx, endIdx).map((word, index) => {
      const originalWordIdx = startIdx + index;
      return {
        text: word.toUpperCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ""),
        isCurrent: originalWordIdx === clampedIdx
      };
    });
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleToggleMute = () => {
    const newMute = !muted;
    setMuted(newMute);
    if (audioRef.current) {
      audioRef.current.muted = newMute;
    }
    const synth = window.speechSynthesis;
    if (synth && synth.speaking) {
      // Toggle speaking volume by canceling and restarting
      synth.cancel();
      playSlide(currentIdx);
    }
  };

  const jumpToSlide = (idx: number) => {
    setCurrentIdx(idx);
    setProgress(0);
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    } else {
      setCurrentIdx(slides.length - 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < slides.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setCurrentIdx(0);
    }
  };

  // Compile Slideshow dynamically into MP4 WebM video inside browser!
  // Renders each frame on offscreen canvas, merges audio streams, and spits out video download.
  const handleCompileVideo = async () => {
    try {
      setIsCompiling(true);
      setCompileProgress(0);
      setCompileStatus("Initializing compiler canvas...");
      stopCurrentPlayback();

      // Create a clean high performance canvas to record frames
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not construct Web 2D graphic pipeline");

      // Verify browser support
      const stream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).transferControlToOffscreen ? null : null;
      if (!stream) {
        throw new Error("Canvas streaming recording is not fully supported in this browser mode.");
      }

      // Collect audio streams & make Audio Destination Node
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      
      const audioTracks = dest.stream.getAudioTracks();
      const combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...(audioTracks.length > 0 ? audioTracks : [])
      ]);

      // Set up standard MediaRecorder using WebM default (h264/VP9) which can play instantly on computers
      let options = { mimeType: "video/webm; codecs=vp9" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm; codecs=vp8" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }

      const recorder = new MediaRecorder(combinedStream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      // Recording sequence variables
      let slideRecordIdx = 0;
      let recordedMediaSource: HTMLAudioElement | null = null;

      // Start recording
      recorder.start();

      // Recursive Slideshow Frame Painter Loop
      const renderSlideFrame = async (slideIndex: number) => {
        if (slideIndex >= slides.length) {
          // Finished rendering all slides! Wrap up!
          recorder.stop();
          return;
        }

        slideRecordIdx = slideIndex;
        const currentSlide = slides[slideIndex];
        const duration = currentSlide.duration || 10;
        const durationMs = duration * 1000;
        
        setCompileProgress(Math.round((slideIndex / slides.length) * 100));
        setCompileStatus(`Recording Slide ${slideIndex + 1}/${slides.length}: "${currentSlide.title}"...`);

        // Load image texture
        const slideImg = new Image();
        slideImg.crossOrigin = "anonymous";
        slideImg.src = currentSlide.imageUrl;
        await new Promise((resolve) => {
          slideImg.onload = resolve;
          slideImg.onerror = resolve; // proceed if image fails
        });

        // Try playing voice audio matching the slide
        let audioPlayPromise: Promise<void> | null = null;
        if (currentSlide.audioUrl) {
          const audioElem = new Audio(currentSlide.audioUrl);
          recordedMediaSource = audioElem;
          const sourceNode = audioCtx.createMediaElementSource(audioElem);
          sourceNode.connect(dest);
          sourceNode.connect(audioCtx.destination); // let the user hear it during recording (exciting feedback!)
          audioPlayPromise = audioElem.play();
        }

        // Draw frame loop at 30 fps
        const fps = 30;
        const frameInterval = 1000 / fps;
        let elapsed = 0;

        const drawLoop = async () => {
          if (elapsed >= durationMs) {
            // Stop active audio
            if (recordedMediaSource) {
              recordedMediaSource.pause();
              recordedMediaSource = null;
            }
            // Transition to next slide
            await renderSlideFrame(slideIndex + 1);
            return;
          }

          // Clear frame
          ctx.fillStyle = "#090d16";
          ctx.fillRect(0, 0, 1280, 720);

          // Calculate Ken Burns scale factor (slow zoom-in)
          const zoomRate = 1 + (elapsed / durationMs) * 0.15; // zooms from 1.0 to 1.15
          const imgW = 1280 * zoomRate;
          const imgH = 720 * zoomRate;
          const imgX = (1280 - imgW) / 2;
          const imgY = (720 - imgH) / 2;

          // Draw scaled background image
          if (slideImg.complete && slideImg.naturalWidth > 0) {
            ctx.drawImage(slideImg, imgX, imgY, imgW, imgH);
          }

          // Apply rich cinematic dark-vignette graphic layover
          const gradient = ctx.createRadialGradient(640, 360, 200, 640, 360, 700);
          gradient.addColorStop(0, "rgba(9, 13, 22, 0.45)");
          gradient.addColorStop(0.5, "rgba(9, 13, 22, 0.75)");
          gradient.addColorStop(1, "rgba(9, 13, 22, 0.95)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1280, 720);

          // Draw Header - Topic Banner Info
          ctx.font = "bold 20px 'Space Grotesk', system-ui, sans-serif";
          ctx.fillStyle = "#3b82f6";
          ctx.fillText("REVIZE REEL", 80, 70);

          ctx.font = "500 20px 'Space Grotesk', system-ui, sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText(`•   ${topic.toUpperCase()}`, 240, 70);

          // Draw active slide number pill
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.strokeRect(1100, 50, 100, 36);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px 'JetBrains Mono', monospace";
          ctx.fillText(`SLIDE 0${slideIndex + 1}`, 1120, 73);

          // Draw MAIN Slide Title
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 44px 'Space Grotesk', system-ui, sans-serif";
          ctx.fillText(currentSlide.title, 80, 170);

          // Draw Bullet points (Bento Card block style)
          const bulletYStart = 240;
          const bulletSpacing = 68;

          currentSlide.bullets.forEach((bullet, index) => {
            const bulletY = bulletYStart + index * bulletSpacing;

            // Rounded rectangle background for bullet bento block
            ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            
            // Draw standard path
            ctx.beginPath();
            ctx.roundRect(80, bulletY, 1120, 52, 10);
            ctx.fill();
            ctx.stroke();

            // Decorative blue dot indicator
            ctx.beginPath();
            ctx.arc(110, bulletY + 26, 6, 0, 2 * Math.PI);
            ctx.fillStyle = "#2563eb";
            ctx.fill();

            // Text content writing (supporting bold highlight format markers)
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "500 18px 'Inter', system-ui, sans-serif";
            ctx.fillText(bullet, 140, bulletY + 32);
          });

          // Draw dynamic narration lyrics/subtitle block at bottom (YouTube Shorts kinetic style)
          const wordList = currentSlide.narration.split(/\s+/).filter(Boolean);
          if (wordList.length > 0) {
            const activeWIdx = Math.floor((elapsed / durationMs) * wordList.length);
            const clmIdx = Math.max(0, Math.min(activeWIdx, wordList.length - 1));
            const startI = Math.max(0, clmIdx - 1);
            const endI = Math.min(wordList.length, clmIdx + 2);
            
            const chunkWords = wordList.slice(startI, endI).map((w, idx) => {
              const oIdx = startI + idx;
              return {
                text: w.toUpperCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ""),
                isCurrent: oIdx === clmIdx
              };
            });

            const spacing = 18;
            let totalPhraseWidth = 0;
            const wordWidths = chunkWords.map(w => {
              ctx.font = w.isCurrent 
                ? "900 38px 'Space Grotesk', system-ui, sans-serif" 
                : "700 28px 'Space Grotesk', system-ui, sans-serif";
              const wWidth = ctx.measureText(w.text).width;
              totalPhraseWidth += wWidth;
              return wWidth;
            });
            totalPhraseWidth += (chunkWords.length - 1) * spacing;

            let drawingX = 640 - totalPhraseWidth / 2;
            const drawingY = 630;

            chunkWords.forEach((w, wIdx) => {
              ctx.font = w.isCurrent 
                ? "900 38px 'Space Grotesk', system-ui, sans-serif" 
                : "700 28px 'Space Grotesk', system-ui, sans-serif";
              
              const wordWidth = wordWidths[wIdx];
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = w.isCurrent ? 12 : 8;
              ctx.lineJoin = "miter";
              ctx.strokeText(w.text, drawingX, drawingY);
              ctx.fillStyle = w.isCurrent ? "#facc15" : "#ffffff";
              ctx.fillText(w.text, drawingX, drawingY);
              drawingX += wordWidth + spacing;
            });
          }

          // Time progression bar inside recording
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          ctx.fillRect(80, 560, 1120, 4);

          ctx.fillStyle = "#3b82f6";
          const progWidth = (elapsed / durationMs) * 1120;
          ctx.fillRect(80, 560, progWidth, 4);

          // Advance timeline and recurse
          elapsed += frameInterval;
          setTimeout(drawLoop, frameInterval);
        };

        // Trigger loop start
        drawLoop();
      };

      // Handle direct file generation download on save completed!
      recorder.onstop = () => {
        setCompileProgress(100);
        setCompileStatus("Baking standard MP4 revision reel container...");
        
        audioCtx.close();

        setTimeout(() => {
          const blob = new Blob(chunks, { type: "video/mp4" });
          const videoUrl = URL.createObjectURL(blob);
          
          // Trigger browser downloader anchor
          const downloadAnchor = document.createElement("a");
          downloadAnchor.href = videoUrl;
          downloadAnchor.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-revision-reel.mp4`;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);

          setIsCompiling(false);
          setCompileProgress(0);
          setCompileStatus("");
        }, 1500);
      };

      // Start the sequence trigger
      await renderSlideFrame(0);

    } catch (e: any) {
      console.error("Recording compiler system error:", e);
      alert(`Recording Engine error: ${e.message || e}`);
      setIsCompiling(false);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="reel-player-container">
      {/* LEFT COLUMN: Beautiful Simulated Smartphone Revize Cinema Player */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <span className="text-xs font-mono tracking-wider uppercase text-slate-500 mb-3 block">Revision Preview Client Screen</span>
        
        {/* Mobile container border framing */}
        <div className="relative w-full max-w-[340px] aspect-[9/16] bg-slate-950 border-[6px] border-slate-800 rounded-[38px] shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col justify-between">
          
          {/* Dynamic Top earphone notch indicator */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-full z-30 flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-900 rounded-full" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Ken burns animated background texture content */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallbackSeed = encodeURIComponent(currentSlide.title.substring(0, 15));
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${fallbackSeed}/1280/720`;
                  }}
                  className={`w-full h-full object-cover origin-center ${isPlaying ? "animate-ken-burns" : "scale-[1.05]"}`}
                />
                
                {/* Visual shade masks */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/90 z-10" />
              </div>

              {/* Active Slide Graphics Contents overlay */}
              <div className="relative z-20 w-full h-full flex flex-col justify-between p-6 pt-12 pb-14">
                {/* Slide index & subtitle status indicator */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1"><Brain className="w-3 h-3 text-blue-400" /> STUDY CARDS</span>
                  <span>SLIDE {currentIdx + 1}/{slides.length}</span>
                </div>

                {/* Slides Main content */}
                <div className="space-y-4 my-auto">
                  <h4 className="font-display font-bold text-lg text-white tracking-tight leading-tight">
                    {currentSlide.title}
                  </h4>
                  
                  {/* Bullet study content list */}
                  <div className="space-y-2.5">
                    {currentSlide.bullets.map((bullet, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        key={idx} 
                        className="p-2.5 bg-slate-950/70 border border-white/5 rounded-xl flex items-start gap-2.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                        <p className="text-[11px] text-slate-300 leading-normal font-sans" dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<b class="text-blue-300 block">$1</b>') }} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Elegant, seamless kinetic YouTube Shorts style burnt-in captions */}
                <div className="w-full text-center pb-1 pointer-events-none select-none">
                  <div className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 py-1.5 px-3 bg-black/50 backdrop-blur-[3px] rounded-xl border border-white/10 shadow-lg max-w-[95%] mx-auto">
                    {getShortsCaptionWords(currentSlide.narration, progress).map((word, wordIdx) => (
                      <motion.span
                        key={wordIdx}
                        animate={word.isCurrent ? { scale: 1.15 } : { scale: 1 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className={`text-[10px] font-display font-black tracking-tight uppercase select-none transition-all duration-75 ${
                          word.isCurrent 
                            ? "text-yellow-400 font-extrabold" 
                            : "text-white opacity-85 font-semibold"
                        }`}
                        style={{
                          textShadow: "1px 1px 2px rgba(0,0,0,1)"
                        }}
                      >
                        {word.text}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Persistent Player bottom controls */}
          <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 z-30 p-3 border-t border-white/5 flex flex-col gap-2">
            
            {/* Play progression line */}
            <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Previous index button */}
              <button 
                type="button" 
                onClick={handlePrev}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Core trigger toggles */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95 transition-all text-sm flex items-center justify-center"
                  id="btn-play-pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
              </div>

              {/* Captions mode indicator badge instead of audio trigger */}
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-800/30">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" /> Captions ON
              </div>

              {/* Next slide index button */}
              <button 
                type="button" 
                onClick={handleNext}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Full Revision Details Workspace & Interactive Compilation Controls */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">REVIZE STUDY DECK</span>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight mt-2">{topic}</h2>
          <p className="text-slate-400 text-xs mt-1">Generated 7-10 detailed, high-yield study cards with deeper storytelling narrations built for immersive active learning.</p>
        </div>

        {/* Dynamic active timeline chapter selectors */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">Chapters / Cards Overview</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => jumpToSlide(idx)}
                className={`text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                  currentIdx === idx
                    ? "bg-blue-600/10 border-blue-500/40 shadow-inner"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center ${
                    currentIdx === idx
                      ? "bg-blue-600 text-white"
                      : "bg-slate-950 text-slate-400"
                  }`}>
                    0{slide.id}
                  </div>
                  <div>
                    <h4 className={`text-sm font-semibold ${currentIdx === idx ? "text-white" : "text-slate-300"}`}>
                      {slide.title}
                    </h4>
                    <span className="text-[10px] font-serif tracking-normal text-slate-500 line-clamp-1">{slide.bullets.join(" • ")}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-500 block">{slide.duration}s Captions</span>
                  <span className="text-[10px] font-mono font-medium text-cyan-400">
                    Auto-Advancing
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action compiling download drawer blocks */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" /> Export Options
            </h3>
            <p className="text-xs text-slate-400 leading-normal">Download a high-fidelity MP4 study revision reel directly to your device with synced slide graphics, cinematic transitions, zoom-ins, bullet overlays, and beautifully burned-in educational subtitle captions!</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleCompileVideo}
              disabled={isCompiling}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:translate-y-px text-white font-semibold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md shadow-blue-900/10"
              id="btn-download-video"
            >
              <Download className="w-4 h-4" />
              Download MP4 Video Reel
            </button>
            <button
              onClick={onReset}
              disabled={isCompiling}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 active:translate-y-px text-slate-300 font-semibold py-3.5 px-6 rounded-xl text-sm transition-all"
              id="btn-recreate"
            >
              <RotateCcw className="w-4 h-4" />
              Summarize Different Notes
            </button>
          </div>
        </div>

        {/* Dynamic Compilation rendering modal state overlay */}
        {isCompiling && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-card p-6 rounded-2xl space-y-6 text-center text-white border border-blue-500/20">
              <div className="space-y-2">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                <h3 className="font-display font-extrabold text-lg">Baking Revision Video Reel...</h3>
                <p className="text-xs text-slate-400 font-mono italic">Recording off-screen graphic canvas at 30 fps</p>
              </div>

              {/* Compiles progression chart */}
              <div className="space-y-2">
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${compileProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>Rendering Slides</span>
                  <span>{compileProgress}% Complete</span>
                </div>
              </div>

              {/* Compiles detailed statuses */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 font-mono text-[11px] text-cyan-400 leading-normal">
                {compileStatus}
              </div>

              <div className="flex items-center gap-2.5 justify-center text-[10px] text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-left leading-normal">Please keep this browser tab active and do not close it while we pack the frames and synchronize the voiceovers.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
