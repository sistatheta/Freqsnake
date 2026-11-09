import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

export const getGameOverCommentary = async (score: number): Promise<string> => {
  if (!API_KEY) {
    return "Great rhythm! Add an API Key to hear the AI music critic.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `I just finished playing 'Freq Snake', a musical snake game. I scored ${score} points. 
      The grid size is small. A score of 0-5 is 'tone deaf'. 10-20 is 'catching the beat'. 30+ is 'virtuoso'.
      Give me a very short, witty, music-themed sarcastic or encouraging one-sentence remark about my performance. 
      Address me as 'DJ' or 'Maestro'.`,
      config: {
        maxOutputTokens: 50,
        temperature: 1.2, // High creativity
      }
    });

    return response.text || "Music Stopped!";
  } catch (error) {
    console.error("AI Error:", error);
    return "Music Stopped! (AI critic is offline)";
  }
};