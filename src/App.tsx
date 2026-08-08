import { useState } from 'react';
import { Header } from './components/Header';
import { ComplaintForm } from './components/ComplaintForm';
import { CopilotChat } from './components/CopilotChat';
import { QMSHistoryModal } from './components/QMSHistoryModal';
import { PresetsModal } from './components/PresetsModal';
import { FileText, Sparkles } from 'lucide-react';

export default function App() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'copilot'>('form');

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* App Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
      />

      {/* Mobile Tab Toggle (< lg screens) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-center gap-2 shrink-0">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 max-w-xs py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'form'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Complaint Form</span>
        </button>

        <button
          onClick={() => setMobileTab('copilot')}
          className={`flex-1 max-w-xs py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'copilot'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          <span>AIVOA Copilot</span>
        </button>
      </div>

      {/* Main Workspace split into Left Form & Right Copilot */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 items-stretch min-h-0 overflow-hidden">
        {/* Left: Log Customer Complaint Form */}
        <div className={`lg:col-span-7 h-full min-h-0 overflow-hidden flex flex-col ${mobileTab === 'form' ? 'flex' : 'hidden lg:flex'}`}>
          <ComplaintForm />
        </div>

        {/* Right: AIVOA Copilot AI Assistant */}
        <div className={`lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col ${mobileTab === 'copilot' ? 'flex' : 'hidden lg:flex'}`}>
          <CopilotChat />
        </div>
      </main>

      {/* Modals */}
      <QMSHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
      />
    </div>
  );
}
