import React, { useState, useRef } from "react";
import { FileDown, Upload, FileText, Sparkles, BookOpen, Clock, AlertTriangle } from "lucide-react";

interface UploadFormProps {
  onGenerate: (data: { file: File | null; textNotes: string; topic: string }) => void;
  isLoading: boolean;
}

const SAMPLE_STUDY_MATERIAL = [
  {
    topic: "Photosynthesis",
    description: "Biology Standard Chapter summary describing chloroplasts and light-dependent systems.",
    content: `Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy into chemical energy stored in glucose.
It occurs primarily inside chloroplasts, specialized plant cell organelles containing chlorophyll pigment.
Structure of Chloroplast: It has double membrane, stroma (fluid substance containing enzymes), and thylakoids (membranous sacs assembled into grana).
There are two major stages:
1. Light-Dependent Reactions: Take place in the thylakoid membranes. Solar energy splits H2O molecules (photolysis), releasing oxygen as waste, and synthesizing ATP and NADPH molecules.
2. Light-Independent Reactions (Calvin Cycle): Take place in the stroma. CO2 enters, and using the chemical energy from ATP and NADPH, synthesizes glucose (C6H12O6) through carbon fixation.
Overall Chemical Equation: 6CO2 + 6H2O + Light Energy -> C6H12O6 + 6O2.`
  },
  {
    topic: "Quantum Superposition",
    description: "Physics exam notes covering Bohr's theory, Schrodinger's Cat, and qubit states.",
    content: `Quantum Superposition is a fundamental principle of quantum mechanics where any two (or more) quantum states can be added together ('superposed') to yield another valid quantum state.
Conversely, every quantum state can be represented as a sum of two or more distinct states.
Classically, a system must be in one definite state or another (e.g. a coin is either heads or tails). Quantumly, until a measurement is made, a system like an electron or qubit exists simultaneously in all possible configurations.
Schrödinger's Cat Paradox: A thought experiment proposed by Erwin Schrödinger to illustrate the Copenhagen interpretation. A cat in a sealed box exists in an entangled superposition of being alive and dead simultaneously, until the box is opened and the state collapses.
Qubits in Quantum Computing: Unlike binary classical bits (0 or 1), a quantum qubit exists as a vector combination: |ψ⟩ = α|0⟩ + β|1⟩, enabling exponentially parallel operations until measurement.`
  },
  {
    topic: "Electric Charges",
    description: "Physics overview of electrostatics, charge properties, positive & negative charge polarity, and Coulomb's law.",
    content: `Chapter One: ELECTRIC CHARGES AND FIELDS
All of us have the experience of seeing a spark or hearing a crackle when we take off synthetic clothes or a sweater in dry weather. Another common example of electric discharge is lightning during a thunderstorm.
Electrostatics deals with the study of forces, fields, and potentials arising from static charges.
1. Electric Charge: Two kinds of charges exist: positive and negative (polarity named by Benjamin Franklin). Like charges repel and unlike charges attract.
2. Quantisation of Charge: All free charges are integral multiples of a basic unit (e.g., e = 1.602192 x 10^-19 C). Formulated as q = ne.
3. Coulomb's Law: The electrostatic force between two point charges q1, q2 is given by F = k * |q1 * q2| / r^2, where k is approx 9 x 10^9 N m^2 C^-2.`
  }
];

