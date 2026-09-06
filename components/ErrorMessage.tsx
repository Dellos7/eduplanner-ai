import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink, X, Clock, Cpu } from 'lucide-react';
import { GeminiErrorInfo } from '../services/geminiErrors';

interface ErrorMessageProps {
  info: GeminiErrorInfo | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ info, onDismiss, onRetry, className = "" }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    setShowDetails(false);
    setSecondsLeft(info?.retryAfterSeconds ?? null);
  }, [info]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(s => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  if (!info) return null;

  const isWaiting = secondsLeft !== null && secondsLeft > 0;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-xl overflow-hidden animate-fade-in ${className}`}>
      <div className="p-4 flex items-start gap-3">
        <div className="bg-red-100 p-2 rounded-lg shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-red-800 text-sm leading-snug">{info.title}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-400 hover:text-red-700 transition-colors shrink-0"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-sm text-red-700 leading-relaxed">{info.message}</p>

          {info.hint && (
            <p className="text-xs text-red-800/90 bg-white/70 border border-red-100 rounded-lg p-3 leading-relaxed">
              <strong>Qué puedes hacer:</strong> {info.hint}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-red-600/90 font-medium">
            {info.model && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                Modelo: <span className="font-mono">{info.model}</span>
              </span>
            )}
            {info.code && <span>Código: {info.code}{info.status ? ` · ${info.status}` : ''}</span>}
            {isWaiting && (
              <span className="flex items-center gap-1 text-red-700">
                <Clock className="w-3 h-3" />
                Podrás reintentar en {secondsLeft} s
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isWaiting}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white transition-colors"
              >
                {isWaiting ? `Reintentar (${secondsLeft} s)` : 'Reintentar'}
              </button>
            )}

            {info.helpUrl && (
              <a
                href={info.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
              >
                Más información
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-bold text-red-600/80 hover:text-red-800 flex items-center gap-1 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
            </button>
          </div>

          {showDetails && (
            <pre className="mt-2 text-[10px] leading-relaxed bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-48 custom-scrollbar">
              {info.raw}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
