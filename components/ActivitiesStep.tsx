import React, { useState, useEffect } from 'react';
import { extractActivitiesFromMarkdown, ParsedActivity } from '../utils/markdownParser';
import { ActivityPromptInfo, generateActivityDetails } from '../services/geminiService';
import { TeacherContext, DocType, CurriculumAnalysis } from '../types';
import { ChevronDown, ChevronUp, CheckSquare, Square, Save, ArrowLeft, Loader2, FileDown, FileType, Printer, Copy, Check, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ActivitiesStepProps {
  markdownContent: string;
  pdfBase64: string;
  context: TeacherContext;
  onBack: () => void;
}

interface GeneratedActivity {
  id: string;
  saTitle: string;
  activityName: string;
  content: string;
}

const ActivitiesStep: React.FC<ActivitiesStepProps> = ({ markdownContent, pdfBase64, context, onBack }) => {
  const [activities, setActivities] = useState<ParsedActivity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  
  const [stage, setStage] = useState<'SELECTION' | 'GENERATING' | 'RESULTS'>('SELECTION');
  const [generatedResults, setGeneratedResults] = useState<GeneratedActivity[]>([]);
  
  const [isCopied, setIsCopied] = useState<Record<string, boolean>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  useEffect(() => {
    const extracted = extractActivitiesFromMarkdown(markdownContent);
    setActivities(extracted);
  }, [markdownContent]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSA = (saTitle: string) => {
    const saActs = activities.filter(a => a.saTitle === saTitle);
    const allSelected = saActs.every(a => selectedIds.has(a.id));
    
    const newSet = new Set(selectedIds);
    if (allSelected) {
      saActs.forEach(a => newSet.delete(a.id));
    } else {
      saActs.forEach(a => newSet.add(a.id));
    }
    setSelectedIds(newSet);
  };

  const handleInstructionChange = (id: string, text: string) => {
    setInstructions(prev => ({ ...prev, [id]: text }));
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;
    
    setStage('GENERATING');
    const results: GeneratedActivity[] = [];
    
    const selectedActivities = activities.filter(a => selectedIds.has(a.id));
    
    try {
      // In a real app we might want to do this in parallel, but to avoid rate limits 
      // or context overwhelm, let's process them sequentially.
      for (const act of selectedActivities) {
        const promptInfo: ActivityPromptInfo = {
          saTitle: act.saTitle,
          activityName: act.activityName,
          instructions: instructions[act.id] || ""
        };
        
        const content = await generateActivityDetails(pdfBase64, context, promptInfo, markdownContent);
        
        results.push({
          id: act.id,
          saTitle: act.saTitle,
          activityName: act.activityName,
          content
        });
      }
      setGeneratedResults(results);
      setStage('RESULTS');
    } catch (e) {
      console.error(e);
      alert("Hubo un error al generar las actividades. Por favor, reintenta.");
      setStage('SELECTION');
    }
  };

  const getGroupedActivities = () => {
    const groups: Record<string, ParsedActivity[]> = {};
    activities.forEach(a => {
      if (!groups[a.saTitle]) groups[a.saTitle] = [];
      groups[a.saTitle].push(a);
    });
    return groups;
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setIsCopied(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Export functions
  const getFullMarkdown = () => {
    return generatedResults.map(r => r.content).join("\n\n---\n\n");
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMD = () => {
    const blob = new Blob([getFullMarkdown()], {type: 'text/markdown'});
    downloadFile(blob, 'Desarrollo_Actividades.md');
  };

  const handleDownloadDoc = () => {
    const htmlString = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Actividades</title></head>
      <body>
        ${document.getElementById('activities-preview')?.innerHTML || ''}
      </body>
      </html>
    `;
    const blob = new Blob([htmlString], {type: 'application/msword'});
    downloadFile(blob, 'Desarrollo_Actividades.doc');
  };

  if (stage === 'GENERATING') {
    return (
      <div className="py-20 flex flex-col items-center text-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in w-full max-w-4xl mx-auto">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-xl font-bold">Desarrollando actividades...</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
          Esto puede tardar unos segundos dependiendo del número de actividades seleccionadas.
        </p>
      </div>
    );
  }

  if (stage === 'RESULTS') {
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto animate-fade-in">
        {/* Left Panel: Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-w-0">
          <div className="bg-gradient-to-r from-slate-800 to-indigo-900 px-8 py-5 text-white shrink-0 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-wide">Desarrollo de Actividades</h1>
              <p className="text-indigo-200 text-sm">{generatedResults.length} {generatedResults.length === 1 ? 'actividad desarrollada' : 'actividades desarrolladas'}</p>
            </div>
            <button onClick={() => setStage('SELECTION')} className="text-indigo-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver a selección
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 relative pb-32">
            <div id="activities-preview" className="space-y-12">
              {generatedResults.map((result) => (
                <div key={result.id} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative group">
                  <button 
                    onClick={() => handleCopy(result.id, result.content)}
                    className="absolute top-4 right-4 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                  >
                    {isCopied[result.id] ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {isCopied[result.id] ? 'Copiado' : 'Copiar Markdown'}
                  </button>
                  <div className="markdown-body text-slate-800">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Export */}
        <aside className="w-full lg:w-96 shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
               <FileDown className="w-5 h-5 text-indigo-600" />
               <h2 className="text-lg font-bold text-slate-800">Descargar/Exportar</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-slate-500 mb-2">Exporta todas las actividades desarrolladas en un único documento.</p>
              
              <button onClick={handleDownloadMD} className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition-colors" title="Descargar Markdown">
                <FileDown className="w-4 h-4" /> Descargar Todo (MD)
              </button>

              <button onClick={handleDownloadDoc} className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors" title="Descargar Word / OpenOffice">
                <FileType className="w-4 h-4" /> Descargar Todo (DOC)
              </button>

              <div className="flex gap-2 w-full mt-2">
                  <a href="https://markdowntoword.io/tools/markdown-to-docx" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 hover:bg-blue-200 rounded-lg transition-colors" title="Convertir MD a DOCX">
                    <FileType className="w-4 h-4" /> MD a DOCX
                  </a>

                  <a href="https://markdowntoword.io/tools/markdown-to-pdf" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 hover:bg-rose-200 rounded-lg transition-colors" title="Convertir MD a PDF">
                    <Printer className="w-4 h-4" /> MD a PDF
                  </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  // SELECTION STAGE
  const groupedActivities = getGroupedActivities();
  const hasActivities = Object.keys(groupedActivities).length > 0;

  return (
    <div className="flex flex-col relative w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 text-white shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-indigo-200" />
          <h2 className="text-2xl font-bold">Desarrollar Actividades</h2>
        </div>
        <p className="text-indigo-100 mt-2">
          Selecciona las actividades que deseas desarrollar en detalle y opcionalmente añade instrucciones sobre cómo enfocarlas.
        </p>
      </div>
      
      <div className="p-8">
        {!hasActivities ? (
          <div className="text-center py-12 text-slate-500">
            No se encontraron actividades en el documento generado.
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([saTitle, acts]) => {
              const allSelected = acts.every(a => selectedIds.has(a.id));
              const someSelected = acts.some(a => selectedIds.has(a.id));
              
              return (
                <div key={saTitle} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSA(saTitle)}>
                      <button className={`text-indigo-600`}>
                        {allSelected ? <CheckSquare className="w-5 h-5" /> : someSelected ? <Square className="w-5 h-5 text-indigo-400 fill-indigo-100" /> : <Square className="w-5 h-5 text-slate-400" />}
                      </button>
                      <h3 className="font-bold text-slate-800">{saTitle}</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {acts.map(act => {
                      const isSelected = selectedIds.has(act.id);
                      return (
                        <div key={act.id} className={`p-4 rounded-lg border transition-colors ${isSelected ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <button className={`mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} onClick={() => toggleSelection(act.id)}>
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            <div className="flex-1">
                              <h4 className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-700'} cursor-pointer`} onClick={() => toggleSelection(act.id)}>{act.activityName}</h4>
                              
                              {isSelected && (
                                <div className="mt-3 animate-fade-in">
                                  <textarea
                                    placeholder="Instrucciones opcionales (ej: incluir una fase de debate, usar material reciclado...)"
                                    className="w-full text-sm p-3 border border-indigo-100 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                                    rows={2}
                                    value={instructions[act.id] || ''}
                                    onChange={(e) => handleInstructionChange(act.id, e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
          <button
            onClick={onBack}
            className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          
          <button
            onClick={handleGenerate}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
          >
            <Zap className="w-5 h-5" />
            Desarrollar {selectedIds.size > 0 ? selectedIds.size : ''} actividades
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesStep;