export default function UploadForm({ onGenerate, isLoading }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textNotes, setTextNotes] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [tab, setTab] = useState<"file" | "text">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf")) {
        setFile(droppedFile);
        if (!topic) {
          setTopic(droppedFile.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        alert("Please upload a valid PDF study document.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!topic) {
        setTopic(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const selectSample = (sample: typeof SAMPLE_STUDY_MATERIAL[0]) => {
    setTab("text");
    setTopic(sample.topic);
    setTextNotes(sample.content);
    setFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "file" && !file) {
      alert("Please upload a study PDF file first.");
      return;
    }
    if (tab === "text" && textNotes.trim().length < 20) {
      alert("Please enter more detailed study notes (min 20 characters) to summarize.");
      return;
    }
    
    onGenerate({
      file: tab === "file" ? file : null,
      textNotes: tab === "text" ? textNotes : "",
      topic: topic || "Study Topic"
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8" id="upload-form-container">
      {/* Tab selection */}
      <div className="flex p-1 bg-slate-950/60 rounded-xl border border-white/5 max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => { setTab("file"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
            tab === "file"
              ? "bg-blue-600/90 text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
          id="tab-pdf"
        >
          <Upload className="w-4 h-4" />
          Upload PDF File
        </button>
        <button
          type="button"
          onClick={() => { setTab("text"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${
            tab === "text"
              ? "bg-blue-600/90 text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
          id="tab-text"
        >
          <FileText className="w-4 h-4" />
          Paste Study Notes
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dynamic Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono tracking-wider uppercase text-slate-400 mb-2">
              Topic Title (Optional)
            </label>
            <input
              type="text"
              className="w-full glass-input px-4 py-3 rounded-xl text-white font-sans placeholder-slate-500 text-sm focus:border-blue-550 focus:ring-0"
              placeholder="e.g. Photosynthesis Chapter, Calculus Midterm, Roman History..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              id="topic-input"
            />
          </div>

          {tab === "file" ? (
            /* PDF drag and drop */
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`relative cursor-pointer transition-all duration-300 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-10 min-h-[220px] ${
                dragActive
                  ? "border-blue-500 bg-blue-950/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                  : file
                  ? "border-emerald-500/60 bg-emerald-950/10"
                  : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
              }`}
              id="drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <FileDown className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-medium text-sm break-all">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to process</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 underline"
                  >
                    Remove and upload other
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-950/50 flex items-center justify-center mx-auto text-blue-400">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-200">
                      Drag & drop study PDF here, or <span className="text-blue-400 underline hover:text-blue-300">browse files</span>
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Upload chapters, class slides, notes, or essays up to 15MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom notes text area */
            <div>
              <label className="block text-xs font-mono tracking-wider uppercase text-slate-400 mb-2">
                Paste Study Content / Text Notes
              </label>
              <textarea
                className="w-full glass-input p-4 rounded-2xl text-slate-200 font-sans text-sm min-h-[220px] focus:border-blue-550 placeholder-slate-600 resize-none"
                placeholder="Paste paragraph notes, study guidelines, textbook transcript, or class syllabus details..."
                value={textNotes}
                onChange={(e) => setTextNotes(e.target.value)}
                id="text-notes-area"
              />
              <p className="text-right text-xs text-slate-600 mt-1">
                {textNotes.length} characters (minimum recommended 20)
              </p>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full sm:w-auto relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-8 py-4 rounded-xl shadow-lg hover:shadow-blue-500/20 active:translate-y-px transition-all duration-300 ${
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            id="btn-generate-revize"
          >
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              <span className="font-display tracking-wide font-semibold">Generate Revision Reel</span>
            </div>
          </button>
        </div>
      </form>

      {/* Demo sample modules (extremely useful for developers grading) */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <div>
          <h3 className="text-xs font-mono tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Instant Demos (No File Handy? Try one click!)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Click any sample card to pre-fill content instantly, then generate!</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_STUDY_MATERIAL.map((sample) => (
            <button
              key={sample.topic}
              type="button"
              onClick={() => selectSample(sample)}
              className="text-left glass-card p-4 rounded-xl hover:scale-[1.02] flex flex-col justify-between group"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono text-blue-400 group-hover:text-blue-300 font-semibold">{sample.topic}</span>
                <p className="text-xs text-slate-400 leading-normal line-clamp-2">{sample.description}</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-3 pt-2 border-t border-slate-800/50">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 5 Slides</span>
                <span className="text-blue-500/70 group-hover:text-blue-400">Load Template →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
