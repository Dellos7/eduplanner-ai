import React from 'react';
import { DocType } from '../types';
import { BookMarked, Lightbulb } from 'lucide-react';

interface DocTypeSelectorProps {
  onSelect: (type: DocType) => void;
}

const DocTypeSelector: React.FC<DocTypeSelectorProps> = ({ onSelect }) => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800">¿Qué deseas crear hoy?</h2>
        <p className="text-slate-500 mt-2">La IA utilizará el currículum subido y tus preferencias.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Propuesta */}
        <button
          onClick={() => onSelect(DocType.PROPUESTA)}
          className="group relative bg-white p-8 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 text-left flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookMarked className="w-24 h-24 text-indigo-600" />
          </div>
          <div className="bg-indigo-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <BookMarked className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">
            Propuesta Pedagógica
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Genera el documento marco del departamento. Incluye objetivos, metodología, criterios de evaluación generales y atención a la diversidad para toda la asignatura.
          </p>
        </button>

        {/* Card 2: Situaciones */}
        <button
          onClick={() => onSelect(DocType.SITUACION)}
          className="group relative bg-white p-8 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 text-left flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Lightbulb className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="bg-emerald-50 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Lightbulb className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">
            Situaciones de Aprendizaje
          </h3>
          <p className="text-slate-600 leading-relaxed">
            Diseña unidades didácticas concretas (SdA). Incluye justificación, reto, secuencia de actividades, productos finales e instrumentos de evaluación específicos.
          </p>
        </button>
      </div>
    </div>
  );
};

export default DocTypeSelector;
