
import React, { useState, useEffect, useRef } from 'react';
import { Download, Edit3, ArrowLeft, Save, FileText, ChevronDown, ChevronUp, Layers, Type, LayoutTemplate, FileJson, FileType, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CurriculumAnalysis } from '../types';
import CurricularReference from './CurricularReference';

interface EditorProps {
  initialContent: string;
  docTitle: string;
  onRestart: () => void;
  analysisData: CurriculumAnalysis | null;
}

interface DocSection {
  id: number;
  title: string;
  content: string; 
  level: number; 
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
  // Organización en 5 columnas
  orgSequencing: string;
  orgSpaces: string;
  orgTime: string;
  orgResources: string;
  orgInclusion: string;
  instruments: string;
}

const Editor: React.FC<EditorProps> = ({ initialContent, docTitle, onRestart, analysisData }) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [sections, setSections] = useState<DocSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
    // Generamos un HTML enriquecido que Word/LibreOffice interpretan bien como .odt/.doc
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${docTitle}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.5; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 10pt; }
        th { background-color: #f2f2f2; }
        h1 { color: #2c3e50; }
        h2 { border-bottom: 1px solid #ccc; color: #34495e; }
      </style>
      </head>
      <body>
        ${document.querySelector('.markdown-body')?.innerHTML || ''}
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], {type: 'application/vnd.oasis.opendocument.text'});
    downloadFile(blob, `${docTitle.replace(/\s+/g, '_')}.odt`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      <div className="print:hidden">
        <CurricularReference analysisData={analysisData} className="mb-6" />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-10 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{docTitle}</h2>
          <p className="text-xs text-slate-500">
            {mode === 'preview' ? 'Vista Previa' : 'Edición Estructurada'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'preview' ? (
            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              Editar Secciones
            </button>
          ) : (
            <button
              onClick={saveSectionsToContent}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Guardar y Ver
            </button>
          )}
          
          <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

          <button
            onClick={handleDownloadMD}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            title="Descargar Markdown"
          >
            <FileJson className="w-3.5 h-3.5" />
            .MD
          </button>

          <button
            onClick={handleDownloadODT}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors"
            title="Descargar ODT (LibreOffice/Word)"
          >
            <FileType className="w-3.5 h-3.5" />
            .ODT
          </button>

          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-lg transition-colors"
            title="Imprimir / Guardar PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[60vh] print:border-none print:shadow-none">
        {mode === 'edit' ? (
          <div className="p-6 bg-slate-50 space-y-4">
             <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-4 border border-blue-100 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Edita los campos específicos. Las tablas se formatearán automáticamente.
             </div>
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
          <div className="markdown-body prose prose-slate max-w-none p-8 min-h-[60vh] overflow-y-auto custom-scrollbar print:p-0 print:overflow-visible" ref={printRef}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex justify-start print:hidden">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors px-2 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Crear otro documento
        </button>
      </div>
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
      const parsed = parseSAMarkdown(section.content);
      setSaData(parsed);
    }
  }, [isExpanded, isSA, useRaw, section.content]);

  const parseSAMarkdown = (md: string): SAStructure => {
    const extract = (markerStart: string, markerEnd: string | null) => {
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cleanMarker = markerStart.replace(/\*\*/g, '');
      const pattern = `(?:\\*\\*${escapeRegExp(cleanMarker)}\\*\\*|${escapeRegExp(cleanMarker)})[:\\s]*`;
      const startRegex = new RegExp(pattern, 'i');
      const split = md.split(startRegex);
      if (split.length < 2) return "";
      let rest = split[1];
      if (markerEnd) {
        const cleanEndMarker = markerEnd.replace(/\*\*/g, '');
        const endPattern = `(?:\\*\\*${escapeRegExp(cleanEndMarker)}\\*\\*|${escapeRegExp(cleanEndMarker)})[:\\s]*`;
        const endRegex = new RegExp(endPattern, 'i');
        const endSplit = rest.split(endRegex);
        return endSplit[0].trim();
      }
      return rest.trim();
    };

    // Contexto (4 cols)
    const contextTable = extract("Contexto:", "Descripción");
    const ctxRows = contextTable.split('\n').filter(l => l.includes('|') && !l.includes('---'));
    let ctxParts = ctxRows.length > 1 ? ctxRows[1].split('|').map(s => s.trim()).filter(s => s !== "") : [];

    // Organización (5 cols)
    const orgTable = extract("Organización:", "Instrumentos");
    const orgRows = orgTable.split('\n').filter(l => l.includes('|') && !l.includes('---') && !/sequenciaci|activitats/i.test(l));
    let orgParts = orgRows.length > 0 ? orgRows[0].split('|').map(s => s.trim()).filter(s => s !== "") : [];

    return {
      contextPersonal: ctxParts[0] || "",
      contextEducativo: ctxParts[1] || "",
      contextSocial: ctxParts[2] || "",
      contextProfesional: ctxParts[3] || "",
      justification: extract("Descripción / Justificación:", "Relación con"),
      ods: extract("Relación con los retos del s.XXI y los ODS:", "Competencias Específicas"),
      competencies: extract("Competencias Específicas y Criterios de Evaluación vinculados:", "Saberes Básicos:"),
      knowledge: extract("Saberes Básicos:", "Organización:"),
      orgSequencing: orgParts[0] || "",
      orgSpaces: orgParts[1] || "",
      orgTime: orgParts[2] || "",
      orgResources: orgParts[3] || "",
      orgInclusion: orgParts[4] || "",
      instruments: extract("Instrumentos de recogida de información:", null)
    };
  };

  const handleSAChange = (field: keyof SAStructure, value: string) => {
    if (!saData) return;
    const newData = { ...saData, [field]: value };
    setSaData(newData);
    
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
| Sequenciación d'activitats | Organització dels espais | Distribució del temps | Recursos i materials | Mesures de respuesta educativa per a la inclusió |
| :--- | :--- | :--- | :--- | :--- |
| ${newData.orgSequencing} | ${newData.orgSpaces} | ${newData.orgTime} | ${newData.orgResources} | ${newData.orgInclusion} |

**Instrumentos de recogida de información:**
${newData.instruments}`;

    onChange(newMd);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all">
      <div 
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-mono text-slate-400 shrink-0">
            {section.level > 0 ? 'H' + section.level : 'Intro'}
          </span>
          {isExpanded ? (
             <input 
               type="text" 
               value={section.title}
               onClick={(e) => e.stopPropagation()}
               onChange={(e) => onTitleChange(e.target.value)}
               className="font-bold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none w-full max-w-lg"
             />
          ) : (
             <h3 className="font-bold text-slate-700 truncate">{section.title}</h3>
          )}
        </div>
        <div className="flex items-center gap-2">
           {isSA && isExpanded && (
             <button 
               onClick={(e) => { e.stopPropagation(); setUseRaw(!useRaw); }}
               className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-white"
             >
               {useRaw ? "Modo Campos" : "Modo Markdown"}
             </button>
           )}
           {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-white">
          {isSA && !useRaw && saData ? (
            <div className="space-y-6">
              {/* Contexto */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                  Contexto
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['Personal', 'Educativo', 'Social', 'Profesional'].map(c => (
                    <div key={c} className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{c}</span>
                      <input 
                        className="w-full p-2 border border-slate-200 rounded text-sm" 
                        value={(saData as any)[`context${c}`]} 
                        onChange={(e) => handleSAChange(`context${c}` as any, e.target.value)} 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Justificación y ODS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Type className="w-4 h-4 text-indigo-500" />
                    Descripción / Justificación
                  </label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm"
                    value={saData.justification}
                    onChange={(e) => handleSAChange('justification', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    Retos s.XXI y ODS
                  </label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm"
                    value={saData.ods}
                    onChange={(e) => handleSAChange('ods', e.target.value)}
                  />
                </div>
              </div>

              {/* Competencias y Saberes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Competencias y Criterios</label>
                  <textarea 
                    className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50"
                    value={saData.competencies}
                    onChange={(e) => handleSAChange('competencies', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-2 block">Saberes Básicos</label>
                  <textarea 
                    className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50"
                    value={saData.knowledge}
                    onChange={(e) => handleSAChange('knowledge', e.target.value)}
                  />
                </div>
              </div>

              {/* Organización (Tabla de 5 columnas) */}
              <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                <label className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-4">
                  <LayoutTemplate className="w-4 h-4" />
                  Organización (Tabla Multicolumna)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-600 uppercase font-bold">Sequenciación d'activitats</span>
                    <textarea className="w-full p-2 border border-indigo-200 rounded text-xs min-h-[100px]" value={saData.orgSequencing} onChange={(e) => handleSAChange('orgSequencing', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-600 uppercase font-bold">Organització espais</span>
                    <textarea className="w-full p-2 border border-indigo-200 rounded text-xs min-h-[100px]" value={saData.orgSpaces} onChange={(e) => handleSAChange('orgSpaces', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-600 uppercase font-bold">Distribució temps</span>
                    <textarea className="w-full p-2 border border-indigo-200 rounded text-xs min-h-[100px]" value={saData.orgTime} onChange={(e) => handleSAChange('orgTime', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-600 uppercase font-bold">Recursos i materials</span>
                    <textarea className="w-full p-2 border border-indigo-200 rounded text-xs min-h-[100px]" value={saData.orgResources} onChange={(e) => handleSAChange('orgResources', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-indigo-600 uppercase font-bold">Mesures inclusió</span>
                    <textarea className="w-full p-2 border border-indigo-200 rounded text-xs min-h-[100px]" value={saData.orgInclusion} onChange={(e) => handleSAChange('orgInclusion', e.target.value)} />
                  </div>
                </div>
              </div>

               <div>
                 <label className="text-sm font-bold text-slate-700 mb-2 block">Instrumentos de Evaluación</label>
                 <textarea 
                   className="w-full min-h-[80px] p-3 border border-slate-200 rounded-lg text-sm"
                   value={saData.instruments}
                   onChange={(e) => handleSAChange('instruments', e.target.value)}
                 />
              </div>

            </div>
          ) : (
            <textarea
              value={section.content}
              onChange={(e) => onChange(e.target.value)}
              className="w-full min-h-[300px] p-3 border border-slate-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Contenido en Markdown..."
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Editor;
