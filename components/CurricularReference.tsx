
import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Layers, Bookmark } from 'lucide-react';
import { CurriculumAnalysis } from '../types';

interface CurricularReferenceProps {
  analysisData: CurriculumAnalysis | null;
  className?: string;
}

const CurricularReference: React.FC<CurricularReferenceProps> = ({ analysisData, className = "" }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  if (!analysisData) return null;

  const renderItemWithCode = (text: string, type: 'ce' | 'block') => {
    // Intentamos separar el código (ej: CE1, Bloque 1) del contenido
    const parts = text.split(/[:\s-]{1,2}/);
    if (parts.length > 1 && (parts[0].toUpperCase().startsWith('CE') || parts[0].toUpperCase().startsWith('BLOQUE'))) {
      const code = parts[0];
      const content = text.substring(code.length).replace(/^[:\s-]{1,2}/, '').trim();
      
      return (
        <li className="text-xs text-slate-600 flex items-start gap-2 group">
          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight
            ${type === 'ce' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
            {code}
          </span>
          <span className="mt-0.5 leading-relaxed">{content}</span>
        </li>
      );
    }

    // Fallback si no hay código detectable
    return (
      <li className="text-xs text-slate-600 flex items-start gap-2">
        <span className={`${type === 'ce' ? 'text-emerald-500' : 'text-blue-500'} mt-1`}>•</span>
        {text}
      </li>
    );
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <button 
        type="button"
        onClick={() => setShowAnalysis(!showAnalysis)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-slate-700">Referencia Curricular Extraída</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {analysisData.subject || "Sin asignatura"}
          </span>
        </div>
        {showAnalysis ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      
      {showAnalysis && (
        <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white max-h-[400px] overflow-y-auto custom-scrollbar">
          <div>
            <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3 text-sm sticky top-0 bg-white py-1">
              <Layers className="w-4 h-4 text-emerald-500" />
              Competencias Específicas
            </h4>
            <ul className="space-y-3">
              {analysisData.competencies && analysisData.competencies.length > 0 ? (
                analysisData.competencies.map((comp, idx) => (
                  <React.Fragment key={idx}>
                    {renderItemWithCode(comp, 'ce')}
                  </React.Fragment>
                ))
              ) : (
                <li className="text-xs text-slate-400 italic">No se detectaron competencias específicas.</li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-3 text-sm sticky top-0 bg-white py-1">
              <Bookmark className="w-4 h-4 text-blue-500" />
              Bloques de Saberes
            </h4>
             <ul className="space-y-3">
              {analysisData.blocks && analysisData.blocks.length > 0 ? (
                analysisData.blocks.map((block, idx) => (
                  <React.Fragment key={idx}>
                    {renderItemWithCode(block, 'block')}
                  </React.Fragment>
                ))
              ) : (
                <li className="text-xs text-slate-400 italic">No se detectaron bloques de saberes.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurricularReference;
