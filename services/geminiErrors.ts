import { getSelectedModel } from "./modelService";

export interface GeminiErrorInfo {
  /** Código HTTP devuelto por la API, si se ha podido determinar. */
  code?: number;
  /** Estado canónico de Google (RESOURCE_EXHAUSTED, PERMISSION_DENIED...). */
  status?: string;
  /** Titular corto para la interfaz. */
  title: string;
  /** Explicación en lenguaje llano de lo que ha pasado. */
  message: string;
  /** Qué puede hacer el usuario para resolverlo. */
  hint?: string;
  /** Segundos que la API pide esperar antes de reintentar (errores 429). */
  retryAfterSeconds?: number;
  /** Enlace de ayuda oficial relacionado con el error. */
  helpUrl?: string;
  /** Modelo implicado en el error. */
  model?: string;
  /** Mensaje técnico original, para el desplegable de detalle. */
  raw: string;
}

interface ParsedApiError {
  code?: number;
  status?: string;
  message: string;
  details?: any[];
}

/**
 * Último recurso cuando el JSON viene truncado o mal formado: rescata el código
 * y el estado con expresiones regulares para no perder la clasificación del error.
 */
const extractByRegex = (raw: string): ParsedApiError | null => {
  const code = raw.match(/"code"\s*:\s*(\d{3})/);
  const status = raw.match(/"status"\s*:\s*"([A-Z_]+)"/);
  if (!code && !status) return null;
  return {
    code: code ? parseInt(code[1], 10) : undefined,
    status: status ? status[1] : undefined,
    message: raw
  };
};

/** Extrae el objeto JSON de error que el SDK incrusta dentro del mensaje de la excepción. */
const extractApiError = (raw: string): ParsedApiError | null => {
  const start = raw.indexOf('{');
  if (start === -1) return null;

  const candidate = raw.slice(start);
  let parsed: any = null;

  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    // El mensaje puede llevar texto después del JSON: probamos a recortar por el último cierre.
    const end = candidate.lastIndexOf('}');
    if (end === -1) return extractByRegex(raw);
    try {
      parsed = JSON.parse(candidate.slice(0, end + 1));
    } catch (e2) {
      return extractByRegex(raw);
    }
  }

  const body = parsed?.error || parsed;
  if (!body) return extractByRegex(raw);

  return {
    code: typeof body.code === 'number' ? body.code : undefined,
    status: typeof body.status === 'string' ? body.status : undefined,
    message: typeof body.message === 'string' ? body.message : raw,
    details: Array.isArray(body.details) ? body.details : undefined
  };
};

const extractRetrySeconds = (parsed: ParsedApiError | null, raw: string): number | undefined => {
  const fromDetails = parsed?.details?.find(d => typeof d?.retryDelay === 'string')?.retryDelay;
  if (fromDetails) {
    const seconds = parseFloat(String(fromDetails).replace('s', ''));
    if (!isNaN(seconds)) return Math.ceil(seconds);
  }

  const match = raw.match(/retry in\s+([\d.]+)\s*s/i);
  if (match) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds)) return Math.ceil(seconds);
  }

  return undefined;
};

const extractModel = (parsed: ParsedApiError | null, raw: string): string | undefined => {
  const violation = parsed?.details
    ?.find(d => Array.isArray(d?.violations))
    ?.violations?.find((v: any) => v?.quotaDimensions?.model)?.quotaDimensions?.model;
  if (violation) return String(violation);

  const match = raw.match(/model:\s*([a-z0-9.\-]+)/i);
  return match ? match[1] : undefined;
};

const isNetworkError = (raw: string): boolean =>
  /failed to fetch|networkerror|network error|load failed|err_internet|net::/i.test(raw);

/**
 * Convierte cualquier excepción lanzada por el SDK de Gemini en información
 * comprensible para el profesorado, con una acción concreta que poder seguir.
 */
