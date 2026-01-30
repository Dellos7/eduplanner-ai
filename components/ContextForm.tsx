
import React, { useState } from 'react';
import { TeacherContext, CurriculumAnalysis } from '../types';
import { ArrowRight, CheckSquare, Square, Clock, BookOpen, Users, Globe, Briefcase, AlertCircle, RefreshCw, GraduationCap, Lightbulb } from 'lucide-react';
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

const GRADE_LEVELS = [
  "1ºESO",
  "2ºESO",
  "3ºESO",
  "4ºESO",
  "1º Bachiller",
  "2º Bachiller"
];

const ContextForm: React.FC<ContextFormProps> = ({ initialData, analysisData, onReAnalyze, onSubmit }) => {
  const [formData, setFormData] = useState<TeacherContext>(initialData);

  const isAnalysisIncomplete = !analysisData || 
    !analysisData.subject || 
    analysisData.competencies.length === 0 || 
    analysisData.blocks.length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'numberOfSAs') {
      const num = parseInt(value) || 1;
      const clampedNum = Math.min(Math.max(num, 1), 15);
      
      setFormData(prev => {
        const newIdeas = [...prev.saIdeas];
        if (newIdeas.length < clampedNum) {
          while (newIdeas.length < clampedNum) newIdeas.push('');
        } else {
          newIdeas.length = clampedNum;
        }
        return { ...prev, numberOfSAs: clampedNum, saIdeas: newIdeas };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleIdeaChange = (index: number, value: string) => {
    setFormData(prev => {
      const newIdeas = [...prev.saIdeas];
      newIdeas[index] = value;
      return { ...prev, saIdeas: newIdeas };
    });
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
    if (!formData.gradeLevel) {
      alert("Por favor, selecciona un curso.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isAnalysisIncomplete && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 text-amber-800 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Información curricular parcial</p>
            <p className="text-xs mt-1 opacity-90">
              No hemos detectado todos los campos (como competencias o bloques). Puedes completarlos manualmente o reintentar si el PDF contiene el currículo.
            </p>
            <button 
              type="button"
              onClick={onReAnalyze}
              className="mt-3 flex items-center gap-2 text-xs font-bold bg-white hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors border border-amber-200 text-amber-700"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar análisis
            </button>
          </div>
        </div>
      )}

      <CurricularReference analysisData={analysisData} />

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-8">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Configuración del Contexto
          </h2>
          <p className="text-slate-500 mt-1">Personaliza el curso y las necesidades del grupo para una IA más precisa.</p>
        </div>

        {/* Row 1: Subject & Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Asignatura / Materia</label>
            <input
              type="text"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              placeholder="Ej: Biología y Geología"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Departamento Didáctico</label>
            <input
              type="text"
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
              placeholder="Ej: Departamento de Ciencias"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Row 2: Level, Hours & Language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              Curso / Nivel <span className="text-rose-500">*</span>
            </label>
            <select
              name="gradeLevel"
              required
              value={formData.gradeLevel}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white font-medium ${!formData.gradeLevel ? 'border-rose-200 ring-1 ring-rose-50 text-slate-400' : 'border-slate-300 text-slate-700'}`}
            >
              <option value="" disabled>Selecciona el curso...</option>
              {GRADE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
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
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              Idioma del Documento
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
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
            Metodologías Preferidas
          </h3>
          <p className="text-sm text-slate-500 mb-4">Selecciona los enfoques que la IA priorizará en la redacción:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {METHODOLOGIES.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleMethodologyToggle(method)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                  formData.methodologyPreference.includes(method)
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
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
            Inclusión y Atención a la Diversidad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {COMMON_NEEDS.map((need) => (
              <button
                key={need}
                type="button"
                onClick={() => handleNeedToggle(need)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                  formData.selectedNeeds.includes(need)
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
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
            placeholder="Describe otras características del grupo o necesidades específicas..."
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
          />
        </div>

        <hr className="border-slate-100" />

        {/* Section: Settings SAs */}
        <div className="space-y-4">
           <label className="text-sm font-semibold text-slate-700 block">Planificación de Situaciones de Aprendizaje</label>
           
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
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
              
              <div className={`transition-all duration-300 space-y-6 ${formData.generateFullCourse ? 'opacity-40 pointer-events-none grayscale blur-[1px]' : 'opacity-100'}`}>
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
                      disabled={formData.generateFullCourse}
                      value={formData.numberOfSAs}
                      onChange={handleChange}
                      className="w-20 px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-center text-indigo-600 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Ideas dinámicas para cada SA */}
                <div className="space-y-4 animate-fade-in-down">
                  <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm bg-indigo-50/50 p-2 rounded-lg w-fit">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Propuestas Temáticas (Opcional)
                  </div>
                  <p className="text-xs text-slate-500">Si dejas estos campos vacíos, la IA propondrá temas creativos basados en el currículo.</p>
                  <div className="grid grid-cols-1 gap-4">
                    {Array.from({ length: formData.numberOfSAs }).map((_, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 group hover:border-indigo-200 transition-colors">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Situación de Aprendizaje {idx + 1}
                          </label>
                          <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono">SA#{idx+1}</span>
                        </div>
                        <textarea
                          value={formData.saIdeas[idx] || ''}
                          disabled={formData.generateFullCourse}
                          onChange={(e) => handleIdeaChange(idx, e.target.value)}
                          placeholder="Ej: Proyecto sobre energías renovables usando Arduino..."
                          className="w-full px-4 py-2.5 border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm bg-slate-50/30 transition-all disabled:bg-slate-100"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-3 active:scale-[0.98]"
          >
            Continuar al Siguiente Paso
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContextForm;
