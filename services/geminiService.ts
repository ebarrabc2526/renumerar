
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const refineScript = async (baseScript: string, userFeedback: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
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

  return JSON.parse(response.text);
};