export const parseGeminiError = (error: unknown): GeminiErrorInfo => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (() => {
            try {
              return JSON.stringify(error);
            } catch (e) {
              return String(error);
            }
          })();

  const parsed = extractApiError(raw);
  const code = parsed?.code ?? (error as any)?.status ?? undefined;
  const status = parsed?.status;
  const detail = parsed?.message || raw;
  const retryAfterSeconds = extractRetrySeconds(parsed, raw);
  const model = extractModel(parsed, raw) || getSelectedModel();

  const base = { code, status, raw: detail, model, retryAfterSeconds };

  // 0. Falta la clave (error propio de la aplicación, no de la API).
  if (/API KEY/i.test(raw) && !parsed) {
    return {
      ...base,
      title: 'Falta la clave de API de Gemini',
      message: 'La aplicación no encuentra ninguna clave de Google Gemini configurada.',
      hint: 'Abre el icono de ajustes (arriba a la derecha) y pega tu clave de AI Studio.'
    };
  }

  // 1. Sin conexión o petición bloqueada por el navegador.
  if (isNetworkError(raw)) {
    return {
      ...base,
      title: 'No se ha podido conectar con Gemini',
      message: 'La petición no ha llegado al servidor de Google.',
      hint: 'Revisa tu conexión a internet. En la red del centro puede haber un cortafuegos o un proxy que bloquee generativelanguage.googleapis.com; prueba con otra red.'
    };
  }

  // 2. Cuota agotada / límite de peticiones.
  if (code === 429 || status === 'RESOURCE_EXHAUSTED' || /exceeded your current quota|quota exceeded/i.test(raw)) {
    const noFreeTier = /limit:\s*0/.test(detail);
    const perDay = /PerDay/i.test(detail);

    let message = `Tu clave ha superado el límite de uso de la API de Gemini para el modelo ${model}.`;
    let hint = retryAfterSeconds
      ? `Espera unos ${retryAfterSeconds} segundos y vuelve a intentarlo, o cambia a un modelo más ligero (Ajustes → Modelo de Gemini).`
      : 'Espera unos minutos y vuelve a intentarlo, o cambia a un modelo más ligero (Ajustes → Modelo de Gemini).';

    if (noFreeTier) {
      message = `El modelo ${model} no está disponible en el nivel gratuito de tu clave (la cuota asignada es 0).`;
      hint = 'Cambia de modelo en Ajustes → Modelo de Gemini (por ejemplo, un modelo Flash o 2.5 Pro), o activa la facturación en tu proyecto de Google AI Studio.';
    } else if (perDay) {
      message = `Has agotado la cuota diaria gratuita del modelo ${model}.`;
      hint = 'Prueba mañana, cambia a un modelo más ligero en Ajustes → Modelo de Gemini, o activa la facturación en tu proyecto de Google AI Studio.';
    }

    return {
      ...base,
      title: 'Has superado la cuota de la API de Gemini',
      message,
      hint,
      helpUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits'
    };
  }

  // 3. Clave inválida o mal copiada.
  if (/API[_ ]key not valid|API_KEY_INVALID|api key expired/i.test(detail)) {
    return {
      ...base,
      title: 'La clave de API no es válida',
      message: 'Google ha rechazado la clave configurada.',
      hint: 'Comprueba que la has copiado entera y sin espacios. Puedes generar una nueva en aistudio.google.com/app/apikey y pegarla en Ajustes.',
      helpUrl: 'https://aistudio.google.com/app/apikey'
    };
  }

  // 4. Permisos: API no habilitada, clave restringida, región no admitida.
  if (code === 401 || code === 403 || status === 'PERMISSION_DENIED' || status === 'UNAUTHENTICATED') {
    return {
      ...base,
      title: 'Acceso denegado por Google',
      message: 'La clave existe pero no tiene permiso para usar este modelo o esta API.',
      hint: 'Revisa que la API "Generative Language" esté habilitada en tu proyecto, que la clave no tenga restricciones de dominio y que tu país tenga acceso al modelo elegido.',
      helpUrl: 'https://aistudio.google.com/app/apikey'
    };
  }

  // 5. Modelo inexistente o no disponible para esa clave.
  if (code === 404 || status === 'NOT_FOUND' || /is not found for API version|not supported for generateContent/i.test(detail)) {
    return {
      ...base,
      title: `El modelo "${model}" no está disponible`,
      message: 'Google no reconoce ese modelo para tu clave, o el modelo ya no admite generación de contenido.',
      hint: 'Abre Ajustes → Modelo de Gemini, pulsa "Detectar modelos disponibles" y elige uno de la lista.',
      helpUrl: 'https://ai.google.dev/gemini-api/docs/models'
    };
  }

  // 6. Petición demasiado grande (PDF muy pesado).
  if (code === 413 || /request payload size|too large|exceeds the maximum/i.test(detail)) {
    return {
      ...base,
      title: 'El documento enviado es demasiado grande',
      message: 'El PDF del currículum, junto con el contexto, supera el tamaño máximo admitido por la API.',
      hint: 'Sube un PDF más ligero: extrae solo las páginas de tu asignatura y curso antes de cargarlo.'
    };
  }

  // 7. Contenido bloqueado por los filtros de seguridad.
  if (/SAFETY|blocked|PROHIBITED_CONTENT|RECITATION/i.test(detail) && !/unsafe connection/i.test(detail)) {
    return {
      ...base,
      title: 'Gemini ha bloqueado la respuesta',
      message: 'Los filtros de seguridad del modelo han detenido la generación de este contenido.',
      hint: 'Suele ocurrir por alguna palabra del contexto o de las ideas introducidas. Reformula el texto del formulario y vuelve a intentarlo.'
    };
  }

  // 8. Petición mal formada.
  if (code === 400 || status === 'INVALID_ARGUMENT' || status === 'FAILED_PRECONDITION') {
    return {
      ...base,
      title: 'Gemini ha rechazado la petición',
      message: 'La API ha devuelto un error de petición no válida.',
      hint: 'Suele deberse a un PDF corrupto o a un modelo que no admite archivos PDF. Prueba con otro PDF o con otro modelo en Ajustes.'
    };
  }

  // 9. Tiempo de espera agotado.
  if (code === 504 || status === 'DEADLINE_EXCEEDED' || /timeout|timed out/i.test(detail)) {
    return {
      ...base,
      title: 'La generación ha tardado demasiado',
      message: 'La petición ha superado el tiempo máximo de espera del servidor.',
      hint: 'Genera menos situaciones de aprendizaje de una vez, o usa un modelo más rápido (Flash) en Ajustes.'
    };
  }

  // 10. Errores del lado de Google.
  if ((code && code >= 500) || status === 'UNAVAILABLE' || status === 'INTERNAL' || /overloaded/i.test(detail)) {
    return {
      ...base,
      title: 'El servicio de Gemini no está disponible ahora mismo',
      message: 'Google ha devuelto un error temporal (servidor saturado o caído).',
      hint: 'No es un problema de tu clave. Espera unos minutos y vuelve a intentarlo; si urge, prueba con otro modelo.'
    };
  }

  // 11. La respuesta no se ha podido interpretar.
  if (error instanceof SyntaxError || /JSON/i.test(raw)) {
    return {
      ...base,
      title: 'La respuesta de Gemini no se ha podido interpretar',
      message: 'El modelo ha devuelto un texto que la aplicación no ha sabido leer, probablemente porque la respuesta se ha cortado.',
      hint: 'Vuelve a intentarlo. Si se repite, reduce el número de situaciones de aprendizaje o de actividades solicitadas a la vez.'
    };
  }

  // 12. Cualquier otro caso.
  return {
    ...base,
    title: 'Error inesperado al comunicar con Gemini',
    message: detail.length > 300 ? `${detail.slice(0, 300)}…` : detail,
    hint: 'Vuelve a intentarlo. Si el error persiste, revisa la clave y el modelo en Ajustes.'
  };
};
