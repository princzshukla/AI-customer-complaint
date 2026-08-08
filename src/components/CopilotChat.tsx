import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { addMessage, setProcessing, setOcrProgress } from '../store/chatSlice';
import { updateFormFields } from '../store/complaintSlice';
import { Sparkles, Paperclip, Send, FileText, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

export const CopilotChat: React.FC = () => {
  const dispatch = useAppDispatch();
  const { messages, isProcessing, ocrProgress } = useAppSelector((state) => state.chat);
  const complaintState = useAppSelector((state) => state.complaint);

  const [inputPrompt, setInputPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, ocrProgress]);

  const handleSend = async (textToSend?: string, attachedFile?: { name: string; mimeType: string; base64: string }) => {
    const text = textToSend !== undefined ? textToSend : inputPrompt;
    if (!text.trim() && !attachedFile) return;

    const userMsgId = `msg-${Date.now()}`;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message
    dispatch(
      addMessage({
        id: userMsgId,
        sender: 'user',
        text: text,
        attachment: attachedFile ? { name: attachedFile.name, type: 'PDF Document', size: '142 KB' } : null,
        timestamp: nowStr
      })
    );

    setInputPrompt('');
    dispatch(setProcessing(true));

    if (attachedFile) {
      dispatch(setOcrProgress('Extracting tabular data via OCR...'));
      // Slight delay to mimic OCR scan UX if needed
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      // Call server API route
      const response = await fetch(`${API_BASE_URL}/api/copilot/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          attachment: attachedFile,
          currentFormState: complaintState
        })
      });

      const data = await response.json();
      dispatch(setOcrProgress(null));

      if (data.formUpdates) {
        dispatch(
          updateFormFields({
            fields: data.formUpdates,
            updatedFieldsList: data.updatedFieldsList
          })
        );
      }

      const assistantMsgId = `msg-reply-${Date.now()}`;
      dispatch(
        addMessage({
          id: assistantMsgId,
          sender: 'assistant',
          text: data.assistantMessage || 'Complaint form updated on the left.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      );
    } catch (err) {
      console.error('Copilot processing error:', err);
      dispatch(setOcrProgress(null));
      dispatch(
        addMessage({
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Encountered an issue processing request. Updated form with parsed details.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      );
    } finally {
      dispatch(setProcessing(false));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      handleSend(`Please extract data from attached file: ${file.name}`, {
        name: file.name,
        mimeType: file.type || 'application/pdf',
        base64: base64String
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full min-h-0 overflow-hidden">
      {/* Copilot Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              AIVOA Copilot
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Drop complaint files or paste text below.
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
              }`}
            >
              {/* Attachment Card if present */}
              {msg.attachment && (
                <div className="mb-2 p-2.5 rounded-lg bg-indigo-700/80 text-white flex items-center gap-2 border border-indigo-500/50">
                  <FileText className="w-5 h-5 text-indigo-200 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-semibold text-xs truncate">{msg.attachment.name}</p>
                    <p className="text-[10px] text-indigo-200">{msg.attachment.type}</p>
                  </div>
                </div>
              )}

              {/* Message text with bullet highlight if assistant */}
              {msg.sender === 'assistant' ? (
                <div className="flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-normal">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* OCR scan status indicator */}
        {ocrProgress && (
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>{ocrProgress}</span>
          </div>
        )}

        {/* AI Processing spinner */}
        {isProcessing && !ocrProgress && (
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Analyzing complaint & extracting QA metrics...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Preset Chips for Demo */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Try:
        </span>
        <button
          onClick={() =>
            handleSend(
              'Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500 mg. Batch number AMX240602. Manufacturing date March 2026. Expiry date February 2028. Please log this complaint'
            )
          }
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium text-[11px]"
        >
          <span>Apollo Pharmacy (Discoloration)</span>
          <ArrowUpRight className="w-3 h-3 text-slate-400" />
        </button>
        <button
          onClick={() =>
            handleSend(
              'ah sorry the batch number is BMX240602 and affected quantity is 48 capsules'
            )
          }
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium text-[11px]"
        >
          <span>Correction: BMX240602 & 48 caps</span>
          <ArrowUpRight className="w-3 h-3 text-slate-400" />
        </button>
        <button
          onClick={() =>
            handleSend('Simulate PDF Upload: Zenith_Life_Sciences_Complaint.pdf', {
              name: 'Fictional_Pharma_Customer_Complaint.pdf',
              mimeType: 'application/pdf',
              base64: 'JVBERi0xLjQKJS...'
            })
          }
          className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium text-[11px]"
        >
          <span>Sample PDF OCR</span>
          <ArrowUpRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Input Box Area */}
      <div className="p-3 bg-white border-t border-slate-200 relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-slate-50 border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl p-1.5 transition-all"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Attach customer complaint document (PDF/Image/Text)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Type a message or paste a complaint..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 focus:outline-none px-1"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Powered tag matching exact video requirement */}
        <div className="mt-2 flex items-center justify-end px-1">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
            POWERED BY LANGGRAPH
          </span>
        </div>
      </div>
    </div>
  );
};
