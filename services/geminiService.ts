
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
Tu tarea es generar documentos técnicos educativos basándote en el currículum oficial (PDF) y el contexto proporcionado.

REGLAS ESTRICTAS DE RESPUESTA:
1. NO SALUDES, NO TE PRESENTES, NO DES EXPLICACIONES PREVIAS NI POSTERIORES.
2. NO inicies la respuesta con frases como "Como experto pedagogo...", "Aquí tienes...", "A continuación...".
3. Empieza DIRECTAMENTE con el primer encabezado Markdown del documento (ej: # o ##).
4. Sigue estrictamente la estructura de Markdown solicitada.
5. Usa un lenguaje técnico, inclusivo y profesional.
6. El documento debe estar escrito ÚNICA Y EXCLUSIVAMENTE en el idioma solicitado por el usuario.
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
  const langInstruction = `IDIOMA DEL DOCUMENTO: ${context.language}.`;

  if (docType === DocType.PROPUESTA) {
    prompt = `
      ${langInstruction}
      Genera una **PROPUESTA PEDAGÓGICA DE DEPARTAMENTO**.
      IMPORTANTE: No incluyas texto introductorio ("Claro, aquí tienes..."). Empieza directamente con el título.
      
      Usa exactamente estos encabezados de nivel 2:

      # PROPUESTA PEDAGÓGICA: ${context.subject}
      ## 1. Concreción Curricular
      Detalla competencias específicas y criterios del PDF vinculados a ${context.gradeLevel}.
      IMPORTANTE: Escribe el texto COMPLETO de las Competencias Específicas, sin usar puntos suspensivos ni resumirlas. Los Criterios de Evaluación deben indicarse ÚNICAMENTE con su numeración (ej. 3.1, 3.2...) y deben aparecer justo debajo de la Competencia Específica a la que hacen referencia.
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
      const estimatedTotalSessions = context.weeklyHours * 35; // Aproximadamente 35 semanas lectivas
      saCountText = "todas las necesarias para el curso completo (decide tú el número ideal basándote en la carga lectiva)";
      ideasPrompt = `\n\nIMPORTANTE: Ignora el número de SAs manual y genera una planificación completa anual.
      Un curso escolar tiene aproximadamente 35 semanas lectivas. Dado que esta asignatura tiene ${context.weeklyHours} sesiones semanales, el total de sesiones del curso debe rondar las ${estimatedTotalSessions} sesiones.
      Asegúrate de generar suficientes Situaciones de Aprendizaje y asignarles un número de sesiones realista (y suficientes actividades en cada una) para que la suma total se acerque a esta cifra (${estimatedTotalSessions} sesiones).`;
      if (context.fullCourseIdeas && context.fullCourseIdeas.trim()) {
        ideasPrompt += `\nTen en cuenta estas ideas generales para el curso: ${context.fullCourseIdeas.trim()}\n`;
      }
    } else if (context.saDetails && context.saDetails.length > 0) {
      ideasPrompt = "\n\nIMPORTANTE: Ten en cuenta estas propuestas específicas del usuario para cada SdA:\n";
      context.saDetails.forEach((detail, idx) => {
        if (detail.idea.trim() || detail.sessions?.trim() || detail.competencies.length > 0 || detail.blocks.length > 0) {
          ideasPrompt += `- SdA número ${idx + 1}:\n`;
          if (detail.idea.trim()) {
            ideasPrompt += `  * Idea/Temática: ${detail.idea.trim()}\n`;
          }
          if (detail.sessions?.trim()) {
            ideasPrompt += `  * Nº de sesiones (aproximado): ${detail.sessions.trim()}\n`;
          }
          if (detail.competencies.length > 0) {
            ideasPrompt += `  * Competencias Específicas: ${detail.competencies.join(', ')}\n`;
          }
          if (detail.blocks.length > 0) {
            ideasPrompt += `  * Bloques de Saberes: ${detail.blocks.join(', ')}\n`;
          }
        }
      });
    }

    const orgHeader = getOrganizationHeaders(context.language);

    let programacionTitle = `Programación de Aula de ${context.subject}, ${context.gradeLevel}, ${context.academicYear}`;
    if (context.language.includes('Catalán') || context.language.includes('Valenciano')) {
      programacionTitle = `Programació d'Aula de ${context.subject}, ${context.gradeLevel}, ${context.academicYear}`;
    } else if (context.language.includes('Inglés')) {
      programacionTitle = `Classroom Programming for ${context.subject}, ${context.gradeLevel}, ${context.academicYear}`;
    }

    prompt = `
      ${langInstruction}
      Genera ${saCountText} **SITUACIONES DE APRENDIZAJE** detalladas para ${context.subject} (${context.gradeLevel}).
      ${ideasPrompt}
      
      REQUISITOS OBLIGATORIOS:
      1. Empieza el documento con un único encabezado principal (h1): # ${programacionTitle}
      2. **NUMERA SIEMPRE** las situaciones en el título (ej: 1, 2, 3...) y usa SIEMPRE encabezado de nivel 2 (h2) para cada una.
      3. Escribe el texto COMPLETO de las Competencias Específicas, sin usar puntos suspensivos ni resumirlas.
      4. Los Criterios de Evaluación deben indicarse ÚNICAMENTE con su numeración estricta (ej. 1.1, 1.2, 2.1, 3.1...) y deben aparecer justo debajo de la Competencia Específica a la que hacen referencia. IGNORA CUALQUIER PREFIJO adicional que aparezca en el PDF (ej. si en el PDF pone 5.1.1 para la CE 1, tú escribe SOLO 1.1).
      5. En la columna "Medidas de respuesta educativa para la inclusión" de la tabla de Organización, debes especificar medidas CONCRETAS que ayuden a las siguientes problemáticas del aula: ${needsString}.
      6. Los Saberes Básicos deben indicar siempre explícitamente a qué Bloque Curricular pertenecen.
      7. Debes incluir una tabla resumen al principio y una matriz de competencias al final. Traduce los títulos de estas tablas al idioma solicitado.
      8. ${context.generateFullCourse ? 'Asegúrate de repartir TODAS las competencias específicas y saberes básicos de la asignatura entre todas las situaciones de aprendizaje generadas.' : 'No fuerces la inclusión de competencias específicas o saberes básicos que no tengan sentido con la temática de la situación de aprendizaje. Es normal que en un número reducido de situaciones no se cubran todas las competencias o saberes del currículo.'}
      
      ESTRUCTURA EXACTA DEL DOCUMENTO:

      # ${programacionTitle}

      ${context.generateFullCourse ? `
      ## Distribución temporal
      Genera una tabla con 3 columnas: "Situación de Aprendizaje" (solo el nombre), "Número de Sesiones Totales" y "Trimestre" (1º, 2º o 3º, distribuyéndolas equitativamente a lo largo del curso).
      Añade una última fila al final de esta tabla que muestre la palabra "TOTAL" y la suma matemática de todas las sesiones del curso.
      ` : `
      ## Distribución temporal
      No se ha generado de forma automática la distribución temporal al no haberse marcado la opción de generación de la programación para todo el curso.
      `}

      [A continuación, repite la siguiente estructura para CADA situación de aprendizaje:]

      ## SITUACIÓN DE APRENDIZAJE {NÚMERO}: [Título Sugerente]

      **Contexto:**
      | Personal | Educativo | Social | Profesional |
      | :--- | :--- | :--- | :--- |
      | [Descripción] | [Descripción] | [Descripción] | [Descripción] |

      **Descripción / Justificación:**
      [Justificación pedagógica]

      **Relación con los retos del s.XXI y los ODS:**
      [Vinculación con ODS]

      **Competencias Específicas y Criterios de Evaluación vinculados:**
      - **Competencia Específica [X]:** [Texto COMPLETO de la competencia]
        - Criterios de evaluación: [X.1], [X.2]... (Recuerda: sin prefijos extra, solo X.Y)

      **Saberes Básicos:**
      - **Bloque [Nombre del Bloque Curricular]:** [Saberes del PDF]

      **Organización:**
      Genera una tabla con al menos 3 filas (Actividad 1, Actividad 2, Actividad 3).
      ${orgHeader}
      | :--- | :--- | :--- | :--- | :--- |
      | **Actividad 1:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas concretas para: ${needsString}] |
      | **Actividad 2:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas concretas para: ${needsString}] |
      | **Actividad 3:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas concretas para: ${needsString}] |

      **Instrumentos de recogida de información:**
      [Lista de instrumentos]

      [Al final del documento, tras la última situación de aprendizaje, incluye obligatoriamente la siguiente sección:]

      ## Matriz de Competencias y Criterios vs Situaciones de Aprendizaje
      Genera una tabla de doble entrada. En las filas, pon TODAS las Competencias Específicas de la asignatura divididas en sus Criterios de Evaluación correspondientes, INCLUSO AQUELLAS QUE NO SE HAYAN UTILIZADO en ninguna situación de aprendizaje (en cuyo caso la fila quedará en blanco). En las columnas, pon las Situaciones de Aprendizaje generadas (SdA 1, SdA 2...). Las celdas deben contener un check (✓) indicando en qué situación de aprendizaje se ha tenido en cuenta cada competencia y criterio.
      IMPORTANTE: La numeración de los criterios de evaluación DEBE corresponder exactamente con su competencia específica (ej. para la CE 1, los criterios son 1.1, 1.2, 1.3... NO uses prefijos inventados ni prefijos del PDF como 5.1.1. Si la competencia es la 2, los criterios son 2.1, 2.2, etc.).
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
    NO AÑADAS texto conversacional al principio ni al final. Solo el documento.
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
