# Propuesta de mejora de los prompts de EduPlanner AI

**Objetivo:** que las programaciones de aula y las situaciones de aprendizaje generadas contengan **actividades realmente prácticas y aplicables en un aula de instituto**, sin perder rigor normativo (LOMLOE / Conselleria d'Educació GVA) y **sin cambiar la estructura de documento ya diseñada**.

**Alcance:** este documento es solo una propuesta. No modifica ningún archivo de la aplicación. Todo el material está redactado para poder copiarse tal cual a [services/geminiService.ts](services/geminiService.ts) cuando se decida implantarlo.

**Fecha:** septiembre de 2026 · **Revisado sobre:** commit `5d372f8`

---

## 1. Resumen ejecutivo

El problema de "actividades poco prácticas" **no se debe a que el modelo no sepa proponerlas**, sino a cinco causas concretas del diseño actual de los prompts. Ordenadas por impacto estimado:

| # | Causa | Impacto | Coste de arreglo |
| --- | --- | --- | --- |
| 1 | **Las metodologías elegidas por el docente nunca llegan al prompt de SdA** (bug real, §2.1) | Muy alto | Trivial (1 línea) |
| 2 | **No existe ninguna definición de qué es una actividad práctica**: no se pide producto, ni evidencia, ni agrupamiento, ni rol del alumnado (§2.2) | Muy alto | Bajo (bloque de texto) |
| 3 | **El curso completo se genera en una sola respuesta** (~105 sesiones): el modelo comprime y lo primero que sacrifica es el detalle de las actividades (§2.3) | Alto | Medio (troceado de llamadas) |
| 4 | **Suelo de 3 actividades por SdA sin relación con las sesiones**: 12 sesiones resueltas con 3 títulos genéricos (§2.4) | Alto | Trivial (fórmula) |
| 5 | **El prompt de desarrollo de actividad pide *describir* la actividad, no *escribir el material***: por eso salen apartados metatextuales ("se propondrá al alumnado que…") en lugar de fichas usables (§2.5) | Muy alto | Bajo (reescritura del prompt) |

Con las propuestas **P1 + P2 + P3** (§5) se cubre lo esencial sin tocar una sola línea de parseo. Con **P4** se transforma el tercer nivel de concreción, que es el que el docente acaba llevando al aula.

A estas se suman dos propuestas posteriores, nacidas de la revisión del ajuste temporal y del modo de trabajo de las materias técnicas:

- **P9 · Presupuesto de sesiones calculado en código.** Hoy el encaje entre las horas semanales y las sesiones programadas se le pide al modelo con fórmulas blandas ("debe rondar") y solo en modo curso completo; nadie comprueba después que la suma cuadre. La propuesta traslada toda la aritmética a TypeScript y deja al modelo únicamente la redacción.
- **P10 · Metodología "Actividades prácticas".** Nueva opción en el paso de contexto para las materias en las que cada sesión es una práctica que el alumnado resuelve y entrega. Por construcción garantiza producto observable en cada actividad, y es la vía más corta al objetivo de este documento en Informática, Tecnología o Dibujo.

---

## 2. Diagnóstico detallado

### 2.1 Bug: la metodología no se inyecta en la rama de Situaciones de Aprendizaje

En [services/geminiService.ts:89](services/geminiService.ts) se construye `methodologyDetails` con las metodologías marcadas en el paso 2 y la descripción libre. Se usa **solo** en la rama `PROPUESTA` ([línea 109](services/geminiService.ts)). La rama `SITUACION` ([líneas 158-228](services/geminiService.ts)) **no la menciona**.

Consecuencia directa: el docente marca "Aprendizaje Basado en Proyectos", "Aprendizaje Servicio" o "Gamificación" y el generador de programación de aula **no se entera**. Al no recibir ninguna orientación metodológica, el modelo cae en su comportamiento por defecto (exposición + ejercicios), que es exactamente el problema reportado.

Lo mismo ocurre con `academicYear` (solo se usa en el título) y con `weeklyHours` (solo se usa en modo curso completo, para estimar sesiones).

### 2.2 No hay definición operativa de "actividad práctica"

El prompt actual pide literalmente:

```
Genera una tabla con al menos 3 filas (Actividad 1, Actividad 2, Actividad 3).
| **Actividad 1:** [Nombre] | [Espacio] | [Tiempo] | [Recursos] | [Medidas concretas...] |
```

`[Nombre]` es la única especificación. Sin criterio de calidad, "Introducción teórica al bloque", "Explicación del profesor" o "Realización de ejercicios" cumplen el formato perfectamente. **Nada en el prompt obliga a que exista un producto observable, un rol activo del alumnado, un agrupamiento o una evidencia evaluable.**

Faltan además dos elementos que en el diseño LOMLOE de una SdA son justamente los que *fuerzan* la practicidad: el **reto o pregunta guía** y el **producto final** con su difusión.

### 2.3 Todo el curso en una sola llamada

En modo curso completo se pide `weeklyHours × 35` sesiones (105 con 3 h/semana). Eso implica, en una única respuesta: tabla de distribución temporal, ~8-12 fichas completas de SdA con el **texto íntegro** de competencias y saberes, y una matriz final de doble entrada con todos los criterios de la asignatura.

El presupuesto de salida del modelo es finito. Cuando la estructura es larga y rígida, lo que se comprime es el contenido "opcional": las actividades pasan a ser etiquetas de una línea. Es la causa estructural de que la programación de curso completo salga sistemáticamente más superficial que una generación de 2-3 SdA.

### 2.4 Ratio actividades / sesiones sin definir

Se pide "al menos 3 filas" tanto si la SdA dura 4 sesiones como si dura 14. El modelo tiende al mínimo. Una actividad que cubre 5 sesiones es, necesariamente, una etiqueta abstracta.

El encaje con la carga lectiva tampoco está resuelto: solo existe en modo curso completo, en forma de estimación blanda, y sin ninguna verificación posterior. Se analiza en detalle en **P9**.

### 2.5 El prompt de desarrollo pide describir, no producir

[`generateActivityDetails`](services/geminiService.ts) pide "Descripción de la actividad", "Desarrollo de la actividad para el alumnado", etc. El modelo responde en **registro metatextual de programación** ("el alumnado trabajará en grupos para investigar…") en lugar de en **registro de material de aula** (el enunciado literal, las preguntas concretas, los datos, los roles, el guion de la sesión).

Es la diferencia entre *hablar de* una actividad y *entregar* la actividad. Este prompt es el que más directamente decide si el docente puede entrar a clase con el documento impreso.

### 2.6 Otras carencias normativas y técnicas detectadas

- **Sin vinculación al Perfil de salida**: no se piden los descriptores operativos de las competencias clave (CCL, CP, STEM, CD, CPSAA, CC, CE, CCEC) asociados a los criterios, que son el referente de evaluación competencial.
- **Inclusión sin marco**: se pide "medidas concretas" para una lista de necesidades, pero sin anclarlas al **DUA** (implicación / representación / acción y expresión) ni a los **niveles de respuesta educativa** de la normativa valenciana. Salen medidas genéricas y repetidas literalmente en todas las filas.
- **Rúbrica desvinculada de los criterios**: se pide "rúbrica sobre 10 puntos" sin exigir que las filas sean los criterios de evaluación `X.Y` implicados, que es lo que exige una evaluación criterial.
- **Sin guardarraíl anti-invención**: nada impide que el modelo redacte competencias o saberes que no están en el PDF aportado.
- **Sin transversales**: comprensión lectora y expresión oral, competencia digital, emprendimiento, igualdad, plan lector… no se solicitan en ningún punto.
- **`needsString` vacío**: si el docente no marca ninguna necesidad, el prompt inyecta "medidas concretas para: " sin contenido (ruido que degrada la respuesta).
- **Parámetros de llamada por defecto**: no se fija `temperature`, ni `maxOutputTokens`, ni `responseSchema` en las dos llamadas que esperan JSON ([`analyzePdfStructure`](services/geminiService.ts) y [`refineActivities`](services/geminiService.ts)).
- **Refinado sin contrato**: [`refineDocument`](services/geminiService.ts) pide "mantén la estructura" sin repetirla; en documentos largos se pierden secciones y se rompen los marcadores que la app parsea.

---

## 3. Marco normativo de referencia que deberían citar los prompts

Los prompts deben mencionar explícitamente el marco para que el modelo active el vocabulario y la lógica correctos. Referencias aplicables en la Comunitat Valenciana (**a verificar con la versión consolidada vigente por el departamento antes de implantar**, ya que la normativa autonómica se actualiza con frecuencia):

| Ámbito | Norma |
| --- | --- |
| Currículo básico ESO / Bachillerato | Real Decreto 217/2022 y Real Decreto 243/2022 |
| Currículo autonómico ESO | Decreto 107/2022, de 5 de agosto, del Consell (modificado por el Decreto 66/2024) |
| Currículo autonómico Bachillerato | Decreto 108/2022, de 5 de agosto, del Consell |
| Equidad e inclusión | Decreto 104/2018, de 27 de julio, del Consell |
| Organización de la respuesta educativa para la inclusión | Orden 20/2019, de 30 de abril (niveles de respuesta I-IV) |

Elementos que, por normativa, deberían aparecer siempre y hoy no se piden o se piden a medias:

1. **Competencias específicas** con su texto íntegro y su vinculación a **descriptores operativos del Perfil de salida**.
2. **Criterios de evaluación** como único referente de la evaluación (evaluación criterial), numerados `X.Y`.
3. **Saberes básicos** con su bloque de procedencia.
4. **Situación de aprendizaje** entendida como reto contextualizado con **producto final** y transferencia.
5. **Medidas de respuesta educativa** diferenciando **ordinarias (nivel I-II)**, de **específicas (nivel III-IV)**, y con enfoque **DUA**.
6. **Elementos transversales** y vinculación a **ODS / Agenda 2030**.
7. **Evaluación del proceso de enseñanza y de la práctica docente** (hoy ausente en la Propuesta Pedagógica).

---

## 4. Principios de diseño de los nuevos prompts

1. **Un solo contrato de formato.** La estructura de salida ya existente es un contrato con el código (ver §7). Ninguna propuesta lo rompe salvo las marcadas explícitamente como "requiere cambio de código".
2. **Contexto antes que instrucción.** Un bloque `CONTEXTO DEL AULA` único y reutilizable, construido con todos los datos del `TeacherContext`, delante de cualquier instrucción.
3. **Definir el estándar de calidad, no solo el formato.** El prompt debe decir qué es una buena actividad y qué es una mala, con ejemplos contrastados.
4. **Prohibiciones explícitas.** Los modelos responden mucho mejor a listas negras concretas ("no escribas 'introducción teórica'") que a peticiones positivas vagas ("sé práctico").
5. **Restricciones de realismo.** Un aula de instituto público real: material fungible barato, dispositivos compartidos, 55 minutos, 28-30 alumnos, sin laboratorio salvo que la materia lo tenga.
6. **Cuadre aritmético obligatorio.** Sesiones de actividades = sesiones de la SdA. Un número que debe cuadrar obliga al modelo a planificar de verdad.
7. **Autoverificación final.** Una checklist al final del prompt que el modelo debe comprobar antes de responder.
8. **Presupuesto de extensión.** Indicar rangos de palabras por apartado evita tanto la compresión como la verborrea.
9. **Dos niveles de concreción, y no confundirlos.** La aplicación produce dos documentos distintos y cada uno pide un grado de detalle distinto:
   - **Paso 5 — programación de aula (SdA).** Es el documento administrativo del departamento. La tabla de organización describe *qué será* cada actividad: una o dos líneas por celda, en registro técnico de programación. **Nunca** enunciados, ni pasos, ni materiales redactados.
   - **Pasos 6 y 7 — desarrollo de actividades.** Es el material de aula. Aquí sí se escribe el enunciado literal, el guion de la sesión, la ficha de trabajo y la rúbrica.

   Las propuestas de este documento respetan esa frontera: la cláusula de practicidad (P2) se aplica a los dos niveles, pero la regla "escribe el material, no lo describas" (P4) es exclusiva de los pasos 6 y 7.

---

## 5. Propuestas concretas

### P0 · Nueva `SYSTEM_INSTRUCTION`

> Sustituye a [services/geminiService.ts:16-27](services/geminiService.ts). Mantiene las reglas de formato actuales y añade rol territorial, guardarraíl anti-invención y estándar de concreción.

```
Eres jefe o jefa de departamento didáctico en un instituto público de la Comunitat Valenciana,
con más de quince años de aula en ESO y Bachillerato y experiencia en la redacción de
programaciones didácticas y situaciones de aprendizaje conforme a la LOMLOE y a la normativa
de la Conselleria d'Educació (Decreto 107/2022 para ESO y Decreto 108/2022 para Bachillerato,
Decreto 104/2018 y Orden 20/2019 en materia de inclusión).

Tu tarea es redactar documentos técnicos educativos a partir del currículum oficial adjunto (PDF)
y del contexto de aula proporcionado.

REGLAS ESTRICTAS DE RESPUESTA:
1. NO SALUDES, NO TE PRESENTES, NO DES EXPLICACIONES PREVIAS NI POSTERIORES.
2. NO inicies la respuesta con frases como "Como experto pedagogo...", "Aquí tienes...", "A continuación...".
3. Empieza DIRECTAMENTE con el primer encabezado Markdown del documento.
4. Sigue estrictamente la estructura Markdown solicitada: los rótulos en negrita, los encabezados
   y el número de columnas de las tablas son un contrato y no pueden alterarse ni reordenarse.
5. Usa un lenguaje técnico, inclusivo y profesional.
6. El documento debe estar escrito ÚNICA Y EXCLUSIVAMENTE en el idioma solicitado por el usuario.

REGLAS DE RIGOR:
7. NO INVENTES currículo. Las competencias específicas, los criterios de evaluación y los saberes
   básicos deben proceder literalmente del PDF adjunto. Si un dato no está en el PDF, omítelo;
   nunca lo sustituyas por una versión plausible.
8. ESCRIBE COMO QUIEN DA CLASE, NO COMO QUIEN INSPECCIONA. Prefiere siempre lo concreto y
   ejecutable a lo abstracto y declarativo. Si una frase podría aparecer igual en la programación
   de cualquier otra asignatura, reescríbela.
9. Todo lo que planifiques debe ser realizable por un docente con 28 alumnos, en sesiones de
   55 minutos, en un aula ordinaria de instituto público y con presupuesto casi nulo.
```

---

### P1 · Bloque de contexto compartido (corrige el bug de metodologías)

> Se construye una sola vez y se inserta en las cuatro llamadas de generación y refinado. Corrige de paso el `needsString` vacío.

```ts
// Pseudocódigo — inserción propuesta en generateEducationalDocument
const needsString = [...context.selectedNeeds, context.otherNeeds].filter(Boolean).join(", ")
  || "sin necesidades específicas declaradas; aplica igualmente el enfoque DUA como medida universal";

const contextBlock = `
CONTEXTO DEL AULA (úsalo en TODAS las decisiones que tomes):
- Asignatura: ${context.subject} · Curso: ${context.gradeLevel} · Curso escolar: ${context.academicYear}
- Carga lectiva: ${context.weeklyHours} sesiones semanales de 55 minutos (≈ ${context.weeklyHours * 35} sesiones anuales)
- Idioma del documento: ${context.language}
- Metodologías que el departamento ha decidido priorizar: ${methodologyDetails}
- Perfil del grupo y barreras a la inclusión: ${needsString}
`;
```

**Cambio mínimo imprescindible:** añadir `${contextBlock}` (o al menos la línea de metodologías) al inicio del prompt de la rama `SITUACION`. Es una línea de código y, por sí sola, ya cambia sustancialmente el tipo de actividades generadas.

---

### P2 · Cláusula de practicidad (núcleo de la propuesta)

> Bloque de texto reutilizable. Se inserta tanto en el prompt de SdA como en el de desarrollo de actividades. Es la pieza que responde directamente al problema detectado.

```
=== ESTÁNDAR DE ACTIVIDAD PRÁCTICA (obligatorio) ===

PRUEBA DE LA FOTOGRAFÍA: si al hacer una foto del aula durante la actividad solo se ve al
alumnado escuchando, copiando o leyendo, la actividad NO ES VÁLIDA. Reescríbela hasta que en
la foto se vea al alumnado manipulando, midiendo, construyendo, discutiendo con roles,
grabando, programando, entrevistando, resolviendo un caso real o produciendo algo.

TODA actividad debe cumplir las cuatro condiciones siguientes:
1. PRODUCTO OBSERVABLE: termina en algo que se puede recoger, ver, escuchar o guardar
   (maqueta, plano, hoja de cálculo, pódcast, cartel, informe de 1 página, código que funciona,
   dossier fotográfico, guion, mapa, prototipo, base de datos, vídeo de 90 segundos...).
2. ROL ACTIVO Y AGRUPAMIENTO EXPLÍCITO: indica si es individual, por parejas, en equipos de 3-4
   con roles asignados, o gran grupo, y qué hace exactamente el alumnado.
3. ANCLAJE REAL: el contenido se aplica a un contexto reconocible para el alumnado
   (el propio centro, el barrio, la localidad, la comarca, la Comunitat Valenciana, su vida
   cotidiana, su consumo, su entorno digital o una salida profesional concreta).
4. FACTIBILIDAD: realizable en un instituto público, con material fungible de bajo coste,
   dispositivos compartidos (1 entre 2) y en sesiones de 55 minutos. Si propones una salida
   del centro, añade siempre una alternativa equivalente dentro del aula.

VERBOS PROHIBIDOS como núcleo de una actividad (solo pueden aparecer como paso interno breve):
"introducción teórica", "explicación del profesorado", "presentación del tema", "repaso",
"lectura del libro de texto", "realización de ejercicios", "toma de apuntes", "corrección en
la pizarra", "visionado de un vídeo" (salvo con guía de observación y producto posterior),
"trabajo de investigación" a secas, "búsqueda de información en internet" a secas.

VERBOS QUE DEBES USAR: medir, construir, prototipar, desmontar, cultivar, cocinar, cartografiar,
simular, modelizar, programar, depurar, diseñar, maquetar, grabar, editar, entrevistar, encuestar,
auditar, presupuestar, dramatizar, debatir con roles asignados, arbitrar, reconstruir, catalogar,
traducir para un uso real, comisariar, divulgar, prestar un servicio a la comunidad.

EQUILIBRIO DE LA SECUENCIA (regla 70/30): como máximo el 30 % del tiempo total de la situación
de aprendizaje puede dedicarse a exposición docente, modelado o instrucción directa; el 70 %
restante debe ser trabajo del alumnado. Ninguna explicación magistral puede superar los 15 minutos
seguidos.

FASES OBLIGATORIAS de la secuencia (en este orden, pueden agruparse si hay pocas sesiones):
Activación y reto → Indagación / exploración → Estructuración del saber → Aplicación y producción
→ Producto final y difusión → Reflexión y metacognición.
Rotula cada actividad con su fase entre corchetes justo después de los dos puntos.

DENSIDAD: el número de actividades de una SdA debe estar entre la mitad y el total de sus sesiones,
con un mínimo de 4. La suma de las sesiones asignadas a las actividades debe ser EXACTAMENTE igual
al número de sesiones de la situación de aprendizaje.

INCLUSIÓN (columna de medidas): no repitas la misma frase en todas las filas. Cada fila debe
recoger medidas DIFERENTES y aplicables a ESA actividad, formuladas según los tres principios del
Diseño Universal para el Aprendizaje (implicación, representación, y acción y expresión) e
indicando si son medidas ordinarias de nivel I-II o medidas específicas de nivel III-IV.
```

**Nota sobre el nivel de detalle.** Esta cláusula fija *qué debe ser* una actividad, no *cuánto hay que escribir sobre ella*. En el prompt de la programación de aula (P3) sus exigencias se cumplen con una descripción breve dentro de la celda de la tabla; el desarrollo completo —enunciado, pasos, materiales— corresponde al prompt de los pasos 6 y 7 (P4). Conviene añadir esta frase al final del bloque cuando se inyecte en P3:

```
NIVEL DE DETALLE EN ESTE DOCUMENTO: describe cada actividad en una o dos líneas dentro de la
celda de la tabla, en registro técnico de programación. NO redactes aquí el enunciado para el
alumnado, ni los pasos, ni las preguntas, ni las fichas de trabajo: eso pertenece al desarrollo
posterior de cada actividad.
```

**Ejemplo contrastivo que conviene incluir literalmente en el prompt** (los ejemplos contrastivos son, en la práctica, el recurso más eficaz para desplazar el estilo del modelo):

```
EJEMPLO DE FILA INACEPTABLE:
| **Actividad 1:** Introducción teórica a las energías renovables | Aula | 2 sesiones | Libro, proyector | Adaptación para alumnado con NEE |

EJEMPLO DE FILA CORRECTA:
| **Actividad 1:** [Activación] Auditoría energética del propio instituto: por parejas, medir consumo real de 5 aulas con pinza amperimétrica y elaborar una ficha de datos | Aula y pasillos del centro | 2 sesiones (110 min) | 6 pinzas amperimétricas del departamento, plantilla de recogida impresa, hoja de cálculo compartida | Implicación: elección del aula a auditar. Representación: plantilla con pictogramas y ejemplo resuelto para el alumnado con dislexia. Acción y expresión: registro alternativo por audio con el móvil para el alumnado con dificultades de escritura (medidas ordinarias de nivel II) |
```

---

### P3 · Prompt reescrito de Situaciones de Aprendizaje

> Sustituye a [services/geminiService.ts:158-228](services/geminiService.ts). **Mantiene íntegros todos los rótulos, encabezados y el número de columnas**, por lo que es compatible con `markdownParser.ts` y con el modo campos del editor. Las novedades van *dentro* de apartados existentes.

```
${langInstruction}
${contextBlock}

Genera ${saCountText} **SITUACIONES DE APRENDIZAJE** para ${context.subject} (${context.gradeLevel}),
conforme al currículum oficial adjunto y al marco LOMLOE de la Comunitat Valenciana.
${ideasPrompt}

${CLAUSULA_DE_PRACTICIDAD}   ← el bloque completo de P2

REQUISITOS OBLIGATORIOS:
1. Empieza el documento con un único encabezado principal (h1): # ${programacionTitle}
2. **NUMERA SIEMPRE** las situaciones en el título (1, 2, 3...) y usa SIEMPRE encabezado de nivel 2 (h2).
3. Escribe el texto COMPLETO de las Competencias Específicas, tal y como aparece en el PDF, sin
   resumir ni usar puntos suspensivos.
4. Los Criterios de Evaluación deben indicarse ÚNICAMENTE con su numeración estricta (1.1, 1.2, 2.1...),
   justo debajo de su Competencia Específica. IGNORA cualquier prefijo adicional del PDF
   (si el PDF pone 5.1.1 para la CE 1, escribe solo 1.1).
5. Añade, entre paréntesis y tras cada criterio, los descriptores operativos del Perfil de salida
   que moviliza (por ejemplo: 1.1 (CCL2, STEM3, CD1)).
6. Los Saberes Básicos deben indicar siempre explícitamente su Bloque Curricular de procedencia.
7. Cada situación de aprendizaje debe articularse en torno a UN RETO y culminar en UN PRODUCTO FINAL
   con difusión real (exposición en el centro, publicación, presentación ante otro grupo, entrega a
   una entidad del entorno...).
8. En la columna "Medidas de respuesta educativa para la inclusión" especifica medidas CONCRETAS,
   distintas en cada fila, para: ${needsString}.
9. Incluye una tabla resumen al principio y la matriz de competencias al final. Traduce sus títulos
   al idioma solicitado.
10. ${context.generateFullCourse
      ? 'Reparte TODAS las competencias específicas y saberes básicos de la asignatura entre las situaciones generadas.'
      : 'No fuerces competencias o saberes que no encajen con la temática. Es normal que en pocas situaciones no se cubra todo el currículo.'}
11. Cada "sesión" dura estrictamente 55 minutos. No planifiques nada que no quepa en ese tiempo sin
    partirlo en varias sesiones, y descuenta siempre 5 minutos de entrada y 5 de recogida.
12. Integra de forma explícita al menos dos elementos transversales por situación (comprensión lectora
    y expresión oral, competencia digital, emprendimiento, igualdad, convivencia, salud, consumo
    responsable) y vincúlalos a los ODS.

ESTRUCTURA EXACTA DEL DOCUMENTO:

# ${programacionTitle}

[Tabla de Distribución temporal — igual que en la versión actual]

[Repite para CADA situación de aprendizaje:]

## SITUACIÓN DE APRENDIZAJE {NÚMERO}: [Título sugerente, en lenguaje de alumnado, que nombre el reto o el producto]

**Contexto:**
| Personal | Educativo | Social | Profesional |
| :--- | :--- | :--- | :--- |
| [Descripción] | [Descripción] | [Descripción] | [Descripción] |

**Descripción / Justificación:**
Reto: [pregunta o encargo real, formulado en segunda persona del plural y dirigido al alumnado]
Producto final: [qué entrega exactamente el alumnado, con formato y extensión: "un cartel A2", "un pódcast de 4 minutos", "una maqueta a escala 1:50", "un informe de 2 páginas"]
Difusión: [a quién se presenta o dónde se publica]
Duración: [N] sesiones de 55 minutos.
Justificación: [3-5 frases de justificación pedagógica y de conexión con el contexto del alumnado]

**Relación con los retos del s.XXI y los ODS:**
[Vinculación concreta con ODS numerados y con los retos del siglo XXI, evitando fórmulas genéricas]

**Competencias Específicas y Criterios de Evaluación vinculados:**
- **Competencia Específica [X]:** [Texto COMPLETO de la competencia]
  - Criterios de evaluación: [X.1] (descriptores), [X.2] (descriptores)...

**Saberes Básicos:**
- **Bloque [Nombre del Bloque Curricular]:** [Saberes del PDF]

**Organización:**
Genera una fila por actividad, respetando el estándar de actividad práctica y la regla de densidad.
Describe cada actividad en una o dos líneas: qué hace el alumnado y qué produce. No redactes aquí
el enunciado ni los pasos para el alumnado.
${orgHeader}
| :--- | :--- | :--- | :--- | :--- |
| **Actividad 1:** [Fase] Verbo de acción + qué produce el alumnado exactamente + agrupamiento | [Espacio concreto] | [N sesiones (N×55 min)] | [Recursos concretos y contables] | [Medidas DUA distintas para: ${needsString}] |
| **Actividad 2:** ... |
[...tantas filas como exija la regla de densidad; la última actividad debe ser siempre la difusión
del producto final, y debe haber una actividad final de reflexión o metacognición]

**Instrumentos de recogida de información:**
[Lista de instrumentos indicando, para cada uno: qué criterios de evaluación X.Y recoge, en qué
actividad se aplica, y si es heteroevaluación, coevaluación o autoevaluación. Al menos tres
instrumentos distintos y al menos uno que no sea una prueba escrita.]

[Al final del documento, la matriz — igual que en la versión actual]

ANTES DE RESPONDER, VERIFICA (no muestres esta comprobación en la respuesta):
□ ¿Cada actividad supera la prueba de la fotografía?
□ ¿Ninguna actividad empieza por un verbo prohibido?
□ ¿Cada SdA tiene reto, producto final y difusión?
□ ¿La suma de sesiones de las actividades coincide con la duración declarada de cada SdA?
□ ¿La suma total coincide con la carga lectiva anual declarada? (solo en curso completo)
□ ¿Las medidas de inclusión son distintas en cada fila y siguen los principios DUA?
□ ¿Las metodologías priorizadas por el departamento son reconocibles en la secuencia?
□ ¿Los criterios están numerados X.Y sin prefijos del PDF?
□ ¿Todo el documento está en el idioma solicitado?
```

---

### P4 · Prompt reescrito de desarrollo de actividad

> Sustituye a [services/geminiService.ts:264-303](services/geminiService.ts). **Es la propuesta de mayor impacto percibido**: convierte el tercer nivel de concreción en material de aula listo para imprimir. Mantiene los siete apartados actuales y añade tres.

```
${langInstruction}
${contextBlock}

Has redactado previamente esta programación de aula:
---
${fullDocumentContext}
---

Desarrolla ahora, con detalle de material de aula, la siguiente actividad:
- Situación de aprendizaje: "${activityInfo.saTitle}"
- Actividad: "${activityInfo.activityName}"
- Instrucciones del docente: "${activityInfo.instructions || 'Sin instrucciones adicionales.'}"

${CLAUSULA_DE_PRACTICIDAD}   ← el bloque completo de P2

REGLA CENTRAL: ESCRIBE EL MATERIAL, NO LO DESCRIBAS.
No redactes "se pedirá al alumnado que analice unos datos": escribe los datos y escribe la pregunta
literal que leerá el alumnado. No escribas "se formarán grupos con roles": escribe los roles con su
nombre y sus tareas. No escribas "se planteará un caso": escribe el caso completo.
El documento resultante debe poder imprimirse y llevarse a clase sin ningún trabajo adicional.

Cada sesión dura estrictamente 55 minutos. Si la actividad ocupa varias, desarrolla el guion de todas.

Redacta en Markdown, en el idioma solicitado, con esta estructura:

# ${activityInfo.activityName}
**Pertenece a:** ${activityInfo.saTitle}

## 1. Descripción de la actividad
[Qué hace el alumnado, en 4-6 frases, y qué producto entrega al terminar. Indica competencias
específicas y criterios de evaluación X.Y implicados, y el agrupamiento.]

## 2. Contexto
[Anclaje real de la actividad y conexión con el reto y el producto final de la situación de aprendizaje.]

## 3. Distribución temporal
[Guion minuto a minuto por sesión, en tabla:
| Tramo | Qué hace el alumnado | Qué hace el docente | Material |
Ejemplo de tramos: 0-5 entrada y objetivo del día · 5-15 · 15-40 · 40-50 · 50-55 cierre y recogida.
Incluye siempre el cierre y la recogida de material.]

## 4. Recursos y materiales
[Lista contable y realista, con cantidades: "12 tijeras", "1 dispositivo por pareja", "cartulinas A3
(1 por equipo)". Distingue lo que ya suele haber en el centro de lo que hay que preparar o comprar,
con coste aproximado. Añade siempre una alternativa sin dispositivos y sin conexión.]

## 5. Medidas de respuesta educativa para la inclusión
[Organizadas en los tres principios DUA (implicación, representación, acción y expresión), con
medidas específicas y distintas para cada una de las necesidades declaradas del grupo, indicando el
nivel de respuesta (ordinarias I-II frente a específicas III-IV). Nada genérico: cada medida debe
decir qué se cambia exactamente en ESTA actividad.]

## 6. Desarrollo de la actividad para el alumnado
[ESCRITO EN SEGUNDA PERSONA, DIRIGIDO AL ALUMNADO, listo para proyectar o fotocopiar. Incluye:
 - El enunciado literal del reto o encargo.
 - Los pasos numerados con lo que hay que hacer en cada uno.
 - El material de trabajo real: preguntas exactas, datos, textos breves, tabla de recogida, roles del
   equipo con sus funciones, plantilla del producto.
 - Los criterios de éxito redactados en lenguaje de alumnado ("lo habré hecho bien si...").
 - El tiempo disponible para cada paso.]

## 7. Notas para el profesorado
[Solucionario o ejemplo resuelto, errores frecuentes del alumnado y cómo intervenir, decisiones de
gestión de aula (formación de equipos, control del ruido, transiciones), y plan B si falla la
conexión, si falta material o si la sesión se acorta.]

## 8. Rúbrica de evaluación
[Tabla cuyas FILAS son los criterios de evaluación X.Y implicados (con su texto abreviado) y cuyas
COLUMNAS son cuatro niveles de logro con descriptores OBSERVABLES y diferenciados:
Insuficiente (1-4) · Suficiente-Bien (5-6) · Notable (7-8) · Sobresaliente (9-10).
Añade una columna de peso porcentual por criterio, y una fila final con la conversión a calificación
sobre 10 puntos. Los descriptores deben describir el producto y la actuación observable, nunca
actitudes vagas del tipo "muestra interés".]

EXTENSIÓN ORIENTATIVA: entre 900 y 1500 palabras, concentrando el grueso en los apartados 3, 6 y 8.
```

---

### P5 · Ampliación del prompt de Propuesta Pedagógica

> Sobre [services/geminiService.ts:96-119](services/geminiService.ts). El documento actual tiene cuatro apartados; para funcionar como documento de departamento le faltan elementos que la normativa espera. La propuesta **mantiene la numeración existente y añade a continuación**, para no romper documentos ya generados.

```
# PROPUESTA PEDAGÓGICA: ${context.subject}   (${context.gradeLevel} · ${context.academicYear})

## 1. Concreción Curricular
   [igual que ahora: competencias completas + criterios completos + saberes por bloques]
   + añadir: vinculación de cada competencia específica con los descriptores operativos del
     Perfil de salida.

## 2. Metodología y Estrategias
   [igual que ahora, basada en ${methodologyDetails}]
   + añadir: tipos de agrupamiento, organización de espacios y tiempos, y un párrafo por cada
     metodología priorizada explicando cómo se concreta en esta asignatura y en este curso
     (no definiciones de manual: decisiones de aula).

## 3. Valoración general del progreso del alumnado
   [igual que ahora: instrumentos + criterios de calificación cualitativa y cuantitativa]
   + añadir: carácter criterial de la evaluación, ponderación por competencia específica,
     evaluación continua y formativa, procedimiento de recuperación y de mejora de la
     calificación, y criterios de promoción y titulación aplicables a ${context.gradeLevel}.

## 4. Medidas de respuesta educativa para la inclusión
   [igual que ahora, para: ${needsString}]
   + añadir: distinción entre medidas ordinarias (niveles I-II) y específicas (niveles III-IV),
     enfoque DUA transversal, y procedimiento de coordinación con el departamento de orientación.

## 5. Elementos transversales y educación en valores
   [comprensión lectora y plan lector, expresión oral y escrita, competencia digital,
    emprendimiento, igualdad y coeducación, convivencia, salud, sostenibilidad y ODS,
    con la concreción de en qué momentos del curso se trabajan]

## 6. Materiales y recursos didácticos
   [recursos del departamento, digitales, espacios y su disponibilidad real]

## 7. Actividades complementarias y extraescolares
   [propuestas vinculadas a las situaciones de aprendizaje, con su trimestre y su justificación
    curricular]

## 8. Evaluación de la práctica docente y de la propia programación
   [indicadores de logro, momentos de revisión (trimestral y final), instrumentos de recogida
    (encuesta al alumnado, actas de departamento, resultados por criterio) y procedimiento de
    modificación de la programación]
```

---

### P6 · Prompts de refinado

**`refineDocument`** — el problema es que pide mantener una estructura que no describe. Propuesta: reinyectar el contrato de formato y acotar el alcance del cambio.

```
${langInstruction}
${contextBlock}

Documento actual:
---
${currentContent}
---

Petición del usuario: "${feedback}"

REGENERA el documento COMPLETO aplicando la petición, con estas condiciones:
1. Modifica ÚNICAMENTE lo que la petición implica. El resto del documento debe reproducirse
   literalmente, sin resumir, sin reordenar y sin eliminar ninguna sección.
2. CONSERVA EXACTAMENTE los rótulos estructurales, que son un contrato con la aplicación:
   los encabezados "## SITUACIÓN DE APRENDIZAJE N: ...", los rótulos en negrita
   ("**Contexto:**", "**Descripción / Justificación:**", "**Relación con los retos del s.XXI y los ODS:**",
   "**Competencias Específicas y Criterios de Evaluación vinculados:**", "**Saberes Básicos:**",
   "**Organización:**", "**Instrumentos de recogida de información:**"), el formato
   "| **Actividad N:** ... |" y las cinco columnas de la tabla de organización.
3. Si la petición afecta a actividades, respeta el estándar de actividad práctica.
4. NO añadas texto conversacional antes ni después. Solo el documento.
5. Usa el currículum adjunto para garantizar el rigor: no inventes elementos curriculares.
```

**`refineActivities`** — además del texto, conviene sustituir el parseo manual de vallas de código por `responseMimeType: "application/json"` y un `responseSchema` explícito (array de objetos `id`, `saTitle`, `activityName`, `content`). Y añadir: "conserva los ocho apartados y la rúbrica por criterios; modifica solo lo solicitado; no acortes los apartados que no cambian".

---

### P7 · Parámetros de las llamadas

| Llamada | Propuesta |
| --- | --- |
| `analyzePdfStructure` | `temperature: 0` y `responseSchema` explícito. *(La propagación del error a la interfaz ya está implementada.)* |
| `generateEducationalDocument` (SdA) | `temperature: 0.8` (la creatividad de las actividades lo agradece), `maxOutputTokens` al máximo del modelo. |
| `generateEducationalDocument` (Propuesta) | `temperature: 0.4` (documento normativo, conviene sobriedad). |
| `generateActivityDetails` | `temperature: 0.8`, `maxOutputTokens` amplio; las llamadas del bucle pueden lanzarse **en paralelo con un límite de 3 concurrentes** en lugar de secuencialmente ([ActivitiesSelection.tsx](components/ActivitiesSelection.tsx)), reduciendo mucho la espera. |
| `refineDocument` / `refineActivities` | `temperature: 0.3` (conservar es más importante que innovar). |

Añadir además `analysisData` (competencias y bloques ya extraídos) **como texto** junto al PDF: evita que el modelo tenga que releer y localizar la información en un documento de cientos de páginas y reduce las omisiones.

---

### P8 · Troceado de la generación de curso completo

Es la propuesta más costosa de implementar y la que resuelve el techo estructural (§2.3). Esquema en tres fases, transparente para el usuario:

1. **Llamada 1 — Plan maestro.** Devuelve solo la tabla de distribución temporal: título de cada SdA, reto, producto final, nº de sesiones, trimestre, competencias y bloques asignados. Barato, rápido y revisable.
2. **Llamadas 2..N — Una por SdA.** Cada una recibe el PDF, el contexto, el plan maestro y la fila que le corresponde, y devuelve **solo** su ficha completa con la secuencia detallada de actividades. Al no competir por el presupuesto de salida, cada SdA puede ser tan detallada como haga falta.
3. **Llamada final — Matriz.** Recibe las fichas generadas y produce la matriz de competencias y criterios vs SdA.

Beneficios adicionales: barra de progreso real ("Situación 4 de 9"), posibilidad de regenerar una sola SdA sin rehacer el curso, y menor riesgo de respuesta truncada. Como paso intermedio más barato, se puede ofrecer en el paso 3 una opción **"generar por trimestres"** que divida en tres llamadas.

---

---

### P9 · Presupuesto de sesiones calculado en código, no por el modelo

**Problema.** Hoy el ajuste a la carga lectiva vive entero dentro del prompt y solo en modo curso completo ([services/geminiService.ts:112-116](services/geminiService.ts)): se calcula `weeklyHours × 35` y se pide que la suma "ronde" y "se acerque" a esa cifra. Eso deja cuatro agujeros:

1. **En modo "SdA específicas" no se usa `weeklyHours` en absoluto.** Las sesiones salen únicamente del campo libre de cada ficha (`SADetail.sessions`, un texto), sin ninguna referencia a la carga del curso.
2. **Nadie comprueba la aritmética.** "Debe rondar" no obliga a cuadrar, y la fila TOTAL de la tabla de distribución temporal la calcula el propio modelo, que es precisamente la tarea que peor hace. Es habitual que la columna sume 80 y la fila TOTAL declare 105. La aplicación no valida nada.
3. **Las 35 semanas son brutas.** No descuentan sesiones de evaluación, festivos, actividades complementarias ni salidas, así que el objetivo queda por encima de lo que cabe realmente en el curso.
4. **El reparto por trimestres se pide "equitativo"** cuando los trimestres son netamente desiguales (el primero ronda 14 semanas lectivas y el tercero apenas 9).

**Principio de la propuesta:** *el modelo redacta, la aplicación cuenta.* Toda cifra que deba cuadrar se calcula en TypeScript y se inyecta en el prompt como dato cerrado.

#### a) Cálculo en código

```ts
// Constantes, idealmente configurables desde el paso 3 (Planificación)
const WEEKS_PER_TERM = [14, 12, 9];   // semanas lectivas reales por trimestre
const LOSS_FACTOR = 0.10;             // evaluaciones, festivos, complementarias, imprevistos

const usableWeeks = WEEKS_PER_TERM.map(w => w * (1 - LOSS_FACTOR));
const sessionsPerTerm = usableWeeks.map(w => Math.round(context.weeklyHours * w));
// Se ajusta el redondeo en el último trimestre para que la suma sea exacta.
const totalSessions = sessionsPerTerm.reduce((a, b) => a + b, 0);
```

Con 3 h/semana: 95 sesiones útiles (38 · 32 · 25) en lugar de las 105 teóricas de hoy.

#### b) Bloque a inyectar en el prompt (modo curso completo)

```
PRESUPUESTO DE SESIONES (cifras cerradas, NO las recalcules ni las redondees):
- Carga semanal: ${context.weeklyHours} sesiones de 55 minutos.
- Sesiones disponibles en todo el curso: ${totalSessions}
  (ya descontadas sesiones de evaluación, festivos y actividades complementarias).
- Reparto por trimestres: 1.º ${sessionsPerTerm[0]} · 2.º ${sessionsPerTerm[1]} · 3.º ${sessionsPerTerm[2]}.

REGLAS ARITMÉTICAS (obligatorias):
1. La suma de la columna "Número de Sesiones Totales" debe ser EXACTAMENTE ${totalSessions}.
2. Las sesiones de las situaciones asignadas a cada trimestre deben coincidir con el reparto
   anterior con un margen máximo de ±2 sesiones.
3. La fila TOTAL debe contener la suma real de la columna. Súmala fila a fila antes de escribirla:
   no estimes.
4. Ninguna situación de aprendizaje puede durar menos de 4 sesiones ni más de 16.
5. El número de sesiones de cada situación debe aparecer en tres sitios y coincidir en los tres:
   la tabla de distribución temporal, la línea "Duración:" de su ficha, y la suma de las sesiones
   asignadas a sus actividades en la tabla de organización.
```

#### c) Bloque equivalente para el modo "SdA específicas"

Hoy este modo genera SdA sin ninguna noción de cuánto curso ocupan. Basta con inyectar la referencia:

```
CONTEXTO DE CARGA LECTIVA (aunque solo generes ${context.numberOfSAs} situaciones):
- El curso completo dispone de ${totalSessions} sesiones de 55 minutos.
- Estas situaciones deben ocupar en conjunto ${declaredOrEstimated} sesiones, es decir, en torno
  al ${percentage} % del curso. Dimensiónalas en consecuencia: no diseñes una situación de
  20 sesiones si el docente ha pedido cubrir solo una parte del temario.
```

donde `declaredOrEstimated` es la suma de los campos `sessions` que el docente haya rellenado y, para los que deje vacíos, un reparto proporcional del resto.

#### d) Validación posterior en la aplicación

El editor ya sabe leer estas tablas: `parseGenericTable` ([components/Editor.tsx:727](components/Editor.tsx)) parsea la de distribución temporal y `parseSAMarkdown` la de organización de cada SdA. Con eso se puede añadir un aviso no bloqueante en el editor:

```ts
// Pseudocódigo
const declared = sumColumn(temporalTable, 'Número de Sesiones Totales');
if (Math.abs(declared - totalSessions) / totalSessions > 0.10) {
  warn(`La programación suma ${declared} sesiones frente a las ${totalSessions} disponibles
        (${context.weeklyHours} h/semana). Revisa la distribución temporal.`);
}
```

Tres comprobaciones útiles, todas deterministas y baratas:

| Comprobación | Aviso |
| --- | --- |
| Suma de la columna vs presupuesto del curso | "Faltan / sobran N sesiones respecto a la carga lectiva" |
| Fila TOTAL vs suma real de la columna | "La fila TOTAL no coincide con la suma real (dice X, suma Y)" |
| Sesiones de las actividades vs duración declarada de la SdA | "La SdA 3 declara 10 sesiones pero sus actividades suman 6" |

#### e) Contador en vivo en el paso de Planificación

En el modo "SdA específicas", mostrar bajo las fichas un contador del tipo **"32 de 95 sesiones del curso (34 %)"** conforme el docente rellena el campo de sesiones. Es el mismo cálculo, reutilizado, y evita que se pidan planificaciones imposibles antes siquiera de llamar a la API.

---

### P10 · Nueva metodología "Actividades prácticas"

**Qué es.** Un enfoque en el que **el tiempo de clase se dedica a resolver actividades o prácticas**, cada una de las cuales termina con una **entrega evaluable**. Es el modo de trabajo habitual en materias eminentemente prácticas —Informática, Tecnología, Digitalización, Dibujo Técnico, Tecnología e Ingeniería, Música, ciclos formativos— donde el aprendizaje se produce ejecutando y entregando, no escuchando.

La unidad de trabajo es **la práctica**, no la sesión: una práctica sencilla puede resolverse en una sesión, y una compleja puede ocupar varias sesiones consecutivas. Lo que define el enfoque no es la duración, sino que **al terminar la práctica el alumnado entrega lo producido durante esas sesiones** y esa entrega se evalúa.

No es lo mismo que ABP (un proyecto largo con un producto final único) ni que el aprendizaje cooperativo: aquí cada práctica tiene enunciado propio, entregable propio y calificación propia. Es, además, la metodología que más directamente ataca el problema de partida de este documento.

#### a) Cambio en la interfaz

Añadir la opción a la lista `METHODOLOGIES` de [components/ContextForm.tsx:26-35](components/ContextForm.tsx):

```ts
const METHODOLOGIES = [
  "Aprendizaje Basado en Proyectos (ABP)",
  "Actividades prácticas",          // ← nueva
  "Flipped Classroom",
  "Gamificación",
  ...
];
```

Conviene colocarla en segundo lugar (junto a ABP) porque será una de las más elegidas en los departamentos técnicos, y añadir un texto de ayuda bajo la lista: *"Cada sesión es una práctica que el alumnado resuelve y entrega para su evaluación."*

#### b) Playbook de metodología en el prompt

Hoy las metodologías llegan al prompt (cuando llegan, ver §2.1) como una simple lista de nombres. Una etiqueta suelta apenas condiciona la redacción. La propuesta es introducir un **diccionario de playbooks**: cada metodología marcada aporta un bloque operativo de instrucciones, y se concatenan los de las metodologías elegidas.

```ts
const METHODOLOGY_PLAYBOOKS: Record<string, string> = {
  "Actividades prácticas": `...`,   // ver más abajo
  "Aprendizaje Basado en Proyectos (ABP)": `...`,
  "Gamificación": `...`,
  // el resto puede incorporarse progresivamente
};

const playbooks = context.methodologyPreference
  .map(m => METHODOLOGY_PLAYBOOKS[m])
  .filter(Boolean)
  .join('\n\n');
```

Bloque propuesto para la nueva metodología:

```
=== METODOLOGÍA "ACTIVIDADES PRÁCTICAS" (prioritaria en esta programación) ===

La asignatura se organiza como una sucesión de PRÁCTICAS. El alumnado las resuelve en clase y,
al terminar cada una, ENTREGA lo producido durante las sesiones que haya ocupado. Esa entrega es
la evidencia que se evalúa.

Al diseñar la tabla de organización de cada situación de aprendizaje:
1. Una actividad = una práctica con su entrega. Una práctica puede ocupar UNA sesión o VARIAS
   sesiones consecutivas, según su complejidad: no fuerces que todas duren lo mismo ni que haya
   una por sesión. Indica en la columna de tiempo cuántas sesiones ocupa, y recuerda que la suma
   de todas debe coincidir con la duración de la situación de aprendizaje.
2. Nombra cada actividad con el formato: **Actividad N:** [Práctica] Verbo + qué se construye
   o resuelve + formato de la entrega.
   Ejemplo: "**Actividad 3:** [Práctica] Maquetar la página de inicio con CSS Grid y entregar
   la carpeta del proyecto comprimida".
3. En la columna de recursos, indica también DÓNDE se entrega (aula virtual del centro,
   repositorio, carpeta compartida, entrega en papel) y en qué formato y nomenclatura de archivo.
4. Cada práctica debe ser resoluble por un alumno de ${context.gradeLevel} en las sesiones que le
   asignes, partiendo de cero, con un máximo de 10-15 minutos de explicación o demostración del
   docente al inicio de cada sesión. El resto del tiempo es trabajo del alumnado.
   En las prácticas de varias sesiones, señala qué debe estar hecho al final de cada una para que
   el docente pueda comprobar el avance sin esperar a la entrega final.
5. Encadena las prácticas en dificultad creciente: las primeras guiadas paso a paso, las
   intermedias con autonomía parcial, las últimas abiertas. La última práctica de la situación
   debe ser INTEGRADORA: resuelve un encargo completo movilizando lo trabajado en las anteriores.
6. Prevé siempre una tarea de ampliación para quien termine antes y una versión reducida
   (mínimos exigibles) para quien no llegue: no dejes tiempo muerto ni alumnado descolgado.

En el apartado de instrumentos de recogida de información:
7. Cada práctica genera una entrega calificable. Indica, por cada una, a qué criterios de
   evaluación X.Y contribuye y con qué instrumento se valora (rúbrica breve, lista de cotejo,
   checklist de requisitos técnicos).
8. Declara la política de entregas: plazo, entregas fuera de plazo, posibilidad de mejorar y
   volver a entregar, y qué ocurre con el alumnado que falta a alguna sesión de una práctica
   de varias sesiones.
9. La calificación de la situación de aprendizaje se construye principalmente con las entregas
   de las prácticas, no con una prueba escrita final. Si se incluye una prueba, debe ser también
   práctica (resolver un encargo en el ordenador o en el taller).

Nota 1: esta metodología es compatible con el reto y el producto final de la situación de
aprendizaje. En ese caso, el producto final es el resultado de la práctica integradora, y las
prácticas previas son sus entregas parciales.

Nota 2: en ESTE documento describe cada práctica en una o dos líneas (qué se resuelve, qué se
entrega y en cuántas sesiones). El enunciado completo, los requisitos y la ficha de trabajo se
redactarán después, al desarrollar cada actividad por separado.
```

#### c) Efecto en el prompt de desarrollo de actividad (P4, pasos 6 y 7)

Esto afecta **solo al desarrollo de actividades** (`generateActivityDetails`, pasos 6 y 7 de la aplicación). En el paso 5, la programación de aula sigue conteniendo únicamente la descripción de la práctica y su entrega dentro de la celda de la tabla de organización: nada de enunciados.

Cuando esta metodología esté activa, el apartado 6 del desarrollo ("Desarrollo de la actividad para el alumnado") debe redactarse directamente como **el enunciado de la práctica listo para repartir**, con esta estructura añadida al final de la instrucción de P4:

```
Si la metodología incluye "Actividades prácticas", el apartado 6 debe tener la forma de un
enunciado de práctica: título, objetivo en una frase, material de partida (ficheros, datos,
plantilla, medidas), requisitos numerados que debe cumplir la entrega, criterios de éxito en
lenguaje de alumnado, formato y nombre del archivo o soporte de entrega, plazo, y una tarea de
ampliación opcional. El apartado 8 debe ser la rúbrica de esa entrega, con los requisitos
convertidos en criterios observables.
```

#### d) Efecto en la Propuesta Pedagógica (P5)

En el apartado 3 (valoración del progreso), cuando esta metodología esté marcada, pedir explícitamente el **peso de las entregas de prácticas** en la calificación, el procedimiento de recuperación de prácticas no entregadas y la relación entre prácticas y criterios de evaluación. Es la parte que el departamento tendrá que defender ante inspección, y hoy no se genera.

#### e) Ventaja colateral

Esta metodología, bien inyectada, resuelve por construcción dos de las carencias del §2: garantiza producto observable en toda actividad (la entrega es obligatoria) y ancla la evaluación en evidencias reales en lugar de en una prueba final. La densidad de actividades sigue rigiéndose por la regla de P2 (entre la mitad y el total de las sesiones, mínimo 4), porque una práctica puede ocupar varias sesiones.

## 6. Un ajuste de UI que multiplica el efecto de los prompts

Sin salir del diseño actual, dos campos nuevos en [components/PlanningForm.tsx](components/PlanningForm.tsx) darían al prompt la información que hoy tiene que inventar:

- **Recursos realmente disponibles** (casillas: aula de informática, carro de portátiles/tablets, laboratorio, taller, aula de música, huerto escolar, impresora 3D, uso de móviles permitido, patio, biblioteca). Es lo que separa una actividad práctica *plausible* de una *ejecutable en ese centro*.
- **Nivel de detalle de la secuencia** (esquemática / estándar / detallada), que se traduce en el número mínimo de actividades y en el presupuesto de extensión del prompt.

(La otra modificación de interfaz propuesta, la nueva metodología "Actividades prácticas", se detalla en **P10**, y el contador de sesiones del paso de planificación, en **P9 e**.)

Un tercer campo útil: **entorno del centro** (urbano/rural, comarca, entidades cercanas con las que se colabora), que alimenta directamente el "anclaje real" de la cláusula de practicidad.

---

## 7. Compatibilidad con el código existente

| Propuesta | ¿Rompe algún parser? | Requiere tocar código |
| --- | --- | --- |
| P0 nueva `SYSTEM_INSTRUCTION` | No | Solo el texto |
| P1 bloque de contexto / bug de metodologías | No | 1-3 líneas |
| P2 cláusula de practicidad | No | Solo el texto |
| P3 prompt de SdA reescrito | **No**, si se respetan los rótulos | Solo el texto |
| P4 prompt de actividad reescrito | No (su salida no se parsea) | Solo el texto |
| P5 Propuesta ampliada | No | Solo el texto |
| P6 refinados | No | Texto + `responseSchema` |
| P7 parámetros | No | `config` de cada llamada |
| P8 troceado | No | Sí, refactor de servicio y UI |
| P9 presupuesto de sesiones | No | Cálculo en el servicio; validación y contador, en la UI |
| P10 metodología "Actividades prácticas" | No (respeta `**Actividad N:**`) | 1 línea en `ContextForm` + playbooks en el servicio |

**Restricciones que ninguna propuesta puede saltarse** (detalladas en [CONTEXT.md](CONTEXT.md) §5):

1. El rótulo de actividad debe seguir siendo **exactamente** `| **Actividad N:** texto |`. La etiqueta de fase va **después** de los dos puntos y fuera de las negritas (`**Actividad 1:** [Activación] ...`); si se escribe `**Actividad 1 (Activación):**` la expresión regular de [utils/markdownParser.ts:29](utils/markdownParser.ts) deja de reconocerla y el paso 6 se queda vacío.
2. La tabla de organización debe mantener **cinco columnas**: una sexta se pierde al editar en modo campos.
3. No usar `<br>` ni HTML dentro de las celdas: `react-markdown` no renderiza HTML sin `rehype-raw` y aparecería como texto literal. Para separar ideas dentro de una celda, usar `·` o `;`.
4. Los nuevos contenidos de la SdA (reto, producto final, difusión, duración) deben ir **dentro** del bloque `**Descripción / Justificación:**`. Un rótulo nuevo en negrita entre `**Relación con los retos del s.XXI y los ODS:**` y `**Competencias Específicas...**` rompería la extracción por pares de [components/Editor.tsx:840-845](components/Editor.tsx).
5. **Deuda pendiente relacionada:** `parseSAMarkdown` solo reconoce los rótulos en castellano y `syncToMd` los reescribe siempre en castellano. Si se quiere modo campos en valenciano, hace falta una función `getSAFieldLabels(language)` análoga a `getOrganizationHeaders`. Mientras no exista, los documentos en valenciano solo se editan en modo texto.

---

## 8. Plan de implantación sugerido

| Fase | Contenido | Esfuerzo | Impacto en la practicidad |
| --- | --- | --- | --- |
| **1** | P1 (bug de metodologías) + P2 (cláusula de practicidad) + regla de densidad | ~1 h | Muy alto |
| **2** | P10 (metodología "Actividades prácticas" y playbooks por metodología) | ~1 h | Muy alto en materias técnicas |
| **3** | P4 (prompt de desarrollo de actividad) | ~1 h | Muy alto |
| **4** | P0 + P3 (SdA completo con reto, producto y checklist) | ~2 h | Alto |
| **5** | P9 (presupuesto de sesiones calculado y validado) | ~4 h | Alto en coherencia temporal |
| **6** | P7 (parámetros, `responseSchema`, paralelismo) + P6 (refinados) | ~3 h | Medio (fiabilidad) |
| **7** | P5 (Propuesta ampliada) + campos de recursos en la UI (§6) | ~4 h | Medio-alto |
| **8** | P8 (troceado del curso completo) | ~1-2 días | Alto en curso completo |

Las fases 1, 2 y 3 son independientes entre sí y de las demás: pueden probarse por separado sobre el mismo PDF para medir su efecto aislado. P10 y P1 conviene implantarlas juntas, porque el playbook de metodología solo sirve si la metodología llega efectivamente al prompt.

---

## 9. Cómo comprobar que ha mejorado

Antes de dar por buena cualquier fase, conviene un **A/B con el mismo PDF y el mismo contexto** (por ejemplo Biología y Geología de 3.º ESO, 3 h/semana, ABP + cooperativo, TDAH + dislexia + desconocimiento del idioma) y puntuar ambas salidas con esta rúbrica:

| Indicador | Medición | Objetivo |
| --- | --- | --- |
| Actividades con producto observable | % sobre el total de filas | ≥ 90 % |
| Actividades que empiezan por verbo prohibido | recuento | 0 |
| Ratio actividades / sesiones | media por SdA | ≥ 0,5 |
| Cuadre de sesiones (actividades vs SdA) | nº de SdA que cuadran | 100 % |
| Medidas de inclusión repetidas literalmente | % de filas duplicadas | < 10 % |
| Metodologías del docente reconocibles en la secuencia | sí/no por SdA | 100 % |
| Actividades con anclaje al entorno real | % | ≥ 60 % |
| Elementos curriculares inventados (no presentes en el PDF) | recuento | 0 |
| Apartado 6 del desarrollo redactado en 2.ª persona hacia el alumnado | sí/no | sí |
| Rúbricas cuyas filas son criterios `X.Y` | % | 100 % |
| Desviación entre sesiones programadas y carga lectiva real | % sobre el presupuesto | < 10 % |
| Fila TOTAL que coincide con la suma real de la columna | sí/no | sí |
| Con "Actividades prácticas": actividades con entrega declarada | % | 100 % |

Es un control manual, pero con dos o tres muestras basta para ver si el cambio funciona. Si en el futuro se quisiera automatizar, esta misma rúbrica sirve como prompt de un evaluador que puntúe las salidas.

---

## 10. Riesgos y contrapesos

- **Prompts más largos = más tokens de entrada.** El coste sube modestamente frente al del PDF, que ya domina el consumo. Compensa.
- **Riesgo de sobreprescripción.** Una lista muy larga de reglas puede provocar que el modelo priorice cumplirlas sobre escribir bien. Contrapeso: la cláusula de practicidad está ordenada de mayor a menor importancia y la checklist final actúa como filtro, no como contenido.
- **Riesgo de uniformidad.** Si todas las SdA acaban con el mismo esqueleto de fases, la programación se vuelve monótona. Contrapeso: indicar en el prompt que las fases pueden agruparse y que **el tipo de producto final debe variar entre situaciones** (una maqueta, un pódcast, una campaña, un informe técnico, una ruta guiada...).
- **Actividades espectaculares pero inviables.** Es el riesgo clásico al pedir "más práctico". La restricción de factibilidad y el requisito de alternativa sin salida ni dispositivos son el contrapeso; conviene no eliminarlos al recortar el prompt.
- **La normativa cambia.** Las referencias de §3 deben revisarse cada curso; conviene extraerlas a una constante del servicio para poder actualizarlas en un solo punto.
