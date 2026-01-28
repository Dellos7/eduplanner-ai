
import { GoogleGenAI } from "@google/genai";
import { DocType, TeacherContext, CurriculumAnalysis } from "../types";

// Función para obtener el cliente de IA con la mejor clave disponible
const getAiClient = () => {
  const manualKey = localStorage.getItem('GEMINI_API_KEY');
  const apiKey = manualKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("No se ha configurado ninguna API KEY. Por favor, configúrala en el icono de ajustes.");
  }
  
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_INSTRUCTION = `
Eres un experto pedagogo y jefe de departamento con amplia experiencia en normativa educativa (LOMLOE) y diseño curricular.
Tu objetivo es redactar documentos oficiales precisos basándote en el currículum oficial (PDF) y el contexto proporcionado.
Debes seguir estrictamente la estructura de Markdown solicitada para que el sistema pueda procesar los campos.
Usa un lenguaje técnico, inclusivo y profesional.
IMPORTANTE: Debes escribir el documento ÚNICA Y EXCLUSIVAMENTE en el idioma solicitado por el usuario.
`;

export const analyzePdfStructure = async (pdfBase64: string): Promise<CurriculumAnalysis> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: `Analiza este PDF del currículum oficial.
          Extrae la siguiente información estructurada en JSON:
          1. "subject": Nombre probable de la Asignatura.
          2. "grade": Curso/Nivel académico.
          3. "competencies": Una lista (array de strings) de las Competencias Específicas. 
             IMPORTANTE: Cada string DEBE empezar con su código (ej: "CE1: [Título]", "CE2: [Título]"). Si el PDF no tiene códigos, invéntalos correlativamente.
          4. "blocks": Una lista (array de strings) de los Bloques de Saberes Básicos. 
             IMPORTANTE: Cada string DEBE empezar con "Bloque X: [Nombre del bloque]".
          
          Devuelve SOLO el JSON raw.` }
        ]
      },
      config: { 
        responseMimeType: "application/json" 
      }
    });
    
    let text = response.text || "{}";
    const parsed = JSON.parse(text);
    return {
      subject: parsed.subject || "",
      grade: parsed.grade || "",
      competencies: parsed.competencies || [],
      blocks: parsed.blocks || []
    };
  } catch (e) {
    console.error("Error analyzing PDF", e);
    return { subject: "", grade: "", competencies: [], blocks: [] };
  }
};

export const generateEducationalDocument = async (
  pdfBase64: string,
  context: TeacherContext,
  docType: DocType
): Promise<string> => {
  const ai = getAiClient();
  let prompt = "";
  const needsString = [...context.selectedNeeds, context.otherNeeds].filter(Boolean).join(", ");
  const methodologiesString = context.methodologyPreference.join(", ");
  const langInstruction = `EL DOCUMENTO DEBE ESTAR ESCRITO ÍNTEGRAMENTE EN: ${context.language}.`;

  if (docType === DocType.PROPUESTA) {
    prompt = `
      ${langInstruction}
      Genera una **PROPUESTA PEDAGÓGICA DE DEPARTAMENTO**.
      Usa exactamente estos encabezados de nivel 2:

      # PROPUESTA PEDAGÓGICA: ${context.subject}
      ## 1. Concreción Curricular
      Detalla competencias específicas y criterios del PDF vinculados a ${context.gradeLevel}.
      ## 2. Metodología y Estrategias
      Basadas en: ${methodologiesString}.
      ## 3. Evaluación
      Instrumentos, criterios de calificación y temporalización (basado en ${context.weeklyHours}h/semana).
      ## 4. Atención a la Diversidad
      Medidas específicas para: ${needsString}.
    `;
  } else {
    prompt = `
      ${langInstruction}
      Genera ${context.numberOfSAs} **SITUACIONES DE APRENDIZAJE** detalladas para ${context.subject} (${context.gradeLevel}).
      
      PARA CADA SITUACIÓN DE APRENDIZAJE, debes usar EXACTAMENTE esta estructura y etiquetas:

      ## SITUACIÓN DE APRENDIZAJE: [Título Sugerente]

      **Contexto:**
      | Personal | Educativo | Social | Profesional |
      | :--- | :--- | :--- | :--- |
      | [Descripción] | [Descripción] | [Descripción] | [Descripción] |

      **Descripción / Justificación:**
      [Escribe aquí la justificación pedagógica]

      **Relación con los retos del s.XXI y los ODS:**
      [Escribe aquí la vinculación con ODS]

      **Competencias Específicas y Criterios de Evaluación vinculados:**
      [Cita las competencias específicas del PDF]

      **Saberes Básicos:**
      [Lista los saberes del PDF involucrados]

      **Organización:**
      | Sequenciación d'activitats | Organització dels espais | Distribució del temps | Recursos i materials | Mesures de resposta educativa per a la inclusió |
      | :--- | :--- | :--- | :--- | :--- |
      | [Inicio, desarrollo y cierre] | [Espacios] | [Sesiones/Horas] | [Materiales] | [Medidas DUA] |

      **Instrumentos de recogida de información:**
      [Lista de instrumentos]
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Error en generación.";
  } catch (error) {
    console.error(error);
    throw error;
  }
};
