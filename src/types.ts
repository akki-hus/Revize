export interface Slide {
  id: number;
  title: string;
  bullets: string[];
  narration: string;
  imagePrompt: string;
  imageUrl: string; // base64 or CDN URL
  audioUrl: string; // base64 data url
  duration: number; // estimated duration in seconds
}

export interface GenerationResponse {
  success: boolean;
  topic: string;
  slides: Slide[];
  error?: string;
}
