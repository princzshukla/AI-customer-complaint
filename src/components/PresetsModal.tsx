import React from 'react';
import { useAppDispatch } from '../store';
import { addMessage, setProcessing, setOcrProgress } from '../store/chatSlice';
import { updateFormFields } from '../store/complaintSlice';
import { X, Sparkles, Play } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();

  if (!isOpen) return null;

  const scenarios = [
    {
      step: '1. Log New Complaint',
      title: 'Apollo Pharmacy Discoloration Complaint',
      prompt:
        'Apollo Pharmacy reported discolored capsules in Amoxicillin Capsules 500 mg. Batch number AMX240602. Manufacturing date March 2026. Expiry date February 2028. Please log this complaint',
      description: 'Extracts customer details, product, batch, dates, and calculates Major risk assessment.',
      fieldsToFill: {
        status: 'Ready to Commit' as const,
        complaintSource: 'Pharmacy',
        customerName: 'Apollo Pharmacy',
        productName: 'Amoxicillin Capsules',
        productStrength: '500 mg',
        batchLotNumber: 'AMX240602',
        affectedQuantity: '12 capsules',
        manufacturingDate: 'March 2026',
        expiryDate: 'February 2028',
        originatingSiteBlock: 'Manufacturing',
        impactedNpm: 'Primary Packaging (Bottle)',
        complaintCategory: 'Product Defect - Discoloration',
        complaintDescription:
          'Apollo Pharmacy reported 12 discolored capsules in a sealed bottle. Requesting investigation and replacement.',
        severitySuggested: 'Major' as const,
        suggestedNextAction: 'Route to QA Investigation & Issue Replacement',
        initialRiskAssessment:
          'Potential moisture ingress or primary packaging seal failure leading to capsule discoloration. Requires stability check.'
      },
      replyText:
        "Complaint parsed successfully. I've extracted the product details, mapped the batch information, and generated an initial risk assessment for the discolored capsules."
    },
    {
      step: '2. Edit / Natural Language Correction',
      title: 'Batch Number & Quantity Update',
      prompt: 'ah sorry the batch number is BMX240602 and affected quantity is 48 capsules',
      description: 'Preserves all existing complaint information while updating Batch/Lot Number and Quantity.',
      fieldsToFill: {
        status: 'Ready to Commit' as const,
        batchLotNumber: 'BMX240602',
        affectedQuantity: '48 capsules'
      },
      updatedFieldsList: ['batchLotNumber', 'affectedQuantity'],
      replyText:
        'Got it. I have updated the Batch / Lot Number to "BMX240602" and the Affected Quantity to "48 capsules" in the form.'
    },
    {
      step: '3. Document OCR Extraction',
      title: 'Zenith Life Sciences Report (PDF/Doc OCR)',
      prompt: 'Extract data from uploaded PDF report (Zenith Life Sciences Metformin API Contamination)',
      description: 'Simulates document OCR reading, extracting API product details and Critical risk assessment.',
      hasOcr: true,
      fileAttachment: { name: 'Fictional_Pharma_Customer_Complaint.pdf', type: 'PDF Document', size: '184 KB' },
      fieldsToFill: {
        status: 'Ready to Commit' as const,
        complaintSource: 'Email',
        customerName: 'ABC Formulations Ltd.',
        productName: 'Metformin Hydrochloride API',
        productStrength: 'IP/BP',
        batchLotNumber: 'MFH260712A',
        affectedQuantity: '25 kg (1 HDPE Drum)',
        manufacturingDate: '25 June 2026',
        expiryDate: 'Not Provided',
        originatingSiteBlock: 'Manufacturing',
        impactedNpm: 'HDPE Drum',
        complaintCategory: 'Foreign Matter Contamination',
        complaintDescription:
          'ABC Formulations Ltd, reported multiple dark foreign particles inside one sealed HDPE drum during incoming quality inspection. The drum had no visible external damage. Material quarantined.',
        severitySuggested: 'Critical' as const,
        suggestedNextAction: 'Laboratory investigation & manufacturing record review',
        initialRiskAssessment:
          'Potential foreign matter contamination. High impact to API quality. Investigation of manufacturing batch records and drum seal integrity requested.'
      },
      replyText:
        "PDF analysis complete. I've successfully extracted the Zenith Life Sciences complaint report (CC-2026-00154). The issue is foreign matter contamination in the Metformin API drum. Form populated on the left."
    },
    {
      step: '4. Second Natural Language Correction',
      title: 'Batch CHG 260712A & 50 kg Quantity Correction',
      prompt: 'ah sorry the batch number is CHG 260712A and affected quantity is 50 kg (2 HDPE Drum)',
      description: 'Updates batch number to CHG 260712A and quantity to 50 kg (2 HDPE Drum).',
      fieldsToFill: {
        status: 'Ready to Commit' as const,
        batchLotNumber: 'CHG 260712A',
        affectedQuantity: '50 kg (2 HDPE Drum)'
      },
      updatedFieldsList: ['batchLotNumber', 'affectedQuantity'],
      replyText:
        'I\'ve applied the correction. The Batch / Lot Number is now "CHG 260712A" and the Affected Quantity is "50 kg (2 HDPE Drum)".'
    }
  ];

  const handleRunScenario = async (sc: typeof scenarios[0]) => {
    onClose();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    dispatch(
      addMessage({
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: sc.prompt,
        attachment: sc.fileAttachment || null,
        timestamp: nowStr
      })
    );

    dispatch(setProcessing(true));

    if (sc.hasOcr) {
      dispatch(setOcrProgress('Extracting tabular data via OCR...'));
      await new Promise((r) => setTimeout(r, 900));
      dispatch(setOcrProgress(null));
    } else {
      await new Promise((r) => setTimeout(r, 400));
    }

    dispatch(
      updateFormFields({
        fields: sc.fieldsToFill as any,
        updatedFieldsList: sc.updatedFieldsList || Object.keys(sc.fieldsToFill)
      })
    );

    dispatch(
      addMessage({
        id: `msg-reply-${Date.now()}`,
        sender: 'assistant',
        text: sc.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    );

    dispatch(setProcessing(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Video Challenge Demo Scenarios
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
          <p className="text-xs text-slate-500 mb-2">
            Click any step below to simulate the exact interactions shown in the assignment video:
          </p>

          {scenarios.map((sc, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="space-y-1 pr-2">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  {sc.step}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{sc.title}</h3>
                <p className="text-xs text-slate-600 italic">{sc.prompt}</p>
                <p className="text-[11px] text-slate-500">{sc.description}</p>
              </div>

              <button
                onClick={() => handleRunScenario(sc)}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-center transition-transform group-hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Step</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
