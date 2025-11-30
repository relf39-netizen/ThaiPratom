
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
  const encodedPrompt = encodeURIComponent(description + " cartoon style, for kids, educational, white background, simple, clear, high quality");
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
};

export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  instructions: string,
  apiKey: string,
  count: number = 1 
): Promise<GeneratedQuestion[] | null> => {
  try {
    if (!apiKey) {
      throw new Error("กรุณาระบุ API Key");
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = "gemini-2.5-flash";
    
    // Updated Prompt: Uses instructions specifically for guidance
    const prompt = `
      Create ${count} multiple-choice question(s) for Thai Elementary students.
      Grade Level: ${grade} (Please strictly adjust the difficulty for this grade level).
      Subject: Thai Language (${subject})
      Specific Instructions: ${instructions}
      
      Requirements:
      - Language: Thai (Simple, natural, appropriate for ${grade} students).
      - Return an array of objects.
      - Each object must have 4 choices (c1, c2, c3, c4).
      - Indicate the correct choice number (1, 2, 3, or 4).
      - If the question is about a visual object (e.g., animal names, objects matching spelling), provide a concise English description in the 'image_description' field.
      - **Provide a simple explanation for the correct answer in Thai (field: explanation).**
    `;

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
              image_description: { type: Type.STRING, description: "Visual description in English for image generation (or 'none')" }
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
        image: item.image_description ? generateImageUrl(item.image_description) : ''
      }));
    }
    
    return null;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
