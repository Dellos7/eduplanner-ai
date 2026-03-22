import React from 'react';
import { HistoryItem, DocType } from '../types';
import { getHistory, deleteFromHistory } from '../services/historyService';
import { FileText, Trash2, Calendar, BookOpen, GraduationCap, ArrowLeft, Clock } from 'lucide-react';

interface HistoryProps {
  onSelect: (item: HistoryItem) => void;
  onBack: () => void;
}

const History: React.FC<HistoryProps> = ({ onSelect, onBack }) => {
  const [history, setHistory] = React.useState<HistoryItem[]>([]);

  React.useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este documento del historial?')) {
      deleteFromHistory(id);
      setHistory(getHistory());
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Clock className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Historial de Generaciones</h2>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No hay documentos guardados</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Los documentos que generes aparecerán aquí automáticamente para que puedas consultarlos más tarde.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.type === DocType.PROPUESTA 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.type === DocType.PROPUESTA ? 'Propuesta' : 'Situación'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.date)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span>{item.subject}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      <span>{item.gradeLevel}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar del historial"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
