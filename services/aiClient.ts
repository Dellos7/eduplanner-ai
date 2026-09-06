import { GoogleGenAI } from "@google/genai";

/**
 * Resuelve la clave de API: primero la que el usuario haya guardado en el navegador
 * y, si no existe, la inyectada en tiempo de compilación.
 */
export const getApiKey = (): string | null => {
  let manualKey: string | null = null;
  try {
    manualKey = localStorage.getItem('GEMINI_API_KEY');
  } catch (e) {
    manualKey = null;
  }
  return manualKey || process.env.API_KEY || null;
};

/**
 * Crea el cliente de Gemini. Acepta una clave concreta para poder validar
 * una clave todavía no guardada (por ejemplo, desde el modal de configuración).
 */
export const getAiClient = (apiKeyOverride?: string) => {
  const apiKey = apiKeyOverride?.trim() || getApiKey();

  if (!apiKey) {
    throw new Error("No se ha configurado ninguna API KEY. Por favor, configúrala en el icono de ajustes.");
  }

  return new GoogleGenAI({ apiKey });
};
