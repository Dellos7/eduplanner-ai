import React, { useState } from 'react';
import { GeneratedActivity } from '../types';
import { ArrowLeft, FileDown, FileType, Printer, Copy, Check, FileJson, MessageSquare, Loader2, Sparkles, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ActivitiesResultsProps {
  generatedResults: GeneratedActivity[];
  onBack: () => void;
  onExportJSON: () => void;
  onRefine: (feedback: string) => Promise<void>;
}

const ActivitiesResults: React.FC<ActivitiesResultsProps> = ({ generatedResults, onBack, onExportJSON, onRefine }) => {
  const [isCopied, setIsCopied] = useState<Record<string, boolean>>({});
  const [isCopiedFull, setIsCopiedFull] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleCopyMD = async () => {
    try {
      await navigator.clipboard.writeText(getFullMarkdown());
      setIsCopiedFull(true);
      setTimeout(() => setIsCopiedFull(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isRefining) return;
    
    setIsRefining(true);
    const feedback = chatInput;
    setChatInput('');
    try {
      await onRefine(feedback);
    } catch (err) {
      alert("Error al intentar ajustar las actividades.");
    } finally {
      setIsRefining(false);
    }
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[90rem] mx-auto animate-fade-in relative px-4 lg:px-8 pb-10 w-full z-10">
      {/* Left Panel: Content */}
      <div className="flex-[3] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-w-0">
        <div className="bg-white border-b border-slate-200 px-6 sm:px-12 py-6 sm:py-8 shrink-0 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-50 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none opacity-60"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">Desarrollo de Actividades</h2>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <p className="text-slate-500 font-medium text-sm hidden sm:block whitespace-nowrap bg-white/80 px-3 py-1 rounded-full border border-slate-200">{generatedResults.length} {generatedResults.length === 1 ? 'actividad' : 'actividades'}</p>
            <button onClick={onBack} className="text-slate-500 hover:text-slate-800 transition-colors bg-white hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-200">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-white relative min-h-[500px]">
          {isRefining && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-fade-in">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Ajustando Actividades con IA...</h3>
              <p className="text-slate-500 mt-2 max-w-md text-center">Analizando tus instrucciones y aplicando los cambios a todas las actividades. Esto puede tardar unos segundos.</p>
            </div>
          )}
          <div id="activities-preview" className={`space-y-16 ${isRefining ? 'opacity-30 pointer-events-none' : ''}`}>
            {generatedResults.map((result) => (
              <div key={result.id} className="relative group">
                <button 
                  onClick={() => handleCopy(result.id, result.content)}
                  className="absolute top-0 right-0 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold z-10"
                >
                  {isCopied[result.id] ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {isCopied[result.id] ? 'Copiado' : 'Copiar Markdown'}
                </button>
                <div className="markdown-body prose prose-slate max-w-none break-words w-full">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                </div>
                <hr className="mt-16 border-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Export */}
      <aside className="w-full lg:w-96 shrink-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
             <FileDown className="w-6 h-6 text-indigo-600" />
             <h2 className="text-xl font-bold text-slate-800">Exportar</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-slate-500 mb-2 leading-relaxed">Guarda todo el desarrollo generado para compartirlo o entregarlo.</p>
            
            <div className="flex gap-2 w-full">
              <button onClick={handleCopyMD} className={`flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${isCopiedFull ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 'text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200'}`} title="Copiar Markdown">
                {isCopiedFull ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopiedFull ? '¡Copiado!' : 'Copiar MD'}
              </button>

              <button onClick={handleDownloadMD} className="flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition-colors" title="Descargar Markdown">
                <FileDown className="w-4 h-4" /> Descargar MD
              </button>

              <button onClick={handleDownloadDoc} className="flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg transition-colors" title="Descargar Word / OpenOffice">
                <FileType className="w-4 h-4" /> Descargar DOC
              </button>
            </div>

            <div className="flex gap-2 w-full mt-2">
                <a href="https://markdowntoword.io/tools/markdown-to-docx" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 hover:bg-blue-200 rounded-lg transition-colors" title="Convertir MD a DOCX">
                  <FileType className="w-4 h-4" /> MD a DOCX
                </a>

                <a href="https://markdowntoword.io/tools/markdown-to-pdf" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center flex-1 gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-100 border border-rose-200 hover:bg-rose-200 rounded-lg transition-colors" title="Convertir MD a PDF">
                  <Printer className="w-4 h-4" /> MD a PDF
                </a>
            </div>

            <button onClick={onExportJSON} className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-all shadow-sm mt-2" title="Exportar todo el proyecto incluyendo actividades a JSON para guardar copia de seguridad">
              <FileJson className="w-5 h-5" /> Exportar todo el proyecto a JSON
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col shrink-0 mt-6">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Ajustar con IA</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-800 leading-relaxed flex gap-2 italic">
              <Sparkles className="w-5 h-5 shrink-0 text-amber-500" />
              <span>Ej: "Añade más ejercicios prácticos", "Simplifica el lenguaje" o "Incluye más criterios de evaluación."</span>
            </div>
            <form onSubmit={handleRefineSubmit} className="space-y-3">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe cómo quieres modificar las actividades..."
                className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm bg-slate-50 transition-all custom-scrollbar"
                rows={4}
                disabled={isRefining}
              />
              <button
                type="submit"
                disabled={isRefining || !chatInput.trim()}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRefining ? 'Aplicando cambios...' : 'Ajustar Actividades'}
                {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ActivitiesResults;
