
import React, { useState, useEffect, useRef } from 'react';
import { Download, Edit3, ArrowLeft, Save, FileText, ChevronDown, ChevronUp, Layers, Type, LayoutTemplate, FileJson, FileType, Printer, Plus, Trash2, Send, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CurriculumAnalysis } from '../types';
import CurricularReference from './CurricularReference';

interface EditorProps {
  initialContent: string;
  docTitle: string;
  onRestart: () => void;
  analysisData: CurriculumAnalysis | null;
  onRefine: (feedback: string) => Promise<string>;
}

interface DocSection {
  id: number;
  title: string;
  content: string; 
  level: number; 
}

interface ActivityRow {
  sequencing: string;
  spaces: string;
  time: string;
  resources: string;
  inclusion: string;
}

interface SAStructure {
  contextPersonal: string;
  contextEducativo: string;
  contextSocial: string;
  contextProfesional: string;
  justification: string;
  ods: string;
  competencies: string;
  knowledge: string;
  activities: ActivityRow[];
  instruments: string;
}

const Editor: React.FC<EditorProps> = ({ initialContent, docTitle, onRestart, analysisData, onRefine }) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [sections, setSections] = useState<DocSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (mode === 'edit') {
      const parsed = parseMarkdownToSections(content);
      setSections(parsed);
      if (parsed.length > 0) setExpandedSection(parsed[0].id);
    }
  }, [mode, content]);

  const parseMarkdownToSections = (md: string): DocSection[] => {
    const lines = md.split('\n');
    const result: DocSection[] = [];
    let currentSection: DocSection | null = null;
    let currentBuffer: string[] = [];
    let idCounter = 0;

    const pushCurrent = () => {
      if (currentSection) {
        currentSection.content = currentBuffer.join('\n').trim();
        result.push(currentSection);
      } else if (currentBuffer.length > 0 && currentBuffer.some(l => l.trim() !== '')) {
        result.push({
          id: idCounter++,
          title: "Portada / Introducción",
          content: currentBuffer.join('\n').trim(),
          level: 0
        });
      }
      currentBuffer = [];
    };

    const headerRegex = /^(#{1,6})\s+(.*)$/;

    for (const line of lines) {
      const match = line.match(headerRegex);
      if (match) {
        pushCurrent();
        const level = match[1].length;
        const title = match[2];
        currentSection = {
          id: idCounter++,
          title: title,
          content: "",
          level: level
        };
      } else {
        currentBuffer.push(line);
      }
    }
    pushCurrent();
    return result;
  };

  const handleSectionChange = (id: number, newContent: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  const saveSectionsToContent = () => {
    const newContent = sections.map(s => {
      if (s.level === 0) return s.content;
      return `${'#'.repeat(s.level)} ${s.title}\n\n${s.content}`;
    }).join('\n\n');
    
    setContent(newContent);
    setMode('preview');
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isRefining) return;

    setIsRefining(true);
    const feedback = chatInput;
    setChatInput('');
    
    try {
      const newContent = await onRefine(feedback);
      setContent(newContent);
      setMode('preview');
    } catch (err) {
      alert("Error al intentar ajustar el documento. Inténtalo de nuevo.");
    } finally {
      setIsRefining(false);
    }
  };

  const downloadFile = (data: Blob, filename: string) => {
    const element = document.createElement("a");
    element.href = URL.createObjectURL(data);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadMD = () => {
    const blob = new Blob([content], {type: 'text/markdown'});
    downloadFile(blob, `${docTitle.replace(/\s+/g, '_')}.md`);
  };

  const handleDownloadODT = () => {
    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docTitle}</title>
        <style>
          @page Section1 {
            size: 29.7cm 21.0cm; /* A4 Landscape */
            margin: 1.5cm;
            mso-page-orientation: landscape;
          }
          div.Section1 {
            page: Section1;
          }
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1e293b; }
          table { border-collapse: collapse; width: 100%; margin: 20px 0; table-layout: fixed; }
          th, td { border: 1px solid #94a3b8; padding: 10px; text-align: left; font-size: 9pt; vertical-align: top; word-wrap: break-word; }
          th { background-color: #f1f5f9; font-weight: bold; }
          h1 { font-size: 24pt; color: #0f172a; margin-bottom: 25pt; text-align: center; border-bottom: 2px solid #e2e8f0; }
          h2 { font-size: 18pt; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 5pt; margin-top: 35pt; }
          h3 { font-size: 13pt; color: #334155; margin-top: 20pt; }
          p { margin-bottom: 10pt; text-align: justify; }
          ul, ol { margin-bottom: 12pt; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${previewRef.current?.innerHTML || ''}
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([htmlString], {type: 'application/msword'});
    downloadFile(blob, `${docTitle.replace(/\s+/g, '_')}.doc`);
  };

  const handlePrintPDF = () => {
    setMode('preview');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full">
      {/* Main content area */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="print:hidden">
          <CurricularReference analysisData={analysisData} className="mb-6" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-10 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{docTitle}</h2>
            <p className="text-xs text-slate-500">
              {mode === 'preview' ? 'Vista Previa (Formato Horizontal)' : 'Editor de Secciones'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'preview' ? (
              <button
                onClick={() => setMode('edit')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                Modo Edición
              </button>
            ) : (
              <button
                onClick={saveSectionsToContent}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios
              </button>
            )}
            
            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

            <button
              onClick={handleDownloadMD}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              title="Descargar Markdown"
            >
              <FileJson className="w-3.5 h-3.5" /> MD
            </button>

            <button
              onClick={handleDownloadODT}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors"
              title="Descargar para Word/LibreOffice (Horizontal)"
            >
              <FileType className="w-3.5 h-3.5" /> EDITABLE
            </button>

            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-lg transition-colors"
              title="Exportar a PDF"
            >
              <Printer className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[70vh] print:border-none print:shadow-none relative">
          {isRefining && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center animate-fade-in">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <div className="text-center">
                  <h3 className="font-bold text-slate-800">Ajustando documento...</h3>
                  <p className="text-sm text-slate-500">La IA está procesando tus comentarios.</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'edit' ? (
            <div className="p-6 bg-slate-50 space-y-4">
               {sections.map((section) => (
                  <SectionEditor 
                    key={section.id} 
                    section={section} 
                    isExpanded={expandedSection === section.id}
                    onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    onChange={(newContent) => handleSectionChange(section.id, newContent)}
                    onTitleChange={(newTitle) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: newTitle } : s))}
                  />
               ))}
            </div>
          ) : (
            <div className="markdown-body prose prose-slate max-w-none p-10 min-h-[70vh] overflow-y-auto custom-scrollbar print:p-0 print:overflow-visible" ref={previewRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex justify-start print:hidden">
          <button onClick={onRestart} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
            <ArrowLeft className="w-4 h-4" /> Crear otro documento desde cero
          </button>
        </div>
      </div>

      {/* Chat Sidebar for Refinement */}
      <aside className="w-full lg:w-96 shrink-0 print:hidden space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sticky top-20">
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-700 text-sm">Asistente de Ajustes</span>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-800 leading-relaxed flex gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
              <span>¿Algo no ha salido bien? Pídeme que cambie el tono, que añada más actividades o que sea más específico con las competencias.</span>
            </div>

            <form onSubmit={handleRefineSubmit} className="space-y-3">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ej: Haz que las situaciones sean más tecnológicas y usa gamificación..."
                className="w-full min-h-[150px] p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50/50"
                disabled={isRefining}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isRefining}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Reajustar con IA
              </button>
            </form>

            <div className="pt-2">
              <p className="text-[10px] text-slate-400 text-center">
                Al reajustar, se generará una nueva versión del documento basada en tus instrucciones manteniendo el currículum.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

interface SectionEditorProps {
  section: DocSection;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (content: string) => void;
  onTitleChange: (title: string) => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, isExpanded, onToggle, onChange, onTitleChange }) => {
  const isSA = section.title.toUpperCase().includes("SITUACIÓN DE APRENDIZAJE");
  const [useRaw, setUseRaw] = useState(!isSA);
  const [saData, setSaData] = useState<SAStructure | null>(null);

  useEffect(() => {
    if (isSA && !useRaw && isExpanded) {
      setSaData(parseSAMarkdown(section.content));
    }
  }, [isExpanded, isSA, useRaw, section.content]);

  const parseSAMarkdown = (md: string): SAStructure => {
    const extract = (markerStart: string, markerEnd: string | null) => {
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const startPattern = `(?:\\*\\*${escapeRegExp(markerStart.replace(/\*\*/g, ''))}\\*\\*|${escapeRegExp(markerStart.replace(/\*\*/g, ''))})[:\\s]*`;
      const split = md.split(new RegExp(startPattern, 'i'));
      if (split.length < 2) return "";
      let rest = split[1];
      if (markerEnd) {
        const endPattern = `(?:\\*\\*${escapeRegExp(markerEnd.replace(/\*\*/g, ''))}\\*\\*|${escapeRegExp(markerEnd.replace(/\*\*/g, ''))})[:\\s]*`;
        return rest.split(new RegExp(endPattern, 'i'))[0].trim();
      }
      return rest.trim();
    };

    const ctxTable = extract("Contexto:", "Descripción");
    const ctxRows = ctxTable.split('\n').filter(l => l.includes('|') && !l.includes('---'));
    const ctxParts = ctxRows.length > 1 ? ctxRows[1].split('|').map(s => s.trim()).filter(s => s !== "") : [];

    const orgTable = extract("Organización:", "Instrumentos");
    const orgRows = orgTable.split('\n').filter(l => l.includes('|') && !l.includes('---') && !/sequenciaci|activitats/i.test(l));
    const activities: ActivityRow[] = orgRows.map(row => {
      const cols = row.split('|').map(s => s.trim()).filter(s => s !== "");
      return {
        sequencing: cols[0] || "",
        spaces: cols[1] || "",
        time: cols[2] || "",
        resources: cols[3] || "",
        inclusion: cols[4] || ""
      };
    });

    return {
      contextPersonal: ctxParts[0] || "",
      contextEducativo: ctxParts[1] || "",
      contextSocial: ctxParts[2] || "",
      contextProfesional: ctxParts[3] || "",
      justification: extract("Descripción / Justificación:", "Relación con"),
      ods: extract("Relación con los retos del s.XXI y los ODS:", "Competencias Específicas"),
      competencies: extract("Competencias Específicas y Criterios de Evaluación vinculados:", "Saberes Básicos:"),
      knowledge: extract("Saberes Básicos:", "Organización:"),
      activities: activities.length > 0 ? activities : [{ sequencing: "Actividad 1", spaces: "", time: "", resources: "", inclusion: "" }],
      instruments: extract("Instrumentos de recogida de información:", null)
    };
  };

  const syncToMd = (newData: SAStructure) => {
    const tableRows = newData.activities.map(a => 
      `| ${a.sequencing} | ${a.spaces} | ${a.time} | ${a.resources} | ${a.inclusion} |`
    ).join('\n');

    const newMd = `**Contexto:**
| Personal | Educativo | Social | Profesional |
| :--- | :--- | :--- | :--- |
| ${newData.contextPersonal} | ${newData.contextEducativo} | ${newData.contextSocial} | ${newData.contextProfesional} |

**Descripción / Justificación:**
${newData.justification}

**Relación con los retos del s.XXI y los ODS:**
${newData.ods}

**Competencias Específicas y Criterios de Evaluación vinculados:**
${newData.competencies}

**Saberes Básicos:**
${newData.knowledge}

**Organización:**
| Sequenciació d'activitats | Organització dels espais | Distribució del temps | Recursos i materials | Mesures de respuesta educativa per a la inclusió |
| :--- | :--- | :--- | :--- | :--- |
${tableRows}

**Instrumentos de recogida de información:**
${newData.instruments}`;

    onChange(newMd);
  };

  const handleSAChange = (field: keyof SAStructure, value: any) => {
    if (!saData) return;
    const updated = { ...saData, [field]: value };
    setSaData(updated);
    syncToMd(updated);
  };

  const updateActivity = (index: number, field: keyof ActivityRow, value: string) => {
    if (!saData) return;
    const newActs = [...saData.activities];
    newActs[index] = { ...newActs[index], [field]: value };
    handleSAChange('activities', newActs);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-mono text-slate-400 shrink-0">{section.level > 0 ? 'H' + section.level : 'Intro'}</span>
          <input 
            type="text" 
            value={section.title} 
            onClick={e => e.stopPropagation()} 
            onChange={e => onTitleChange(e.target.value)} 
            className="font-bold text-slate-700 bg-transparent outline-none w-full border-b border-transparent hover:border-indigo-300 focus:border-indigo-500" 
          />
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
           {isSA && <button onClick={() => setUseRaw(!useRaw)} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 transition-colors uppercase">{useRaw ? "CAMPOS" : "RAW"}</button>}
           {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white animate-fade-in-down">
          {isSA && !useRaw && saData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {['Personal', 'Educativo', 'Social', 'Profesional'].map(c => (
                  <div key={c}><span className="text-[10px] uppercase text-slate-400 font-bold">{c}</span>
                  <input className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none" value={(saData as any)[`context${c}`]} onChange={e => handleSAChange(`context${c}` as any, e.target.value)} /></div>
                ))}
              </div>

              <div><span className="text-xs font-bold text-slate-600 block mb-1">Descripción / Justificación</span>
              <textarea className="w-full min-h-[80px] p-2 border rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={saData.justification} onChange={e => handleSAChange('justification', e.target.value)} /></div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" />
                    Secuencia de Actividades
                  </span>
                  <button onClick={() => handleSAChange('activities', [...saData.activities, { sequencing: `Actividad ${saData.activities.length+1}`, spaces: "", time: "", resources: "", inclusion: "" }])} className="text-xs flex items-center gap-1 text-white bg-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-700 font-bold transition-all"><Plus className="w-3 h-3" /> Añadir Actividad</button>
                </div>
                <div className="space-y-4">
                  {saData.activities.map((act, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group animate-fade-in">
                      {saData.activities.length > 1 && (
                        <button onClick={() => handleSAChange('activities', saData.activities.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full border border-red-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Actividad / Título</span>
                          <input className="w-full p-2 border rounded text-xs bg-slate-50 font-bold text-indigo-700" value={act.sequencing} onChange={e => updateActivity(idx, 'sequencing', e.target.value)} />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Espacios</span>
                          <input className="w-full p-2 border rounded text-xs" value={act.spaces} onChange={e => updateActivity(idx, 'spaces', e.target.value)} />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Tiempo</span>
                          <input className="w-full p-2 border rounded text-xs" value={act.time} onChange={e => updateActivity(idx, 'time', e.target.value)} />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Recursos</span>
                          <input className="w-full p-2 border rounded text-xs" value={act.resources} onChange={e => updateActivity(idx, 'resources', e.target.value)} />
                        </div>
                      </div>
                      <div className="mt-3 bg-indigo-50/30 p-2 rounded">
                         <span className="text-[9px] uppercase font-bold text-indigo-400">Medidas de Inclusión / DUA</span>
                         <input className="w-full p-2 border border-indigo-100 rounded text-xs bg-white" value={act.inclusion} onChange={e => updateActivity(idx, 'inclusion', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="text-xs font-bold text-slate-600 block mb-1">Competencias y Criterios</span>
                <textarea className="w-full min-h-[120px] p-2 border rounded text-[11px] font-mono bg-slate-50 leading-relaxed" value={saData.competencies} onChange={e => handleSAChange('competencies', e.target.value)} /></div>
                <div><span className="text-xs font-bold text-slate-600 block mb-1">Saberes Básicos</span>
                <textarea className="w-full min-h-[120px] p-2 border rounded text-[11px] font-mono bg-slate-50 leading-relaxed" value={saData.knowledge} onChange={e => handleSAChange('knowledge', e.target.value)} /></div>
              </div>
              
              <div><span className="text-xs font-bold text-slate-600 block mb-1">Instrumentos de Evaluación</span>
              <textarea className="w-full min-h-[80px] p-2 border rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={saData.instruments} onChange={e => handleSAChange('instruments', e.target.value)} /></div>
            </div>
          ) : (
            <textarea value={section.content} onChange={e => onChange(e.target.value)} className="w-full min-h-[300px] p-3 border rounded font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed" />
          )}
        </div>
      )}
    </div>
  );
};

export default Editor;
