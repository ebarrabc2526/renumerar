
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const refineScript = async (baseScript: string, userFeedback: string) => {
  // Use gemini-3-pro-preview for complex coding and script refinement tasks as per guidelines
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `El usuario tiene este script de consola para Trello:
    \`\`\`javascript
    ${baseScript}
    \`\`\`
    
    Y quiere hacer la siguiente modificación o mejora: "${userFeedback}".
    
    Por favor, genera una versión mejorada del script. Devuelve la respuesta en formato JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          improvedScript: { type: Type.STRING, description: "El código JavaScript mejorado" },
          explanation: { type: Type.STRING, description: "Breve explicación de los cambios realizados" }
        },
        required: ["improvedScript", "explanation"]
      }
    }
  });

  // Safe access to .text property and trimming as recommended for JSON responses
  const jsonStr = response.text?.trim() || "{}";
  return JSON.parse(jsonStr);
};
