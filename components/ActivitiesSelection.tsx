import React, { useState, useEffect } from 'react';
import { extractActivitiesFromMarkdown, ParsedActivity } from '../utils/markdownParser';
import { ActivityPromptInfo, generateActivityDetails } from '../services/geminiService';
import { TeacherContext, GeneratedActivity } from '../types';
import { ChevronDown, ChevronUp, CheckSquare, Square, ArrowLeft, Loader2, Zap } from 'lucide-react';

interface ActivitiesSelectionProps {
  markdownContent: string;
  pdfBase64: string;
  context: TeacherContext;
  onBack: () => void;
  onActivitiesGenerated: (activities: GeneratedActivity[]) => void;
}

const ActivitiesSelection: React.FC<ActivitiesSelectionProps> = ({ markdownContent, pdfBase64, context, onBack, onActivitiesGenerated }) => {
  const [activities, setActivities] = useState<ParsedActivity[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState<Record<string, string>>({});
  
  const [isGenerating, setIsGenerating] = useState(false);
  
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
    
    setIsGenerating(true);
    const results: GeneratedActivity[] = [];
    
    const selectedActivities = activities.filter(a => selectedIds.has(a.id));
    
    try {
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
      setIsGenerating(false);
      onActivitiesGenerated(results);
    } catch (e) {
      console.error(e);
      alert("Hubo un error al generar las actividades. Por favor, reintenta.");
      setIsGenerating(false);
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

  if (isGenerating) {
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

  const groupedActivities = getGroupedActivities();
  const hasActivities = Object.keys(groupedActivities).length > 0;

  return (
    <div className="flex flex-col relative w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 text-white shrink-0">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-indigo-200" />
          <h2 className="text-2xl font-bold">Selección de Actividades</h2>
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
            {Object.entries(groupedActivities).map(([saTitle, acts], saIndex) => {
              const allSelected = acts.every(a => selectedIds.has(a.id));
              const someSelected = acts.some(a => selectedIds.has(a.id));
              
              return (
                <div key={saTitle} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSA(saTitle)}>
                      <button className={`text-indigo-600`}>
                        {allSelected ? <CheckSquare className="w-5 h-5" /> : someSelected ? <Square className="w-5 h-5 text-indigo-400 fill-indigo-100" /> : <Square className="w-5 h-5 text-slate-400" />}
                      </button>
                      <h3 className="font-bold text-slate-800">SdA {saIndex + 1}: {saTitle}</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    {acts.map((act, actIndex) => {
                      const isSelected = selectedIds.has(act.id);
                      return (
                        <div key={act.id} className={`p-4 rounded-lg border transition-colors ${isSelected ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <button className={`mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} onClick={() => toggleSelection(act.id)}>
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            <div className="flex-1">
                              <h4 className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-700'} cursor-pointer`} onClick={() => toggleSelection(act.id)}>Actividad {actIndex + 1}: {act.activityName}</h4>
                              
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

export default ActivitiesSelection;
