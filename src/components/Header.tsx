import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { resetForm } from '../store/complaintSlice';
import { resetChat } from '../store/chatSlice';
import { RotateCcw, FileText, CheckCircle2, AlertCircle, ShieldCheck, Database } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenPresets: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory, onOpenPresets }) => {
  const dispatch = useAppDispatch();
  const { status, qmsLogId, history } = useAppSelector((state) => state.complaint);

  const handleReset = () => {
    if (confirm('Reset form and chat to start fresh?')) {
      dispatch(resetForm());
      dispatch(resetChat());
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg shadow-xs flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Log Customer Complaint
              </h1>
              {/* Status Badge */}
              {status === 'Pending Triage' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  Pending Triage
                </span>
              )}
              {status === 'Ready to Commit' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Ready to Commit
                </span>
              )}
              {status === 'Committed' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  <Database className="w-3 h-3 text-purple-600" />
                  Committed ({qmsLogId})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              API & FDF Quality Assurance Module
            </p>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={onOpenPresets}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Load demo scenario presets"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Demo Scenarios</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200"
          >
            <Database className="w-3.5 h-3.5" />
            <span>QMS Logs ({history.length})</span>
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Reset form and start fresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
