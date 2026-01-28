import React, { useState } from 'react';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ContextForm from './components/ContextForm';
import DocTypeSelector from './components/DocTypeSelector';
import Editor from './components/Editor';
import { AppStep, DocType, TeacherContext, CurriculumAnalysis } from './types';
import { generateEducationalDocument, analyzePdfStructure } from './services/geminiService';
import { Loader2 } from 'lucide-react';

const initialContext: TeacherContext = {
  subject: '',
  department: '',
  gradeLevel: '',
  weeklyHours: 3,
  language: 'Castellano',
  selectedNeeds: [],
  otherNeeds: '',
  methodologyPreference: ['Aprendizaje Basado en Proyectos (ABP)'], // Default as array
  generateFullCourse: false,
  numberOfSAs: 2,
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

  const handleFileSelect = async (base64: string, name: string) => {
    if (base64) {
      setPdfBase64(base64);
      setPdfName(name);
      setIsAnalyzing(true);
      
      try {
        // Analyze PDF to get subject, grade, competencies and blocks
        const analysis = await analyzePdfStructure(base64);
        setAnalysisData(analysis);
        
        setContext(prev => ({
          ...prev,
          subject: analysis.subject || prev.subject,
          gradeLevel: analysis.grade || prev.gradeLevel
        }));
      } catch (error) {
        console.error("Analysis failed", error);
      } finally {
        setIsAnalyzing(false);
        setStep(AppStep.CONTEXT);
      }
    } else {
      setPdfBase64('');
      setPdfName('');
    }
  };

  const handleContextSubmit = (data: TeacherContext) => {
    setContext(data);
    setStep(AppStep.SELECT_TYPE);
  };

  const handleDocTypeSelect = async (type: DocType) => {
    setCurrentDocType(type);
    setStep(AppStep.GENERATING);

    try {
      const content = await generateEducationalDocument(pdfBase64, context, type);
      setResultContent(content);
      setStep(AppStep.EDITOR);
    } catch (error) {
      alert("Hubo un error generando el documento. Por favor intenta de nuevo.");
      setStep(AppStep.SELECT_TYPE);
    }
  };

  const handleRestart = () => {
    setResultContent('');
    setStep(AppStep.SELECT_TYPE);
  };

  // Navigation Logic
  const canGoToStep = (targetStep: AppStep): boolean => {
    if (targetStep === AppStep.UPLOAD) return true;
    if (targetStep === AppStep.CONTEXT) return !!pdfBase64;
    if (targetStep === AppStep.SELECT_TYPE) return !!pdfBase64 && !!context.subject; // Basic check
    if (targetStep === AppStep.EDITOR) return !!resultContent;
    return false;
  };

  const handleNavClick = (targetStep: AppStep) => {
    if (canGoToStep(targetStep)) {
      setStep(targetStep);
    }
  };

  const getDocTitle = () => {
    if (!currentDocType) return 'Documento';
    return currentDocType === DocType.PROPUESTA 
      ? `Propuesta Pedagógica - ${context.subject}`
      : `Programación de Aula (SAs) - ${context.subject}`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator - Now Interactive */}
        <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4 text-sm font-medium text-slate-400 select-none">
          <button 
            onClick={() => handleNavClick(AppStep.UPLOAD)}
            className={`transition-colors ${step === AppStep.UPLOAD || step > AppStep.UPLOAD ? 'text-indigo-600 hover:text-indigo-800' : 'cursor-not-allowed'}`}
          >
            1. Subir PDF
          </button>
          <span className="w-4 h-[1px] bg-slate-300"></span>
          <button 
            onClick={() => handleNavClick(AppStep.CONTEXT)}
            className={`transition-colors ${step === AppStep.CONTEXT || step > AppStep.CONTEXT ? 'text-indigo-600 hover:text-indigo-800' : 'cursor-not-allowed'}`}
          >
            2. Contexto
          </button>
          <span className="w-4 h-[1px] bg-slate-300"></span>
          <button 
             onClick={() => handleNavClick(AppStep.SELECT_TYPE)}
             className={`transition-colors ${step === AppStep.SELECT_TYPE || step > AppStep.SELECT_TYPE ? 'text-indigo-600 hover:text-indigo-800' : 'cursor-not-allowed'}`}
          >
            3. Elegir
          </button>
          <span className="w-4 h-[1px] bg-slate-300"></span>
          <button 
            onClick={() => handleNavClick(AppStep.EDITOR)}
            className={`transition-colors ${step === AppStep.EDITOR ? 'text-indigo-600 hover:text-indigo-800' : 'cursor-not-allowed'}`}
          >
            4. Resultado
          </button>
        </div>

        {step === AppStep.UPLOAD && (
          <div className="space-y-6 animate-fade-in relative">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800">Sube tu Currículum Oficial</h2>
              <p className="text-slate-500 mt-2">Analizaremos el PDF para autocompletar la asignatura y asegurar normativa.</p>
            </div>
            {isAnalyzing ? (
              <div className="bg-white border border-indigo-100 rounded-xl p-10 flex flex-col items-center justify-center shadow-sm">
                 <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                 <p className="text-lg font-medium text-slate-700">Analizando currículum...</p>
                 <p className="text-sm text-slate-500">Detectando competencias y saberes básicos</p>
              </div>
            ) : (
              <FileUpload onFileSelect={handleFileSelect} />
            )}
          </div>
        )}

        {step === AppStep.CONTEXT && (
          <div className="animate-fade-in">
            <ContextForm initialData={context} onSubmit={handleContextSubmit} />
          </div>
        )}

        {step === AppStep.SELECT_TYPE && (
          <DocTypeSelector onSelect={handleDocTypeSelect} />
        )}

        {step === AppStep.GENERATING && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center">
            <div className="bg-white p-4 rounded-full shadow-md mb-6">
               <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Generando documento...</h3>
            <p className="text-slate-500 mt-2 max-w-md">
              La IA está diseñando {currentDocType === DocType.PROPUESTA ? 'la propuesta pedagógica' : 'la programación de situaciones de aprendizaje'} para {context.subject}.
            </p>
            {context.generateFullCourse && currentDocType === DocType.SITUACION && (
               <p className="text-indigo-600 font-medium mt-4 bg-indigo-50 px-4 py-2 rounded-full text-sm">
                 Generando curso completo (esto puede tardar un poco más)
               </p>
            )}
          </div>
        )}

        {step === AppStep.EDITOR && (
          <Editor 
            initialContent={resultContent} 
            docTitle={getDocTitle()} 
            onRestart={handleRestart}
            analysisData={analysisData}
          />
        )}
      </div>
    </Layout>
  );
}