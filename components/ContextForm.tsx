
import React, { useState } from 'react';
import { TeacherContext, CurriculumAnalysis } from '../types';
import { ArrowRight, CheckSquare, Square, Clock, BookOpen, Users, Globe, Briefcase, AlertCircle, RefreshCw } from 'lucide-react';
import CurricularReference from './CurricularReference';

interface ContextFormProps {
  initialData: TeacherContext;
  analysisData: CurriculumAnalysis | null;
  onReAnalyze: () => void;
  onSubmit: (data: TeacherContext) => void;
}

const COMMON_NEEDS = [
  "Alumnado TDAH",
  "Altas Capacidades",
  "Dislexia / DEA",
  "Medidas Nivel II (Apoyo ordinario)",
  "Medidas Nivel III (Apoyo específico)",
  "Desconocimiento del idioma",
  "Problemas de conducta",
  "Discapacidad motora"
];

const METHODOLOGIES = [
  "Aprendizaje Basado en Proyectos (ABP)",
  "Flipped Classroom",
  "Gamificación",
  "Aprendizaje Cooperativo",
  "Instrucción Directa y Práctica",
  "Aprendizaje Basado en Retos",
  "Aprendizaje Servicio (ApS)",
  "Design Thinking"
];

const ContextForm: React.FC<ContextFormProps> = ({ initialData, analysisData, onReAnalyze, onSubmit }) => {
  const [formData, setFormData] = useState<TeacherContext>(initialData);

  const isAnalysisIncomplete = !analysisData || 
    !analysisData.subject || 
    !analysisData.grade || 
    analysisData.competencies.length === 0 || 
    analysisData.blocks.length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === 'generateFullCourse') {
      setFormData(prev => ({ ...prev, generateFullCourse: checked }));
    }
  };

  const handleNeedToggle = (need: string) => {
    setFormData(prev => {
      const currentNeeds = prev.selectedNeeds || [];
      if (currentNeeds.includes(need)) {
        return { ...prev, selectedNeeds: currentNeeds.filter(n => n !== need) };
      } else {
        return { ...prev, selectedNeeds: [...currentNeeds, need] };
      }
    });
  };

  const handleMethodologyToggle = (method: string) => {
    setFormData(prev => {
      const currentMethods = prev.methodologyPreference || [];
      if (currentMethods.includes(method)) {
        return { ...prev, methodologyPreference: currentMethods.filter(m => m !== method) };
      } else {
        return { ...prev, methodologyPreference: [...currentMethods, method] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isAnalysisIncomplete && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-4 text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Detección automática incompleta</p>
            <p className="text-xs mt-1">La IA no ha podido extraer todos los datos curriculares del PDF. Puedes rellenarlos manualmente abajo o intentar analizar el archivo de nuevo.</p>
            <button 
              type="button"
              onClick={onReAnalyze}
              className="mt-3 flex items-center gap-2 text-xs font-bold bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors border border-red-300"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar análisis del PDF
            </button>
          </div>
        </div>
      )}

      <CurricularReference analysisData={analysisData} />

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-8">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Datos Generales
          </h2>
          <p className="text-slate-500 mt-1">Revisa la información base extraída del PDF.</p>
        </div>

        {/* Row 1: Subject & Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Asignatura / Materia</label>
            <input
              type="text"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              placeholder="Ej: Biología y Geología"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Departamento Didáctico</label>
            <input
              type="text"
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
              placeholder="Ej: Departamento de Ciencias"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Row 2: Level, Hours & Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Curso / Nivel</label>
            <input
              type="text"
              name="gradeLevel"
              required
              value={formData.gradeLevel}
              onChange={handleChange}
              placeholder="Ej: 3º ESO"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Horas Semanales
            </label>
            <input
              type="number"
              name="weeklyHours"
              required
              min="1"
              max="30"
              value={formData.weeklyHours || ''}
              onChange={handleChange}
              placeholder="Ej: 3"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              Idioma Documento
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
            >
              <option value="Castellano">Castellano</option>
              <option value="Catalán / Valenciano">Catalán / Valenciano</option>
              <option value="Inglés">Inglés</option>
            </select>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Section: Methodologies */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Metodologías Activas
          </h3>
          <p className="text-sm text-slate-500 mb-3">Selecciona las metodologías que se aplicarán en el aula:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {METHODOLOGIES.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleMethodologyToggle(method)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  formData.methodologyPreference.includes(method)
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                 {formData.methodologyPreference.includes(method) ? (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 shrink-0" />
                )}
                <span>{method}</span>
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Section: Needs */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Atención a la Diversidad (Inclusión)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {COMMON_NEEDS.map((need) => (
              <button
                key={need}
                type="button"
                onClick={() => handleNeedToggle(need)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  formData.selectedNeeds.includes(need)
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {formData.selectedNeeds.includes(need) ? (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 shrink-0" />
                )}
                <span>{need}</span>
              </button>
            ))}
          </div>
          <textarea
            name="otherNeeds"
            value={formData.otherNeeds}
            onChange={handleChange}
            rows={2}
            placeholder="Otras necesidades específicas o notas sobre el grupo..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
          />
        </div>

        <hr className="border-slate-100" />

        {/* Section: Settings */}
        <div className="space-y-4">
           <label className="text-sm font-medium text-slate-700 block">Planificación de Situaciones de Aprendizaje</label>
           
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  name="generateFullCourse"
                  checked={formData.generateFullCourse}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <span className="text-slate-800 font-medium">Generar SAs para todo el curso</span>
              </label>
              
              <div className={`transition-opacity ${formData.generateFullCourse ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <label className="text-sm text-slate-600 mb-1 block">¿Cuántas SAs quieres generar?</label>
                <input
                  type="number"
                  name="numberOfSAs"
                  min="1"
                  max="15"
                  value={formData.numberOfSAs}
                  onChange={handleChange}
                  className="w-full max-w-[200px] px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
           </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContextForm;
