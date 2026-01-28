import React, { useState, useEffect } from 'react';
import { Download, Edit3, Eye, ArrowLeft, Save, FileText, ChevronDown, ChevronUp, Layers, Type, LayoutTemplate, BookOpen, Bookmark } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CurriculumAnalysis } from '../types';

interface EditorProps {
  initialContent: string;
  docTitle: string;
  onRestart: () => void;
  analysisData: CurriculumAnalysis | null;
}

interface DocSection {
  id: number;
  title: string;
  content: string; // The markdown content belonging to this section
  level: number; // h1, h2, h3
}

// Structure for a detailed Learning Situation (SA)
interface SAStructure {
  contextPersonal: string;
  contextEducativo: string;
  contextSocial: string;
  contextProfesional: string;
  justification: string;
  ods: string;
  competencies: string;
  knowledge: string;
  organization: string; // Keep as string (markdown table) for complexity reasons or simplify if needed
  instruments: string;
}

const Editor: React.FC<EditorProps> = ({ initialContent, docTitle, onRestart, analysisData }) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [sections, setSections] = useState<DocSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Parse markdown into sections when entering edit mode
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
          title: "Introducción / Portada",
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

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${docTitle.replace(/\s+/g, '_')}_EduPlanner.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Analysis Summary Accordion */}
      {analysisData && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <button 
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-700">Referencia Curricular Extraída</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {analysisData.subject}
              </span>
            </div>
            {showAnalysis ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {showAnalysis && (
            <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white max-h-[300px] overflow-y-auto custom-scrollbar">
              <div>
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  Competencias Específicas
                </h4>
                <ul className="space-y-2">
                  {analysisData.competencies && analysisData.competencies.length > 0 ? (
                    analysisData.competencies.map((comp, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        {comp}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400 italic">No se detectaron competencias específicas.</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                  <Bookmark className="w-4 h-4 text-blue-500" />
                  Bloques de Saberes
                </h4>
                 <ul className="space-y-2">
                  {analysisData.blocks && analysisData.blocks.length > 0 ? (
                    analysisData.blocks.map((block, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        {block}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-slate-400 italic">No se detectaron bloques de saberes.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-10">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{docTitle}</h2>
          <p className="text-xs text-slate-500">
            {mode === 'preview' ? 'Vista Previa' : 'Modo Edición Estructurada'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              Guardar y Ver Vista Previa
            </button>
          )}
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar Markdown
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[60vh]">
        {mode === 'edit' ? (
          <div className="p-6 bg-slate-50 space-y-4">
             <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg mb-4 border border-blue-100 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Edita los campos específicos. Pulsa "Guardar" para ver el resultado final.
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
          <div className="markdown-body prose prose-slate max-w-none p-8 h-[60vh] overflow-y-auto custom-scrollbar">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex justify-start">
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

// --- Sub-component for individual section editing ---

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

  // Parse Markdown to Structured Data when expanding an SA section
  useEffect(() => {
    if (isSA && !useRaw && isExpanded && !saData) {
      const parsed = parseSAMarkdown(section.content);
      setSaData(parsed);
    }
  }, [isExpanded, isSA, useRaw, section.content, saData]);

  const parseSAMarkdown = (md: string): SAStructure => {
    // Helper to extract content between markers
    const extract = (markerStart: string, markerEnd: string | null) => {
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const startRegex = new RegExp(escapeRegExp(markerStart), 'i');
      const split = md.split(startRegex);
      if (split.length < 2) return "";
      
      let rest = split[1];
      if (markerEnd) {
        const endRegex = new RegExp(escapeRegExp(markerEnd), 'i');
        const endSplit = rest.split(endRegex);
        return endSplit[0].trim();
      }
      return rest.trim();
    };

    // Parsing the Context Table loosely (looking for pipes)
    const contextTable = extract("**Contexto:**", "**Descripción");
    const contextParts = contextTable.split('|').map(s => s.trim()).filter(s => s && !s.includes('---') && !s.includes('Personal'));
    // Attempt to grab the second row of the table (values)
    // Table structure expected: | P | E | S | P | \n |---|---|... \n | Val1 | Val2 | ... |
    const contextPersonal = contextParts.length >= 4 ? contextParts[contextParts.length - 4] : "";
    const contextEducativo = contextParts.length >= 4 ? contextParts[contextParts.length - 3] : "";
    const contextSocial = contextParts.length >= 4 ? contextParts[contextParts.length - 2] : "";
    const contextProfesional = contextParts.length >= 4 ? contextParts[contextParts.length - 1] : "";

    return {
      contextPersonal,
      contextEducativo,
      contextSocial,
      contextProfesional,
      justification: extract("**Descripción / Justificación:**", "**Relación con"),
      ods: extract("**Relación con los retos del s.XXI y los ODS:**", "**Competencias Específicas"),
      competencies: extract("**Competencias Específicas y Criterios de Evaluación vinculados:**", "**Saberes Básicos:**"),
      knowledge: extract("**Saberes Básicos:**", "**Organización:**"),
      organization: extract("**Organización:**", "**Instrumentos de recogida"),
      instruments: extract("**Instrumentos de recogida de información:**", null)
    };
  };

  const handleSAChange = (field: keyof SAStructure, value: string) => {
    if (!saData) return;
    const newData = { ...saData, [field]: value };
    setSaData(newData);
    
    // Reconstruct Markdown immediately
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
${newData.organization}

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
              {/* Context Fields */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                  Contexto
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Personal</span>
                    <input className="w-full p-2 border border-slate-200 rounded text-sm" value={saData.contextPersonal} onChange={(e) => handleSAChange('contextPersonal', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Educativo</span>
                    <input className="w-full p-2 border border-slate-200 rounded text-sm" value={saData.contextEducativo} onChange={(e) => handleSAChange('contextEducativo', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Social</span>
                    <input className="w-full p-2 border border-slate-200 rounded text-sm" value={saData.contextSocial} onChange={(e) => handleSAChange('contextSocial', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase font-semibold">Profesional</span>
                    <input className="w-full p-2 border border-slate-200 rounded text-sm" value={saData.contextProfesional} onChange={(e) => handleSAChange('contextProfesional', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                 <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                   <Type className="w-4 h-4 text-indigo-500" />
                   Descripción / Justificación
                 </label>
                 <textarea 
                   className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                   value={saData.justification}
                   onChange={(e) => handleSAChange('justification', e.target.value)}
                 />
              </div>

              {/* ODS */}
              <div>
                 <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                   <Layers className="w-4 h-4 text-emerald-500" />
                   Retos s.XXI y ODS
                 </label>
                 <textarea 
                   className="w-full min-h-[80px] p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                   value={saData.ods}
                   onChange={(e) => handleSAChange('ods', e.target.value)}
                 />
              </div>

              {/* Competencies */}
              <div>
                 <label className="text-sm font-bold text-slate-700 mb-2 block">Competencias Específicas y Criterios</label>
                 <textarea 
                   className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50"
                   value={saData.competencies}
                   onChange={(e) => handleSAChange('competencies', e.target.value)}
                   placeholder="Lista las competencias..."
                 />
              </div>

              {/* Knowledge */}
              <div>
                 <label className="text-sm font-bold text-slate-700 mb-2 block">Saberes Básicos</label>
                 <textarea 
                   className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50"
                   value={saData.knowledge}
                   onChange={(e) => handleSAChange('knowledge', e.target.value)}
                 />
              </div>

               {/* Organization (Table raw edit) */}
               <div>
                 <label className="text-sm font-bold text-slate-700 mb-2 block">Organización (Secuenciación, espacios, recursos)</label>
                 <textarea 
                   className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50"
                   value={saData.organization}
                   onChange={(e) => handleSAChange('organization', e.target.value)}
                   placeholder="Mantén el formato de tabla markdown..."
                 />
              </div>

               {/* Instruments */}
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
              placeholder="Escribe aquí el contenido de esta sección..."
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Editor;