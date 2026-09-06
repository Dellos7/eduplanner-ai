# CONTEXT.md — EduPlanner AI

Documento de contexto técnico y funcional del proyecto. Describe **qué hace la aplicación, cómo está construida, cómo fluyen los datos y, sobre todo, qué prompts internos usa y de qué manera el formato de salida está acoplado al código**. Sirve como referencia para cualquier persona (o agente) que vaya a trabajar sobre el repositorio.

> Ámbito de uso: institutos de la Comunitat Valenciana (Conselleria d'Educació, Generalitat Valenciana), etapas de ESO y Bachillerato, marco LOMLOE.

---

## 1. Propósito funcional

EduPlanner AI es una **SPA de una sola sesión de trabajo** (sin backend, sin cuentas de usuario) que ayuda al profesorado a redactar dos tipos de documento a partir del PDF del currículum oficial:

1. **Propuesta Pedagógica de Departamento** (`DocType.PROPUESTA`): documento marco de la asignatura (concreción curricular, metodología, evaluación, inclusión).
2. **Situaciones de Aprendizaje** (`DocType.SITUACION`): programación de aula, ya sea de **curso completo** o de un **número concreto de SdA**, con tabla resumen de distribución temporal, fichas de SdA y matriz de competencias/criterios vs SdA.

Adicionalmente, sobre una programación ya generada, permite un tercer nivel de concreción: **desarrollar en profundidad actividades concretas** extraídas de las tablas de organización de cada SdA (descripción, temporalización, recursos, medidas de inclusión, desarrollo para el alumnado y rúbrica).

Toda la generación se hace con **Google Gemini** (modelo seleccionable desde los ajustes; por defecto `gemini-3.1-pro-preview`) enviando el **PDF del currículum como `inlineData`** en cada llamada, de modo que el modelo trabaja siempre con la fuente normativa delante.

---

## 2. Stack y ejecución

| Elemento | Detalle |
| --- | --- |
| Framework | React 19 + TypeScript, sin router (máquina de estados por `AppStep`) |
| Build | Vite 6 (`npm run dev` en el puerto 3000, `npm run build`, `npm run lint` = `tsc --noEmit`) |
| IA | `@google/genai` (SDK oficial); modelo elegido por el usuario, por defecto `gemini-3.1-pro-preview` |
| Estilos | Tailwind vía CDN (`index.html`) + CSS propio para `.markdown-body`, impresión y modo PDF |
| Render Markdown | `react-markdown` + `remark-gfm` (necesario para tablas) |
| Exportación | `jspdf` + `dom-to-image-more` (PDF por rasterizado), HTML-Word (`.doc`), Markdown, JSON |
| Iconos | `lucide-react` |
| Persistencia | **Solo `localStorage`** (no hay servidor) |

### Clave de API y modelo

`services/aiClient.ts:getAiClient()` resuelve la clave en este orden:

1. `localStorage.GEMINI_API_KEY` (introducida por el usuario en el modal de ajustes, `components/SettingsModal.tsx`).
2. `process.env.API_KEY`, inyectada en build por `vite.config.ts` desde la variable de entorno `GEMINI_API_KEY`.

Si no hay ninguna, se lanza error y `App.tsx` muestra un aviso bloqueante en el paso 1.

El **modelo** se elige desde el modal de ajustes y se guarda en `localStorage.GEMINI_MODEL` (`services/modelService.ts`). Si no hay ninguno guardado se usa `DEFAULT_MODEL` (`gemini-3.1-pro-preview`). El modal ofrece una lista sugerida, un botón **"Detectar modelos disponibles"** que consulta `ai.models.list()` con la clave del usuario, y un campo libre para escribir cualquier identificador. El modelo activo se muestra como distintivo en la cabecera y se usa en las cinco llamadas del servicio.

> Nota de seguridad: la clave viaja en el bundle del navegador y las llamadas a Gemini salen desde el cliente. Es aceptable para uso individual del docente con su propia clave, pero no para un despliegue multiusuario.

---

## 3. Flujo de la aplicación (máquina de estados)

`types.ts:AppStep` define los pasos; `App.tsx` los orquesta y pinta la barra de navegación (se puede retroceder a pasos ya superados, nunca avanzar saltando).

```
UPLOAD → (análisis automático del PDF) → CONTEXT → PLANNING → SELECT_TYPE → GENERATING → EDITOR
                                                                                          ├→ ACTIVITIES_SELECTION → ACTIVITIES_RESULTS
                                                                                          └→ (refinado por chat, vuelve a EDITOR)
HISTORY (acceso lateral desde UPLOAD)
```

### 3.1 UPLOAD — `components/FileUpload.tsx`

Dos zonas de arrastre:

- **PDF del currículum** (máx. 20 MB) → se convierte a base64 y se guarda en el estado `pdfBase64`. Al soltarlo se dispara **automáticamente** `analyzePdfStructure`.
- **JSON de proyecto** previamente exportado → `handleJsonImport` restaura `docType`, `teacherContext`, `analysisData`, `content`, `activities`, nombre del docente y departamento, y salta directamente al `EDITOR`.

### 3.2 Análisis automático del currículum

`analyzePdfStructure()` pide a Gemini un JSON con `subject`, `grade`, `competencies[]`, `blocks[]` (ver §4.1). El resultado precarga la asignatura y el curso del formulario y alimenta:

- `components/CurricularReference.tsx`: desplegable "Referencia Curricular Extraída".
- `components/PlanningForm.tsx`: listas de checkboxes de competencias y bloques por SdA.

Si el análisis viene incompleto, `ContextForm` muestra un aviso ámbar con botón **"Reintentar análisis"**.

### 3.3 CONTEXT — `components/ContextForm.tsx`

Recoge el `TeacherContext`: asignatura, curso escolar, nivel (`1ºESO`…`2º Bachiller`), **horas semanales** (se declara explícitamente que una sesión = 55 min), idioma (Castellano / Catalán-Valenciano / Inglés), **metodologías** (lista cerrada de 8 + descripción libre) y **necesidades de inclusión** (lista cerrada de 8 + texto libre).

Listas cerradas actuales:

- Metodologías: ABP, Flipped Classroom, Gamificación, Aprendizaje Cooperativo, Instrucción Directa y Práctica, Aprendizaje Basado en Retos, ApS, Design Thinking.
- Necesidades: TDAH, Altas Capacidades, Dislexia/DEA, Medidas Nivel II, Medidas Nivel III, Desconocimiento del idioma, Problemas de conducta, Discapacidad motora. (Los "niveles" remiten a los niveles de respuesta educativa de la normativa valenciana de inclusión.)

### 3.4 PLANNING — `components/PlanningForm.tsx`

Dos modos excluyentes:

- **Curso completo** (`generateFullCourse = true`, valor por defecto): solo un campo de "ideas para el curso".
- **SdA específicas**: número de SdA (1–15) y, por cada una, una ficha con *idea/temática*, *nº de sesiones aproximado*, *competencias específicas* y *bloques de saberes* seleccionables de los extraídos del PDF.

### 3.5 SELECT_TYPE — `components/DocTypeSelector.tsx`

Campo de **título personalizado** (para el historial) y elección entre Propuesta Pedagógica y Situaciones de Aprendizaje. Al elegir se llama a `generateEducationalDocument` y el resultado se guarda en historial.

### 3.6 EDITOR — `components/Editor.tsx` (1065 líneas, el componente central)

Tres capacidades en paralelo:

1. **Vista previa** (`mode = 'preview'`): render Markdown con GFM sobre `.markdown-body`, con encabezado/pie configurables (docente, departamento, asignatura, numeración de páginas). Antes de exportar, `validateExport()` obliga a rellenar docente y departamento si sus casillas están marcadas.
2. **Edición estructurada** (`mode = 'edit'`): el Markdown se trocea por encabezados en `DocSection[]`. Cada sección se edita en **"modo campos"** o **"modo texto"**:
   - Secciones cuyo título contiene `SITUACIÓN DE APRENDIZAJE` → formulario de SdA (`parseSAMarkdown`) con los 4 contextos, justificación, ODS, competencias, saberes, **tabla de actividades editable fila a fila** (título, espacios, tiempo, recursos, inclusión) e instrumentos. Al modificar cualquier campo, `syncToMd()` **reescribe** el Markdown de la sección con la plantilla fija.
   - Secciones de "Distribución temporal" y "Matriz de competencias" → editor genérico de tabla (`parseGenericTable` / `syncGenericTableToMd`).
3. **Refinado conversacional**: caja de chat que llama a `refineDocument` con el documento completo + el feedback; la versión refinada se guarda como **nueva entrada de historial** con sufijo `(Refinado HH:MM)`.

### 3.7 ACTIVITIES_SELECTION / ACTIVITIES_RESULTS

`utils/markdownParser.ts:extractActivitiesFromMarkdown()` recorre el Markdown generado, localiza las SdA y, dentro de cada una, las filas de actividad de la tabla de organización. El usuario marca las que quiere desarrollar y puede añadir **instrucciones libres por actividad**. Después, `generateActivityDetails` se llama **una vez por actividad, secuencialmente** (bucle `for` en `ActivitiesSelection.tsx`), enviando el PDF + el documento completo como contexto. Los resultados se pueden refinar en bloque con `refineActivities` y se adjuntan al ítem de historial.

### 3.8 HISTORY — `components/History.tsx` + `services/historyService.ts`

CRUD sobre `localStorage['educational_docs_history']`: cada `HistoryItem` guarda id, título, contenido Markdown, tipo, fecha, asignatura, nivel y, opcionalmente, las actividades desarrolladas. **No se guardan ni el PDF ni el `TeacherContext`**, por lo que al recuperar un documento del historial se pierde el contexto de generación (limitación conocida, §8).

---

## 4. Inventario de prompts (`services/geminiService.ts`)

Todas las llamadas comparten `SYSTEM_INSTRUCTION` (líneas 16-27), que fija el rol ("experto pedagogo y jefe de departamento con amplia experiencia en normativa educativa (LOMLOE)") y **seis reglas de formato**: no saludar, no introducir, empezar por el encabezado Markdown, respetar la estructura pedida, lenguaje técnico e inclusivo y **escribir solo en el idioma solicitado**.

Todas usan el modelo devuelto por `getSelectedModel()`. Ninguna llamada usa `temperature`, `maxOutputTokens`, `responseSchema` ni configuración de razonamiento explícita, salvo `responseMimeType: "application/json"` en el análisis del PDF.

### 4.1 `analyzePdfStructure` (línea 38)

- Entrada: PDF en base64.
- Pide JSON con `subject`, `grade` (valor obligatorio de una lista cerrada, `"múltiple"` o `""`), `competencies[]` (cada string empieza por `CE1:`…) y `blocks[]` (cada string empieza por `Bloque X:`).
- Salida normalizada a `CurriculumAnalysis`. Ante un error, **propaga la excepción**: `App.tsx` la traduce con `parseGeminiError` y muestra la causa real (cuota, clave, modelo…), continuando igualmente al paso 2 para poder rellenar los datos a mano o reintentar.

### 4.2 `generateEducationalDocument` (línea 80) — dos ramas

**Rama PROPUESTA** (líneas 96-119). Estructura pedida: `# PROPUESTA PEDAGÓGICA: {asignatura}` + `## 1. Concreción Curricular` (texto completo de competencias, criterios y saberes por bloques) + `## 2. Metodología y Estrategias` (aquí **sí** se inyecta `methodologyDetails`) + `## 3. Valoración general del progreso del alumnado` (instrumentos y criterios de calificación, referidos a las horas semanales) + `## 4. Medidas de respuesta educativa para la inclusión` (referidas a `needsString`).

**Rama SITUACIÓN** (líneas 120-228). Es el prompt más largo y complejo. Compone:

- `saCountText` / `ideasPrompt`: en modo curso completo estima `weeklyHours × 35` sesiones y pide repartirlas; en modo SdA específicas vuelca idea, sesiones, competencias y bloques de cada ficha.
- **9 requisitos obligatorios**: título h1 fijo; SdA numeradas en h2; texto completo de las competencias; criterios **solo con numeración `X.Y`**, ignorando prefijos del PDF; medidas concretas de inclusión por actividad; saberes con su bloque explícito; tabla resumen inicial y matriz final; reparto de competencias (exhaustivo en curso completo, no forzado en SdA sueltas); **sesiones de 55 minutos estrictos**.
- **Estructura exacta**: `## Distribución temporal` (tabla SdA/sesiones/trimestre con fila TOTAL, solo en curso completo) → por cada SdA: `**Contexto:**` (tabla Personal/Educativo/Social/Profesional), `**Descripción / Justificación:**`, `**Relación con los retos del s.XXI y los ODS:**`, `**Competencias Específicas y Criterios de Evaluación vinculados:**`, `**Saberes Básicos:**`, `**Organización:**` (tabla de 5 columnas con **mínimo 3 filas** `**Actividad N:** …`), `**Instrumentos de recogida de información:**` → cierre con `## Matriz de Competencias y Criterios vs Situaciones de Aprendizaje`.
- Los encabezados de la tabla de organización se localizan según idioma en `getOrganizationHeaders()` (líneas 29-36).

### 4.3 `generateActivityDetails` (línea 255)

Recibe PDF + **documento completo generado** + título de la SdA + nombre de la actividad + instrucciones libres. Recuerda la restricción de 55 minutos y pide 7 apartados fijos: descripción, contexto, distribución temporal, recursos y materiales, medidas de inclusión, **desarrollo para el alumnado** y **rúbrica de evaluación sobre 10 puntos**.

### 4.4 `refineActivities` (línea 327)

Envía el array de actividades **serializado como JSON** + el feedback, y pide de vuelta el array JSON completo. No adjunta el PDF. El parseo se hace limpiando manualmente las vallas de código (frágil: no usa `responseSchema`).

### 4.5 `refineDocument` (línea 374)

Envía PDF + documento actual + feedback y pide **regenerar el documento entero** manteniendo "la estructura técnica de Markdown que se usó anteriormente". No repite la especificación estructural, solo la referencia.

---

## 5. Acoplamiento crítico: el formato de salida es un contrato

Este es el punto más importante para cualquier modificación de prompts. **El Markdown que produce el modelo es parseado por expresiones regulares en dos sitios**, y romper el formato rompe funcionalidades enteras de la aplicación:

| Marcador generado por el prompt | Quién lo parsea | Qué se rompe si cambia |
| --- | --- | --- |
| `## SITUACIÓN DE APRENDIZAJE N: Título` (también `SITUACIÓ D'APRENENTATGE`, `LEARNING SITUATION`) | `utils/markdownParser.ts:11` | El paso 6 no encuentra ninguna SdA → no se pueden desarrollar actividades |
| `\| **Actividad N:** Nombre \| …` (también `Activitat`, `Activity`) | `utils/markdownParser.ts:29` | No se listan actividades seleccionables |
| `**Contexto:**` … `**Descripción / Justificación:**` … `**Relación con los retos del s.XXI y los ODS:**` … `**Competencias Específicas y Criterios de Evaluación vinculados:**` … `**Saberes Básicos:**` … `**Organización:**` … `**Instrumentos de recogida de información:**` | `components/Editor.tsx:818-845` (`parseSAMarkdown`, por pares inicio/fin) | El "modo campos" de la SdA se vacía o mezcla contenidos |
| Tabla de organización con **exactamente 5 columnas** | `components/Editor.tsx:823-833` (`cols[0..4]`) | Una 6.ª columna se descarta al editar en modo campos y desaparece al sincronizar |
| Títulos `Distribución temporal` / `Matriz de competencias` (con variantes ca/en) | `components/Editor.tsx:788-790` | Se pierde el editor de tablas genérico |

Consecuencias prácticas:

- **Añadir apartados nuevos dentro de una SdA** solo es seguro si se insertan *dentro* del texto de un apartado ya existente, o si se actualiza `parseSAMarkdown` a la vez.
- `parseSAMarkdown` **solo reconoce los marcadores en castellano**, mientras que `markdownParser.ts` sí contempla valenciano e inglés. Al generar en valenciano, el modo campos de las SdA no funciona (queda en modo texto, sin pérdida de datos).
- `syncToMd()` reescribe la SdA con una plantilla **fija en castellano** salvo la cabecera de la tabla: editar en modo campos un documento en valenciano castellaniza las etiquetas.

---

## 6. Modelo de datos

```ts
TeacherContext {
  subject, gradeLevel, academicYear, weeklyHours, language,
  selectedNeeds[], otherNeeds,
  methodologyPreference[], methodologyDescription,
  generateFullCourse, fullCourseIdeas, numberOfSAs, saDetails[]
}
SADetail { idea, sessions?, competencies[], blocks[] }
CurriculumAnalysis { subject, grade, competencies[], blocks[] }
GeneratedDocument { title, content, type }
HistoryItem { id, title, content, type, date, subject, gradeLevel, activities? }
GeneratedActivity { id, saTitle, activityName, content }
```

### Claves de `localStorage`

`GEMINI_API_KEY`, `GEMINI_MODEL`, `TEACHER_NAME`, `DEPARTMENT_NAME`, `educational_docs_history`.

### Formato de exportación JSON de proyecto

`{ version: "1.0", docType, teacherContext, analysisData, content, teacherName, department, activities }` — es el único mecanismo para **conservar el contexto completo entre sesiones**; el PDF no se incluye.

---

## 7. Exportación

| Formato | Implementación | Notas |
| --- | --- | --- |
| **PDF** | `Editor.handleDownloadPDF` (línea 373): `dom-to-image-more` rasteriza la vista previa a canvas, `jsPDF` lo trocea en páginas A4 verticales, tapa los márgenes con rectángulos blancos y dibuja encabezado/pie con `pdf.text` | El texto **no es seleccionable** (es una imagen) y los cortes de página pueden partir tablas |
| **Word `.doc`** | `Editor.handleDownloadDoc` (línea 275): HTML con namespaces de Office, `@page Section1` en **A4 apaisado**, encabezado y pie por `mso-element` | Es HTML con extensión `.doc`, no OOXML; Word lo abre correctamente. La UI también enlaza a un conversor externo MD→DOCX |
| **Markdown** | Descarga directa del `content` | Formato canónico del documento |
| **JSON** | Proyecto completo reimportable | Ver §6 |
| **Copiar** | `navigator.clipboard` con el Markdown | |

---

## 8. Limitaciones y puntos frágiles conocidos

1. **La metodología seleccionada no llega al prompt de Situaciones de Aprendizaje.** `methodologyDetails` se construye en la línea 89 pero solo se inyecta en la rama PROPUESTA (línea 109). En la rama SITUACIÓN no aparece: las metodologías elegidas por el docente (ABP, gamificación, ApS…) no condicionan la generación de la programación de aula.
2. **Generación de curso completo en una sola llamada.** Se piden ~`weeklyHours × 35` sesiones (105 con 3 h/semana) con todas las fichas, la tabla resumen y la matriz final en una única respuesta. El presupuesto de salida del modelo obliga a comprimir, y lo primero que se resiente es el detalle de las actividades.
3. **Suelo de 3 actividades por SdA sin relación con el número de sesiones**: una SdA de 12 sesiones puede resolverse con 3 actividades genéricas.
4. **`analysisData` no se reinyecta como texto** en la generación: el modelo debe releer el PDF completo cada vez.
5. **`refineActivities` parsea JSON sin esquema** (`responseSchema`) y puede fallar si la respuesta se corta.
6. **El historial no guarda el contexto** (ni PDF ni `TeacherContext`): al recuperar un documento, el refinado y el desarrollo de actividades trabajan sin currículum adjunto y con un contexto parcialmente reconstruido.
7. **`needsString` puede quedar vacío** si el docente no marca ninguna necesidad, dejando en el prompt frases del tipo "medidas concretas para: " sin contenido.
8. **Sin tests ni CI**; `npm run lint` es solo `tsc --noEmit`.
9. **Coste y latencia**: cada actividad desarrollada es una llamada independiente y secuencial que reenvía el PDF completo.

---

## 9. Mapa rápido de archivos

```
App.tsx                        Máquina de estados, orquestación, exportación JSON global
types.ts                       Enums y modelo de datos
services/geminiService.ts      TODOS los prompts y llamadas a Gemini  ← núcleo de la calidad
services/aiClient.ts           Resolución de la clave de API y creación del cliente
services/modelService.ts       Catálogo de modelos, modelo seleccionado y detección vía API
services/geminiErrors.ts       Traducción de errores de la API a mensajes accionables
services/historyService.ts     CRUD de historial en localStorage
utils/markdownParser.ts        Extracción de SdA y actividades del Markdown generado
components/FileUpload.tsx      Carga de PDF y de proyecto JSON
components/ContextForm.tsx     Paso 2: contexto docente, metodologías, inclusión
components/PlanningForm.tsx    Paso 3: curso completo vs SdA concretas
components/DocTypeSelector.tsx Paso 4: título y tipo de documento
components/Editor.tsx          Paso 5: vista previa, edición estructurada, chat, exportación
components/ActivitiesSelection.tsx  Paso 6: selección de actividades a desarrollar
components/ActivitiesResults.tsx    Paso 7: resultados y refinado de actividades
components/ErrorMessage.tsx     Tarjeta de error con causa, solución, cuenta atrás y detalle técnico
components/CurricularReference.tsx  Desplegable de competencias y bloques extraídos
components/History.tsx / SettingsModal.tsx / Layout.tsx
index.html                     Tailwind CDN + estilos .markdown-body, print y pdf-export-mode
migrated_prompt_history/       Histórico de conversación de desarrollo (AI Studio), no se usa en runtime
```
