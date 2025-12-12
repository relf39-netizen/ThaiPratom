
import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedQuestion {
  text: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  correct: string;
  explanation?: string; // Optional now
  image?: string; 
}

const generateImageUrl = (description: string): string => {
  if (!description || description.trim().length === 0 || description.toLowerCase() === 'none') return '';
  
  // 🎨 ปรับสไตล์ภาพให้เหมาะกับเด็กประถม (การ์ตูน, เวกเตอร์, พื้นหลังขาว)
  const styleKeywords = "cute cartoon style, flat vector illustration, colorful, white background, educational, for kids, simple lines, high quality";
  const encodedPrompt = encodeURIComponent(`${description}, ${styleKeywords}`);
  
  // ใช้ Pollinations.ai (ฟรี ไม่ต้องใช้ Key)
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=800&height=600&seed=${Math.floor(Math.random() * 1000)}`;
};

// ฟังก์ชันสำหรับหน่วงเวลา (Delay)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  instructions: string,
  apiKey: string,
  count: number = 1 
): Promise<GeneratedQuestion[] | null> => {
  if (!apiKey) {
    throw new Error("กรุณาระบุ API Key");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const model = "gemini-2.5-flash";
  
  // 📝 Prompt: สั่งให้ AI สร้างโจทย์พร้อมระบุเรื่องรูปภาพสำหรับเด็กเล็ก
  const prompt = `
    Create ${count} multiple-choice question(s) for Thai Elementary students.
    Grade Level: ${grade}
    Subject: ${subject}
    Specific Instructions: ${instructions}
    
    IMPORTANT RULES FOR IMAGES:
    1. IF GRADE IS P1, P2, OR P3: You **MUST** provide an English 'image_description' for EVERY question. 
       - The image should be a visual clue, a cute illustration of the object, or the subject being asked about.
       - Example: "A cute cartoon cat smiling", "Three red apples on a table".
    2. IF GRADE IS P4-P6: Provide 'image_description' if the question requires a visual aid (e.g., Geometry, Maps, Science diagrams). Otherwise, it can be empty.
    
    Output Requirements:
    - Language: Thai (Simple, natural, polite, appropriate for ${grade} students).
    - Return a JSON Array of objects.
    - Each object must have:
      - text: Question text in Thai.
      - c1, c2, c3, c4: The 4 choices.
      - correct: The correct choice number ('1', '2', '3', or '4').
      - explanation: Simple explanation in Thai for why it is correct.
      - image_description: English description for image generation (Mandatory for P1-P3).
  `;

  // Retry Logic (สูงสุด 3 ครั้ง)
  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY, 
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The question text in Thai" },
                c1: { type: Type.STRING, description: "Choice 1" },
                c2: { type: Type.STRING, description: "Choice 2" },
                c3: { type: Type.STRING, description: "Choice 3" },
                c4: { type: Type.STRING, description: "Choice 4" },
                correct: { type: Type.STRING, description: "The correct choice number '1', '2', '3', or '4'" },
                explanation: { type: Type.STRING, description: "Simple explanation for the correct answer in Thai" },
                image_description: { type: Type.STRING, description: "Visual description in English for image generation (Important for P1-P3)" }
              },
              required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
            },
          },
        },
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        const rawArray = Array.isArray(data) ? data : [data];
        
        return rawArray.map((item: any) => ({
          text: item.text,
          c1: item.c1,
          c2: item.c2,
          c3: item.c3,
          c4: item.c4,
          correct: item.correct,
          explanation: item.explanation || '',
          // แปลงคำบรรยายภาพเป็น URL
          image: item.image_description ? generateImageUrl(item.image_description) : ''
        }));
      }

      return null;

    } catch (error: any) {
      console.warn(`AI Generation Attempt ${attempt} failed:`, error);
      lastError = error;

      const isOverloaded = 
        error?.status === 503 || 
        error?.message?.includes('overloaded') || 
        error?.message?.includes('UNAVAILABLE');

      if (isOverloaded && attempt < MAX_RETRIES) {
        console.log(`Model overloaded. Retrying in ${attempt * 2} seconds...`);
        await delay(attempt * 2000); 
        continue;
      }
      break;
    }
  }

  console.error("AI Generation Failed after retries:", lastError);
  throw new Error("AI กำลังทำงานหนัก (Server Overloaded) กรุณาลองใหม่อีกครั้งในอีกสักครู่");
};
