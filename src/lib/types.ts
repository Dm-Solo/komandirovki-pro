export type ApprovalStep = {
  label: string;
  name: string;
  status: "done" | "pending" | "rejected" | "waiting";
};

export type Receipt = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  fileType: string;
};

export type VoiceNote = {
  id: string;
  durationLabel: string;
};

export type Report = {
  id: string;
  tripId: string | null;
  title: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: "draft" | "pending" | "approved" | "rejected";
  comment: string;
  voiceNote: VoiceNote | null;
  aiSummary: string | null;
  approvalSteps: ApprovalStep[];
  receipts: Receipt[];
  attachments: Attachment[];
};

export type Trip = {
  id: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  status: "pending" | "approved" | "rejected";
  comment: string;
  approvalSteps: ApprovalStep[];
};
