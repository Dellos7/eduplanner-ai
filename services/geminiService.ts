import { GoogleGenAI } from "@google/genai";
import { DocType, TeacherContext, CurriculumAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Eres un experto pedagogo y jefe de departamento con amplia experiencia en normativa educativa (LOMLOE) y diseño curricular.
Tu objetivo es redactar documentos oficiales precisos basándote en el currículum oficial (PDF) y el contexto proporcionado.
Debes seguir estrictamente la estructura solicitada, que corresponde a plantillas oficiales.
Usa un lenguaje técnico, inclusivo y profesional.
IMPORTANTE: Debes escribir el documento ÚNICA Y EXCLUSIVAMENTE en el idioma solicitado por el usuario, independientemente del idioma en el que esté el PDF proporcionado. Traduce si es necesario.
`;

export const analyzePdfStructure = async (pdfBase64: string): Promise<CurriculumAnalysis> => {
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
          3. "competencies": Una lista (array de strings) con los TÍTULOS de las Competencias Específicas (ej: "CE1. Interpretar...").
          4. "blocks": Una lista (array de strings) con los nombres de los Bloques de Saberes Básicos (ej: "Bloque A. Proyecto científico").
          
          Devuelve SOLO el JSON raw.` }
        ]
      },
      config: { 
        responseMimeType: "application/json" 
      }
    });
    
    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return {
      subject: parsed.subject || "",
      grade: parsed.grade || "",
      competencies: parsed.competencies || [],
      blocks: parsed.blocks || []
    };
  } catch (e) {
    console.error("Error analyzing PDF structure", e);
    return { subject: "", grade: "", competencies: [], blocks: [] };
  }
};

export const generateEducationalDocument = async (
  pdfBase64: string,
  context: TeacherContext,
  docType: DocType
): Promise<string> => {
  
  let prompt = "";
  const needsString = [...context.selectedNeeds, context.otherNeeds].filter(Boolean).join(", ");
  const methodologiesString = context.methodologyPreference.join(", ");
  const langInstruction = `EL DOCUMENTO DEBE ESTAR ESCRITO ÍNTEGRAMENTE EN: ${context.language}. TRADUCE LOS TÉRMINOS DEL PDF SI ES NECESARIO.`;

  if (docType === DocType.PROPUESTA) {
    prompt = `
      ${langInstruction}
      Basándote en el PDF adjunto, genera una **PROPUESTA PEDAGÓGICA DE DEPARTAMENTO**.
      
      **Datos del Contexto:**
      - Departamento: ${context.department}
      - Asignatura: ${context.subject}
      - Curso/Nivel: ${context.gradeLevel}
      - Necesidades: ${needsString || "Grupo estándar"}
      - Metodologías: ${methodologiesString}

      **ESTRUCTURA OBLIGATORIA (Markdown):**

      # PROPUESTA PEDAGÓGICA DE DEPARTAMENTO

      ## 1. Concreción curricular de la materia
      
      ### 1.1 Elementos curriculares del nivel (${context.gradeLevel})
      
      *(Repetir la siguiente estructura para las Competencias Específicas más relevantes del PDF)*

      #### 1.1.1 Competencia Específica [NÚMERO]
      *[Texto descriptivo de la competencia extraído del PDF]*

      | Criterios de Evaluación vinculados | Saberes Básicos vinculados |
      | :--- | :--- |
      | (Lista con viñetas '- ' de los criterios) | (Lista con viñetas '- ' indicando el BLOQUE DE CONTENIDO del que provienen. Ej: <br> **Bloque A:** <br> - Saber 1 <br> - Saber 2) |

      ### 1.1.2 Valoración general del progreso del alumnado
      
      | Instrumentos de recogida de información | Criterios de calificación |
      | :--- | :--- |
      | (Lista '- ' basada en metodologías: ${methodologiesString}) | (Ponderaciones y niveles de logro) |

      ## Medidas de respuesta educativa para la inclusión
      *Detallar medidas para: ${needsString}.*
    `;
  } else {
    // Logic for quantity
    let quantityInstruction = "";
    if (context.generateFullCourse) {
      quantityInstruction = `Genera una planificación secuenciada de **TODAS las Situaciones de Aprendizaje (SdA)** para cubrir el curso (${context.weeklyHours}h/semanales). Resumidas pero completas.`;
    } else {
      quantityInstruction = `Genera exactamente **${context.numberOfSAs} Situación(es) de Aprendizaje (SdA)** detallada(s).`;
    }

    prompt = `
      ${langInstruction}
      Basándote en el PDF adjunto, genera el contenido para la **PROGRAMACIÓN DE AULA: SITUACIONES DE APRENDIZAJE**.
      
      **Datos del Contexto:**
      - Asignatura: ${context.subject}
      - Nivel: ${context.gradeLevel}
      - Grupo: ${needsString || "Estándar"}
      - Instrucción de cantidad: ${quantityInstruction}

      **ESTRUCTURA OBLIGATORIA PARA CADA SITUACIÓN DE APRENDIZAJE (Markdown):**
      *(MANTÉN LOS TÍTULOS EXACTOS EN NEGRITA)*

      ---
      ## SITUACIÓN DE APRENDIZAJE N.º [X]: [TÍTULO]

      **Contexto:**
      | Personal | Educativo | Social | Profesional |
      | :--- | :--- | :--- | :--- |
      | (Texto) | (Texto) | (Texto) | (Texto) |

      **Descripción / Justificación:**
      *Explicar el reto y justificación.*

      **Relación con los retos del s.XXI y los ODS:**
      *ODS vinculados.*

      **Competencias Específicas y Criterios de Evaluación vinculados:**
      *(Usa este formato de lista anidada)*
      *   **Competencia Específica [N]:** [Descripción breve]
          *   Criterio [N.1]: [Descripción]
          *   Criterio [N.2]: [Descripción]
      *   **Competencia Específica [M]:** [Descripción breve]
          *   Criterio [M.1]: [Descripción]

      **Saberes Básicos:**
      *(Agrupa por Bloques usando negrita para el bloque)*
      *   **Bloque [X] - [Nombre]:**
          *   Saber básico 1
          *   Saber básico 2
      *   **Bloque [Y] - [Nombre]:**
          *   Saber básico 3

      **Organización:**
      *(Tabla detallada con FILAS DISTINTAS para cada actividad. NO pongas todo en una celda)*
      
      | Fase / Actividad | Descripción | Espacios / Agrupamiento | Tiempo |
      | :--- | :--- | :--- | :--- |
      | **Inicio / Motivación:** [Nombre Actividad 1] | [Descripción clara] | [Aula/Grupos] | [X sesiones] |
      | **Desarrollo:** [Nombre Actividad 2] | [Descripción clara] | [Aula/Parejas] | [X sesiones] |
      | **Desarrollo:** [Nombre Actividad 3] | [Descripción clara] | [Lab/Individual] | [X sesiones] |
      | **Cierre / Producto:** [Nombre Actividad 4] | [Descripción clara] | [Aula/Gran grupo] | [X sesiones] |

      **Instrumentos de recogida de información:**
      *(Lista con viñetas '- ')*

      ---
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
        thinkingConfig: context.generateFullCourse && docType === DocType.SITUACION ? { thinkingBudget: 1024 } : { thinkingBudget: 0 }
      },
    });

    return response.text || "No se pudo generar el contenido. Por favor intenta de nuevo.";
  } catch (error) {
    console.error("Error generating document:", error);
    throw new Error("Hubo un error al comunicarse con la IA. Asegúrate de que el PDF es válido.");
  }
};