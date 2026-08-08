export interface AIQualityInsights {
  completenessScore: number; // 0 - 100%
  missingFields: string[];
  completenessSummary: string;
  rootCauses: { cause: string; probability: string; category: string }[];
  duplicateAlert: {
    isPossibleDuplicate: boolean;
    confidenceScore: number;
    matchingRecordId?: string;
    details: string;
  };
  capaRecommendations: {
    immediateAction: string;
    correctiveAction: string;
    preventiveAction: string;
  };
  executiveSummary: string;
  riskMatrixScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ComplaintState {
  status: 'Pending Triage' | 'Ready to Commit' | 'Committed';
  complaintSource: string;
  customerName: string;
  productName: string;
  productStrength: string;
  batchLotNumber: string;
  affectedQuantity: string;
  manufacturingDate: string;
  expiryDate: string;
  originatingSiteBlock: string;
  impactedNpm: string;
  complaintCategory: string;
  complaintDescription: string;
  severitySuggested: 'Minor' | 'Major' | 'Critical' | 'Awaiting AI classification...';
  suggestedNextAction: string;
  initialRiskAssessment: string;
  updatedFields: string[]; // field keys updated in last step for highlight animation
  qmsLogId?: string;
  committedAt?: string;
  insights?: AIQualityInsights;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  attachment?: {
    name: string;
    type: string;
    size?: string;
  } | null;
  ocrStatus?: string;
  timestamp: string;
}

export interface QMSLogRecord extends ComplaintState {
  id: string;
  loggedAt: string;
}
