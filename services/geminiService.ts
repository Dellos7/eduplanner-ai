
import { DocType, TeacherContext, CurriculumAnalysis, GeneratedActivity } from "../types";
import { getAiClient } from "./aiClient";
import { getTaskModel } from "./modelService";
import { tagErrorModel } from "./geminiErrors";

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

/**
 * Bloque de contexto común a todas las generaciones (P1).
 * Antes, las metodologías elegidas por el docente solo llegaban al prompt de la
 * Propuesta Pedagógica y se perdían en la generación de Situaciones de Aprendizaje.
 */
const buildContextBlock = (
  context: TeacherContext,
  needsString: string,
  methodologyDetails: string
) => `
CONTEXTO DEL AULA (tenlo en cuenta en TODAS las decisiones que tomes):
- Asignatura: ${context.subject} · Curso: ${context.gradeLevel} · Curso escolar: ${context.academicYear}
- Carga lectiva: ${context.weeklyHours} sesiones semanales de 55 minutos (aproximadamente ${context.weeklyHours * 35} sesiones anuales).
- Idioma del documento: ${context.language}
- Metodologías que el departamento ha decidido priorizar: ${methodologyDetails || 'no se ha indicado ninguna preferencia'}
- Perfil del grupo y barreras para la inclusión: ${needsString}
`;

/**
 * Estándar de actividad práctica (P2). Define QUÉ debe ser una actividad;
 * el grado de detalle con que se redacta lo fija cada prompt por separado.
 */
const PRACTICALITY_CLAUSE = `
=== ESTÁNDAR DE ACTIVIDAD PRÁCTICA (obligatorio) ===

PRUEBA DE LA FOTOGRAFÍA: si al hacer una foto del aula durante la actividad solo se ve al alumnado escuchando, copiando o leyendo, la actividad NO ES VÁLIDA. Reescríbela hasta que en la foto se vea al alumnado manipulando, midiendo, construyendo, discutiendo con roles, grabando, programando, entrevistando, resolviendo un caso real o produciendo algo.

TODA actividad debe cumplir estas cuatro condiciones:
1. PRODUCTO OBSERVABLE: termina en algo que se puede recoger, ver, escuchar o guardar (maqueta, plano, hoja de cálculo, pódcast, cartel, informe de una página, código que funciona, dossier fotográfico, guion, mapa, prototipo, base de datos, vídeo de 90 segundos...).
2. ROL ACTIVO Y AGRUPAMIENTO EXPLÍCITO: indica si es individual, por parejas, en equipos de 3-4 con roles asignados o en gran grupo, y qué hace exactamente el alumnado.
3. ANCLAJE REAL: el contenido se aplica a un contexto reconocible para el alumnado (el propio centro, el barrio, la localidad, la comarca, la Comunitat Valenciana, su vida cotidiana, su consumo, su entorno digital o una salida profesional concreta).
4. FACTIBILIDAD: realizable en un instituto público, con material fungible de bajo coste, dispositivos compartidos (uno entre dos) y en sesiones de 55 minutos. Si propones una salida del centro, añade siempre una alternativa equivalente dentro del aula.

VERBOS PROHIBIDOS como núcleo de una actividad (solo pueden aparecer como paso interno breve): "introducción teórica", "explicación del profesorado", "presentación del tema", "repaso", "lectura del libro de texto", "realización de ejercicios", "toma de apuntes", "corrección en la pizarra", "visionado de un vídeo" (salvo con guía de observación y producto posterior), "trabajo de investigación" a secas, "búsqueda de información en internet" a secas.

VERBOS QUE DEBES USAR: medir, construir, prototipar, desmontar, cultivar, cocinar, cartografiar, simular, modelizar, programar, depurar, diseñar, maquetar, grabar, editar, entrevistar, encuestar, auditar, presupuestar, dramatizar, debatir con roles asignados, arbitrar, reconstruir, catalogar, traducir para un uso real, comisariar, divulgar, prestar un servicio a la comunidad.

EQUILIBRIO DE LA SECUENCIA (regla 70/30): como máximo el 30 % del tiempo total de la situación de aprendizaje puede dedicarse a exposición docente, modelado o instrucción directa; el 70 % restante debe ser trabajo del alumnado. Ninguna explicación magistral puede superar los 15 minutos seguidos.

FASES DE LA SECUENCIA (en este orden; pueden agruparse si hay pocas sesiones): Activación y reto → Indagación o exploración → Estructuración del saber → Aplicación y producción → Producto final y difusión → Reflexión y metacognición. Rotula cada actividad con su fase entre corchetes justo después de los dos puntos.

DENSIDAD: el número de actividades de una situación de aprendizaje debe estar entre la mitad y el total de sus sesiones, con un mínimo de 4. Una actividad puede ocupar una o varias sesiones. La suma de las sesiones asignadas a las actividades debe ser EXACTAMENTE igual al número de sesiones de la situación de aprendizaje.

INCLUSIÓN: no repitas la misma frase en todas las actividades. Cada una debe recoger medidas DIFERENTES y aplicables a ESA actividad, formuladas según los tres principios del Diseño Universal para el Aprendizaje (implicación, representación, y acción y expresión), e indicando si son medidas ordinarias (niveles I-II) o específicas (niveles III-IV).
`;

