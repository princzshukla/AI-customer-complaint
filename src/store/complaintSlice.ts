import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ComplaintState, QMSLogRecord } from '../types';

const initialState: ComplaintState & { history: QMSLogRecord[] } = {
  status: 'Pending Triage',
  complaintSource: '',
  customerName: '',
  productName: '',
  productStrength: '',
  batchLotNumber: '',
  affectedQuantity: '',
  manufacturingDate: '',
  expiryDate: '',
  originatingSiteBlock: '',
  impactedNpm: '',
  complaintCategory: '',
  complaintDescription: '',
  severitySuggested: 'Awaiting AI classification...',
  suggestedNextAction: '',
  initialRiskAssessment: '',
  updatedFields: [],
  history: []
};

export const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    updateFormFields: (state, action: PayloadAction<{ fields: Partial<ComplaintState>; updatedFieldsList?: string[] }>) => {
      const { fields, updatedFieldsList } = action.payload;
      Object.assign(state, fields);
      if (updatedFieldsList && updatedFieldsList.length > 0) {
        state.updatedFields = updatedFieldsList;
      } else {
        state.updatedFields = Object.keys(fields);
      }
      if (fields.productName || fields.batchLotNumber || fields.customerName || fields.complaintDescription || fields.complaintCategory) {
        state.status = 'Ready to Commit';
      }
    },
    clearFieldHighlights: (state) => {
      state.updatedFields = [];
    },
    setHistory: (state, action: PayloadAction<QMSLogRecord[]>) => {
      state.history = action.payload;
    },
    commitToQMS: (state, action?: PayloadAction<{ logId?: string }>) => {
      const logId = action?.payload?.logId || `QMS-CMP-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date().toLocaleString();
      const { history, ...cleanState } = state;
      const record: QMSLogRecord = {
        ...cleanState,
        id: logId,
        qmsLogId: logId,
        status: 'Committed',
        loggedAt: now,
        committedAt: now,
        updatedFields: []
      };
      
      // Avoid duplicates in history
      state.history = [record, ...state.history.filter(h => h.qmsLogId !== logId)];
      state.status = 'Committed';
      state.qmsLogId = logId;
      state.committedAt = now;
    },
    resetForm: (state) => {
      state.status = 'Pending Triage';
      state.complaintSource = '';
      state.customerName = '';
      state.productName = '';
      state.productStrength = '';
      state.batchLotNumber = '';
      state.affectedQuantity = '';
      state.manufacturingDate = '';
      state.expiryDate = '';
      state.originatingSiteBlock = '';
      state.impactedNpm = '';
      state.complaintCategory = '';
      state.complaintDescription = '';
      state.severitySuggested = 'Awaiting AI classification...';
      state.suggestedNextAction = '';
      state.initialRiskAssessment = '';
      state.updatedFields = [];
      state.qmsLogId = undefined;
      state.committedAt = undefined;
    }
  }
});

export const { updateFormFields, clearFieldHighlights, setHistory, commitToQMS, resetForm } = complaintSlice.actions;
export default complaintSlice.reducer;
