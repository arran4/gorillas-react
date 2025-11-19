import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Coordinate } from "../types";

// Initialize Gemini Client
// We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const calculateAiShot = async (
  myPos: Coordinate,
  targetPos: Coordinate,
  wind: number,
  gravity: number
): Promise<{ angle: number; velocity: number; taunt?: string }> => {
  
  const model = "gemini-2.5-flash";

  const prompt = `
    You are playing the artillery game "Gorillas".
    
    Your position: X=${myPos.x}, Y=${myPos.y}.
    Target position: X=${targetPos.x}, Y=${targetPos.y}.
    Wind: ${wind} (Positive is right, Negative is left).
    Gravity: ${gravity}.
    
    Calculate the optimal firing Angle (0 to 90 degrees) and Velocity (10 to 150) to hit the target.
    Also provide a short, funny, 8-bit style taunt (max 10 words).

    The physics model is:
    x(t) = x0 + v * cos(angle) * t + 0.5 * wind * t^2
    y(t) = y0 - (v * sin(angle) * t - 0.5 * gravity * t^2)
    (Note: Y is inverted in canvas, 0 is top).
    
    Return the result in JSON format.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      angle: { type: Type.NUMBER, description: "Firing angle in degrees" },
      velocity: { type: Type.NUMBER, description: "Firing velocity/power" },
      taunt: { type: Type.STRING, description: "A short taunt message" },
    },
    required: ["angle", "velocity"],
  };

  try {
    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7, // A little creativity for the taunt, but mostly math
      },
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text);
    return {
        angle: data.angle,
        velocity: data.velocity,
        taunt: data.taunt
    };

  } catch (error) {
    console.error("Gemini AI calculation failed:", error);
    // Fallback "dumb" shot if AI fails
    return { angle: 45, velocity: 60, taunt: "..." };
  }
};
