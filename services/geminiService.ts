
import { GoogleGenAI } from "@google/genai";
import { DocType, TeacherContext, CurriculumAnalysis } from "../types";

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

const getOrganizationHeaders = (language: string) => {
  if (language.includes('Catalán') || language.includes('Valenciano')) {
    return "| Seqüenciació d'activitats | Organització dels espais | Distribució del temps | Recursos i materials | Mesures de resposta educativa per a la inclusió |";
  } else if (language.includes('Inglés')) {
    return "| Sequencing of activities | Organization of spaces | Time distribution | Resources and materials | Educational response measures for inclusion |";
  }
  return "| Secuenciación de actividades | Organización de espacios | Distribución del tiempo | Recursos y materiales | Medidas de respuesta educativa para la inclusión |";
};

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
          1. "subject": Nombre probable de la Asignatura (ej: Matemáticas).
          2. "grade": Determina a qué curso pertenece el documento. DEBE ser estrictamente uno de estos valores: "1ºESO", "2ºESO", "3ºESO", "4ºESO", "1º Bachiller", "2º Bachiller". 
             - Si el PDF describe varios cursos o la etapa completa, devuelve "múltiple".
             - Si no puedes determinarlo con seguridad, devuelve "".
          3. "competencies": Una lista (array de strings) de las Competencias Específicas detectadas. Cada string DEBE empezar con su código (ej: "CE1: [Título]").
          4. "blocks": Una lista (array de strings) de los Bloques de Saberes Básicos. Cada string DEBE empezar con "Bloque X: [Nombre]".
          
          Devuelve SOLO el JSON raw.` }
        ]
      },
      config: { 
        responseMimeType: "application/json" 
      }
    });
    
    let text = response.text || "{}";
    const parsed = JSON.parse(text);
    
    const finalGrade = (parsed.grade === "múltiple" || !parsed.grade) ? "" : parsed.grade;

    return {
      subject: parsed.subject || "",
      grade: finalGrade,
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
    let ideasPrompt = "";
    let saCountText = `${context.numberOfSAs}`;
    
    if (context.generateFullCourse) {
      saCountText = "todas las necesarias para el curso completo (decide tú el número ideal basándote en la carga lectiva)";
      ideasPrompt = "\n\nIMPORTANTE: Ignora el número de SAs manual y genera una planificación completa anual.";
    } else if (context.saIdeas.length > 0) {
      ideasPrompt = "\n\nIMPORTANTE: Ten en cuenta estas propuestas específicas del usuario para cada SdA:\n";
      context.saIdeas.forEach((idea, idx) => {
        if (idea.trim()) {
          ideasPrompt += `- SdA número ${idx + 1}: ${idea.trim()}\n`;
        }
      });
    }

    const orgHeader = getOrganizationHeaders(context.language);

    prompt = `
      ${langInstruction}
      Genera ${saCountText} **SITUACIONES DE APRENDIZAJE** detalladas para ${context.subject} (${context.gradeLevel}).
      ${ideasPrompt}
      
      PARA CADA SITUACIÓN DE APRENDIZAJE, debes usar EXACTAMENTE esta estructura:

      ## SITUACIÓN DE APRENDIZAJE: [Título Sugerente]

      **Contexto:**
      | Personal | Educativo | Social | Profesional |
      | :--- | :--- | :--- | :--- |
      | [Descripción] | [Descripción] | [Descripción] | [Descripción] |

      **Descripción / Justificación:**
      [Justificación pedagógica]

      **Relación con los retos del s.XXI y los ODS:**
      [Vinculación con ODS]

      **Competencias Específicas y Criterios de Evaluación vinculados:**
      [Cita competencias del PDF]

      **Saberes Básicos:**
      [Saberes del PDF]

      **Organización:**
      Genera una tabla con al menos 3 filas (Actividad 1, Actividad 2, Actividad 3).
      ${orgHeader}
      | :--- | :--- | :--- | :--- | :--- |
      | **Actividad 1:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas] |
      | **Actividad 2:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas] |
      | **Actividad 3:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas] |

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

export const refineDocument = async (
  pdfBase64: string,
  context: TeacherContext,
  docType: DocType,
  currentContent: string,
  feedback: string
): Promise<string> => {
  const ai = getAiClient();
  const langInstruction = `EL DOCUMENTO DEBE SEGUIR ESTANDO EN: ${context.language}.`;
  
  const prompt = `
    ${langInstruction}
    Has generado previamente el siguiente documento pedagógico:
    ---
    ${currentContent}
    ---
    El usuario solicita los siguientes cambios o mejoras:
    "${feedback}"

    REGENERA el documento completo incorporando estas peticiones. 
    MANTÉN la estructura técnica de Markdown (tablas, encabezados h2, etc.) que se usó anteriormente.
    Usa el currículum adjunto para asegurar el rigor académico.
  `;

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

    return response.text || "Error en refinamiento.";
  } catch (error) {
    console.error(error);
    throw error;
  }
};
