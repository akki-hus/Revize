import React, { useState } from "react";
import { GraduationCap, ArrowRight, User, Mail, Lock, Sparkles, Check, Globe, HelpCircle } from "lucide-react";
import { UserProfile } from "../types";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"welcome" | "auth" | "academics">("welcome");
  const [mode, setMode] = useState<"login" | "signup" | "guest">("signup");
  
  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [standard, setStandard] = useState("10"); // Default 10th
  const [board, setBoard] = useState("CBSE"); // Default CBSE
  const [errorMsg, setErrorMsg] = useState("");

  const BOARDS = [
    { id: "CBSE", name: "CBSE", label: "Central Board of Secondary Education", region: "National (India)" },
    { id: "ICSE", name: "ICSE / ISC", label: "Council for Indian School Certificate Examinations", region: "National (India)" },
    { id: "State Board", name: "State Board", label: "State-specific Official Curriculum syllabus", region: "Regional" },
    { id: "IB", name: "IB Board", label: "International Baccalaureate Organisation", region: "International" },
    { id: "IGCSE", name: "IGCSE / CIE", label: "Cambridge Assessment International Education", region: "International" },
    { id: "Other", name: "Other Syllabus", label: "Custom or alternative academic system", region: "Other" }
  ];

  const STANDARDS = Array.from({ length: 12 }, (_, i) => String(i + 1));

  const handleNextFromWelcome = () => {
    setStep("auth");
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Simple client-side validation
    if (mode === "signup") {
      if (!name.trim()) {
        setErrorMsg("Please enter your name");
        return;
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setErrorMsg("Please enter a valid email address");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters");
        return;
      }
    } else if (mode === "login") {
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setErrorMsg("Please enter your registered email");
        return;
      }
      if (!password) {
        setErrorMsg("Please enter your account password");
        return;
      }
    }
    
    // Go to Academic selection
    setStep("academics");
  };

  const handleGuestContinue = () => {
    setMode("guest");
    setName("Guest Student");
    setEmail("guest@revize.ai");
    setStep("academics");
  };

  const handleFinishOnboarding = () => {
    // Construct final UserProfile structure
    const profile: UserProfile = {
      name: mode === "guest" ? "Guest Student" : name,
      email: mode === "guest" ? "guest@revize.ai" : email,
      standard,
      board,
      onboarded: true,
      isGuest: mode === "guest",
      savedReelsCount: 0
    };
    
    // Trigger callbacks & save
    onComplete(profile);
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[580px] bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-md flex flex-col justify-between relative overflow-hidden" id="onboarding-flow-container">
      
      {/* Decorative vector background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top branding indicator */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-display font-black tracking-wider text-base text-white">REVIZE ADAPTIVE</span>
        </div>
        <div className="flex gap-1.5">
          <div className={`w-8 h-1 rounded-full ${step === "welcome" ? "bg-blue-500" : "bg-slate-800"}`} />
          <div className={`w-8 h-1 rounded-full ${step === "auth" ? "bg-blue-500" : "bg-slate-800"}`} />
          <div className={`w-8 h-1 rounded-full ${step === "academics" ? "bg-blue-500" : "bg-slate-800"}`} />
        </div>
      </div>

      {/* Step 1: Immersive Welcome Presentation */}
      {step === "welcome" && (
        <div className="my-auto space-y-8 py-4 text-center max-w-2xl mx-auto relative z-10" id="step-welcome">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold">
            <Sparkles className="w-3 h-3 text-yellow-300" /> NEW DESKTOP WEB EXPERIENCE
          </div>
          
          <div className="space-y-3">
            <h1 className="font-display font-black text-3xl md:text-5xl text-white tracking-tight leading-tight">
              Say goodbye to boring textbooks. Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">Cinematic Revision.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              We convert standard educational chapters, handouts, essays, and notes into interactive visual slides synchronized with kinetic subtitles built for active recall and modern learners. 
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-cyan-400 font-bold block">01   ENTER NOTE CONTENT</span>
              <p className="text-[11px] text-slate-400 leading-normal">Upload complex textbook chapters or copy bullet guides directly.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-yellow-400 font-bold block">02   CINEMA WEB VIEW</span>
              <p className="text-[11px] text-slate-400 leading-normal">Full wide-screen immersive auto-scrolling with smart active recall slides.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 space-y-1">
              <span className="text-xs font-mono text-pink-400 font-bold block">03   SHORTS STYLE OVERLAYS</span>
              <p className="text-[11px] text-slate-400 leading-normal">Text outline animations baked directly onto widescreen educational renders.</p>
            </div>
          </div>

          <div className="pt-6">
            <button
              onClick={handleNextFromWelcome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 active:translate-y-px"
              id="onboarding-welcome-next"
            >
              Configure Student Workspace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Adaptive Credentials Gateway */}
      {step === "auth" && (
        <div className="my-auto py-4 space-y-6 relative z-10" id="step-auth">
          <div className="text-center space-y-1.5">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white">Choose how you wish to access</h2>
            <p className="text-slate-400 text-xs">Create a quick study account to track statistics, or evaluate instantly in guest mode.</p>
          </div>

          <div className="max-w-md mx-auto bg-slate-950/60 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
            {/* Quick Login / Signup Toggle Tabs */}
            <div className="flex p-1 bg-slate-900 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrorMsg(""); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === "signup" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
                id="tab-signup"
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setMode("login"); setErrorMsg(""); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === "login" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
                id="tab-login"
              >
                Log In
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:border-blue-500 text-sm text-white focus:outline-none"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      id="input-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:border-blue-500 text-sm text-white focus:outline-none"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    id="input-email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl focus:border-blue-500 text-sm text-white focus:outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    id="input-password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all hover:shadow-lg active:translate-y-px"
                >
                  {mode === "signup" ? "Create Account & Continue" : "Sign In & Continue"}
                </button>
              </div>
            </form>

            <div className="relative flex items-center justify-center my-3">
              <div className="absolute inset-0 border-t border-white/5" />
              <span className="relative z-10 px-3 text-[10px] font-mono text-slate-500 bg-[#0c1020] uppercase">Or</span>
            </div>

            <button
              type="button"
              onClick={handleGuestContinue}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold text-sm rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-center"
              id="btn-guest-onboarding"
            >
              Evaluate instantly as Guest Student
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Grade Standard and Board Syllabus Survey Questionnaire */}
      {step === "academics" && (
        <div className="my-auto py-2 space-y-6 relative z-10" id="step-academics">
          <div className="text-center space-y-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white">Personalise Educational Focus</h2>
            <p className="text-slate-400 text-xs">Let the neural generator tailor presentation vocabulary, grade difficulty, and curriculum style to your specific system.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2 items-start">
            {/* Standard Options (1st to 12th) */}
            <div className="lg:col-span-5 space-y-3">
              <label className="text-xs font-mono font-bold tracking-wider uppercase text-blue-400 block">
                1) CURRICULUM GRADE / STANDARD
              </label>
              
              <div className="grid grid-cols-4 gap-2">
                {STANDARDS.map((stdNum) => {
                  const isSelected = standard === stdNum;
                  return (
                    <button
                      type="button"
                      key={stdNum}
                      onClick={() => setStandard(stdNum)}
                      className={`h-11 rounded-xl font-mono text-sm font-bold flex flex-col items-center justify-center transition-all ${
                        isSelected 
                          ? "bg-blue-600 text-white scale-[1.05] shadow-lg shadow-blue-900/40 border border-blue-400" 
                          : "bg-slate-950/60 border border-white/5 hover:border-slate-700 text-slate-300 hover:text-white"
                      }`}
                      id={`std-btn-${stdNum}`}
                    >
                      <span className="text-xs font-black">{stdNum}th</span>
                      <span className="text-[7px] text-slate-400 font-sans font-medium uppercase truncate block">
                        {parseInt(stdNum) <= 5 ? "Primary" : parseInt(stdNum) <= 8 ? "Middle" : parseInt(stdNum) <= 10 ? "Secondary" : "Senior"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 bg-blue-950/20 rounded-xl border border-blue-800/20 text-[11px] text-slate-400 leading-relaxed font-sans mt-3">
                <span className="text-blue-400 font-bold">Standard {standard}</span> adapts the Gemini cognitive models to formulate appropriate bullet points, simplified keywords, educational depth, and interactive study cards.
              </div>
            </div>

            {/* Board Selector */}
            <div className="lg:col-span-7 space-y-3">
              <label className="text-xs font-mono font-bold tracking-wider uppercase text-yellow-500 block">
                2) ACCREDITED SCHOOL / BOARD SYLLABUS
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BOARDS.map((opt) => {
                  const isSelected = board === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setBoard(opt.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                        isSelected
                          ? "bg-yellow-500/10 border-yellow-500/40 shadow-inner scale-[1.02]"
                          : "bg-slate-950/50 border-white/5 hover:border-slate-800 hover:bg-slate-950/80"
                      }`}
                      id={`board-btn-${opt.id}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${isSelected ? "text-yellow-400" : "text-white"}`}>
                          {opt.name}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-slate-950">
                            <Check className="w-2.5 h-2.5 stroke-[4]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 lines-clamp-1">{opt.label}</p>
                      <span className="text-[8px] font-mono text-slate-500 mt-2 block uppercase">{opt.region}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 text-center sm:text-right">
            <button
              onClick={handleFinishOnboarding}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm transition-all duration-300 shadow-lg shadow-yellow-950/20 active:translate-y-px"
              id="onboarding-finish"
            >
              Enter Revize Workspace <ArrowRight className="w-4.5 h-4.5 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* Footer support labels */}
      <div className="relative z-10 pt-4 mt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[10px] text-slate-500 font-mono">
        <div>Registered with Secure Sandbox session keys</div>
        <div className="flex gap-3">
          <span>Board Syllabuses compliant</span>
          <span>•</span>
          <span>Full widescreen responsive standard</span>
        </div>
      </div>
    </div>
  );
}
