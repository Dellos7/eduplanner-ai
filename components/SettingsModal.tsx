
import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle, AlertCircle, ExternalLink, StepForward, LogIn, MousePointer2, Copy, Cpu, RefreshCw, Loader2, RotateCcw } from 'lucide-react';
import {
  CURATED_MODELS,
  GeminiModelOption,
  MODEL_TASKS,
  ModelTask,
  getAllTaskModels,
  setTaskModels,
  fetchAvailableModels
} from '../services/modelService';
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

  const [taskModels, setTaskModelsState] = useState<Record<ModelTask, string>>(getAllTaskModels());
  const [detectedModels, setDetectedModels] = useState<GeminiModelOption[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<GeminiErrorInfo | null>(null);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);
  const [hasDetected, setHasDetected] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);

    setTaskModelsState(getAllTaskModels());
    setDetectionError(null);
    setDetectionMessage(null);
  }, [isOpen]);

  const updateTaskModel = (task: ModelTask, value: string) => {
    setTaskModelsState(prev => ({ ...prev, [task]: value }));
  };

  const restoreRecommended = () => {
    setTaskModelsState(
      MODEL_TASKS.reduce((acc, task) => {
        acc[task.key] = task.defaultModel;
        return acc;
      }, {} as Record<ModelTask, string>)
    );
  };

  const handleDetectModels = async () => {
    setIsDetecting(true);
    setDetectionError(null);
    setDetectionMessage(null);
    try {
      const models = await fetchAvailableModels(apiKey);
      setDetectedModels(models);
      setHasDetected(true);
      if (models.length === 0) {
        setDetectionMessage('La API no ha devuelto ningún modelo de texto para esta clave.');
      } else {
        setDetectionMessage(`${models.length} modelos disponibles para tu clave. Los que no aparezcan en tu lista darán error 404 al usarlos.`);
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

    setTaskModels(taskModels);

    setIsSaved(true);
    if (onSave) onSave();
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  const isDefaultConfig = MODEL_TASKS.every(task => taskModels[task.key] === task.defaultModel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            Configuración de API y modelos
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
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

          {/* Selección del modelo de Gemini para cada tarea */}
          <div className="space-y-3 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Modelos de Gemini por tarea
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

            <p className="text-xs text-slate-500 leading-relaxed">
              Cada paso de la aplicación consume de forma muy distinta. Vienen preconfigurados los modelos recomendados para cada uno: puedes cambiarlos si tu clave tiene otros límites.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {MODEL_TASKS.map(task => (
                <TaskModelSelector
                  key={task.key}
                  taskKey={task.key}
                  label={task.label}
                  description={task.description}
                  defaultModel={task.defaultModel}
                  value={taskModels[task.key]}
                  detectedModels={detectedModels}
                  hasDetected={hasDetected}
                  onChange={updateTaskModel}
                />
              ))}
            </div>

            {!isDefaultConfig && (
              <button
                type="button"
                onClick={restoreRecommended}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer los modelos recomendados
              </button>
            )}

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

interface TaskModelSelectorProps {
  taskKey: ModelTask;
  label: string;
  description: string;
  defaultModel: string;
  value: string;
  /** Modelos que ha devuelto la API para la clave del usuario. */
  detectedModels: GeminiModelOption[];
  /** Si ya se ha consultado la lista; hasta entonces no se puede saber qué falta. */
  hasDetected: boolean;
  onChange: (task: ModelTask, value: string) => void;
}

const TaskModelSelector: React.FC<TaskModelSelectorProps> = ({
  taskKey, label, description, defaultModel, value, detectedModels, hasDetected, onChange
}) => {
  const isKnown = CURATED_MODELS.some(m => m.id === value) || detectedModels.some(m => m.id === value);
  const [useCustom, setUseCustom] = useState(!isKnown);

  useEffect(() => {
    setUseCustom(!(CURATED_MODELS.some(m => m.id === value) || detectedModels.some(m => m.id === value)));
  }, [value, detectedModels]);

  const hint = CURATED_MODELS.find(m => m.id === value)?.hint;
  const isDefault = value === defaultModel;
  const isUnavailable = hasDetected && value.trim() !== '' && !detectedModels.some(m => m.id === value.trim());

  // Una vez consultada la API, la lista real manda: se muestran primero los modelos
  // que la clave admite (con la descripción de la lista sugerida cuando se conoce)
  // y aparte los sugeridos que esa clave NO sirve.
  const detectedOptions = detectedModels.map(d => CURATED_MODELS.find(c => c.id === d.id) || d);
  const notDetected = CURATED_MODELS.filter(c => !detectedModels.some(d => d.id === c.id));

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 leading-tight">{label}</span>
        {isDefault && (
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
            Recomendado
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>

      <select
        value={useCustom ? CUSTOM_OPTION : value}
        onChange={(e) => {
          const selected = e.target.value;
          if (selected === CUSTOM_OPTION) {
            setUseCustom(true);
          } else {
            setUseCustom(false);
            onChange(taskKey, selected);
          }
        }}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
      >
        {hasDetected ? (
          <>
            <optgroup label="Disponibles para tu clave">
              {detectedOptions.map(m => (
                <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
              ))}
            </optgroup>
            {notDetected.length > 0 && (
              <optgroup label="No disponibles para tu clave">
                {notDetected.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </optgroup>
            )}
          </>
        ) : (
          <optgroup label="Modelos sugeridos">
            {CURATED_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </optgroup>
        )}
        <option value={CUSTOM_OPTION}>Otro modelo (escribir identificador)…</option>
      </select>

      {useCustom ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(taskKey, e.target.value)}
          placeholder="Ej: gemini-3.8-flash"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
        />
      ) : (
        hint && <p className="text-[11px] text-slate-400 leading-relaxed">{hint}</p>
      )}

      {isUnavailable && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed flex gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>Tu clave no ha devuelto este modelo: al usarlo dará error 404. Elige uno del grupo "Detectados para tu clave".</span>
        </p>
      )}
    </div>
  );
};

export default SettingsModal;
