
import React, { useState } from 'react';
import { BookOpen, Sparkles, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

interface LayoutProps {
  children: React.ReactNode;
  onHome?: () => void;
  onSettingsSave?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onHome, onSettingsSave }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onHome}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
            >
              <div className="bg-indigo-600 p-2 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight whitespace-nowrap">
                EduPlanner <span className="text-indigo-600">AI</span>
              </h1>
            </button>
            
            <div className="hidden lg:block h-6 w-[1px] bg-slate-200"></div>
            
            <p className="hidden md:block text-xs text-slate-500 font-medium leading-tight max-w-[300px]">
              Diseño inteligente de propuestas pedagógicas y situaciones de aprendizaje basadas en el currículum oficial.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              data-settings-trigger="true"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-sm font-semibold transition-all"
              title="Configura tu clave de API y el modelo de IA de cada paso"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Modelos de IA y API Key</span>
            </button>
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={onSettingsSave}
      />

      <main className="flex-1 w-full max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 mt-auto py-8">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} EduPlanner AI. Diseño pedagógico automatizado.</p>
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl max-w-3xl mx-auto">
            <p className="text-amber-800 text-xs leading-relaxed">
              <strong>Aviso legal:</strong> Esta plataforma utiliza inteligencia artificial para generar contenido educativo. EduPlanner AI no se hace responsable de posibles errores, imprecisiones o falta de adecuación curricular en los documentos generados. El usuario es el único responsable de revisar, corregir y validar todo el contenido antes de su uso profesional o administrativo.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
