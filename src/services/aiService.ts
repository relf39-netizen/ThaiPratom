
import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedQuestion {
  text: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  correct: string;
  explanation: string;
}

export const generateQuestionWithAI = async (
  subject: string,
  grade: string,
  topic: string,
  apiKey: string // ✅ รับ API Key จากผู้ใช้งาน
): Promise<GeneratedQuestion | null> => {
  try {
    if (!apiKey) {
      throw new Error("กรุณาระบุ API Key");
    }

    // ✅ Initialize Client with user provided key
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = "gemini-2.5-flash";
    
    const prompt = `
      Create a multiple-choice question for ${grade} grade students.
      Subject: ${subject}
      Topic: ${topic}
      Language: Thai (Make sure the question and choices are natural Thai).
      
      Requirements:
      - 4 choices (c1, c2, c3, c4).
      - Indicate the correct choice number (1, 2, 3, or 4).
      - Provide a short explanation for the correct answer.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question text" },
            c1: { type: Type.STRING, description: "Choice 1" },
            c2: { type: Type.STRING, description: "Choice 2" },
            c3: { type: Type.STRING, description: "Choice 3" },
            c4: { type: Type.STRING, description: "Choice 4" },
            correct: { type: Type.STRING, description: "The correct choice number '1', '2', '3', or '4'" },
            explanation: { type: Type.STRING, description: "Explanation of the answer" },
          },
          required: ["text", "c1", "c2", "c3", "c4", "correct", "explanation"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data as GeneratedQuestion;
    }
    
    return null;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