/**
 * Recordatorio de nivel de concreción (P2): la programación de aula DESCRIBE las
 * actividades; los enunciados y materiales se redactan al desarrollarlas (pasos 6 y 7).
 */
const SDA_DETAIL_LEVEL_NOTE = `
NIVEL DE DETALLE EN ESTE DOCUMENTO: describe cada actividad en una o dos líneas dentro de la celda de la tabla, en registro técnico de programación. NO redactes aquí el enunciado para el alumnado, ni los pasos, ni las preguntas, ni las fichas de trabajo: eso pertenece al desarrollo posterior de cada actividad.
`;

/**
 * Playbooks por metodología (P10): cada metodología marcada aporta instrucciones
 * operativas, en lugar de llegar al prompt como una etiqueta suelta.
 */
const METHODOLOGY_PLAYBOOKS: Record<string, (context: TeacherContext) => string> = {
  "Actividades prácticas": (context) => `
=== METODOLOGÍA "ACTIVIDADES PRÁCTICAS" (prioritaria en esta programación) ===

La asignatura se organiza como una sucesión de PRÁCTICAS. El alumnado las resuelve en clase y, al terminar cada una, ENTREGA lo producido durante las sesiones que haya ocupado. Esa entrega es la evidencia que se evalúa.

Al diseñar la secuencia de actividades de cada situación de aprendizaje:
1. Una actividad = una práctica con su entrega. Una práctica puede ocupar UNA sesión o VARIAS sesiones consecutivas, según su complejidad: no fuerces que todas duren lo mismo ni que haya una por sesión. Indica cuántas sesiones ocupa cada una, y recuerda que la suma debe coincidir con la duración de la situación de aprendizaje.
2. Nombra cada actividad con el formato: **Actividad N:** [Práctica] Verbo + qué se construye o resuelve + formato de la entrega. Ejemplo: "**Actividad 3:** [Práctica] Maquetar la página de inicio con CSS Grid y entregar la carpeta del proyecto comprimida".
3. En los recursos, indica también DÓNDE se entrega (aula virtual del centro, repositorio, carpeta compartida, entrega en papel) y en qué formato y nomenclatura de archivo.
4. Cada práctica debe ser resoluble por un alumno de ${context.gradeLevel} en las sesiones que le asignes, partiendo de cero, con un máximo de 10-15 minutos de explicación o demostración del docente al inicio de cada sesión. El resto del tiempo es trabajo del alumnado. En las prácticas de varias sesiones, señala qué debe estar hecho al final de cada sesión para poder comprobar el avance sin esperar a la entrega final.
5. Encadena las prácticas en dificultad creciente: las primeras guiadas paso a paso, las intermedias con autonomía parcial, las últimas abiertas. La última práctica de la situación debe ser INTEGRADORA: resuelve un encargo completo movilizando lo trabajado en las anteriores.
6. Prevé siempre una tarea de ampliación para quien termine antes y una versión reducida (mínimos exigibles) para quien no llegue: ni tiempo muerto ni alumnado descolgado.
7. Cada práctica genera una entrega calificable. Indica, por cada una, a qué criterios de evaluación X.Y contribuye y con qué instrumento se valora (rúbrica breve, lista de cotejo, checklist de requisitos técnicos).
8. Declara la política de entregas: plazo, entregas fuera de plazo, posibilidad de mejorar y volver a entregar, y qué ocurre con el alumnado que falta a alguna sesión de una práctica de varias sesiones.
9. La calificación de la situación de aprendizaje se construye principalmente con las entregas de las prácticas, no con una prueba escrita final. Si se incluye una prueba, debe ser también práctica (resolver un encargo en el ordenador o en el taller).

Nota: esta metodología es compatible con el reto y el producto final de la situación de aprendizaje. En ese caso, el producto final es el resultado de la práctica integradora y las prácticas previas son sus entregas parciales.
`,
};

