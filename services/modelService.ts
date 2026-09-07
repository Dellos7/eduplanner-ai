import { getAiClient } from "./aiClient";

export interface GeminiModelOption {
  id: string;
  label: string;
  hint?: string;
}

/** Clave donde se guarda el modelo elegido para cada tarea. */
export const MODELS_STORAGE_KEY = 'GEMINI_MODELS';

/** Clave de la versión anterior, cuando había un único modelo global. */
export const LEGACY_MODEL_STORAGE_KEY = 'GEMINI_MODEL';

/**
 * Las cinco llamadas de la aplicación tienen perfiles muy distintos (entrada enorme
 * y salida corta, salida larguísima, muchas llamadas seguidas...), así que cada una
 * puede usar un modelo diferente.
 */
export type ModelTask = 'analysis' | 'situacion' | 'propuesta' | 'activities' | 'refine';

export interface ModelTaskDefinition {
  key: ModelTask;
  label: string;
  description: string;
  defaultModel: string;
}

export const MODEL_TASKS: ModelTaskDefinition[] = [
  {
    key: 'analysis',
    label: 'Análisis del currículum (paso 1)',
    description: 'Extrae asignatura, curso, competencias y bloques del PDF. Entrada muy grande y salida corta: es una tarea mecánica que no necesita un modelo caro.',
    defaultModel: 'gemini-3.5-flash-lite'
  },
  {
    key: 'situacion',
    label: 'Programación de aula y SdA (paso 5)',
    description: 'El documento largo donde se juega la calidad del resultado. Conviene el mejor modelo al que tengas acceso: si tu clave admite un Pro, cámbialo aquí.',
    defaultModel: 'gemini-3.8-flash'
  },
  {
    key: 'propuesta',
    label: 'Propuesta pedagógica (paso 5)',
    description: 'Documento largo pero más formulaico que las situaciones de aprendizaje.',
    defaultModel: 'gemini-3.8-flash'
  },
  {
    key: 'activities',
    label: 'Desarrollo de actividades (pasos 6 y 7)',
    description: 'Una llamada por cada actividad seleccionada: es donde más peticiones se acumulan.',
    defaultModel: 'gemini-3.8-flash'
  },
  {
    key: 'refine',
    label: 'Refinado por chat',
    description: 'Reescribe el documento completo conservando su estructura. Prima la fidelidad sobre la creatividad.',
    defaultModel: 'gemini-3.8-flash'
  }
];

/** Modelo por defecto de referencia cuando no se conoce la tarea. */
export const DEFAULT_MODEL = 'gemini-3.8-flash';

/**
 * Lista sugerida. No es exhaustiva ni permanente: Google añade y retira modelos
 * con frecuencia, por eso el modal permite detectar los disponibles para la clave
 * del usuario y también escribir un identificador a mano.
 */
export const CURATED_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (preview)',
    hint: 'Máxima calidad de redacción. NO tiene nivel gratuito: necesita facturación activada en tu proyecto.'
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    hint: 'Pro con nivel gratuito, pero CERRADO A CLAVES NUEVAS: los proyectos creados recientemente reciben un 404 aunque aparezca en la lista de modelos.'
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    hint: 'El Flash más capaz. Con nivel gratuito. Recomendado para el trabajo diario y para desarrollar actividades.'
  },
  {
    id: 'gemini-3.7-flash',
    label: 'Gemini 3.7 Flash',
    hint: 'Flash de gama alta con nivel gratuito. Es el más capaz disponible en muchas claves sin facturación.'
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    hint: 'Equilibrio entre velocidad y capacidad. Con nivel gratuito.'
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    hint: 'Flash de generación anterior para cargas rutinarias. Con nivel gratuito.'
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash Lite',
    hint: 'El más rápido y económico. Suficiente para el análisis inicial del PDF.'
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (preview)',
    hint: 'Versión preliminar de la familia 3, con nivel gratuito.'
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    hint: 'Ligero y con nivel gratuito. Muy buena opción para el análisis del PDF.'
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    hint: 'Alternativa estable y con nivel gratuito si los modelos 3.x te dan problemas de cuota.'
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    hint: 'El más económico de la familia 2.5. Otra opción válida para el análisis del PDF.'
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (última versión)',
    hint: 'Alias que apunta siempre al Flash más reciente disponible.'
  },
  {
    id: 'gemini-flash-lite-latest',
    label: 'Gemini Flash Lite (última versión)',
    hint: 'Alias que apunta siempre al Flash Lite más reciente disponible.'
  },
  {
    id: 'gemini-pro-latest',
    label: 'Gemini Pro (última versión)',
    hint: 'Alias al Pro más reciente. Ojo: si apunta a un Pro sin nivel gratuito, dará error de cuota sin facturación.'
  }
];

const getDefaultModel = (task: ModelTask): string =>
  MODEL_TASKS.find(t => t.key === task)?.defaultModel || DEFAULT_MODEL;

const readStoredModels = (): Partial<Record<ModelTask, string>> => {
  try {
    const stored = localStorage.getItem(MODELS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('No se ha podido leer la configuración de modelos', e);
  }
  return {};
};

/** Modelo con el que debe ejecutarse una tarea concreta. */
export const getTaskModel = (task: ModelTask): string => {
  const stored = readStoredModels()[task];
  return stored && stored.trim() ? stored.trim() : getDefaultModel(task);
};

export const getAllTaskModels = (): Record<ModelTask, string> => {
  const stored = readStoredModels();
  return MODEL_TASKS.reduce((acc, task) => {
    const value = stored[task.key];
    acc[task.key] = value && value.trim() ? value.trim() : task.defaultModel;
    return acc;
  }, {} as Record<ModelTask, string>);
};

export const setTaskModels = (models: Record<ModelTask, string>): void => {
  try {
    const cleaned = MODEL_TASKS.reduce((acc, task) => {
      const value = (models[task.key] || '').trim();
      if (value && value !== task.defaultModel) acc[task.key] = value;
      return acc;
    }, {} as Partial<Record<ModelTask, string>>);

    if (Object.keys(cleaned).length > 0) {
      localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(cleaned));
    } else {
      localStorage.removeItem(MODELS_STORAGE_KEY);
    }
    // La configuración global anterior deja de usarse.
    localStorage.removeItem(LEGACY_MODEL_STORAGE_KEY);
  } catch (e) {
    console.error('No se ha podido guardar la configuración de modelos', e);
  }
};

/** Modelo principal, el de la programación de aula: el que se muestra en la cabecera. */
export const getSelectedModel = (): string => getTaskModel('situacion');

export const getModelLabel = (modelId: string): string => {
  const found = CURATED_MODELS.find(m => m.id === modelId);
  return found ? found.label : modelId;
};

/** Modelos que no sirven para generar documentos (embeddings, imagen, audio, vídeo...). */
const EXCLUDED_PATTERNS = [
  'embedding', 'aqa', 'imagen', 'veo', 'tts', 'audio', 'image', 'vision-live',
  'robotics', 'transcribe', 'computer-use', 'translate'
];

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
