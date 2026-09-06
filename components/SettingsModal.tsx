
import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, AlertCircle, ExternalLink, StepForward, LogIn, MousePointer2, Copy, Cpu, RefreshCw, Loader2 } from 'lucide-react';
import { CURATED_MODELS, GeminiModelOption, getSelectedModel, setSelectedModel, fetchAvailableModels, DEFAULT_MODEL } from '../services/modelService';
import { parseGeminiError, GeminiErrorInfo } from '../services/geminiErrors';
import ErrorMessage from './ErrorMessage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const CUSTOM_OPTION = '__custom__';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [customModel, setCustomModel] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [detectedModels, setDetectedModels] = useState<GeminiModelOption[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<GeminiErrorInfo | null>(null);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);

    const savedModel = getSelectedModel();
    const isKnown = CURATED_MODELS.some(m => m.id === savedModel);
    setModel(savedModel);
    setUseCustomModel(!isKnown);
    setCustomModel(isKnown ? '' : savedModel);
    setDetectionError(null);
    setDetectionMessage(null);
  }, [isOpen]);

  const effectiveModel = useCustomModel ? customModel.trim() : model;

  const handleDetectModels = async () => {
    setIsDetecting(true);
    setDetectionError(null);
    setDetectionMessage(null);
    try {
      const models = await fetchAvailableModels(apiKey);
      setDetectedModels(models);
      if (models.length === 0) {
        setDetectionMessage('La API no ha devuelto ningún modelo de texto para esta clave.');
      } else {
        setDetectionMessage(`${models.length} modelos disponibles para tu clave.`);
      }
    } catch (e) {
      setDetectionError(parseGeminiError(e));
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }

    setSelectedModel(effectiveModel || DEFAULT_MODEL);

    setIsSaved(true);
    if (onSave) onSave();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  // Los detectados que no estén ya en la lista sugerida.
  const extraDetected = detectedModels.filter(d => !CURATED_MODELS.some(c => c.id === d.id));
  const selectedHint = CURATED_MODELS.find(m => m.id === effectiveModel)?.hint
    || detectedModels.find(m => m.id === effectiveModel)?.hint;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Configuración de API y modelo
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Gemini API Key</label>
            <input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Introduce tu clave AI Studio (ej: AIza...)"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              La clave se guardará localmente. Si está vacía, se usará la clave del sistema.
            </p>
          </div>

          {/* Selección del modelo de Gemini */}
          <div className="space-y-3 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Modelo de Gemini
              </label>
              <button
                type="button"
                onClick={handleDetectModels}
                disabled={isDetecting}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 transition-colors"
                title="Consulta a Google qué modelos admite tu clave"
              >
                {isDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {isDetecting ? 'Consultando...' : 'Detectar modelos disponibles'}
              </button>
            </div>

            <select
              value={useCustomModel ? CUSTOM_OPTION : model}
              onChange={(e) => {
                const value = e.target.value;
                if (value === CUSTOM_OPTION) {
                  setUseCustomModel(true);
                  if (!customModel) setCustomModel(model);
                } else {
                  setUseCustomModel(false);
                  setModel(value);
                }
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
            >
              <optgroup label="Modelos sugeridos">
                {CURATED_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
              {extraDetected.length > 0 && (
                <optgroup label="Detectados para tu clave">
                  {extraDetected.map(m => (
                    <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                  ))}
                </optgroup>
              )}
              <option value={CUSTOM_OPTION}>Otro modelo (escribir identificador)…</option>
            </select>

            {useCustomModel && (
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Ej: gemini-2.5-flash"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              />
            )}

            {selectedHint && !useCustomModel && (
              <p className="text-xs text-slate-500 leading-relaxed">{selectedHint}</p>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Modelo activo: <span className="font-mono text-slate-600">{effectiveModel || DEFAULT_MODEL}</span>.
              Los modelos Pro redactan mejor, pero consumen mucha más cuota; los Flash son más rápidos y baratos.
            </p>

            {detectionMessage && !detectionError && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                {detectionMessage}
              </p>
            )}

            {detectionError && (
              <ErrorMessage info={detectionError} onDismiss={() => setDetectionError(null)} />
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <StepForward className="w-4 h-4 text-indigo-600" />
                ¿Cómo obtener tu clave gratuita?
              </h3>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
              >
                Ir a AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">1</div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Inicia Sesión</span>
                  <p className="text-[11px] text-slate-500">Usa tu cuenta de Google en AI Studio.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">2</div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Crea la clave</span>
                  <p className="text-[11px] text-slate-500">Pulsa el botón azul <strong>"Get API Key"</strong> y luego <strong>"Create API key in new project"</strong>.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400">3</div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">Copia y pega</span>
                  <p className="text-[11px] text-slate-500">Copia el código alfanumérico que aparece y pégalo en el cuadro de arriba.</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-3 rounded-lg flex gap-3 items-start border border-indigo-100">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                <strong>Importante:</strong> La versión gratuita permite miles de peticiones al mes, suficiente para planificar todo un curso escolar. No compartas nunca tu clave.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95"
          >
            {isSaved ? <CheckCircle className="w-4 h-4" /> : null}
            {isSaved ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
