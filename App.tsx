
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ContextForm from './components/ContextForm';
import DocTypeSelector from './components/DocTypeSelector';
import Editor from './components/Editor';
import { AppStep, DocType, TeacherContext, CurriculumAnalysis } from './types';
import { generateEducationalDocument, analyzePdfStructure, refineDocument } from './services/geminiService';
import { Loader2, AlertCircle, FileSearch, Key } from 'lucide-react';

const initialContext: TeacherContext = {
  subject: '',
  department: '',
  gradeLevel: '',
  weeklyHours: 3,
  language: 'Castellano',
  selectedNeeds: [],
  otherNeeds: '',
  methodologyPreference: ['Aprendizaje Basado en Proyectos (ABP)'],
  generateFullCourse: false,
  numberOfSAs: 2,
  saIdeas: ['', ''],
};

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [pdfName, setPdfName] = useState<string>('');
  const [context, setContext] = useState<TeacherContext>(initialContext);
  const [analysisData, setAnalysisData] = useState<CurriculumAnalysis | null>(null);
  const [resultContent, setResultContent] = useState<string>('');
  const [currentDocType, setCurrentDocType] = useState<DocType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    const checkKey = () => {
      const key = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
      setHasApiKey(!!key);
    };
    checkKey();
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, []);

  const performAnalysis = async (base64: string) => {
    if (!hasApiKey) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzePdfStructure(base64);
      setAnalysisData(analysis);
      
      setContext(prev => ({
        ...prev,
        subject: analysis.subject || prev.subject,
        gradeLevel: analysis.grade || prev.gradeLevel
      }));
      setStep(AppStep.CONTEXT);
    } catch (err: any) {
      setError("Error al analizar el PDF. Por favor, verifica tu clave de API en la configuración.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = async (base64: string, name: string) => {
    if (base64) {
      setPdfBase64(base64);
      setPdfName(name);
      await performAnalysis(base64);
    }
  };

  const handleContextSubmit = (data: TeacherContext) => {
    setContext(data);
    setStep(AppStep.SELECT_TYPE);
  };

  const handleDocTypeSelect = async (type: DocType) => {
    setCurrentDocType(type);
    setStep(AppStep.GENERATING);
    setError(null);

    try {
      const content = await generateEducationalDocument(pdfBase64, context, type);
      setResultContent(content);
      setStep(AppStep.EDITOR);
    } catch (err: any) {
      setError(err.message || "Error al generar el documento.");
      setStep(AppStep.SELECT_TYPE);
    }
  };

  const handleRefine = async (feedback: string): Promise<string> => {
    if (!currentDocType) throw new Error("Tipo de documento no definido.");
    
    const newContent = await refineDocument(
      pdfBase64,
      context,
      currentDocType,
      resultContent,
      feedback
    );
    
    setResultContent(newContent);
    return newContent;
  };

  const handleRestart = () => {
    setStep(AppStep.UPLOAD);
    setPdfBase64('');
    setResultContent('');
    setAnalysisData(null);
    setError(null);
  };

  const AnalysisLoadingView = (
    <div className="py-20 flex flex-col items-center text-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-25"></div>
        <div className="relative bg-indigo-50 p-6 rounded-full">
          <FileSearch className="w-12 h-12 text-indigo-600" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-800">Analizando currículum...</h3>
      <p className="text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
        Estamos extrayendo competencias y saberes del PDF para automatizar tu planificación.
      </p>
      <div className="mt-8 flex items-center gap-2 text-indigo-600 font-medium text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Procesando con Gemini AI
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="w-full mx-auto">
        {!hasApiKey && step === AppStep.UPLOAD && (
          <div className="max-w-4xl mx-auto mb-8 bg-rose-50 border-2 border-rose-200 p-6 rounded-2xl flex flex-col items-center gap-4 text-rose-800 animate-fade-in">
            <div className="bg-rose-100 p-4 rounded-full">
              <Key className="w-8 h-8 text-rose-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">API KEY no detectada</h3>
              <p className="text-sm mt-1 opacity-90">
                Para usar este asistente, necesitas configurar tu propia clave de Google Gemini (es gratuita).
              </p>
            </div>
            <button 
              onClick={() => {
                const btn = document.querySelector('[title="Configuración de API"]') as HTMLButtonElement;
                btn?.click();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all active:scale-95 text-sm"
            >
              Configurar API Key ahora
            </button>
          </div>
        )}

        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto mb-8 flex items-center justify-center gap-4 text-sm font-bold print:hidden">
          <div className={`flex flex-col items-center gap-1 ${step === AppStep.UPLOAD ? 'text-indigo-600' : 'text-slate-300'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.UPLOAD ? 'border-indigo-600' : 'border-slate-200'}`}>1</span>
            <span className="hidden sm:inline">Subir</span>
          </div>
          <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
          <div className={`flex flex-col items-center gap-1 ${step === AppStep.CONTEXT ? 'text-indigo-600' : 'text-slate-300'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.CONTEXT ? 'border-indigo-600' : 'border-slate-200'}`}>2</span>
            <span className="hidden sm:inline">Contexto</span>
          </div>
          <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
          <div className={`flex flex-col items-center gap-1 ${step === AppStep.SELECT_TYPE ? 'text-indigo-600' : 'text-slate-300'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.SELECT_TYPE ? 'border-indigo-600' : 'border-slate-200'}`}>3</span>
            <span className="hidden sm:inline">Tipo</span>
          </div>
          <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
          <div className={`flex flex-col items-center gap-1 ${step === AppStep.EDITOR ? 'text-indigo-600' : 'text-slate-300'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.EDITOR ? 'border-indigo-600' : 'border-slate-200'}`}>4</span>
            <span className="hidden sm:inline">Resultado</span>
          </div>
        </div>

        <div className={step === AppStep.EDITOR ? 'w-full' : 'max-w-4xl mx-auto'}>
          {isAnalyzing ? (
            AnalysisLoadingView
          ) : (
            <>
              {step === AppStep.UPLOAD && <FileUpload onFileSelect={handleFileSelect} disabled={!hasApiKey} />}
              {step === AppStep.CONTEXT && (
                <ContextForm 
                  initialData={context} 
                  analysisData={analysisData} 
                  onReAnalyze={() => performAnalysis(pdfBase64)} 
                  onSubmit={handleContextSubmit} 
                />
              )}
              {step === AppStep.SELECT_TYPE && <DocTypeSelector onSelect={handleDocTypeSelect} />}
              {step === AppStep.GENERATING && (
                <div className="py-20 flex flex-col items-center text-center bg-white rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <h3 className="text-xl font-bold">Generando contenido pedagógico...</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                    Redactando {currentDocType === DocType.PROPUESTA ? 'tu propuesta de departamento' : 'tus situaciones de aprendizaje'} con rigor curricular.
                  </p>
                </div>
              )}
              {step === AppStep.EDITOR && (
                <Editor 
                  initialContent={resultContent} 
                  docTitle={currentDocType === DocType.PROPUESTA ? 'Propuesta Pedagógica' : 'Situaciones de Aprendizaje'} 
                  onRestart={handleRestart} 
                  analysisData={analysisData} 
                  onRefine={handleRefine}
                  language={context.language}
                  gradeLevel={context.gradeLevel}
                  subject={context.subject}
                  department={context.department}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
