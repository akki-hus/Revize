import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";

async function parsePdfText(buffer: Buffer): Promise<string> {
  try {
    console.log("Using PDFParse class from modern pdf-parse package");
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParse({ data: uint8Array });
    const result = await parser.getText();
    return result.text || "";
  } catch (error: any) {
    console.error("PDF Parsing error inside helper:", error);
    throw error;
  }
}

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large limits for body parser to allow base64 transcripts/elements
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// Lazy initialize Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please add your Gemini API key in the AI Studio Settings > Secrets panel.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Healthy route
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Helper: Try to extract structured JSON slides from text notes
async function generateRevisionSlides(textNotes: string, topicName: string = ""): Promise<{ topic: string; slides: any[] }> {
  const ai = getAI();
  const systemPrompt = `You are an expert masterclass educator who transforms complex topics, PDFs, or textbook notes into highly immersive, extremely engaging, and deep study revision reels.
You must plan an extensive visual study slideshow of between 7 and 10 slides to make the revision video long, comprehensive, and high-value. Every slide must contain top-tier synthesized revision content.`;

  const inputPrompt = `Topic Hint: ${topicName}
Study Notes content:
${textNotes.slice(0, 20000)} // safely sliced to fit prompt`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: inputPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description: "Summarized beautiful, highly attractive main topic name."
          },
          slides: {
            type: Type.ARRAY,
            description: "List of exactly 7 to 10 study revision slides summarizing key concepts.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Clear, highly attractive slide title for this card."
                },
                bullets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING
                  },
                  description: "2 to 3 high-yield summary bullet points highlighting important terms with markdown **bold** tags."
                },
                narration: {
                  type: Type.STRING,
                  description: "Deep, lively, energetic audio narration script (approx 45-65 words, 4-6 sentences) explaining the concept comprehensively, contextualizing the bullets in detail."
                },
                image_prompt: {
                  type: Type.STRING,
                  description: "A highly specific, topic-relevant visual image prompt describing the concrete educational concept or metaphor of this slide. Must directly correspond to the actual subject matter of the uploaded PDF (e.g., if biology, describe exact organs/cells; if physics, describe physics phenomena like prisms; if history, describe appropriate historical settings/figures). Do not use broad words like infographic, chart, diagram, text, labels, numbers, words, letters. Describe a high-texture, professional, immersive, and educational visual scene."
                },
                duration: {
                  type: Type.INTEGER,
                  description: "Slide duration in seconds (must be 15 or 20)."
                }
              },
              required: ["title", "bullets", "narration", "image_prompt", "duration"]
            }
          }
        },
        required: ["topic", "slides"]
      },
      temperature: 0.7,
    },
  });

  const rawText = response.text || "";
  try {
    return JSON.parse(rawText.trim());
  } catch (err) {
    console.error("Failed to parse Gemini JSON directly, attempting search-and-extract:", rawText);
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Gemini did not return valid JSON for slides. Please try again.");
  }
}

// Generate single educational image using Pollinations AI
async function generateSlideImage(prompt: any): Promise<string> {
  // Return the direct CDN URL of Pollinations AI for the client-side browser to fetch.
  // This bypasses server-to-server rate lines and shared cloud IP blocks completely.
  const safePrompt = typeof prompt === "string" ? prompt : "educational study layout abstract concept";
  const cleanPrompt = safePrompt.replace(/[^\w\s,\-\.]/g, "") + ", cinematic CGI concept art, atmospheric professional visual lighting, stunning photography, masterclass studio design style, highly detailed 3D render, 16:9 aspect ratio, strictly no text, no letters, no labels, no words, no user interfaces";
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/p/${encodeURIComponent(cleanPrompt)}?width=1280&height=720&nologo=true&seed=${seed}`;
}

// Generate TTS voice narration using Edge-TTS
async function generateTTS(narrationText: string, slideIndex: number): Promise<string> {
  // Return empty string to trigger browser-native window.speechSynthesis fallback.
  // This stops unhandled WebSocket socket errors and Connect Errors in restrictive container networks.
  return "";
}

// End-to-end generator endpoint (Accepts uploaded PDF)
app.post("/api/generate", upload.single("pdfFile"), async (req, res) => {
  try {
    let textContent = req.body.textNotes || "";
    const topicHint = req.body.topic || "";

    // If PDF file was uploaded, extract text
    if (req.file) {
       console.log(`Processing uploaded PDF file: ${req.file.originalname} (${req.file.size} bytes)`);
       const extractedText = await parsePdfText(req.file.buffer);
       if (extractedText && extractedText.trim().length > 10) {
         textContent = extractedText;
       } else {
         throw new Error("Uploaded PDF contains no extractable text or is formatted as images only.");
       }
    }

    if (!textContent || textContent.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Please provide either a PDF upload or some valid study notes text."
      });
    }

    console.log(`Analyzing notes (~${textContent.length} chars)...`);
    const slidePlan = await generateRevisionSlides(textContent, topicHint);
    
    // Validate we got slides
    if (!slidePlan.slides || !Array.isArray(slidePlan.slides) || slidePlan.slides.length === 0) {
      throw new Error("Could not extract a clean slide plan from notes content.");
    }

    // Limit to max 10 slides
    const activeSlides = slidePlan.slides.slice(0, 10);
    console.log(`Generated plan with ${activeSlides.length} slides for topic: "${slidePlan.topic}"`);

    // Process slide assets (Images and Audios) in parallel
    const refinedSlides = await Promise.all(
      activeSlides.map(async (slide, idx) => {
        console.log(`Generating assets for Slide ${idx + 1}: ${slide.title}`);
        
        // Parallel generate image and narration audio
        const [imageUrl, audioUrl] = await Promise.all([
          generateSlideImage(slide.image_prompt || slide.imagePrompt || slide.title),
          generateTTS(slide.narration, idx)
        ]);

        return {
          id: idx + 1,
          title: slide.title || `Concept ${idx + 1}`,
          bullets: slide.bullets || [],
          narration: slide.narration || "",
          imagePrompt: slide.image_prompt || slide.imagePrompt || "",
          imageUrl,
          audioUrl,
          duration: slide.duration || 20
        };
      })
    );

    return res.json({
      success: true,
      topic: slidePlan.topic || topicHint || "Study Revision Review",
      slides: refinedSlides
    });

  } catch (error: any) {
    console.error("Generation pipeline failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during the revision reel generation process."
    });
  }
});

// Global Express & Multer error-handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error Handler caught:", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "Uploaded file is too large! Maximum limit is 15MB."
      });
    }
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`
    });
  }
  return res.status(500).json({
    success: false,
    error: err.message || "Internal server error occurred."
  });
});

// Serve frontend and handle bundler environments
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Revize full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
