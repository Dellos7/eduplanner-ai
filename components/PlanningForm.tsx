import React, { useState } from 'react';
import { TeacherContext, CurriculumAnalysis, SADetail } from '../types';
import { ArrowRight, Lightbulb, ArrowLeft, Target, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface PlanningFormProps {
  initialData: TeacherContext;
  analysisData: CurriculumAnalysis | null;
  onBack: () => void;
  onSubmit: (data: TeacherContext) => void;
}

const PlanningForm: React.FC<PlanningFormProps> = ({ initialData, analysisData, onBack, onSubmit }) => {
  const [formData, setFormData] = useState<TeacherContext>(initialData);
  const [expandedSA, setExpandedSA] = useState<number | null>(0);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === 'generateFullCourse') {
      setFormData(prev => ({ ...prev, generateFullCourse: checked }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'numberOfSAs') {
      const val = parseInt(value, 10);
      const newNum = isNaN(val) ? 1 : val;
      setFormData(prev => {
        const newDetails = [...prev.saDetails];
        while (newDetails.length < newNum) {
          newDetails.push({ idea: '', competencies: [], blocks: [] });
        }
        return { ...prev, numberOfSAs: newNum, saDetails: newDetails.slice(0, newNum) };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSADetailChange = (index: number, field: keyof SADetail, value: any) => {
    setFormData(prev => {
      const newDetails = [...prev.saDetails];
      if (!newDetails[index]) {
        newDetails[index] = { idea: '', competencies: [], blocks: [] };
      }
      newDetails[index] = { ...newDetails[index], [field]: value };
      return { ...prev, saDetails: newDetails };
    });
  };

  const toggleSelection = (index: number, field: 'competencies' | 'blocks', item: string) => {
    setFormData(prev => {
      const newDetails = [...prev.saDetails];
      if (!newDetails[index]) {
        newDetails[index] = { idea: '', competencies: [], blocks: [] };
      }
      const list = newDetails[index][field];
      const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
      newDetails[index] = { ...newDetails[index], [field]: newList };
      return { ...prev, saDetails: newDetails };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 text-white">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Planificación de Situaciones de Aprendizaje
          </h2>
          <p className="text-indigo-100 mt-2">
            Configura cómo se estructurarán las situaciones de aprendizaje.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6 shadow-inner">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  name="generateFullCourse"
                  checked={formData.generateFullCourse}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 transition-all"
                />
                <span className="text-slate-800 font-bold group-hover:text-indigo-600 transition-colors">Generar programación para todo el curso</span>
              </label>
              
              {formData.generateFullCourse ? (
                <div className="space-y-4 animate-fade-in-down">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm bg-indigo-50/50 p-2 rounded-lg w-fit">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Ideas para el curso (Opcional)
                  </div>
                  <p className="text-xs text-slate-500">Describe brevemente las temáticas o proyectos que te gustaría incluir a lo largo del curso.</p>
                  <textarea
                    name="fullCourseIdeas"
                    value={formData.fullCourseIdeas || ''}
                    onChange={handleChange}
                    placeholder="Ej: Me gustaría incluir un proyecto sobre el medio ambiente en el primer trimestre, y algo sobre robótica en el segundo..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white shadow-sm"
                    rows={4}
                  />
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in-down">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block">Número de SAs a detallar</label>
                      <p className="text-xs text-slate-400">Cada SA tendrá su propia ficha técnica.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        name="numberOfSAs"
                        min="1"
                        max="15"
                        value={formData.numberOfSAs}
                        onChange={handleChange}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm bg-indigo-50/50 p-2 rounded-lg w-fit">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Detalles de cada Situación de Aprendizaje
                    </div>
                    <p className="text-xs text-slate-500">Configura la temática, competencias y saberes para cada SA. Si dejas campos vacíos, la IA los completará por ti.</p>
                    
                    <div className="space-y-4">
                      {Array.from({ length: formData.numberOfSAs }).map((_, idx) => {
                        const isExpanded = expandedSA === idx;
                        const detail = formData.saDetails[idx] || { idea: '', competencies: [], blocks: [] };
                        
                        return (
                          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                            <button
                              type="button"
                              onClick={() => setExpandedSA(isExpanded ? null : idx)}
                              className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">SA #{idx + 1}</span>
                                <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">
                                  {detail.idea ? detail.idea : 'Temática libre (IA)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                                  <span className={detail.competencies.length > 0 ? 'text-indigo-600 font-medium' : ''}>{detail.competencies.length} comp.</span>
                                  <span>•</span>
                                  <span className={detail.blocks.length > 0 ? 'text-indigo-600 font-medium' : ''}>{detail.blocks.length} saberes</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-4 space-y-5 animate-fade-in">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 block mb-1">Idea / Temática</label>
                                  <textarea
                                    value={detail.idea}
                                    onChange={(e) => handleSADetailChange(idx, 'idea', e.target.value)}
                                    placeholder="Ej: Proyecto sobre energías renovables usando Arduino..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-white shadow-sm"
                                    rows={2}
                                  />
                                </div>
                                
                                {analysisData && analysisData.competencies && analysisData.competencies.length > 0 && (
                                  <div>
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-2">
                                      <Target className="w-3 h-3 text-indigo-500" />
                                      Competencias Específicas
                                    </label>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-2 bg-slate-50/50 space-y-1">
                                      {analysisData.competencies.map((comp, cIdx) => (
                                        <label key={cIdx} className="flex items-start gap-2 p-1.5 hover:bg-white rounded cursor-pointer group transition-colors">
                                          <input 
                                            type="checkbox" 
                                            checked={detail.competencies.includes(comp)}
                                            onChange={() => toggleSelection(idx, 'competencies', comp)}
                                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                          />
                                          <span className="text-xs text-slate-600 group-hover:text-slate-900 leading-tight">{comp}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {analysisData && analysisData.blocks && analysisData.blocks.length > 0 && (
                                  <div>
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-2">
                                      <BookOpen className="w-3 h-3 text-indigo-500" />
                                      Bloques de Saberes
                                    </label>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-2 bg-slate-50/50 space-y-1">
                                      {analysisData.blocks.map((block, bIdx) => (
                                        <label key={bIdx} className="flex items-start gap-2 p-1.5 hover:bg-white rounded cursor-pointer group transition-colors">
                                          <input 
                                            type="checkbox" 
                                            checked={detail.blocks.includes(block)}
                                            onChange={() => toggleSelection(idx, 'blocks', block)}
                                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                          />
                                          <span className="text-xs text-slate-600 group-hover:text-slate-900 leading-tight">{block}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Atrás
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center gap-2 group"
            >
              Siguiente Paso
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanningForm;
