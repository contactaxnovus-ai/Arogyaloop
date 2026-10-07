export type StageId =
  | "kiosk"
  | "intake"
  | "reception"
  | "doctor"
  | "pathology"
  | "pharmacy"
  | "patient"
  | "operations";

export type StageState = "pending" | "current" | "complete";
export type Role =
  | "PATIENT"
  | "RECEPTIONIST"
  | "DOCTOR"
  | "LAB_TECHNICIAN"
  | "PHARMACIST"
  | "CASHIER"
  | "CARE_COORDINATOR"
  | "OPERATIONS_MANAGER"
  | "ADMIN";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  visitId: string;
  hospital: string;
  reason: string;
  doctor: string;
  department: string;
  appointment: string;
  token: string;
  status: string;
  historySummary?: string;
}

export interface Stage {
  id: StageId;
  label: string;
  shortLabel: string;
  icon: string;
  owner: string;
}

export interface AppConfig {
  productName: string;
  hospitalName: string;
  facilityId: string;
  locale: string;
  currency: string;
  demoLabel: string;
  integrationLabel: string;
  aiReviewLabel: string;
  stageOrder: StageId[];
  stages: Stage[];
  paymentModes: string[];
  pathologyStatuses: PathologyStatus[];
}

export interface AdminSetup {
  tenant: {
    id: string;
    name: string;
    deploymentType: string;
    timezone: string;
    locale: string;
    currency: string;
  };
  facilities: Array<{
    id: string;
    name: string;
    city: string;
    hospitalType: string;
    departments: string[];
    queuePrefix: string;
    enabledModules: StageId[];
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    facilityIds: string[];
    status: string;
  }>;
  specialties: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  doctors: Array<{
    id: string;
    name: string;
    loginEmail?: string;
    room: string;
    specialtyIds: string[];
    availableSlots: string[];
    qualification?: string;
    experienceYears?: number;
    profile?: string;
    photoUrl?: string;
    status: string;
  }>;
  serviceUnits: {
    pathLabs: Array<{ id: string; name: string; location: string; testIds: string[]; status: string }>;
    pharmacies: Array<{ id: string; name: string; location: string; status: string }>;
    cashiers: Array<{ id: string; name: string; location: string; status: string }>;
  };
  labTests: Array<{ id: string; name: string; category: string; sampleType: string; status: string }>;
  integrations: {
    openAiApiKey: string;
    openAiModel: string;
    openAiConfigured?: boolean;
  };
  goLiveChecklist: Array<{ id: string; label: string; complete: boolean }>;
}

export interface HospitalUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  facilityIds: string[];
  status: string;
}

export interface AuthSession {
  user: HospitalUser;
  permissions: string[];
}

export interface DoctorAvailability {
  id: string;
  name: string;
  loginEmail?: string;
  specialtyId?: string;
  specialty: string;
  room: string;
  availableSlots: string[];
  photoUrl?: string;
}

export interface PatientReportRecord {
  visitId: string;
  date: string;
  title: string;
  status: string;
  detail: string;
  fileName?: string;
  uploadedAt?: string;
}

export interface PublicKioskState {
  hospitalName: string;
  doctors: DoctorAvailability[];
  visit: Visit;
}

export interface PublicPatientRecord {
  id: string;
  name: string;
  mobile: string;
  age: number;
  gender: string;
  history: {
    summary: string;
    visits: Array<{ visitId: string; date: string; reason: string; department: string; doctor: string; appointment: string }>;
    reports: PatientReportRecord[];
    prescriptions: Array<{ visitId: string; date: string; title: string; status: string; lines: string[] }>;
  };
}

export interface AdminSetupResponse {
  setup: AdminSetup;
  permissions: Record<Role, string[]>;
  availableRoles: Role[];
  availableModules: Array<{ id: StageId; label: string; owner: string }>;
}

export interface JourneyEvent {
  stage: StageId;
  stepCode?: string;
  title: string;
  owner: string;
  status: StageState;
  detail: string;
  timestamp: string;
}

export interface CbcRow {
  parameter: string;
  value: string;
  unit: string;
  interval: string;
  flag: "Low" | "Normal";
}

export interface BillLine {
  label: string;
  detail: string;
  amountMinor: number;
}

