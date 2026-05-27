
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ContextForm from './components/ContextForm';
import PlanningForm from './components/PlanningForm';
import DocTypeSelector from './components/DocTypeSelector';
import Editor from './components/Editor';
import ActivitiesSelection from './components/ActivitiesSelection';
import ActivitiesResults from './components/ActivitiesResults';
import History from './components/History';
import { AppStep, DocType, TeacherContext, CurriculumAnalysis, HistoryItem, GeneratedActivity } from './types';
import { generateEducationalDocument, analyzePdfStructure, refineDocument, refineActivities } from './services/geminiService';
import { saveToHistory, updateHistoryItem } from './services/historyService';
import { Loader2, AlertCircle, FileSearch, Key, Clock } from 'lucide-react';

const getCurrentAcademicYear = () => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  
  if (month >= 6) { // July to December
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else { // January to June
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
};

const initialContext: TeacherContext = {
  subject: '',
  gradeLevel: '',
  academicYear: getCurrentAcademicYear(),
  weeklyHours: 3,
  language: 'Castellano',
  selectedNeeds: [],
  otherNeeds: '',
  methodologyPreference: ['Aprendizaje Basado en Proyectos (ABP)'],
  methodologyDescription: '',
  generateFullCourse: true,
  fullCourseIdeas: '',
  numberOfSAs: 2,
  saDetails: [
    { idea: '', sessions: '', competencies: [], blocks: [] },
    { idea: '', sessions: '', competencies: [], blocks: [] }
  ],
};

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [pdfName, setPdfName] = useState<string>('');
  const [context, setContext] = useState<TeacherContext>(initialContext);
  const [analysisData, setAnalysisData] = useState<CurriculumAnalysis | null>(null);
  const [resultContent, setResultContent] = useState<string>('');
  const [currentDocType, setCurrentDocType] = useState<DocType | null>(null);
  const [generatedActivities, setGeneratedActivities] = useState<GeneratedActivity[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  const checkKey = () => {
    const key = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
    setHasApiKey(!!key);
  };

  useEffect(() => {
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

  const handleJsonImport = (jsonData: any) => {
    if (jsonData.docType) setCurrentDocType(jsonData.docType);
    if (jsonData.teacherContext) setContext(jsonData.teacherContext);
    if (jsonData.analysisData) setAnalysisData(jsonData.analysisData);
    if (jsonData.content) setResultContent(jsonData.content);
    
    // Also restore teacher/department if present
    if (jsonData.teacherName) localStorage.setItem('TEACHER_NAME', jsonData.teacherName);
    if (jsonData.department) localStorage.setItem('DEPARTMENT_NAME', jsonData.department);
    if (jsonData.activities) setGeneratedActivities(jsonData.activities);

    setCurrentHistoryId(null);
    setStep(AppStep.EDITOR);
  };

  const handleExportJSON = () => {
    const exportData = {
      version: "1.0",
      docType: currentDocType,
      teacherContext: context,
      analysisData: analysisData,
      content: resultContent, // using latest resultContent
      teacherName: localStorage.getItem('TEACHER_NAME') || '',
      department: localStorage.getItem('DEPARTMENT_NAME') || '',
      activities: generatedActivities
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proyecto_${currentDocType === DocType.PROPUESTA ? 'Propuesta' : 'SdA'}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContextSubmit = (data: TeacherContext) => {
    setContext(data);
    setStep(AppStep.PLANNING);
  };

  const handlePlanningSubmit = (data: TeacherContext) => {
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
      
      // Save to history
      const historyItem = saveToHistory({
        title: type === DocType.PROPUESTA ? 'Propuesta Pedagógica' : 'Situaciones de Aprendizaje',
        content,
        type,
        subject: context.subject,
        gradeLevel: context.gradeLevel
      });
      setCurrentHistoryId(historyItem.id);
      setGeneratedActivities([]);

      setStep(AppStep.EDITOR);
    } catch (err: any) {
      setError(err.message || "Error al generar el documento.");
      setStep(AppStep.SELECT_TYPE);
    }
  };

  const handleRefineActivities = React.useCallback(async (feedback: string): Promise<void> => {
    try {
      const refinedActs = await refineActivities(generatedActivities, feedback, context.language);
      setGeneratedActivities(refinedActs);
      if (currentHistoryId) {
        updateHistoryItem(currentHistoryId, { activities: refinedActs });
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [generatedActivities, context.language, currentHistoryId]);

  const handleRefine = React.useCallback(async (feedback: string, currentContent: string): Promise<string> => {
    console.log('handleRefine called with feedback:', feedback);
    if (!currentDocType) throw new Error("Tipo de documento no definido.");
    
    const newContent = await refineDocument(
      pdfBase64,
      context,
      currentDocType,
      currentContent,
      feedback
    );
    
    setResultContent(newContent);
    
    // Save refined version to history
    try {
      const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const historyItem = saveToHistory({
        title: `${currentDocType === DocType.PROPUESTA ? 'Propuesta Pedagógica' : 'Situaciones de Aprendizaje'} (Refinado ${timeStr})`,
        content: newContent,
        type: currentDocType,
        subject: context.subject,
        gradeLevel: context.gradeLevel
      });
      setCurrentHistoryId(historyItem.id);
      console.log('Refined version saved to history:', historyItem);
    } catch (e) {
      console.error('Error saving refined version to history', e);
    }
    
    return newContent;
  }, [currentDocType, pdfBase64, context]);

  const handleRestart = () => {
    setStep(AppStep.UPLOAD);
    setPdfBase64('');
    setResultContent('');
    setAnalysisData(null);
    setError(null);
    setCurrentHistoryId(null);
    setGeneratedActivities([]);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setResultContent(item.content);
    setCurrentDocType(item.type);
    setCurrentHistoryId(item.id);
    setGeneratedActivities(item.activities || []);
    setContext(prev => ({
      ...prev,
      subject: item.subject,
      gradeLevel: item.gradeLevel
    }));
    setStep(AppStep.EDITOR);
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

  const stepOrder = [AppStep.UPLOAD, AppStep.CONTEXT, AppStep.PLANNING, AppStep.SELECT_TYPE, AppStep.EDITOR, AppStep.ACTIVITIES_SELECTION, AppStep.ACTIVITIES_RESULTS];
  const currentStepIndex = stepOrder.indexOf(step);

  const canNavigateTo = (targetStep: AppStep) => {
    const targetIndex = stepOrder.indexOf(targetStep);
    
    // For specific steps that can only be reached if something exists
    if (targetStep === AppStep.ACTIVITIES_SELECTION) {
      if (currentDocType !== DocType.SITUACION) return false;
      return currentStepIndex >= stepOrder.indexOf(AppStep.EDITOR);
    }
    
    if (targetStep === AppStep.ACTIVITIES_RESULTS) {
      if (currentDocType !== DocType.SITUACION) return false;
      return generatedActivities.length > 0 && currentStepIndex >= stepOrder.indexOf(AppStep.EDITOR);
    }

    // Can navigate back to any previous step, or stay on current
    return targetIndex < currentStepIndex || targetStep === step;
  };

  const handleStepClick = (targetStep: AppStep) => {
    if (canNavigateTo(targetStep)) {
      setStep(targetStep);
      setError(null);
    }
  };

  return (
    <Layout onHome={handleRestart} onSettingsSave={checkKey}>
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

        {step !== AppStep.HISTORY && (
          <div className="max-w-4xl mx-auto mb-8 flex items-center justify-center gap-4 text-sm font-bold print:hidden">
            <button 
              onClick={() => handleStepClick(AppStep.UPLOAD)}
              disabled={!canNavigateTo(AppStep.UPLOAD)}
              className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.UPLOAD ? 'text-indigo-600' : canNavigateTo(AppStep.UPLOAD) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.UPLOAD ? 'border-indigo-600' : canNavigateTo(AppStep.UPLOAD) ? 'border-slate-400' : 'border-slate-200'}`}>1</span>
              <span className="hidden sm:inline">Subir</span>
            </button>
            <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
            <button 
              onClick={() => handleStepClick(AppStep.CONTEXT)}
              disabled={!canNavigateTo(AppStep.CONTEXT)}
              className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.CONTEXT ? 'text-indigo-600' : canNavigateTo(AppStep.CONTEXT) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.CONTEXT ? 'border-indigo-600' : canNavigateTo(AppStep.CONTEXT) ? 'border-slate-400' : 'border-slate-200'}`}>2</span>
              <span className="hidden sm:inline">Contexto</span>
            </button>
            <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
            <button 
              onClick={() => handleStepClick(AppStep.PLANNING)}
              disabled={!canNavigateTo(AppStep.PLANNING)}
              className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.PLANNING ? 'text-indigo-600' : canNavigateTo(AppStep.PLANNING) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.PLANNING ? 'border-indigo-600' : canNavigateTo(AppStep.PLANNING) ? 'border-slate-400' : 'border-slate-200'}`}>3</span>
              <span className="hidden sm:inline">Planificación</span>
            </button>
            <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
            <button 
              onClick={() => handleStepClick(AppStep.SELECT_TYPE)}
              disabled={!canNavigateTo(AppStep.SELECT_TYPE)}
              className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.SELECT_TYPE ? 'text-indigo-600' : canNavigateTo(AppStep.SELECT_TYPE) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.SELECT_TYPE ? 'border-indigo-600' : canNavigateTo(AppStep.SELECT_TYPE) ? 'border-slate-400' : 'border-slate-200'}`}>4</span>
              <span className="hidden sm:inline">Tipo</span>
            </button>
            <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
            <button 
              onClick={() => handleStepClick(AppStep.EDITOR)}
              disabled={!canNavigateTo(AppStep.EDITOR)}
              className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.EDITOR ? 'text-indigo-600' : canNavigateTo(AppStep.EDITOR) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.EDITOR ? 'border-indigo-600' : canNavigateTo(AppStep.EDITOR) ? 'border-slate-400' : 'border-slate-200'}`}>5</span>
              <span className="hidden sm:inline">Resultado</span>
            </button>
            {currentDocType === DocType.SITUACION && (
              <>
                <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
                <button 
                  onClick={() => handleStepClick(AppStep.ACTIVITIES_SELECTION)}
                  disabled={!canNavigateTo(AppStep.ACTIVITIES_SELECTION)}
                  className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.ACTIVITIES_SELECTION ? 'text-indigo-600' : canNavigateTo(AppStep.ACTIVITIES_SELECTION) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.ACTIVITIES_SELECTION ? 'border-indigo-600' : canNavigateTo(AppStep.ACTIVITIES_SELECTION) ? 'border-slate-400' : 'border-slate-200'}`}>6</span>
                  <span className="hidden sm:inline">Sel. Actividades</span>
                </button>
              </>
            )}
            {currentDocType === DocType.SITUACION && generatedActivities.length > 0 && (
              <>
                <div className="w-8 h-[2px] bg-slate-200 mb-6"></div>
                <button 
                  onClick={() => handleStepClick(AppStep.ACTIVITIES_RESULTS)}
                  disabled={!canNavigateTo(AppStep.ACTIVITIES_RESULTS)}
                  className={`flex flex-col items-center gap-1 transition-all ${step === AppStep.ACTIVITIES_RESULTS ? 'text-indigo-600' : canNavigateTo(AppStep.ACTIVITIES_RESULTS) ? 'text-slate-600 hover:text-indigo-400' : 'text-slate-300 cursor-default'}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === AppStep.ACTIVITIES_RESULTS ? 'border-indigo-600' : canNavigateTo(AppStep.ACTIVITIES_RESULTS) ? 'border-slate-400' : 'border-slate-200'}`}>7</span>
                  <span className="hidden sm:inline">Actividades</span>
                </button>
              </>
            )}
          </div>
        )}

        <div className={(step === AppStep.EDITOR || step === AppStep.ACTIVITIES_RESULTS) ? 'w-full' : 'max-w-4xl mx-auto'}>
          {isAnalyzing ? (
            AnalysisLoadingView
          ) : (
            <>
              {step === AppStep.UPLOAD && (
                <div className="space-y-8">
                  <FileUpload onFileSelect={handleFileSelect} onJsonImport={handleJsonImport} disabled={!hasApiKey} />
                  
                  <div className="flex justify-center">
                    <button
                      onClick={() => setStep(AppStep.HISTORY)}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all font-medium"
                    >
                      <Clock className="w-5 h-5" />
                      Ver historial de documentos
                    </button>
                  </div>
                </div>
              )}
              {step === AppStep.HISTORY && (
                <History 
                  onSelect={handleHistorySelect} 
                  onBack={() => setStep(AppStep.UPLOAD)} 
                />
              )}
              {step === AppStep.CONTEXT && (
                <ContextForm 
                  initialData={context} 
                  analysisData={analysisData} 
                  onReAnalyze={() => performAnalysis(pdfBase64)} 
                  onBack={() => setStep(AppStep.UPLOAD)}
                  onSubmit={handleContextSubmit} 
                />
              )}
              {step === AppStep.PLANNING && (
                <PlanningForm
                  initialData={context}
                  analysisData={analysisData}
                  onBack={() => setStep(AppStep.CONTEXT)}
                  onSubmit={handlePlanningSubmit}
                />
              )}
              {step === AppStep.SELECT_TYPE && (
                <DocTypeSelector 
                  onSelect={handleDocTypeSelect} 
                  onBack={() => setStep(AppStep.PLANNING)}
                />
              )}
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
                  onBack={() => setStep(AppStep.SELECT_TYPE)}
                  analysisData={analysisData} 
                  onRefine={handleRefine}
                  language={context.language}
                  gradeLevel={context.gradeLevel}
                  subject={context.subject}
                  teacherContext={context}
                  docType={currentDocType || undefined}
                  onDevelopActivities={() => setStep(AppStep.ACTIVITIES_SELECTION)}
                  generatedActivities={generatedActivities}
                  onUpdateContent={setResultContent}
                  onExportJSON={handleExportJSON}
                />
              )}
              {step === AppStep.ACTIVITIES_SELECTION && (
                <ActivitiesSelection 
                  markdownContent={resultContent}
                  pdfBase64={pdfBase64}
                  context={context}
                  onBack={() => setStep(AppStep.EDITOR)}
                  onActivitiesGenerated={(acts) => {
                    setGeneratedActivities(acts);
                    if (currentHistoryId) {
                      updateHistoryItem(currentHistoryId, { activities: acts });
                    }
                    setStep(AppStep.ACTIVITIES_RESULTS);
                  }}
                />
              )}
              {step === AppStep.ACTIVITIES_RESULTS && (
                <ActivitiesResults 
                  generatedResults={generatedActivities}
                  onBack={() => setStep(AppStep.ACTIVITIES_SELECTION)}
                  onExportJSON={handleExportJSON}
                  onRefine={handleRefineActivities}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