const buildMethodologyPlaybooks = (context: TeacherContext): string =>
  context.methodologyPreference
    .map(m => METHODOLOGY_PLAYBOOKS[m])
    .filter(Boolean)
    .map(playbook => playbook(context))
    .join('\n');

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
  const model = getTaskModel('analysis');
  try {
    const response = await ai.models.generateContent({
      model,
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
    // Se propaga para que la interfaz pueda explicar la causa real (cuota, clave, modelo...)
    // en lugar de mostrar únicamente el aviso genérico de "información curricular parcial".
    throw tagErrorModel(e, model);
  }
};

export const generateEducationalDocument = async (
  pdfBase64: string,
  context: TeacherContext,
  docType: DocType
): Promise<string> => {
  const ai = getAiClient();
  const model = getTaskModel(docType === DocType.PROPUESTA ? 'propuesta' : 'situacion');
  let prompt = "";
  const needsString = [...context.selectedNeeds, context.otherNeeds].filter(Boolean).join(", ")
    || "sin necesidades específicas declaradas; aplica igualmente el enfoque DUA como medida universal";
  const methodologiesString = context.methodologyPreference.join(", ");
  let methodologyDetails = methodologiesString;
  if (context.methodologyDescription && context.methodologyDescription.trim()) {
    methodologyDetails += `. Descripción adicional: ${context.methodologyDescription.trim()}`;
  }
  const langInstruction = `IDIOMA DEL DOCUMENTO: ${context.language}.`;
  const contextBlock = buildContextBlock(context, needsString, methodologyDetails);
  const methodologyPlaybooks = buildMethodologyPlaybooks(context);

  if (docType === DocType.PROPUESTA) {
    prompt = `
      ${langInstruction}
      ${contextBlock}
      ${methodologyPlaybooks}
      Genera una **PROPUESTA PEDAGÓGICA DE DEPARTAMENTO**.
      IMPORTANTE: No incluyas texto introductorio ("Claro, aquí tienes..."). Empieza directamente con el título.
      
      Usa exactamente estos encabezados de nivel 2:

      # PROPUESTA PEDAGÓGICA: ${context.subject}
      ## 1. Concreción Curricular
      Detalla competencias específicas y criterios del PDF vinculados a ${context.gradeLevel}.
      IMPORTANTE: Escribe el texto COMPLETO de las Competencias Específicas. Además, detalla de forma completa el texto de los Criterios de Evaluación asociados a cada competencia, no solo su numeración.
      A continuación, redacta también los Saberes Básicos, distribuidos de forma adecuada en los bloques de contenido correspondientes extraídos de la referencia curricular.
      ## 2. Metodología y Estrategias
      Basadas en: ${methodologyDetails}.
      ## 3. Valoración general del progreso del alumnado
      Incluye subapartados para "Instrumentos de recogida de información" y "Criterios de calificación cualitativa y cuantitativa" (basado en ${context.weeklyHours}h/semana).
      ## 4. Medidas de respuesta educativa para la inclusión
      Medidas específicas para todas estas problemáticas: ${needsString}.
    `;
  } else {
    let ideasPrompt = "";
    let saCountText = `${context.numberOfSAs}`;
    
    if (context.generateFullCourse) {
      const estimatedTotalSessions = context.weeklyHours * 35; // Aproximadamente 35 semanas lectivas
      saCountText = "todas las necesarias para el curso completo (decide tú el número ideal basándote en la carga lectiva)";
      ideasPrompt = `\n\nIMPORTANTE: Ignora el número de SAs manual y genera una planificación completa anual.
      Un curso escolar tiene aproximadamente 35 semanas lectivas. Dado que esta asignatura tiene ${context.weeklyHours} horas semanales (cada hora equivale a una sesión de 55 minutos), el total de sesiones del curso debe rondar las ${estimatedTotalSessions} sesiones.
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
      ${contextBlock}
      Genera ${saCountText} **SITUACIONES DE APRENDIZAJE** detalladas para ${context.subject} (${context.gradeLevel}).
      ${ideasPrompt}

      ${PRACTICALITY_CLAUSE}
      ${SDA_DETAIL_LEVEL_NOTE}
      ${methodologyPlaybooks}

      REQUISITOS OBLIGATORIOS:
      1. Empieza el documento con un único encabezado principal (h1): # ${programacionTitle}
      2. **NUMERA SIEMPRE** las situaciones en el título (ej: 1, 2, 3...) y usa SIEMPRE encabezado de nivel 2 (h2) para cada una.
      3. Escribe el texto COMPLETO de las Competencias Específicas, sin usar puntos suspensivos ni resumirlas.
      4. Los Criterios de Evaluación deben indicarse ÚNICAMENTE con su numeración estricta (ej. 1.1, 1.2, 2.1, 3.1...) y deben aparecer justo debajo de la Competencia Específica a la que hacen referencia. IGNORA CUALQUIER PREFIJO adicional que aparezca en el PDF (ej. si en el PDF pone 5.1.1 para la CE 1, tú escribe SOLO 1.1).
      5. En la columna "Medidas de respuesta educativa para la inclusión" de la tabla de Organización, debes especificar medidas CONCRETAS que ayuden a las siguientes problemáticas del aula: ${needsString}.
      6. Los Saberes Básicos deben indicar siempre explícitamente a qué Bloque Curricular pertenecen.
      7. Debes incluir una tabla resumen al principio y una matriz de competencias al final. Traduce los títulos de estas tablas al idioma solicitado.
      8. ${context.generateFullCourse ? 'Asegúrate de repartir TODAS las competencias específicas y saberes básicos de la asignatura entre todas las situaciones de aprendizaje generadas.' : 'No fuerces la inclusión de competencias específicas o saberes básicos que no tengan sentido con la temática de la situación de aprendizaje. Es normal que en un número reducido de situaciones no se cubran todas las competencias o saberes del currículo.'}
      9. Ten siempre en cuenta que cada "sesión" tiene una duración estricta y cronometrada de 55 minutos. Una actividad puede ocupar una o varias sesiones consecutivas, pero indica siempre cuántas y asegúrate de que el trabajo cabe realmente en ese tiempo.
      10. Aplica el ESTÁNDAR DE ACTIVIDAD PRÁCTICA y las metodologías priorizadas por el departamento en la secuencia de actividades de TODAS las situaciones de aprendizaje. Deben reconocerse en el resultado.
      
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
      Duración: [N] sesiones de 55 minutos.
      [Justificación pedagógica]

      **Relación con los retos del s.XXI y los ODS:**
      [Vinculación con ODS]

      **Competencias Específicas y Criterios de Evaluación vinculados:**
      - **Competencia Específica [X]:** [Texto COMPLETO de la competencia]
        - Criterios de evaluación: [X.1], [X.2]... (Recuerda: sin prefijos extra, solo X.Y)

      **Saberes Básicos:**
      - **Bloque [Nombre del Bloque Curricular]:** [Saberes del PDF]

      **Organización:**
      Genera una fila por actividad, respetando la regla de densidad (entre la mitad y el total de las sesiones de la situación, mínimo 4 actividades) y el estándar de actividad práctica.
      Describe cada actividad en una o dos líneas: qué hace el alumnado y qué produce. NO redactes aquí el enunciado ni los pasos para el alumnado.
      La última actividad debe ser la difusión o entrega del producto final, y debe existir una actividad de reflexión o metacognición.
      ${orgHeader}
      | :--- | :--- | :--- | :--- | :--- |
      | **Actividad 1:** [Fase] Verbo de acción + qué produce el alumnado + agrupamiento | [Espacio concreto] | [N sesiones (N x 55 min)] | [Recursos concretos y contables] | [Medidas DUA distintas en cada fila para: ${needsString}] |
      | **Actividad 2:** [Fase] ... | [Espacio concreto] | [N sesiones] | [Recursos] | [Medidas DUA] |
      | [...continúa hasta cubrir la secuencia completa: la suma de sesiones de las actividades debe ser igual a la duración de la situación de aprendizaje] |

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
      model,
      contents: {
        parts: [
          ...(pdfBase64 ? [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }] : []),
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
    throw tagErrorModel(error, model);
  }
};

export interface ActivityPromptInfo {
  saTitle: string;
  activityName: string;
  instructions: string;
}

export const generateActivityDetails = async (
  pdfBase64: string,
  context: TeacherContext,
  activityInfo: ActivityPromptInfo,
  fullDocumentContext: string
): Promise<string> => {
  const ai = getAiClient();
  const model = getTaskModel('activities');
  const langInstruction = `IDIOMA DEL DOCUMENTO: ${context.language}.`;

  const needsString = [...context.selectedNeeds, context.otherNeeds].filter(Boolean).join(", ")
    || "sin necesidades específicas declaradas; aplica igualmente el enfoque DUA como medida universal";
  const methodologiesString = context.methodologyPreference.join(", ");
  let methodologyDetails = methodologiesString;
  if (context.methodologyDescription && context.methodologyDescription.trim()) {
    methodologyDetails += `. Descripción adicional: ${context.methodologyDescription.trim()}`;
  }
  const contextBlock = buildContextBlock(context, needsString, methodologyDetails);
  const methodologyPlaybooks = buildMethodologyPlaybooks(context);
  const isPracticeBased = context.methodologyPreference.includes("Actividades prácticas");

  const prompt = `
    ${langInstruction}
    ${contextBlock}
    Eres un experto pedagogo. Has generado previamente esta Programación de Aula:
    ---
    ${fullDocumentContext}
    ---
    
    Tu tarea ahora es DESARROLLAR EN PROFUNDIDAD una de las actividades de esa programación.
    Situación de Aprendizaje: "${activityInfo.saTitle}"
    Actividad a desarrollar: "${activityInfo.activityName}"
    Instrucciones específicas del usuario: "${activityInfo.instructions || 'Ninguna instrucción específica, desarrolla la actividad de forma creativa y alineada con la programación.'}"
    
    MUY IMPORTANTE: Recuerda que todas las "sesiones" del curso duran estrictamente 55 minutos. Si esta actividad requiere una sesión entera, asegúrate de que haya tareas y tiempos distribuidos realísticamente para rellenar esos 55 minutos. Si requiere varias, indícalo y desarrolla el guion de todas. No planees nada imposible de hacer en 55 minutos.

    ${PRACTICALITY_CLAUSE}
    ${methodologyPlaybooks}

    REGLA CENTRAL DE ESTE DOCUMENTO: ESCRIBE EL MATERIAL, NO LO DESCRIBAS.
    A diferencia de la programación de aula, aquí sí se redacta el material de clase. No escribas "se pedirá al alumnado que analice unos datos": escribe los datos y la pregunta literal que leerá el alumnado. No escribas "se formarán grupos con roles": escribe los roles con su nombre y sus tareas. El resultado debe poder imprimirse y llevarse a clase sin trabajo adicional.
    ${isPracticeBased ? `
    METODOLOGÍA DE PRÁCTICAS ACTIVA: el apartado 6 debe tener la forma de un enunciado de práctica listo para repartir: título, objetivo en una frase, material de partida (ficheros, datos, plantilla, medidas), requisitos numerados que debe cumplir la entrega, criterios de éxito en lenguaje de alumnado, formato y nombre del archivo o soporte de entrega, plazo, y una tarea de ampliación opcional. El apartado 7 debe ser la rúbrica de esa entrega, con los requisitos convertidos en criterios observables.
    ` : ''}
    Escribe el desarrollo completo de la actividad en formato Markdown asegurándote de incluir, AL MENOS, los siguientes apartados:
    
    # ${activityInfo.activityName}
    **Pertenece a:** ${activityInfo.saTitle}
    
    ## 1. Descripción de la actividad
    [Descripción detallada]
    
    ## 2. Contexto
    [Contexto en el que se desarrolla]
    
    ## 3. Distribución temporal
    [Tiempo estimado y cómo se distribuye]
    
    ## 4. Recursos y materiales
    [Lista detallada de recursos necesarios]
    
    ## 5. Medidas de respuesta educativa para la inclusión
    [Medidas concretas aplicables a esta actividad, basándote en las necesidades del aula indicadas en la programación]
    
    ## 6. Desarrollo de la actividad para el alumnado
    [Pasos detallados que seguirán los alumnos, explicados paso a paso]
    
    ## 7. Rúbrica de evaluación
    Genera una propuesta de rúbrica para la evaluación de esta actividad en forma de tabla.
    La máxima puntuación debe ser de 10 puntos. Establece niveles de logro claramente diferenciados.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          ...(pdfBase64 ? [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }] : []),
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Error en generación de la actividad.";
  } catch (error) {
    console.error(error);
    throw tagErrorModel(error, model);
  }
};

export const refineActivities = async (
  currentActivities: GeneratedActivity[],
  feedback: string,
  language: string
): Promise<GeneratedActivity[]> => {
  const ai = getAiClient();
  const model = getTaskModel('refine');
  const langInstruction = `EL DOCUMENTO DEBE SEGUIR ESTANDO EN: ${language}.`;
  
  const contentToRefine = JSON.stringify(currentActivities, null, 2);

  const prompt = `
    ${langInstruction}
    Has generado previamente los siguientes desarrollos de actividades (en formato JSON):
    ---
    ${contentToRefine}
    ---
    El usuario solicita los siguientes cambios o mejoras sobre el desarrollo de las actividades:
    "${feedback}"

    REGENERA la lista de actividades en formato JSON incorporando estas peticiones. 
    MANTÉN la estructura JSON exacta: un array de objetos con las propiedades "id", "saTitle", "activityName" y "content".
    El contenido ("content") debe seguir siendo Markdown con todos sus apartados bien estructurados y rúbricas.
    Devuelve ÚNICAMENTE el array JSON válido, sin delimitadores como \`\`\`json.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const resultText = response.text || "[]";
    const cleanedText = resultText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedText) as GeneratedActivity[];
  } catch (error) {
    console.error(error);
    throw tagErrorModel(error, model);
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
  const model = getTaskModel('refine');
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
      model,
      contents: {
        parts: [
          ...(pdfBase64 ? [{ inlineData: { mimeType: "application/pdf", data: pdfBase64 } }] : []),
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
    throw tagErrorModel(error, model);
  }
};