export type JourneyStatus =
  | "ARRIVED"
  | "PATIENT_IDENTIFIED"
  | "INTAKE_REQUIRED"
  | "INTAKE_IN_PROGRESS"
  | "INTAKE_COMPLETED"
  | "ROUTING_REVIEW_REQUIRED"
  | "ROUTED"
  | "VISIT_CREATED"
  | "CHECKIN_PENDING"
  | "CHECKED_IN"
  | "WAITING_FOR_CONSULTATION"
  | "CONSULTATION_IN_PROGRESS"
  | "CONSULTATION_REVIEW_REQUIRED"
  | "DIAGNOSTIC_ORDERED"
  | "WAITING_FOR_SAMPLE"
  | "SAMPLE_COLLECTED"
  | "DIAGNOSTIC_PROCESSING"
  | "DIAGNOSTIC_REPORT_REVIEW"
  | "DIAGNOSTIC_REPORT_READY"
  | "WAITING_FOR_DOCTOR_REVIEW"
  | "PRESCRIPTION_CREATED"
  | "PHARMACIST_REVIEW_REQUIRED"
  | "PHARMACY_APPROVED"
  | "MEDICATION_READY"
  | "MEDICATION_DISPENSED"
  | "BILLING_PENDING"
  | "INVOICE_CREATED"
  | "PAYMENT_PENDING"
  | "PAYMENT_COMPLETED"
  | "FOLLOWUP_DECISION_PENDING"
  | "FOLLOWUP_REQUIRED"
  | "FOLLOWUP_SCHEDULED"
  | "VISIT_COMPLETION_PENDING"
  | "VISIT_COMPLETED";

export type PathologyStatus = "Not ordered" | "Requested" | "Ordered" | "Sample collection pending" | "Sample collected" | "Processing" | "Awaiting authorization" | "Report ready" | "Reviewed";

export interface Visit {
  id: string;
  tenantId: string;
  facilityId: string;
  activeStage: StageId;
  completedStages: StageId[];
  stageState: Record<StageId, StageState>;
  patient: Patient;
  intake: {
    status: string;
    answers: Array<{ question: string; hindi: string; answer: string; safe?: boolean }>;
    recommendation: string;
    reviewedByStaff: boolean;
    disclaimer: string;
  };
  reception: {
    checkedIn: boolean;
    tokenPrinted: boolean;
    room: string;
    directions: string;
    queue: Array<{ token: string; patient: string; appointment: string; department: string; status: string; visitId?: string; doctor?: string; reason?: string; age?: number; gender?: string; demoOnly?: boolean }>;
  };
  consultation: {
    vitals: Array<{ label: string; value: string }>;
    note: string;
    provisionalDiagnosis: string;
    advice: string;
    priorHistorySummary?: string;
    priorReports?: PatientReportRecord[];
    labRequests: Array<{ id: string; pathLabId: string; tests: AdminSetup["labTests"]; status: string; requestedAt: string }>;
    pharmacyRequests: Array<{ id: string; pharmacyId: string; lines: string[]; status: string; requestedAt: string }>;
    cbcOrdered: boolean;
    prescriptionQueued: boolean;
  };
  pathology: {
    status: PathologyStatus;
    requestedTests: AdminSetup["labTests"];
    selectedPathLabId: string;
    cbcRows: CbcRow[];
    reportFile?: {
      name: string;
      uploadedAt: string;
      content: string;
    } | null;
  };
  pharmacy: {
    reviewCompleted: boolean;
    fulfilmentStatus: string;
    prescriptionLabel: string;
    selectedPharmacyId: string;
    prescriptionLines: string[];
  };
  billing: {
    status: "Pending" | "Payment pending" | "Paid";
    paymentMode: string | null;
    lines: BillLine[];
  };
  followUp: {
    scheduled: boolean;
    appointment: string;
    remindersOn: boolean;
  };
  journeyEvents: JourneyEvent[];
  worklists: {
    reception: VisitQueueEntry[];
    doctor: VisitQueueEntry[];
    pathology: VisitQueueEntry[];
    pharmacy: VisitQueueEntry[];
    billing: VisitQueueEntry[];
    operations: VisitQueueEntry[];
  };
  journeyInstance: {
    id: string;
    visitId: string;
    workflowDefinitionId: string;
    status: JourneyStatus;
    currentStepCode: string;
    startedAt: string;
    completedAt: string;
    version: number;
  };
  journeySteps: Array<{
    id: string;
    stepCode: string;
    label: string;
    sequence: number;
    status: "NOT_STARTED" | "ACTIVE" | "COMPLETED" | "SKIPPED" | "BLOCKED";
    ownerRole: Role;
    readyAt: string;
    startedAt: string;
    completedAt: string;
    blockingReason: string;
  }>;
  nextAction: {
    code: string;
    label: string;
    ownerRole: Role;
    currentStep: string;
    currentStatus: JourneyStatus;
    blockingReason: string | null;
    availableActions: string[];
  };
  auditEvents: AuditEvent[];
  adminSetup: AdminSetup;
}

export type VisitQueueEntry = {
  token: string;
  patient: string;
  appointment: string;
  department: string;
  status: string;
  visitId?: string;
  doctor?: string;
  reason?: string;
  age?: number;
  gender?: string;
  demoOnly?: boolean;
};

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actorRole: Role;
  action: string;
  resourceType: string;
  resourceId: string;
  correlationId: string | null;
  idempotencyKey: string | null;
}
