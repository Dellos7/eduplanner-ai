import { getAiClient } from "./aiClient";

export interface GeminiModelOption {
  id: string;
  label: string;
  hint?: string;
}

export const MODEL_STORAGE_KEY = 'GEMINI_MODEL';

/** Modelo por defecto (el que la aplicación usaba antes de existir el selector). */
export const DEFAULT_MODEL = 'gemini-3.1-pro-preview';

/**
 * Lista sugerida. No es exhaustiva ni permanente: Google añade y retira modelos
 * con frecuencia, por eso el modal permite detectar los disponibles para la clave
 * del usuario y también escribir un identificador a mano.
 */
export const CURATED_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (preview)',
    hint: 'Máxima calidad de redacción. Suele no estar incluido en el nivel gratuito.'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    hint: 'Alta calidad y cuota gratuita más amplia. Buena opción para documentos largos.'
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    hint: 'Rápido y económico. Recomendado si agotas la cuota de los modelos Pro.'
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    hint: 'El más ligero y barato. Menor detalle en documentos extensos.'
  },
  {
    id: 'gemini-pro-latest',
    label: 'Gemini Pro (última versión)',
    hint: 'Alias que apunta siempre al Pro más reciente disponible.'
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (última versión)',
    hint: 'Alias que apunta siempre al Flash más reciente disponible.'
  }
];

export const getSelectedModel = (): string => {
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    return stored && stored.trim() ? stored.trim() : DEFAULT_MODEL;
  } catch (e) {
    return DEFAULT_MODEL;
  }
};

export const setSelectedModel = (modelId: string): void => {
  try {
    if (modelId && modelId.trim() && modelId.trim() !== DEFAULT_MODEL) {
      localStorage.setItem(MODEL_STORAGE_KEY, modelId.trim());
    } else {
      localStorage.removeItem(MODEL_STORAGE_KEY);
    }
  } catch (e) {
    console.error('No se ha podido guardar el modelo seleccionado', e);
  }
};

export const getModelLabel = (modelId: string): string => {
  const found = CURATED_MODELS.find(m => m.id === modelId);
  return found ? found.label : modelId;
};

/** Modelos que no sirven para generar documentos (embeddings, imagen, audio, vídeo...). */
const EXCLUDED_PATTERNS = ['embedding', 'aqa', 'imagen', 'veo', 'tts', 'audio', 'image', 'vision-live'];

/**
 * Pregunta a la API qué modelos tiene disponibles la clave del usuario.
 * Devuelve solo los que sirven para generar contenido de texto.
 */
export const fetchAvailableModels = async (apiKeyOverride?: string): Promise<GeminiModelOption[]> => {
  const ai = getAiClient(apiKeyOverride);
  const collected: GeminiModelOption[] = [];

  const pager: any = await (ai.models as any).list();
  const items: any[] = [];

  if (pager && typeof pager[Symbol.asyncIterator] === 'function') {
    for await (const model of pager) {
      items.push(model);
    }
  } else if (Array.isArray(pager)) {
    items.push(...pager);
  } else if (pager && Array.isArray(pager.models)) {
    items.push(...pager.models);
  } else if (pager && Array.isArray(pager.page)) {
    items.push(...pager.page);
  }

  for (const model of items) {
    const rawName: string = model?.name || '';
    const id = rawName.replace(/^models\//, '');
    if (!id || !id.startsWith('gemini')) continue;
    if (EXCLUDED_PATTERNS.some(p => id.includes(p))) continue;

    // Según la versión del SDK el campo cambia de nombre; si no viene, no filtramos.
    const actions: string[] = model?.supportedActions || model?.supportedGenerationMethods || [];
    if (actions.length > 0 && !actions.includes('generateContent')) continue;

    collected.push({
      id,
      label: model?.displayName || id,
      hint: model?.description || undefined
    });
  }

  // Los identificadores más altos (3.x antes que 2.x) primero.
  collected.sort((a, b) => b.id.localeCompare(a.id, 'en'));

  return collected;
};
