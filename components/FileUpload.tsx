
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, X, FileJson } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (base64: string, fileName: string) => void;
  onJsonImport?: (jsonData: any) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onJsonImport, disabled = false }) => {
  const [dragActivePdf, setDragActivePdf] = useState(false);
  const [dragActiveJson, setDragActiveJson] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDragPdf = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActivePdf(true);
    } else if (e.type === "dragleave") {
      setDragActivePdf(false);
    }
  }, [disabled]);

  const handleDragJson = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveJson(true);
    } else if (e.type === "dragleave") {
      setDragActiveJson(false);
    }
  }, [disabled]);

  const processPdfFile = (file: File) => {
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
      setError("Error al leer el archivo PDF.");
      setIsLoading(false);
    };
  };

  const processJsonFile = (file: File) => {
    if (disabled) return;
    setError(null);
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError("Por favor, sube un archivo JSON válido.");
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const jsonData = JSON.parse(reader.result as string);
        if (!jsonData.version || !jsonData.docType || !jsonData.content) {
          throw new Error("El archivo JSON no tiene el formato correcto.");
        }
        if (onJsonImport) {
          onJsonImport(jsonData);
        }
      } catch (err) {
        setError("Error al procesar el archivo JSON. Asegúrate de que es un archivo exportado válido.");
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError("Error al leer el archivo JSON.");
      setIsLoading(false);
    };
  };

  const handleDropPdf = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActivePdf(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPdfFile(e.dataTransfer.files[0]);
    }
  }, [onFileSelect, disabled]);

  const handleDropJson = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActiveJson(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processJsonFile(e.dataTransfer.files[0]);
    }
  }, [onJsonImport, disabled]);

  const handleChangePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processPdfFile(e.target.files[0]);
    }
  };

  const handleChangeJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processJsonFile(e.target.files[0]);
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
            <p className="font-semibold text-slate-800">Archivo cargado</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Upload */}
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out
            ${dragActivePdf ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'}
            ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer'}
          `}
          onDragEnter={handleDragPdf}
          onDragLeave={handleDragPdf}
          onDragOver={handleDragPdf}
          onDrop={handleDropPdf}
        >
          <input 
            type="file" 
            className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            accept=".pdf"
            onChange={handleChangePdf}
            disabled={isLoading || disabled}
          />
          
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="bg-indigo-50 p-4 rounded-full">
              <UploadCloud className={`w-10 h-10 ${dragActivePdf ? 'text-indigo-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-base font-medium text-slate-700">
                {disabled ? 'Configura la API KEY' : 'Subir PDF con el contenido curricular'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {disabled ? 'Usa el icono de engranaje' : 'Arrastra el PDF o haz clic'}
              </p>
            </div>
          </div>
        </div>

        {/* JSON Upload */}
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out
            ${dragActiveJson ? 'border-amber-500 bg-amber-50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-amber-400 hover:bg-slate-50'}
            ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50' : 'cursor-pointer'}
          `}
          onDragEnter={handleDragJson}
          onDragLeave={handleDragJson}
          onDragOver={handleDragJson}
          onDrop={handleDropJson}
        >
          <input 
            type="file" 
            className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            accept=".json"
            onChange={handleChangeJson}
            disabled={isLoading || disabled}
          />
          
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="bg-amber-50 p-4 rounded-full">
              <FileJson className={`w-10 h-10 ${dragActiveJson ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-base font-medium text-slate-700">
                {disabled ? 'Configura la API KEY' : 'Subir JSON exportado previamente'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {disabled ? 'Usa el icono de engranaje' : 'Arrastra el JSON o haz clic'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {isLoading && <p className="text-center mt-4 text-indigo-600 animate-pulse">Procesando archivo...</p>}
      {error && <p className="text-center mt-4 text-red-500 bg-red-50 p-2 rounded">{error}</p>}
    </div>
  );
};

export default FileUpload;
