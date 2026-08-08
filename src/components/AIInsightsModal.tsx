import React from 'react';
import { useAppSelector } from '../store';
import {
  X,
  Sparkles,
  AlertTriangle,
  Layers,
  SearchCheck,
  ShieldCheck,
  FileCheck2,
  Wrench,
  Percent
} from 'lucide-react';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({ isOpen, onClose }) => {
  const complaintState = useAppSelector((state) => state.complaint);
  const { history } = useAppSelector((state) => state.complaint);

  if (!isOpen) return null;

  // 1. Calculate Completeness Score
  const fields = [
    { key: 'complaintSource', label: 'Complaint Source', val: complaintState.complaintSource },
    { key: 'customerName', label: 'Customer Name', val: complaintState.customerName },
    { key: 'productName', label: 'Product Name', val: complaintState.productName },
    { key: 'productStrength', label: 'Product Strength', val: complaintState.productStrength },
    { key: 'batchLotNumber', label: 'Batch / Lot Number', val: complaintState.batchLotNumber },
    { key: 'affectedQuantity', label: 'Affected Quantity', val: complaintState.affectedQuantity },
    { key: 'manufacturingDate', label: 'Manufacturing Date', val: complaintState.manufacturingDate },
    { key: 'expiryDate', label: 'Expiry Date', val: complaintState.expiryDate },
    { key: 'originatingSiteBlock', label: 'Originating Site Block', val: complaintState.originatingSiteBlock },
    { key: 'impactedNpm', label: 'Impacted NPM', val: complaintState.impactedNpm },
    { key: 'complaintCategory', label: 'Complaint Category', val: complaintState.complaintCategory },
    { key: 'complaintDescription', label: 'Complaint Description', val: complaintState.complaintDescription }
  ];

  const filledFields = fields.filter((f) => f.val && f.val.trim().length > 0 && !f.val.includes('Awaiting'));
  const missingFields = fields.filter((f) => !f.val || f.val.trim().length === 0 || f.val.includes('Awaiting'));
  const completenessScore = Math.round((filledFields.length / fields.length) * 100);

  // 2. Duplicate Detection
  const duplicateMatches = history.filter(
    (item) =>
      item.qmsLogId !== complaintState.qmsLogId &&
      ((complaintState.batchLotNumber && item.batchLotNumber.toLowerCase() === complaintState.batchLotNumber.toLowerCase()) ||
        (complaintState.productName && item.productName.toLowerCase() === complaintState.productName.toLowerCase() && item.customerName.toLowerCase() === complaintState.customerName.toLowerCase()))
  );
  const isDuplicateDetected = duplicateMatches.length > 0;

  // 3. Dynamic Root Cause Recommendations based on category/description
  const getRootCauses = () => {
    const desc = (complaintState.complaintDescription + ' ' + complaintState.complaintCategory).toLowerCase();
    if (desc.includes('discolor') || desc.includes('moisture') || desc.includes('capsule')) {
      return [
        { cause: 'Induction sealing temperature variation during bottling', probability: '85%', category: 'Equipment Calibration' },
        { cause: 'Elevated relative humidity (>60% RH) during primary packaging run', probability: '68%', category: 'Facility HVAC' },
        { cause: 'Desiccant canister insertion skipping anomaly', probability: '42%', category: 'In-line Assembly' }
      ];
    } else if (desc.includes('foreign') || desc.includes('particle') || desc.includes('drum')) {
      return [
        { cause: 'HDPE drum liner integrity breach during raw material handling', probability: '92%', category: 'Primary Packaging' },
        { cause: 'Filter screen mesh degradation during crystallization centrifuge', probability: '74%', category: 'API Chemical Processing' },
        { cause: 'Static electricity buildup attracting airborne particulates during drumming', probability: '55%', category: 'Cleanroom Control' }
      ];
    }
    return [
      { cause: 'Deviation in standard operating procedure during batch execution', probability: '75%', category: 'Process Control' },
      { cause: 'Sub-tier packaging material supplier specification drift', probability: '60%', category: 'Vendor Management' }
    ];
  };

  const rootCauses = getRootCauses();

  // 4. Dynamic CAPA Recommendations
  const getCapa = () => {
    const desc = (complaintState.complaintDescription + ' ' + complaintState.complaintCategory).toLowerCase();
    if (desc.includes('discolor') || desc.includes('amoxicillin')) {
      return {
        immediate: `Quarantine current warehouse inventory for batch ${complaintState.batchLotNumber || 'AMX240602'}. Issue replacement unit to ${complaintState.customerName || 'customer'}.`,
        corrective: 'Inspect sealing temperature logs for Bottling Line #3 and verify 100% leak testing records.',
        preventive: 'Install automated vision inspection camera at capping station and re-validate humidity sensors.'
      };
    } else if (desc.includes('foreign') || desc.includes('metformin')) {
      return {
        immediate: `Block batch ${complaintState.batchLotNumber || 'MFH260712A'} in ERP system and initiate vendor containment notice to ${complaintState.customerName || 'ABC Formulations'}.`,
        corrective: 'Perform FTIR spectroscopy analysis on foreign particles and audit centrifuge mesh filter logbooks.',
        preventive: 'Implement double-layer HEPA air curtain at drumming station and upgrade drum liner micron rating.'
      };
    }
    return {
      immediate: 'Initiate QA stock hold and request retained samples for analytical re-testing.',
      corrective: 'Review batch execution record (BER) for environmental or operational deviations.',
      preventive: 'Update SOP training for cleanroom operators and re-certify packaging equipment.'
    };
  };

  const capa = getCapa();

  // 5. Risk Matrix Level
  const getRiskLevel = (): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (complaintState.severitySuggested === 'Critical') return 'CRITICAL';
    if (complaintState.severitySuggested === 'Major') return 'HIGH';
    if (complaintState.severitySuggested === 'Minor') return 'MEDIUM';
    return 'MEDIUM';
  };

  const riskLevel = getRiskLevel();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                AI Quality Intelligence & CAPA Suite
              </h2>
              <p className="text-xs text-slate-300">
                Automated Root Cause, Duplicate Risk, CAPA Generator & Completeness Audit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 bg-slate-50">
          {/* Top Row: Executive Risk Matrix & Completeness Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completeness Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                  Completeness
                </span>
                <span className="text-xs font-mono font-bold text-slate-900">{completenessScore}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    completenessScore >= 80 ? 'bg-emerald-500' : completenessScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600">
                {filledFields.length} of {fields.length} mandatory QA fields populated.
              </p>
              {missingFields.length > 0 && (
                <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                  <span className="font-semibold">Missing: </span>
                  {missingFields.map((m) => m.label).join(', ')}
                </div>
              )}
            </div>

            {/* Risk Classification Matrix */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  AI Risk Matrix
                </span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                    riskLevel === 'CRITICAL'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : riskLevel === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {riskLevel}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900">
                Severity: {complaintState.severitySuggested || 'Major'}
              </p>
              <p className="text-[11px] text-slate-600 leading-tight">
                {complaintState.initialRiskAssessment || 'Awaiting initial risk assessment generated by Copilot...'}
              </p>
            </div>

            {/* Duplicate Detection Alert */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <SearchCheck className="w-3.5 h-3.5 text-blue-600" />
                  Duplicate Check
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDuplicateDetected ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isDuplicateDetected ? 'POSSIBLE DUPLICATE' : 'NO DUPLICATES'}
                </span>
              </div>
              {isDuplicateDetected ? (
                <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Matched {duplicateMatches.length} existing QMS record(s):
                  </p>
                  <p className="font-mono text-[10px]">
                    {duplicateMatches.map((m) => `${m.qmsLogId} (${m.batchLotNumber})`).join(', ')}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-600">
                  No matching batch or customer defect complaints detected in recent QMS database logs.
                </p>
              )}
            </div>
          </div>

          {/* Root Cause Analysis Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Percent className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Root Cause Probabilistic Recommendations
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="p-2.5">Probable Root Cause Failure Mode</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rootCauses.map((rc, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-medium text-slate-900">{rc.cause}</td>
                      <td className="p-2.5 text-slate-600 font-mono text-[11px]">{rc.category}</td>
                      <td className="p-2.5 text-right font-bold text-indigo-700">{rc.probability}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CAPA Action Plan */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recommended CAPA (Corrective and Preventive Actions)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-red-50/70 border border-red-200/80 space-y-1">
                <span className="font-bold text-red-900 text-[11px] uppercase tracking-wider block">
                  1. Immediate Containment
                </span>
                <p className="text-red-950 font-medium leading-relaxed">{capa.immediate}</p>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1">
                <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider block">
                  2. Corrective Action Plan
                </span>
                <p className="text-amber-950 font-medium leading-relaxed">{capa.corrective}</p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block">
                  3. Preventive Action Plan
                </span>
                <p className="text-emerald-950 font-medium leading-relaxed">{capa.preventive}</p>
              </div>
            </div>
          </div>

          {/* Executive Summary Statement */}
          <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              Executive QA Summary Report
            </div>
            <p className="text-xs leading-relaxed text-indigo-100">
              Customer complaint for{' '}
              <strong className="text-white">{complaintState.productName || 'Product'}</strong> (Batch{' '}
              <strong className="text-white">{complaintState.batchLotNumber || 'N/A'}</strong>) reported by{' '}
              <strong className="text-white">{complaintState.customerName || 'Customer'}</strong> has been processed with severity rating{' '}
              <strong className="text-white">{complaintState.severitySuggested || 'Major'}</strong>. AI
              copilot suggests initiating QA investigation protocol & issuing CAPA notice to originating site{' '}
              <strong className="text-white">{complaintState.originatingSiteBlock || 'Manufacturing'}</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
