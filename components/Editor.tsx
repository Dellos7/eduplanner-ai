
import React, { useState, useEffect, useRef } from 'react';
import { Download, Edit3, ArrowLeft, Save, FileText, ChevronDown, ChevronUp, Layers, Type, LayoutTemplate, FileJson, FileType, Printer, Plus, Trash2, Send, MessageSquare, Loader2, Sparkles, User, Info, CheckSquare, Square, AlertCircle, XCircle } from 'lucide-react';
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
  language?: string;
  gradeLevel?: string;
  subject?: string;
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

const Editor: React.FC<EditorProps> = ({ 
  initialContent, 
  docTitle, 
  onRestart, 
  analysisData, 
  onRefine, 
  language = 'Castellano',
  gradeLevel = '',
  subject = '',
}) => {
  const [content, setContent] = useState(initialContent);
  const [teacherName, setTeacherName] = useState(localStorage.getItem('TEACHER_NAME') || '');
  const [department, setDepartment] = useState(localStorage.getItem('DEPARTMENT_NAME') || '');
  
  // Opciones de encabezado/pie de página
  const [showTeacher, setShowTeacher] = useState(true);
  const [showDepartment, setShowDepartment] = useState(true);
  const [showSubject, setShowSubject] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  const [mode, setMode] = useState<'edit' | 'preview'>('preview');
  const [sections, setSections] = useState<DocSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Estado para mensajes de error de validación visuales
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    localStorage.setItem('TEACHER_NAME', teacherName);
  }, [teacherName]);
  
  useEffect(() => {
    localStorage.setItem('DEPARTMENT_NAME', department);
  }, [department]);

  // Limpiar error cuando el usuario empieza a corregirlo
  useEffect(() => {
    if (validationError) setValidationError(null);
  }, [teacherName, department, showTeacher, showDepartment]);

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
      alert("Error al intentar ajustar el documento.");
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

  // Validar requisitos previos a la exportación con Feedback VISUAL
  const validateExport = (): boolean => {
    setValidationError(null);
    
    if (showTeacher && !teacherName.trim()) {
      setValidationError("⚠️ Falta el Nombre del Docente (escríbelo o desmarca la casilla).");
      return false;
    }
    if (showDepartment && !department.trim()) {
      setValidationError("⚠️ Falta el Departamento (escríbelo o desmarca la casilla).");
      return false;
    }
    return true;
  };

  const handleDownloadMD = () => {
    if (!validateExport()) return;
    const blob = new Blob([content], {type: 'text/markdown'});
    downloadFile(blob, `${docTitle.replace(/\s+/g, '_')}.md`);
  };

  // --- LOGICA DE EXPORTACIÓN DOC/ODT ---
  const handleDownloadDoc = () => {
    if (!validateExport()) return;

    // Construcción dinámica de celdas según checkboxes
    let leftCellContent = "";
    if (showTeacher && teacherName) leftCellContent += `<strong>Profesor:</strong> ${teacherName} `;
    if (showTeacher && teacherName && showDepartment && department) leftCellContent += " | ";
    if (showDepartment && department) leftCellContent += `<strong>Dpto:</strong> ${department}`;

    let rightCellContent = "";
    if (showSubject) rightCellContent = `<strong>${subject}</strong> (${gradeLevel})`;

    const pageNumberField = showPageNumbers ? `<span style='mso-field-code:" PAGE "'></span>` : "";

    const headerFooterContent = `
      <table id='hrdftrtbl' border='0' cellspacing='0' cellpadding='0' style='margin:0in 0in 0in 900in; width:1px; height:1px; overflow:hidden;'>
        <tr>
          <td>
            <div style='mso-element:header' id=h1>
              <table border=0 cellspacing=0 cellpadding=0 style='border-collapse:collapse;border:none;width:100%'>
                <tr>
                  <td style='border:none;border-bottom:solid #6366f1 1.0pt;padding:0cm 0cm 4.0pt 0cm' valign=top>
                    <p style='margin:0cm;font-size:10.0pt;font-family:"Arial",sans-serif;color:#64748b'>
                      ${leftCellContent}
                    </p>
                  </td>
                  <td style='border:none;border-bottom:solid #6366f1 1.0pt;padding:0cm 0cm 4.0pt 0cm' valign=top align=right>
                    <p style='margin:0cm;font-size:10.0pt;font-family:"Arial",sans-serif;color:#64748b'>
                      ${rightCellContent}
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </td>
          <td>
            <div style='mso-element:footer' id=f1>
              <p class=MsoFooter align=right style='text-align:right'>
                <span style='font-size:9.0pt;font-family:"Arial",sans-serif;color:#94a3b8'>
                  ${pageNumberField}
                </span>
              </p>
            </div>
          </td>
        </tr>
      </table>
    `;

    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docTitle}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 29.7cm 21.0cm;
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
            mso-page-orientation: landscape;
            mso-header: h1;
            mso-footer: f1;
          }
          div.Section1 { page: Section1; }
          
          table { border-collapse: collapse; width: 100%; margin: 15pt 0; border: 1px solid #000000; }
          th, td { border: 1px solid #000000; padding: 6pt; text-align: left; font-size: 10pt; vertical-align: top; }
          th { background-color: #f1f5f9; font-weight: bold; }
          
          body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.3; color: #000000; }
          h1 { font-size: 20pt; color: #000000; margin-bottom: 12pt; text-align: center; page-break-after: avoid; }
          h2 { font-size: 16pt; color: #1e293b; border-bottom: 1pt solid #cbd5e1; margin-top: 18pt; margin-bottom: 6pt; page-break-before: always; page-break-after: avoid; }
          p { margin-bottom: 8pt; text-align: justify; }

          p.MsoHeader, li.MsoHeader, div.MsoHeader { margin:0cm; margin-bottom:.0001pt; font-size:10.0pt; font-family:"Arial",sans-serif; }
          p.MsoFooter, li.MsoFooter, div.MsoFooter { margin:0cm; margin-bottom:.0001pt; font-size:10.0pt; font-family:"Arial",sans-serif; }
        </style>
      </head>
      <body>
        <div class="Section1">
          ${previewRef.current?.innerHTML || ''}
        </div>
        ${headerFooterContent}
      </body>
      </html>
    `;
    const blob = new Blob([htmlString], {type: 'application/msword'});
    downloadFile(blob, `${docTitle.replace(/\s+/g, '_')}.doc`);
  };

  // --- LOGICA DE EXPORTACIÓN PDF ---
  const handleDownloadPDF = () => {
    if (!validateExport()) return;

    setMode('preview');
    setIsGeneratingPDF(true);
    
    setTimeout(() => {
      const element = previewRef.current;
      if (!element) {
        setIsGeneratingPDF(false);
        return;
      }

      element.classList.add('pdf-export-mode');

      const opt = {
        margin:       [25, 10, 15, 10], 
        filename:     `${docTitle.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          windowHeight: element.scrollHeight,
          letterRendering: true
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak:    { mode: ['css', 'legacy'], before: 'h2' }
      };

      // @ts-ignore
      window.html2pdf()
        .from(element)
        .set(opt)
        .toPdf()
        .get('pdf')
        .then((pdf: any) => {
          const totalPages = pdf.internal.getNumberOfPages();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            
            // HEADER
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139);
            pdf.setFont("helvetica", "bold");
            
            // Construcción dinámica del header izquierdo
            let leftParts = [];
            if (showTeacher && teacherName) leftParts.push(`Profesor: ${teacherName}`);
            if (showDepartment && department) leftParts.push(`Dpto: ${department}`);
            if (leftParts.length > 0) {
              pdf.text(leftParts.join(" | "), 10, 10);
            }
            
            // Construcción dinámica del header derecho
            if (showSubject) {
              const rightText = `${subject} (${gradeLevel})`;
              const textWidth = pdf.getStringUnitWidth(rightText) * 8 / pdf.internal.scaleFactor;
              pdf.text(rightText, pageWidth - 10 - textWidth, 10);
            }
            
            // Línea separadora Header
            if (leftParts.length > 0 || showSubject) {
              pdf.setDrawColor(226, 232, 240);
              pdf.line(10, 12, pageWidth - 10, 12);
            }

            // FOOTER
            if (showPageNumbers) {
              pdf.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);
              pdf.setFontSize(8);
              const footerText = `Página ${i} de ${totalPages}`;
              const footerWidth = pdf.getStringUnitWidth(footerText) * 8 / pdf.internal.scaleFactor;
              pdf.text(footerText, pageWidth - 10 - footerWidth, pageHeight - 7);
            }
          }
        })
        .save()
        .then(() => {
          element.classList.remove('pdf-export-mode');
          setIsGeneratingPDF(false);
        })
        .catch((err: any) => {
          console.error("PDF Error:", err);
          element.classList.remove('pdf-export-mode');
          setIsGeneratingPDF(false);
          alert("Error generando PDF.");
        });
    }, 600);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full">
      <div className="flex-1 space-y-4 min-w-0">
        <div className="print:hidden">
          <CurricularReference analysisData={analysisData} className="mb-6" />
        </div>

        {/* Top Controls: Teacher Info & Export */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-20 z-10 print:hidden">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                 <User className="w-4 h-4 text-indigo-500" />
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Datos para el Encabezado</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Nombre del Docente..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ${validationError && !teacherName && showTeacher ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50/50 hover:bg-white'}`}
                />
                <input 
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Departamento Didáctico..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ${validationError && !department && showDepartment ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50/50 hover:bg-white'}`}
                />
              </div>

              {/* Checkboxes de configuración */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                 <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="checkbox" checked={showTeacher} onChange={e => setShowTeacher(e.target.checked)} className="hidden" />
                    {showTeacher ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span className={`text-xs ${showTeacher ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}>Incluir Docente</span>
                 </label>
                 <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="checkbox" checked={showDepartment} onChange={e => setShowDepartment(e.target.checked)} className="hidden" />
                    {showDepartment ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span className={`text-xs ${showDepartment ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}>Incluir Dept.</span>
                 </label>
                 <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="checkbox" checked={showSubject} onChange={e => setShowSubject(e.target.checked)} className="hidden" />
                    {showSubject ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span className={`text-xs ${showSubject ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}>Incluir Asignatura</span>
                 </label>
                 <div className="w-[1px] h-4 bg-slate-300 mx-2"></div>
                 <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="checkbox" checked={showPageNumbers} onChange={e => setShowPageNumbers(e.target.checked)} className="hidden" />
                    {showPageNumbers ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    <span className={`text-xs ${showPageNumbers ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}>Numeración Pág.</span>
                 </label>
              </div>
            </div>
            
            <div className="flex flex-col justify-end gap-2 shrink-0 border-l border-slate-100 pl-6 relative">
              {/* Notificación visual de error de validación */}
              {validationError && (
                <div className="absolute bottom-full right-0 mb-3 w-64 bg-rose-600 text-white p-3 rounded-xl text-xs font-bold shadow-xl animate-fade-in z-50 flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 shrink-0 text-rose-200 mt-0.5" />
                   <p className="leading-tight">{validationError}</p>
                   <button onClick={() => setValidationError(null)} className="ml-auto text-rose-200 hover:text-white"><XCircle className="w-4 h-4" /></button>
                   <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-rose-600 rotate-45"></div>
                </div>
              )}

              <div className="flex gap-2">
                {mode === 'preview' ? (
                  <button onClick={() => setMode('edit')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-md w-full justify-center">
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                ) : (
                  <button onClick={saveSectionsToContent} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-md w-full justify-center">
                    <Save className="w-4 h-4" /> Guardar
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button onClick={handleDownloadMD} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition-colors" title="Descargar Markdown">
                  <FileText className="w-4 h-4" /> MD
                </button>

                <button onClick={handleDownloadDoc} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors" title="Descargar Word / OpenOffice">
                  <FileType className="w-4 h-4" /> DOC
                </button>

                <button 
                  onClick={handleDownloadPDF} 
                  disabled={isGeneratingPDF}
                  title="Descargar PDF"
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-md ${isGeneratingPDF ? 'bg-slate-400 cursor-wait' : 'bg-rose-600 hover:bg-rose-700 active:scale-95'}`}
                >
                  {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {isGeneratingPDF ? '...' : 'PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contenedor del documento */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden relative">
          {isRefining && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center animate-fade-in">
              <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <h3 className="font-bold text-slate-800">Actualizando documento...</h3>
              </div>
            </div>
          )}

          {mode === 'edit' ? (
            <div className="p-6 bg-slate-50 space-y-4">
               {sections.map((section) => (
                  <SectionEditor 
                    key={section.id} 
                    section={section} 
                    language={language}
                    isExpanded={expandedSection === section.id}
                    onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    onChange={(newContent) => handleSectionChange(section.id, newContent)}
                    onTitleChange={(newTitle) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: newTitle } : s))}
                  />
               ))}
            </div>
          ) : (
            <div className={`markdown-body prose prose-slate max-w-none p-12 custom-scrollbar ${isGeneratingPDF ? '' : 'min-h-[75vh] overflow-y-auto'}`} ref={previewRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        <button onClick={onRestart} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio y descartar cambios
        </button>
      </div>

      <aside className="w-full lg:w-96 shrink-0 print:hidden">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sticky top-20">
          <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-700 text-sm">Ajustar con Inteligencia Artificial</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-800 leading-relaxed flex gap-2 italic">
              <Sparkles className="w-5 h-5 shrink-0 text-amber-500" />
              <span>Ej: "Añade más actividades de gamificación", "Cambia el tono a uno más inclusivo" o "Sé más específico en la evaluación".</span>
            </div>
            <form onSubmit={handleRefineSubmit} className="space-y-3">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe aquí tus peticiones de cambio..."
                className="w-full min-h-[180px] p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50/30"
                disabled={isRefining}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isRefining}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Actualizar Documento
              </button>
            </form>
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
  language: string;
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, isExpanded, onToggle, onChange, onTitleChange, language }) => {
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
    const orgRows = orgTable.split('\n').filter(l => l.includes('|') && !l.includes('---') && !/sequenciaci|activitats|organizac|secuenciaci/i.test(l));
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

  const getLocalizedOrgHeaders = () => {
    if (language.includes('Catalán') || language.includes('Valenciano')) {
      return "| Seqüenciació d'activitats | Organització dels espais | Distribució del temps | Recursos i materials | Mesures de resposta educativa per a la inclusió |";
    } else if (language.includes('Inglés')) {
      return "| Sequencing of activities | Organization of spaces | Time distribution | Resources and materials | Educational response measures for inclusion |";
    }
    return "| Secuenciación de actividades | Organización de espacios | Distribución del tiempo | Recursos y materiales | Medidas de respuesta educativa para la inclusión |";
  };

  const syncToMd = (newData: SAStructure) => {
    const tableRows = newData.activities.map(a => 
      `| ${a.sequencing} | ${a.spaces} | ${a.time} | ${a.resources} | ${a.inclusion} |`
    ).join('\n');

    const orgHeader = getLocalizedOrgHeaders();

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
${orgHeader}
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4 transition-all hover:border-indigo-200">
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
           {isSA && <button onClick={() => setUseRaw(!useRaw)} className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 transition-all uppercase">{useRaw ? "MODO CAMPOS" : "MODO TEXTO"}</button>}
           {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-5 space-y-4 bg-white animate-fade-in-down">
          {isSA && !useRaw && saData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['Personal', 'Educativo', 'Social', 'Profesional'].map(c => (
                  <div key={c}><span className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Contexto {c}</span>
                  <input className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50" value={(saData as any)[`context${c}`]} onChange={e => handleSAChange(`context${c}` as any, e.target.value)} /></div>
                ))}
              </div>

              <div><span className="text-xs font-bold text-slate-600 block mb-1">Descripción / Justificación</span>
              <textarea className="w-full min-h-[100px] p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50" value={saData.justification} onChange={e => handleSAChange('justification', e.target.value)} /></div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                    Secuencia de Actividades
                  </span>
                  <button onClick={() => handleSAChange('activities', [...saData.activities, { sequencing: `Nueva Actividad`, spaces: "", time: "", resources: "", inclusion: "" }])} className="text-xs flex items-center gap-1 text-white bg-indigo-600 px-4 py-1.5 rounded-lg hover:bg-indigo-700 font-bold transition-all shadow-sm"><Plus className="w-3.5 h-3.5" /> Añadir Actividad</button>
                </div>
                <div className="space-y-4">
                  {saData.activities.map((act, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group animate-fade-in">
                      {saData.activities.length > 1 && (
                        <button onClick={() => handleSAChange('activities', saData.activities.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-red-50 text-red-500 p-1.5 rounded-lg border border-red-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Título de Actividad</span>
                          <input className="w-full p-2.5 border rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50/30" value={act.sequencing} onChange={(e) => updateActivity(idx, 'sequencing', e.target.value)} />
                        </div>
                        <div><span className="text-[10px] uppercase font-bold text-slate-400">Espacios</span>
                        <input className="w-full p-2.5 border rounded-lg text-xs" value={act.spaces} onChange={e => updateActivity(idx, 'spaces', e.target.value)} /></div>
                        <div><span className="text-[10px] uppercase font-bold text-slate-400">Tiempo</span>
                        <input className="w-full p-2.5 border rounded-lg text-xs" value={act.time} onChange={e => updateActivity(idx, 'time', e.target.value)} /></div>
                        <div><span className="text-[10px] uppercase font-bold text-slate-400">Recursos</span>
                        <input className="w-full p-2.5 border rounded-lg text-xs" value={act.resources} onChange={e => updateActivity(idx, 'resources', e.target.value)} /></div>
                      </div>
                      <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                         <span className="text-[10px] uppercase font-bold text-slate-400 mb-1 block tracking-wider">Medidas de Inclusión / DUA</span>
                         <input className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white" value={act.inclusion} onChange={e => updateActivity(idx, 'inclusion', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><span className="text-xs font-bold text-slate-600 block mb-1">Competencias y Criterios vinculados</span>
                <textarea className="w-full min-h-[140px] p-3 border rounded-xl text-[11px] font-mono bg-slate-50/50 leading-relaxed" value={saData.competencies} onChange={e => handleSAChange('competencies', e.target.value)} /></div>
                <div><span className="text-xs font-bold text-slate-600 block mb-1">Saberes Básicos</span>
                <textarea className="w-full min-h-[140px] p-3 border rounded-xl text-[11px] font-mono bg-slate-50/50 leading-relaxed" value={saData.knowledge} onChange={e => handleSAChange('knowledge', e.target.value)} /></div>
              </div>
              
              <div><span className="text-xs font-bold text-slate-600 block mb-1">Instrumentos de Evaluación</span>
              <textarea className="w-full min-h-[100px] p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50" value={saData.instruments} onChange={e => handleSAChange('instruments', e.target.value)} /></div>
            </div>
          ) : (
            <textarea value={section.content} onChange={e => onChange(e.target.value)} className="w-full min-h-[400px] p-4 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed bg-slate-50/30 shadow-inner" />
          )}
        </div>
      )}
    </div>
  );
};

export default Editor;
