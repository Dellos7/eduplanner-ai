
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (base64: string, fileName: string) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled = false }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, [disabled]);

  const processFile = (file: File) => {
    if (disabled) return;
    setError(null);
    if (file.type !== 'application/pdf') {
      setError("Por favor, sube un archivo PDF válido.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) { 
      setError("El archivo es demasiado grande. Máximo 20MB.");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1]; 
      setFileName(file.name);
      onFileSelect(base64Data, file.name);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError("Error al leer el archivo.");
      setIsLoading(false);
    };
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onFileSelect, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  if (fileName) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Currículum cargado</p>
            <p className="text-sm text-slate-500">{fileName}</p>
          </div>
        </div>
        <button 
          onClick={() => { setFileName(null); onFileSelect("", ""); }}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-red-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${disabled ? 'opacity-50 grayscale' : ''}`}>
      <div 
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ease-in-out
          ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'}
          ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          accept=".pdf"
          onChange={handleChange}
          disabled={isLoading || disabled}
        />
        
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="bg-indigo-50 p-4 rounded-full">
            <UploadCloud className={`w-10 h-10 ${dragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">
              {disabled ? 'Configura la API KEY para empezar' : 'Arrastra y suelta el PDF del currículum de la asignatura'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {disabled ? 'Usa el icono de engranaje arriba a la derecha' : 'o haz clic para explorar tus archivos'}
            </p>
          </div>
        </div>
      </div>
      {isLoading && <p className="text-center mt-4 text-indigo-600 animate-pulse">Procesando archivo...</p>}
      {error && <p className="text-center mt-4 text-red-500 bg-red-50 p-2 rounded">{error}</p>}
    </div>
  );
};

export default FileUpload;
