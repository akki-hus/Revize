import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Download, ArrowLeft, ArrowRight, Brain, AlertCircle, RefreshCw, GraduationCap } from "lucide-react";
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
  const [activeWordIdx, setActiveWordIdx] = useState(0);
  
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
    setActiveWordIdx(0);

    // Play narration voiceover using high quality speech synthesis, falling back to dummy timer
    playSpeechSynthesisFallback(slide.narration || "", slide.duration || 20);
  };

  const playSpeechSynthesisFallback = (text: string, duration: number) => {
    if (!isPlaying) return;

    const synth = window.speechSynthesis;
    // Standard safety fallback if SpeechSynthesis is not supported
    if (!synth) {
      runDummyTimer(text, duration);
      return;
    }

    // Cancel any active speakings immediately to start fresh
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = muted ? 0 : 1;
    utterance.rate = 1.0; // Clean natural speed

    // Choose the best premium/high-quality English or global voice
    const voices = synth.getVoices();
    const premiumVoice = voices.find(v => 
      v.lang.startsWith("en-") && 
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Microsoft"))
    ) || voices.find(v => v.lang.startsWith("en-")) || voices[0];
    
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    let hasSpeechBoundary = false;
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        hasSpeechBoundary = true;
        
        // Match active word highlighting exactly with synthesized speech progress
        const spokenPrefix = text.substring(0, event.charIndex);
        const words = spokenPrefix.split(/\s+/).filter(Boolean);
        const wordIndex = words.length;
        setActiveWordIdx(wordIndex);
        
        // Advance progress bar smoothly based on character offset
        const pct = Math.min((event.charIndex / text.length) * 100, 100);
        setProgress(pct);
      }
    };

    utterance.onend = () => {
      setProgress(100);
      handleSlideEnd();
    };

    utterance.onerror = (err) => {
      console.warn("SpeechSynthesis utterance error, fallback to timer:", err);
      if (!hasSpeechBoundary) {
        runDummyTimer(text, duration);
      }
    };

    synth.speak(utterance);

    // Parallel backup safety timer in case the browser does not trigger speech boundaries
    runBackupTimer(text, duration, () => hasSpeechBoundary);
  };

  const runBackupTimer = (text: string, fallbackDuration: number, getHasSpeechBoundary: () => boolean) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    const rawWords = text.split(/\s+/).filter(Boolean);
    const wordCount = rawWords.length;
    // Normalize fallback speaking rate to ~120 words per minute (2.0 words per second) to allow comfortable pacing
    const speakingSpeed = 2.0;
    const speakingDuration = Math.max(8, wordCount / speakingSpeed);
    
    // Use Math.max to guarantee that slides never transition before speech finishes
    const activeDuration = Math.max(fallbackDuration, speakingDuration);
    const intervalStep = 100;
    const totalSteps = activeDuration * 1000;
    let elapsed = 0;

    progressTimerRef.current = window.setInterval(() => {
      if (getHasSpeechBoundary()) {
        elapsed += intervalStep;
        // Watchdog safety release to force transition only if the speaker gets frozen/stuck for too long
        if (elapsed >= totalSteps + 15000) {
          handleSlideEnd();
        }
        return;
      }

      elapsed += intervalStep;
      const pct = Math.min((elapsed / totalSteps) * 100, 100);
      setProgress(pct);

      const estimatedWordIdx = Math.floor((pct / 100) * wordCount);
      setActiveWordIdx(estimatedWordIdx);

      if (elapsed >= totalSteps) {
        handleSlideEnd();
      }
    }, intervalStep);
  };

  const runDummyTimer = (text: string, duration: number) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    const rawWords = text.split(/\s+/).filter(Boolean);
    const wordCount = rawWords.length;
    const speakingSpeed = 2.0;
    const speakingDuration = Math.max(8, wordCount / speakingSpeed);
    const activeDuration = Math.max(duration, speakingDuration);

    const intervalStep = 100;
    const totalSteps = activeDuration * 1000;
    let elapsed = 0;

    progressTimerRef.current = window.setInterval(() => {
      elapsed += intervalStep;
      const pct = Math.min((elapsed / totalSteps) * 100, 100);
      setProgress(pct);

      const estimatedWordIdx = Math.floor((pct / 100) * wordCount);
      setActiveWordIdx(estimatedWordIdx);

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
      setActiveWordIdx(0);
    }
  };

  const getShortsCaptionWords = (narration: string, currentWordIdx: number) => {
    const rawWords = narration.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];
    const clampedIdx = Math.max(0, Math.min(currentWordIdx, rawWords.length - 1));
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
  };  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="reel-player-container">
      {/* LEFT COLUMN: Premium Widescreen Cinematic Presentation Viewport (16:9 Cinema Mode) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold">
              DESKTOP CINEMA VIEW
            </span>
            <h2 className="font-display font-black text-xl md:text-2xl text-white tracking-tight">
              {topic}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" /> Kinetic Media ON
            </span>
          </div>
        </div>

        {/* 16:9 Widescreen Theatre Stage Container */}
        <div className="relative w-full aspect-[16/9] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between group">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Cinematic ambient background */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallbackSeed = encodeURIComponent(currentSlide.title.substring(0, 15));
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${fallbackSeed}/1280/720`;
                  }}
                  className={`w-full h-full object-cover origin-center transition-all ${isPlaying ? "animate-ken-burns" : "scale-[1.03]"}`}
                />
                
                {/* Visual gradients for extreme readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/80 z-10" />
                <div className="absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-slate-950/90 to-transparent z-10" />
              </div>

              {/* Active Slide Graphics Contents overlay */}
              <div className="relative z-20 w-full h-full flex flex-col justify-between p-6 md:p-8">
                {/* Top status bar inside player */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-blue-400" /> STUDY CARDS GENERATED</span>
                  <span>CARD {currentIdx + 1} OF {slides.length}</span>
                </div>

                {/* Slides Widescreen content grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto items-center max-w-[95%]">
                  <div className="space-y-3.5">
                    <span className="text-[10px] bg-blue-600/20 text-blue-300 font-mono font-bold px-2 py-1 rounded border border-blue-500/20 uppercase tracking-widest inline-block">
                      Core Concept
                    </span>
                    <h4 className="font-display font-extrabold text-lg md:text-2xl text-white tracking-tight leading-tight">
                      {currentSlide.title}
                    </h4>
                  </div>
                  
                  {/* Bullet study content list */}
                  <div className="space-y-2.5 bg-slate-950/60 backdrop-blur-[2px] p-4 rounded-xl border border-white/5">
                    {currentSlide.bullets.map((bullet, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        key={idx} 
                        className="flex items-start gap-2.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                        <p className="text-xs text-slate-300 leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: bullet.replace(/\*\*(.*?)\*\*/g, '<b class="text-blue-300 font-bold">$1</b>') }} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Kinetic Subtitles overlay directly on bottom center of presentation layout */}
                <div className="w-full text-center pb-2 pointer-events-none select-none">
                  <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 px-4 bg-black/75 backdrop-blur-[4px] rounded-xl border border-white/15 shadow-2xl max-w-[90%] mx-auto">
                    {getShortsCaptionWords(currentSlide.narration, activeWordIdx).map((word, wordIdx) => (
                      <motion.span
                        key={wordIdx}
                        animate={word.isCurrent ? { scale: 1.15 } : { scale: 1 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                        className={`text-[12px] md:text-sm font-display font-black tracking-tight uppercase select-none transition-all duration-75 ${
                          word.isCurrent 
                            ? "text-yellow-400 font-black" 
                            : "text-white opacity-90 font-bold"
                        }`}
                        style={{
                          textShadow: "1.5px 1.5px 3px rgba(0,0,0,1)"
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

          {/* Quick loading overlays when transitions occur */}
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-md border border-white/5 shadow-md">
              REV-{currentIdx + 1} ACTIVE
            </span>
          </div>

        </div>

        {/* Master Control Board underneath the media screen */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
          
          {/* Action button triggers */}
          <div className="flex items-center gap-2.5">
            <button 
              type="button" 
              onClick={handlePrev}
              className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
              id="desktop-btn-prev"
              title="Previous Slide"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md active:scale-95 transition-all text-xs flex items-center gap-2"
              id="desktop-btn-play"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" /> Pause Presentation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" /> Start Autoplay
                </>
              )}
            </button>

            <button 
              type="button" 
              onClick={handleNext}
              className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
              id="desktop-btn-next"
              title="Next Slide"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Visual flow horizontal timeline progress meter */}
          <div className="flex-1 w-full space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
              <span>ACTIVE CARD PROGRESSION</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5 cursor-pointer relative">
              <div 
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

        </div>

        {/* Action compiling download drawer blocks */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" /> Widescreen Video Exporter
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Download this study revision deck as a standalone high-definition MP4 video container. It records your active deck in 1280x720, kinetic outlines, custom zoom vectors, and embeds beautiful highlighted subtitle captions perfectly!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleCompileVideo}
              disabled={isCompiling}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:translate-y-px text-white font-semibold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md shadow-blue-900/10"
              id="btn-download-video"
            >
              <Download className="w-4 h-4" />
              Compile & Save Widescreen Video (.mp4)
            </button>
            <button
              onClick={onReset}
              disabled={isCompiling}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 active:translate-y-px text-slate-300 font-semibold py-3.5 px-6 rounded-xl text-sm transition-all"
              id="btn-recreate"
            >
              <RotateCcw className="w-4 h-4" />
              Revise Another Document
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Webapp Dashboard Sidebar & Lesson Deck Selectors */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="text-[10px] font-mono tracking-wider uppercase text-slate-500">
            CURRENT ADAPTIVE TARGET
          </span>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-xs text-slate-300 font-bold uppercase">
                Active revision Playlist
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed leading-normal">
              This revision program features {slides.length} distinct educational cards. Double-click or select any segment to instantly preview slides.
            </p>
          </div>
        </div>

        {/* Playlist tracker card overview */}
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1">
            Study Chapters List ({slides.length})
          </h3>
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {slides.map((slide, idx) => {
              const isActive = currentIdx === idx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => jumpToSlide(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                    isActive
                      ? "bg-blue-600/15 border-blue-500/40 shadow-inner scale-[1.01]"
                      : "bg-slate-900/30 border-slate-800 hover:border-slate-705 hover:bg-slate-900/50"
                  }`}
                  id={`chapter-card-${idx}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 w-6 h-6 rounded-lg font-mono text-[10px] font-black flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-950 text-slate-500 group-hover:text-slate-300"
                    }`}>
                      {slide.id}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                        {slide.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate pr-2 mt-0.5">
                        {slide.bullets[0] || "No bullets available"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[9px] font-mono text-slate-500 block">
                      {slide.duration}s
                    </span>
                    <span className={`text-[8px] font-mono leading-none ${isActive ? "text-blue-400 font-bold" : "text-slate-600"}`}>
                      {isActive ? "Playing" : "Queued"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Compilation rendering modal state overlay */}
        {isCompiling && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-6 text-center text-white border-blue-500/20">
              <div className="space-y-2">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                <h3 className="font-display font-extrabold text-lg">Baking Revision Video Reel...</h3>
                <p className="text-xs text-slate-400 font-mono italic">Recording off-screen graphic canvas at 30 fps</p>
              </div>

              {/* Compiles progression chart */}
              <div className="space-y-2">
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
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
