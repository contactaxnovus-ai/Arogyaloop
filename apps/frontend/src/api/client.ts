import type { AdminSetup, AdminSetupResponse, AppConfig, AuthSession, DoctorAvailability, HospitalUser, PublicKioskState, PublicPatientRecord, Role, Visit } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://127.0.0.1:4000" : "");
const VISIT_ID = "current";

interface ApiVisitResponse {
  visit: Visit;
}

function correlationId() {
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function request<T>(path: string, options: RequestInit & { role?: Role; userEmail?: string; idempotent?: boolean } = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-Role", options.role || "PATIENT");
  if (options.userEmail) headers.set("X-User-Email", options.userEmail);
  headers.set("X-Correlation-Id", correlationId());
  if (options.idempotent) headers.set("Idempotency-Key", `${path}-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  return payload as T;
}

export async function loadConfig() {
  return request<AppConfig>("/api/config", { role: "PATIENT" });
}

export async function loadVisit(role: Role = "OPERATIONS_MANAGER", userEmail?: string) {
  return request<ApiVisitResponse>(`/api/visits/${VISIT_ID}`, { role, userEmail }).then((payload) => payload.visit);
}

export async function listLoginUsers() {
  return request<{ users: HospitalUser[]; demoMode: boolean }>("/api/auth/users", { role: "PATIENT" });
}

export async function loginWithEmail(email: string) {
  return request<AuthSession>("/api/auth/login", {
    role: "PATIENT",
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function loadPublicKiosk() {
  return request<PublicKioskState>("/api/public/kiosk", { role: "PATIENT" });
}

export async function lookupPublicPatient(payload: { patientName: string; mobile: string }) {
  return request<{ found: boolean; patient: PublicPatientRecord | null; message: string }>("/api/public/patient-lookup", {
    role: "PATIENT",
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function registerPublicPatient(payload: { patientName: string; mobile: string; age?: number; gender: string }) {
  return request<{ existing: boolean; patient: PublicPatientRecord; message: string }>("/api/public/register-patient", {
    role: "PATIENT",
    method: "POST",
    body: JSON.stringify(payload),
    idempotent: true
  });
}

export async function findDoctors(payload: { symptoms: string; patientName?: string; mobile?: string; age?: number; gender?: string; language?: string }) {
  return request<{ specialty: string; explanation: string; emergencyNotice: string | null; doctors: DoctorAvailability[]; existingPatient?: boolean; requiresRegistration?: boolean; patient?: PublicPatientRecord; historySummary?: string }>("/api/public/find-doctors", {
    role: "PATIENT",
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function bookPublicAppointment(payload: {
  patientName: string;
  mobile: string;
  patientId?: string;
  age?: number;
  gender?: string;
  language?: string;
  symptoms: string;
  specialty: string;
  doctorId: string;
  slot: string;
}) {
  return request<{ appointment: unknown; visit: Visit }>("/api/public/book-appointment", {
    role: "PATIENT",
    method: "POST",
    body: JSON.stringify(payload),
    idempotent: true
  });
}

export async function scanPublicAppointment() {
  return request<{ visit: Visit; message: string }>("/api/public/scan-appointment", {
    role: "PATIENT",
    method: "POST",
    body: JSON.stringify({}),
    idempotent: true
  });
}

export async function loadAdminSetup() {
  return request<AdminSetupResponse>("/api/admin/setup", { role: "ADMIN" });
}

export async function runVisitCommand(path: string, role: Role, body: Record<string, unknown> = {}, userEmail?: string) {
  return request<ApiVisitResponse>(path, {
    role,
    userEmail,
    method: "POST",
    body: JSON.stringify(body),
    idempotent: true
  }).then((payload) => payload.visit);
}

export function commands(role: Role, userEmail?: string) {
  return {
    selectDoctorFinder: (payload: { symptoms: string; duration: string; redFlags: string; conditions: string }) =>
      runVisitCommand(`/api/visits/${VISIT_ID}/demo/select-doctor-finder`, role, payload, userEmail),
    reviewIntake: (payload: { specialty?: string; doctorId?: string } = {}) => runVisitCommand(`/api/visits/${VISIT_ID}/intake/review`, role, payload, userEmail),
    recommendRouting: (payload: { symptoms: string }) => runVisitCommand(`/api/visits/${VISIT_ID}/routing/recommend`, role, payload, userEmail),
    checkIn: () => runVisitCommand(`/api/visits/${VISIT_ID}/check-in`, role, {}, userEmail),
    startConsultation: () => runVisitCommand(`/api/visits/${VISIT_ID}/start-consultation`, role, {}, userEmail),
    saveConsultation: (payload: { note: string; provisionalDiagnosis: string; advice: string }) =>
      runVisitCommand(`/api/visits/${VISIT_ID}/consultation/save-note`, role, payload, userEmail),
    sendLabRequest: (payload: { pathLabId: string; testIds: string[] }) =>
      runVisitCommand(`/api/visits/${VISIT_ID}/consultation/lab-request`, role, payload, userEmail),
    sendPharmacyRequest: (payload: { pharmacyId: string; prescriptionLines: string[] }) =>
      runVisitCommand(`/api/visits/${VISIT_ID}/consultation/pharmacy-request`, role, payload, userEmail),
    confirmOrders: (note: string) => runVisitCommand(`/api/visits/${VISIT_ID}/consultation/confirm-orders`, role, { note }, userEmail),
    updatePathology: (payload: string | { status: string; reportName?: string; reportContent?: string }) =>
      runVisitCommand(`/api/visits/${VISIT_ID}/pathology/status`, role, typeof payload === "string" ? { status: payload } : payload, userEmail),
    reviewReport: () => runVisitCommand(`/api/visits/${VISIT_ID}/diagnostics/review-report`, role, {}, userEmail),
    reviewPharmacy: () => runVisitCommand(`/api/visits/${VISIT_ID}/pharmacy/review`, role, {}, userEmail),
    dispenseMedication: () => runVisitCommand(`/api/visits/${VISIT_ID}/pharmacy/dispense`, role, {}, userEmail),
    generateInvoice: () => runVisitCommand(`/api/visits/${VISIT_ID}/billing/invoice`, role, {}, userEmail),
    recordPayment: (paymentMode = "UPI") => runVisitCommand(`/api/visits/${VISIT_ID}/payment/record`, role, { paymentMode }, userEmail),
    scheduleFollowUp: (remindersOn: boolean) =>
      runVisitCommand(`/api/visits/${VISIT_ID}/follow-up/schedule`, role, { remindersOn }, userEmail),
    completeVisit: () => runVisitCommand(`/api/visits/${VISIT_ID}/complete`, role, {}, userEmail),
    selectVisit: (visitId: string) => runVisitCommand("/api/visits/select", role, { visitId }, userEmail),
    advanceDemo: () => runVisitCommand("/api/demo/advance", role, {}, userEmail),
    resetDemo: () => runVisitCommand("/api/demo/reset", role, {}, userEmail)
  };
};

export async function saveAdminSetup(setup: AdminSetup) {
  return request<ApiVisitResponse>("/api/admin/setup", {
    role: "ADMIN",
    method: "POST",
    body: JSON.stringify(setup),
    idempotent: true
  }).then((payload) => payload.visit);
}

export async function createHospitalUser(user: { name: string; email: string; role: Role; facilityIds: string[] }) {
  return request<ApiVisitResponse>("/api/admin/users", {
    role: "ADMIN",
    method: "POST",
    body: JSON.stringify(user),
    idempotent: true
  }).then((payload) => payload.visit);
}
