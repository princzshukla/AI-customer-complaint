import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { updateFormFields, commitToQMS, clearFieldHighlights, setHistory } from '../store/complaintSlice';
import { Sparkles, Building2, Package, ShieldAlert, CheckCircle2, Factory, Wrench, FileCheck2 } from 'lucide-react';
import { AIInsightsModal } from './AIInsightsModal';
import { API_BASE_URL } from '../lib/api';

export const ComplaintForm: React.FC = () => {
  const dispatch = useAppDispatch();
  const complaintState = useAppSelector((state) => state.complaint);
  const { updatedFields } = complaintState;
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Clear highlight animation after 3s
  useEffect(() => {
    if (updatedFields.length > 0) {
      const timer = setTimeout(() => {
        dispatch(clearFieldHighlights());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [updatedFields, dispatch]);

  const handleChange = (field: keyof typeof complaintState, value: string) => {
    dispatch(updateFormFields({ fields: { [field]: value } }));
  };

  const isHighlighted = (fieldName: string) => updatedFields.includes(fieldName);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();

    const logId = complaintState.qmsLogId || `QMS-CMP-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    // Local commit to Redux state
    dispatch(commitToQMS({ logId } as any));

    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qmsLogId: logId,
          qms_log_id: logId,
          complaintSource: complaintState.complaintSource,
          complaint_source: complaintState.complaintSource,
          customerName: complaintState.customerName,
          customer_name: complaintState.customerName,
          productName: complaintState.productName,
          product_name: complaintState.productName,
          productStrength: complaintState.productStrength,
          product_strength: complaintState.productStrength,
          batchLotNumber: complaintState.batchLotNumber,
          batch_lot_number: complaintState.batchLotNumber,
          affectedQuantity: complaintState.affectedQuantity,
          affected_quantity: complaintState.affectedQuantity,
          manufacturingDate: complaintState.manufacturingDate,
          manufacturing_date: complaintState.manufacturingDate,
          expiryDate: complaintState.expiryDate,
          expiry_date: complaintState.expiryDate,
          originatingSiteBlock: complaintState.originatingSiteBlock,
          originating_site_block: complaintState.originatingSiteBlock,
          impactedNpm: complaintState.impactedNpm,
          impacted_npm: complaintState.impactedNpm,
          complaintCategory: complaintState.complaintCategory,
          complaint_category: complaintState.complaintCategory,
          complaintDescription: complaintState.complaintDescription,
          complaint_description: complaintState.complaintDescription,
          status: 'Committed',
          severitySuggested: complaintState.severitySuggested,
          severity_suggested: complaintState.severitySuggested,
          suggestedNextAction: complaintState.suggestedNextAction,
          suggested_next_action: complaintState.suggestedNextAction,
          initialRiskAssessment: complaintState.initialRiskAssessment,
          initial_risk_assessment: complaintState.initialRiskAssessment
        })
      });

      if (response.ok) {
        // Refresh full complaint history list from DB
        const resList = await fetch(`${API_BASE_URL}/api/complaints`);
        if (resList.ok) {
          const listData = await resList.json();
          if (Array.isArray(listData) && listData.length > 0) {
            dispatch(setHistory(listData));
          }
        }
      } else {
        console.warn('Backend responded with status:', response.status);
      }
    } catch (err) {
      console.warn('API call to /api/complaints failed or non-responsive:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full min-h-0">
      {/* Form scroll container */}
      <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 text-slate-800">

        {/* Bonus AI Quality Suite Banner Button */}
        <div className="p-3.5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-xl text-white flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">AI Quality Intelligence & CAPA Suite</h3>
              <p className="text-[11px] text-indigo-200">
                Root cause, duplicate alert, completeness & CAPA recommendations
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInsightsOpen(true)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>View AI Suite</span>
          </button>
        </div>

        {/* 1. ORIGIN & CUSTOMER DETAILS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. ORIGIN & CUSTOMER DETAILS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Complaint Source
              </label>
              <input
                type="text"
                placeholder="Awaiting AI classification..."
                value={complaintState.complaintSource}
                onChange={(e) => handleChange('complaintSource', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('complaintSource') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Awaiting AI classification..."
                value={complaintState.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('customerName') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
          </div>
        </section>

        {/* 2. PRODUCT & BATCH IDENTIFICATION */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Package className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. PRODUCT & BATCH IDENTIFICATION
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name (API/FDF)
              </label>
              <input
                type="text"
                placeholder="Awaiting AI extraction..."
                value={complaintState.productName}
                onChange={(e) => handleChange('productName', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('productName') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Strength / Grade
              </label>
              <input
                type="text"
                placeholder="Awaiting AI extraction..."
                value={complaintState.productStrength}
                onChange={(e) => handleChange('productStrength', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('productStrength') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch / Lot Number
              </label>
              <input
                type="text"
                placeholder="Awaiting AI extraction..."
                value={complaintState.batchLotNumber}
                onChange={(e) => handleChange('batchLotNumber', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium transition-all ${
                  isHighlighted('batchLotNumber') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Affected Quantity
              </label>
              <input
                type="text"
                placeholder="Awaiting AI extraction..."
                value={complaintState.affectedQuantity}
                onChange={(e) => handleChange('affectedQuantity', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('affectedQuantity') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manufacturing Date
              </label>
              <input
                type="text"
                placeholder="e.g., March 2026"
                value={complaintState.manufacturingDate}
                onChange={(e) => handleChange('manufacturingDate', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('manufacturingDate') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="e.g., February 2028"
                value={complaintState.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('expiryDate') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
          </div>
        </section>

        {/* 3. FACILITY & MATERIAL IMPACT */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Factory className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              3. FACILITY & MATERIAL IMPACT
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Originating Site Block
              </label>
              <input
                type="text"
                placeholder="Awaiting AI classification..."
                value={complaintState.originatingSiteBlock}
                onChange={(e) => handleChange('originatingSiteBlock', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('originatingSiteBlock') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Impacted Non-Product Materials (NPM)
              </label>
              <input
                type="text"
                placeholder="e.g., Primary packaging..."
                value={complaintState.impactedNpm}
                onChange={(e) => handleChange('impactedNpm', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isHighlighted('impactedNpm') ? 'animate-field-update border-blue-500' : 'border-slate-200'
                }`}
              />
            </div>
          </div>
        </section>

        {/* 4. DEFECT ANALYSIS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              4. DEFECT ANALYSIS
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Complaint Category
            </label>
            <input
              type="text"
              placeholder="e.g., Product Defect - Discoloration"
              value={complaintState.complaintCategory}
              onChange={(e) => handleChange('complaintCategory', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                isHighlighted('complaintCategory') ? 'animate-field-update border-blue-500' : 'border-slate-200'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Complaint Description
            </label>
            <textarea
              rows={3}
              placeholder="AI will synthesize the complaint into a formal QMS description..."
              value={complaintState.complaintDescription}
              onChange={(e) => handleChange('complaintDescription', e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                isHighlighted('complaintDescription') ? 'animate-field-update border-blue-500' : 'border-slate-200'
              }`}
            />
          </div>

          {/* AI copilot risk assessment box */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-purple-900 tracking-wide">
                AI copilot risk assessment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                  Severity (Suggested)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Major"
                  value={complaintState.severitySuggested}
                  onChange={(e) => handleChange('severitySuggested', e.target.value as any)}
                  className={`w-full px-3 py-1.5 text-xs font-semibold border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    complaintState.severitySuggested === 'Critical' ? 'text-red-700 border-red-300' :
                    complaintState.severitySuggested === 'Major' ? 'text-amber-700 border-amber-300' :
                    'text-slate-800 border-purple-200'
                  } ${isHighlighted('severitySuggested') ? 'animate-field-update' : ''}`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                  Suggested Next Action
                </label>
                <input
                  type="text"
                  placeholder="e.g., Route to QA Investigation..."
                  value={complaintState.suggestedNextAction}
                  onChange={(e) => handleChange('suggestedNextAction', e.target.value)}
                  className={`w-full px-3 py-1.5 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 border-purple-200 text-slate-800 ${
                    isHighlighted('suggestedNextAction') ? 'animate-field-update' : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                Initial Risk Assessment
              </label>
              <textarea
                rows={2}
                placeholder="Potential moisture ingress or primary packaging seal failure leading to capsule discoloration..."
                value={complaintState.initialRiskAssessment}
                onChange={(e) => handleChange('initialRiskAssessment', e.target.value)}
                className={`w-full px-3 py-1.5 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 border-purple-200 text-slate-800 ${
                  isHighlighted('initialRiskAssessment') ? 'animate-field-update' : ''
                }`}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Pinned Bottom CTA Footer */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0">
        <button
          onClick={handleCommit}
          disabled={complaintState.status === 'Committed'}
          className={`w-full py-3 px-4 rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
            complaintState.status === 'Committed'
              ? 'bg-slate-200 text-slate-600 cursor-not-allowed border border-slate-300'
              : 'bg-indigo-700 hover:bg-indigo-800 text-white active:scale-[0.99] cursor-pointer shadow-sm'
          }`}
        >
          {complaintState.status === 'Committed' ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Committed to QMS ({complaintState.qmsLogId})</span>
            </>
          ) : (
            <span>Commit to QMS Logger</span>
          )}
        </button>
      </div>

      <AIInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
      />
    </div>
  );
};
