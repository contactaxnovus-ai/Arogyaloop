import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const statePath = join(__dirname, "..", "data", "demo-state.json");

const config = {
  productName: "ArogyaLoop",
  hospitalName: "Hospital setup pending",
  facilityId: "facility-primary",
  locale: "en-IN",
  currency: "INR",
  demoLabel: "Configuration required",
  integrationLabel: "ABDM: Integration in progress",
  aiReviewLabel: "AI-assisted routing; staff reviewed",
  stageOrder: ["kiosk", "intake", "reception", "doctor", "pathology", "pharmacy", "patient", "operations"],
  stages: [
    { id: "kiosk", label: "Reception Kiosk", shortLabel: "Kiosk", icon: "touch_app", owner: "Patient / Reception" },
    { id: "intake", label: "Guided Intake", shortLabel: "Intake", icon: "forum", owner: "Reception" },
    { id: "reception", label: "Reception Desk", shortLabel: "Desk", icon: "how_to_reg", owner: "Receptionist" },
    { id: "doctor", label: "Doctor Workspace", shortLabel: "Doctor", icon: "stethoscope", owner: "Doctor" },
    { id: "pathology", label: "Pathology Lab", shortLabel: "Lab", icon: "biotech", owner: "Lab technician" },
    { id: "pharmacy", label: "Pharmacy & Billing", shortLabel: "Pay", icon: "local_pharmacy", owner: "Pharmacist / Cashier" },
    { id: "patient", label: "Patient Follow-up", shortLabel: "Follow-up", icon: "phone_iphone", owner: "Care coordinator" },
    { id: "operations", label: "Operations Overview", shortLabel: "Ops", icon: "monitoring", owner: "Operations manager" }
  ],
  paymentModes: ["UPI", "Cash", "Card"],
  pathologyStatuses: ["Requested", "Sample collection pending", "Sample collected", "Processing", "Awaiting authorization", "Report ready", "Reviewed"],
  permissions: {
    PATIENT: ["visit:read", "demo:doctorFinder"],
    RECEPTIONIST: ["visit:read", "intake:review", "routing:review", "visit:checkIn"],
    DOCTOR: ["visit:read", "consultation:start", "consultation:order", "consultation:reviewReport", "prescription:finalize", "followup:schedule"],
    LAB_TECHNICIAN: ["visit:read", "pathology:update", "pathology:collect", "pathology:process"],
    PHARMACIST: ["visit:read", "pharmacy:review", "pharmacy:dispense"],
    CASHIER: ["visit:read", "billing:invoice", "payment:record"],
    CARE_COORDINATOR: ["visit:read", "followup:schedule", "visit:complete"],
    OPERATIONS_MANAGER: ["visit:read", "audit:read"],
    ADMIN: ["visit:read", "demo:reset", "demo:advance", "audit:read", "admin:setup", "admin:users", "intake:review", "routing:review", "visit:checkIn", "consultation:start", "consultation:order", "consultation:reviewReport", "prescription:finalize", "pathology:update", "pathology:collect", "pathology:process", "pharmacy:review", "pharmacy:dispense", "billing:invoice", "payment:record", "followup:schedule", "visit:complete"]
  }
};

const journeyStatuses = [
  "ARRIVED",
  "PATIENT_IDENTIFIED",
  "INTAKE_REQUIRED",
  "INTAKE_IN_PROGRESS",
  "INTAKE_COMPLETED",
  "ROUTING_REVIEW_REQUIRED",
  "ROUTED",
  "VISIT_CREATED",
  "CHECKIN_PENDING",
  "CHECKED_IN",
  "WAITING_FOR_CONSULTATION",
  "CONSULTATION_IN_PROGRESS",
  "CONSULTATION_REVIEW_REQUIRED",
  "DIAGNOSTIC_ORDERED",
  "WAITING_FOR_SAMPLE",
  "SAMPLE_COLLECTED",
  "DIAGNOSTIC_PROCESSING",
  "DIAGNOSTIC_REPORT_REVIEW",
  "DIAGNOSTIC_REPORT_READY",
  "WAITING_FOR_DOCTOR_REVIEW",
  "PRESCRIPTION_CREATED",
  "PHARMACIST_REVIEW_REQUIRED",
  "PHARMACY_APPROVED",
  "MEDICATION_READY",
  "MEDICATION_DISPENSED",
  "BILLING_PENDING",
  "INVOICE_CREATED",
  "PAYMENT_PENDING",
  "PAYMENT_COMPLETED",
  "FOLLOWUP_DECISION_PENDING",
  "FOLLOWUP_REQUIRED",
  "FOLLOWUP_SCHEDULED",
  "VISIT_COMPLETION_PENDING",
  "VISIT_COMPLETED"
];

const journeyStepDefinitions = [
  { code: "ARRIVAL", stage: "kiosk", label: "Arrival", ownerRole: "PATIENT" },
  { code: "INTAKE", stage: "intake", label: "Intake", ownerRole: "PATIENT" },
  { code: "ROUTING", stage: "reception", label: "Routing", ownerRole: "RECEPTIONIST" },
  { code: "CHECKIN", stage: "reception", label: "Check-in", ownerRole: "RECEPTIONIST" },
  { code: "CONSULTATION", stage: "doctor", label: "Consultation", ownerRole: "DOCTOR" },
  { code: "DIAGNOSTICS", stage: "pathology", label: "Diagnostics", ownerRole: "LAB_TECHNICIAN" },
  { code: "PHARMACY", stage: "pharmacy", label: "Pharmacy", ownerRole: "PHARMACIST" },
  { code: "PAYMENT", stage: "pharmacy", label: "Payment", ownerRole: "CASHIER" },
  { code: "FOLLOWUP", stage: "patient", label: "Follow-up", ownerRole: "CARE_COORDINATOR" },
  { code: "COMPLETION", stage: "operations", label: "Completion", ownerRole: "OPERATIONS_MANAGER" }
];

const statusStepMap = {
  ARRIVED: "ARRIVAL",
  PATIENT_IDENTIFIED: "ARRIVAL",
  INTAKE_REQUIRED: "INTAKE",
  INTAKE_IN_PROGRESS: "INTAKE",
  INTAKE_COMPLETED: "INTAKE",
  ROUTING_REVIEW_REQUIRED: "ROUTING",
  ROUTED: "ROUTING",
  VISIT_CREATED: "CHECKIN",
  CHECKIN_PENDING: "CHECKIN",
  CHECKED_IN: "CHECKIN",
  WAITING_FOR_CONSULTATION: "CONSULTATION",
  CONSULTATION_IN_PROGRESS: "CONSULTATION",
  CONSULTATION_REVIEW_REQUIRED: "CONSULTATION",
  DIAGNOSTIC_ORDERED: "DIAGNOSTICS",
  WAITING_FOR_SAMPLE: "DIAGNOSTICS",
  SAMPLE_COLLECTED: "DIAGNOSTICS",
  DIAGNOSTIC_PROCESSING: "DIAGNOSTICS",
  DIAGNOSTIC_REPORT_REVIEW: "DIAGNOSTICS",
  DIAGNOSTIC_REPORT_READY: "DIAGNOSTICS",
  WAITING_FOR_DOCTOR_REVIEW: "CONSULTATION",
  PRESCRIPTION_CREATED: "PHARMACY",
  PHARMACIST_REVIEW_REQUIRED: "PHARMACY",
  PHARMACY_APPROVED: "PHARMACY",
  MEDICATION_READY: "PHARMACY",
  MEDICATION_DISPENSED: "PHARMACY",
  BILLING_PENDING: "PAYMENT",
  INVOICE_CREATED: "PAYMENT",
  PAYMENT_PENDING: "PAYMENT",
  PAYMENT_COMPLETED: "PAYMENT",
  FOLLOWUP_DECISION_PENDING: "FOLLOWUP",
  FOLLOWUP_REQUIRED: "FOLLOWUP",
  FOLLOWUP_SCHEDULED: "FOLLOWUP",
  VISIT_COMPLETION_PENDING: "COMPLETION",
  VISIT_COMPLETED: "COMPLETION"
};

const seedVisit = {
  id: "visit-pending",
  tenantId: "tenant-new-hospital",
  facilityId: config.facilityId,
  activeStage: "kiosk",
  patient: {
    id: "",
    name: "",
    age: 0,
    gender: "",
    visitId: "",
    hospital: "Hospital setup pending",
    reason: "",
    doctor: "",
    department: "",
    appointment: "",
    token: "",
    status: "Not started"
  },
  intake: {
    status: "Not started",
    answers: [],
    recommendation: "",
    reviewedByStaff: false,
    disclaimer: "This routing suggestion is not a diagnosis. It helps reception direct the patient to an appropriate department for staff review."
  },
  reception: {
    checkedIn: false,
    tokenPrinted: false,
    room: "",
    directions: "",
    queue: []
  },
  consultation: {
    vitals: [],
    note: "",
    provisionalDiagnosis: "",
    advice: "",
    labRequests: [],
    pharmacyRequests: [],
    cbcOrdered: false,
    prescriptionQueued: false
  },
  pathology: {
    status: "Not ordered",
    requestedTests: [],
    selectedPathLabId: "",
    cbcRows: []
  },
  pharmacy: {
    reviewCompleted: false,
    fulfilmentStatus: "Review pending",
    prescriptionLabel: "Prescription linked to visit; pharmacist review required before fulfilment.",
    selectedPharmacyId: "",
    prescriptionLines: []
  },
  billing: {
    status: "Pending",
    paymentMode: null,
    lines: []
  },
  followUp: {
    scheduled: false,
    appointment: "",
    remindersOn: true
  },
  journeyInstance: {
    id: "journey-pending",
    visitId: "visit-pending",
    workflowDefinitionId: "opd-golden-path-v1",
    status: "ARRIVED",
    currentStepCode: "ARRIVAL",
    startedAt: "",
    completedAt: "",
    version: 1
  },
  journeySteps: [],
  journeyDomainEvents: [],
  diagnosticOrders: [],
  prescriptions: [],
  invoices: [],
  payments: [],
  auditEvents: [],
  idempotency: {},
  doctorDirectory: [],
  appointments: [],
  patients: [],
  messages: [],
  adminSetup: {
    tenant: {
      id: "tenant-new-hospital",
      name: "",
      deploymentType: "Single hospital",
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      currency: "INR"
    },
    facilities: [
      {
        id: "facility-primary",
        name: "",
        city: "",
        hospitalType: "General hospital",
        departments: [],
        queuePrefix: "B",
        enabledModules: ["kiosk", "intake", "reception", "doctor", "pathology", "pharmacy", "patient", "operations"]
      }
    ],
    users: [
      { id: "user-bootstrap-admin", name: "Bootstrap Application Admin", email: "admin@arogyaloop.local", role: "ADMIN", facilityIds: ["facility-primary"], status: "Active" }
    ],
    specialties: [],
    doctors: [],
    serviceUnits: {
      pathLabs: [],
      pharmacies: [],
      cashiers: []
    },
    labTests: [],
    integrations: {
      openAiApiKey: "",
      openAiModel: "gpt-4.1-mini"
    },
    goLiveChecklist: [
      { id: "tenant", label: "Tenant and facility profile", complete: true },
      { id: "roles", label: "Role and permission matrix reviewed", complete: true },
      { id: "users", label: "Initial users created", complete: true },
      { id: "catalogues", label: "Departments, billing and service catalogues", complete: false },
      { id: "security", label: "MFA, backup, audit and support policy", complete: false },
      { id: "integrations", label: "ABDM/SMS/payment integrations tested", complete: false }
    ]
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const rootOnlyKeys = new Set(["visitStore", "currentVisitId", "idempotency", "patients"]);

function visitSnapshot(state) {
  const snapshot = clone(state);
  for (const key of rootOnlyKeys) delete snapshot[key];
  return snapshot;
}

function saveCurrentVisitToStore(state) {
  if (!state.visitStore) state.visitStore = {};
  if (state.id && state.patient?.id) {
    state.visitStore[state.id] = visitSnapshot(state);
    state.currentVisitId = state.id;
  }
}

function allVisitSnapshots(state) {
  const byId = { ...(state.visitStore || {}) };
  if (state.id && state.patient?.id) byId[state.id] = visitSnapshot(state);
  return Object.values(byId).filter((visit) => visit?.id && visit?.patient?.id);
}

function readableStatus(status) {
  const text = String(status || "").trim();
  if (!text || /^\d+$/.test(text)) return "";
  return text.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function queueSummary(snapshot, statusOverride) {
  const status = readableStatus(statusOverride) || readableStatus(snapshot.journeyInstance?.status) || readableStatus(snapshot.patient.status) || "Queued";
  return {
    token: snapshot.patient.token,
    patient: snapshot.patient.name,
    appointment: String(snapshot.patient.appointment || "").replace(" today", "") || "Walk-in",
    department: snapshot.patient.department,
    status,
    visitId: snapshot.id,
    doctor: snapshot.patient.doctor,
    reason: snapshot.patient.reason,
    age: snapshot.patient.age,
    gender: snapshot.patient.gender
  };
}

function buildWorklists(state) {
  const visits = allVisitSnapshots(state);
  const open = visits.filter((visit) => !["VISIT_COMPLETED", "CANCELLED"].includes(visit.journeyInstance?.status));
  return {
    reception: open
      .filter((visit) => ["INTAKE_COMPLETED", "ROUTING_REVIEW_REQUIRED", "ROUTED", "VISIT_CREATED", "CHECKIN_PENDING"].includes(visit.journeyInstance?.status))
      .map(queueSummary),
    doctor: open
      .filter((visit) => ["WAITING_FOR_CONSULTATION", "CONSULTATION_IN_PROGRESS", "WAITING_FOR_DOCTOR_REVIEW", "DIAGNOSTIC_REPORT_READY", "PAYMENT_COMPLETED"].includes(visit.journeyInstance?.status) || visit.pathology?.status === "Report ready")
      .map(queueSummary),
    pathology: open
      .filter((visit) => Array.isArray(visit.pathology?.requestedTests) && visit.pathology.requestedTests.length > 0 && !["Not ordered", "Reviewed"].includes(visit.pathology.status))
      .map((visit) => queueSummary(visit, visit.pathology.status)),
    pharmacy: open
      .filter((visit) => Array.isArray(visit.pharmacy?.prescriptionLines) && visit.pharmacy.prescriptionLines.length > 0 && !["No request", "Dispensed"].includes(visit.pharmacy.fulfilmentStatus))
      .map((visit) => queueSummary(visit, visit.pharmacy.fulfilmentStatus)),
    billing: open
      .filter((visit) => (Array.isArray(visit.billing?.lines) && visit.billing.lines.length > 0 && visit.billing.status !== "Paid") || ["BILLING_PENDING", "PAYMENT_PENDING", "INVOICE_CREATED"].includes(visit.journeyInstance?.status))
      .map((visit) => queueSummary(visit, visit.billing.status)),
    operations: visits.map(queueSummary)
  };
}

function switchActiveVisit(state, visitId) {
  saveCurrentVisitToStore(state);
  const snapshot = state.visitStore?.[visitId];
  if (!snapshot) {
    const error = new Error("Selected visit was not found in this hospital worklist.");
    error.status = 404;
    throw error;
  }
  const globals = {
    adminSetup: state.adminSetup,
    doctorDirectory: state.doctorDirectory,
    appointments: state.appointments,
    patients: state.patients,
    messages: state.messages,
    auditEvents: state.auditEvents,
    idempotency: state.idempotency,
    visitStore: state.visitStore
  };
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, clone(snapshot), globals);
  state.currentVisitId = visitId;
  normalizeState(state);
  return state;
}

function ensureState() {
  mkdirSync(dirname(statePath), { recursive: true });
  try {
    const state = normalizeState(JSON.parse(readFileSync(statePath, "utf8")));
    persist(state);
    return state;
  } catch {
    const initial = normalizeState(clone(seedVisit));
    persist(initial);
    return initial;
  }
}

function normalizeState(state) {
  if (!state.visitStore) state.visitStore = {};
  if (!state.adminSetup) state.adminSetup = clone(seedVisit.adminSetup);
  if (!state.appointments) state.appointments = [];
  if (!state.patients) state.patients = [];
  if (!state.messages) state.messages = [];
  state.patients = state.patients.map((patient) => ({
    id: patient.id || `patient-${Date.now()}`,
    identityKey: patient.identityKey || patientIdentityKey(patient.name, patient.mobile),
    name: patient.name || "",
    mobile: patient.mobile || "",
    age: Number(patient.age || 0),
    gender: patient.gender || "",
    historySummary: patient.historySummary || "",
    visits: Array.isArray(patient.visits) ? patient.visits : [],
    createdAt: patient.createdAt || nowIso(),
    updatedAt: patient.updatedAt || nowIso()
  })).filter((patient) => patient.name && patient.mobile);
  state.appointments = state.appointments.map((appointment) => ({
    ...appointment,
    status: appointment.status === "Booked from kiosk" ? "Confirmed appointment" : appointment.status
  }));
  state.adminSetup.facilities = (state.adminSetup.facilities || []).map((facility, index) => {
    const seedFacility = seedVisit.adminSetup.facilities[index] || seedVisit.adminSetup.facilities[0];
    const departments = Array.isArray(facility.departments)
      ? facility.departments
      : String(facility.departments || "").split(",").map((item) => item.trim()).filter(Boolean);
    const enabledModules = Array.isArray(facility.enabledModules)
      ? facility.enabledModules
      : config.stageOrder.filter((stage) => String(facility.enabledModules || "").includes(stage));
    return {
      ...seedFacility,
      ...facility,
      hospitalType: facility.hospitalType || seedFacility.hospitalType || "General hospital",
      departments: departments.length ? departments : clone(seedFacility.departments),
      enabledModules: enabledModules.length ? enabledModules : clone(seedFacility.enabledModules)
    };
  });
  if (!state.adminSetup.facilities.length) state.adminSetup.facilities = clone(seedVisit.adminSetup.facilities);
  if (!state.adminSetup.specialties) state.adminSetup.specialties = [];
  if (!state.adminSetup.doctors) state.adminSetup.doctors = [];
  if (!state.adminSetup.serviceUnits) state.adminSetup.serviceUnits = clone(seedVisit.adminSetup.serviceUnits);
  if (!state.adminSetup.serviceUnits.pathLabs) state.adminSetup.serviceUnits.pathLabs = [];
  if (!state.adminSetup.serviceUnits.pharmacies) state.adminSetup.serviceUnits.pharmacies = [];
  if (!state.adminSetup.serviceUnits.cashiers) state.adminSetup.serviceUnits.cashiers = [];
  if (!state.adminSetup.labTests) state.adminSetup.labTests = [];
  if (!state.adminSetup.integrations) state.adminSetup.integrations = clone(seedVisit.adminSetup.integrations);
  state.adminSetup.labTests = state.adminSetup.labTests.map((test) => ({
    id: test.id || slugId("test", test.name),
    name: test.name || "",
    category: test.category || "",
    sampleType: test.sampleType || "",
    status: test.status || "Active"
  })).filter((test) => test.name);
  state.adminSetup.serviceUnits.pathLabs = state.adminSetup.serviceUnits.pathLabs.map((lab) => ({
    id: lab.id || slugId("lab", lab.name),
    name: lab.name || "",
    location: lab.location || "",
    testIds: Array.isArray(lab.testIds) ? lab.testIds : [],
    status: lab.status || "Active"
  })).filter((lab) => lab.name);
  state.adminSetup.serviceUnits.pharmacies = state.adminSetup.serviceUnits.pharmacies.map((pharmacy) => ({
    id: pharmacy.id || slugId("pharmacy", pharmacy.name),
    name: pharmacy.name || "",
    location: pharmacy.location || "",
    status: pharmacy.status || "Active"
  })).filter((pharmacy) => pharmacy.name);
  state.adminSetup.serviceUnits.cashiers = state.adminSetup.serviceUnits.cashiers.map((cashier) => ({
    id: cashier.id || slugId("cashier", cashier.name),
    name: cashier.name || "",
    location: cashier.location || "",
    status: cashier.status || "Active"
  })).filter((cashier) => cashier.name);
  state.adminSetup.specialties = state.adminSetup.specialties.map((specialty) => ({
    id: specialty.id || slugId("spec", specialty.name),
    name: specialty.name || "",
    description: specialty.description || ""
  })).filter((specialty) => specialty.name);
  if (!generalMedicineSpecialty(state)) {
    state.adminSetup.specialties.unshift({
      id: "spec-general-medicine",
      name: "General Medicine",
      description: "Default OPD triage and initial evaluation when symptoms do not clearly match a configured specialty."
    });
  }
  state.adminSetup.doctors = state.adminSetup.doctors.map((doctor) => ({
    id: doctor.id || slugId("doc", doctor.name),
    name: doctor.name || "",
    loginEmail: String(doctor.loginEmail || "").toLowerCase(),
    room: doctor.room || "",
    specialtyIds: Array.isArray(doctor.specialtyIds) ? doctor.specialtyIds : [],
    availableSlots: Array.isArray(doctor.availableSlots)
      ? doctor.availableSlots
      : String(doctor.availableSlots || "").split(",").map((item) => item.trim()).filter(Boolean),
    qualification: doctor.qualification || "",
    experienceYears: Number(doctor.experienceYears || 0),
    profile: doctor.profile || "",
    photoUrl: doctor.photoUrl || "",
    status: doctor.status || "Active"
  })).filter((doctor) => doctor.name);
  state.doctorDirectory = state.adminSetup.doctors
    .filter((doctor) => doctor.status === "Active")
    .flatMap((doctor) => {
      const specialties = doctor.specialtyIds.length ? doctor.specialtyIds : [""];
      return specialties.map((specialtyId) => {
        const specialty = state.adminSetup.specialties.find((item) => item.id === specialtyId);
        return {
          id: doctor.id,
          name: doctor.name,
          loginEmail: doctor.loginEmail,
          specialtyId,
          specialty: specialty?.name || "",
          room: doctor.room,
          availableSlots: doctor.availableSlots,
          qualification: doctor.qualification,
          experienceYears: doctor.experienceYears,
          profile: doctor.profile,
          photoUrl: doctor.photoUrl
        };
      });
    })
    .filter((doctor) => doctor.specialty);
  state.adminSetup.users = (state.adminSetup.users || []).map((user) => ({
    ...user,
    facilityIds: Array.isArray(user.facilityIds) ? user.facilityIds : [String(user.facilityIds || state.facilityId)].filter(Boolean),
    status: user.status || "Active"
  }));
  if (!state.adminSetup.users.some((user) => user.role === "ADMIN")) {
    state.adminSetup.users.push(clone(seedVisit.adminSetup.users[0]));
  }
  if (!state.idempotency) state.idempotency = {};
  if (!state.patient.status) state.patient.status = state.patient.name ? "Confirmed appointment" : "Not started";
  if (state.reception?.queue?.length) {
    state.reception.queue = state.reception.queue.map((entry) => ({
      ...entry,
      status: entry.status === "Booked from kiosk" ? "Confirmed appointment" : entry.status
    }));
  }
  if (!state.consultation.provisionalDiagnosis) state.consultation.provisionalDiagnosis = "";
  if (!state.consultation.advice) state.consultation.advice = "";
  if (!state.consultation.labRequests) state.consultation.labRequests = [];
  if (!state.consultation.pharmacyRequests) state.consultation.pharmacyRequests = [];
  if (!state.consultation.priorReports) state.consultation.priorReports = [];
  if (!state.pathology.requestedTests) state.pathology.requestedTests = [];
  if (!state.pathology.selectedPathLabId) state.pathology.selectedPathLabId = "";
  if (!("reportFile" in state.pathology)) state.pathology.reportFile = null;
  if (!state.pharmacy.selectedPharmacyId) state.pharmacy.selectedPharmacyId = "";
  if (!state.pharmacy.prescriptionLines) state.pharmacy.prescriptionLines = [];
  ensureJourney(state);
  saveCurrentVisitToStore(state);
  return state;
}

function slugId(prefix, value) {
  const slug = String(value || "new").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${prefix}-${slug || Date.now()}`;
}

function patientIdentityKey(name, mobile) {
  const normalizedName = String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedMobile = String(mobile || "").replace(/\D+/g, "");
  return `${normalizedName}|${normalizedMobile}`;
}

function normalizedMobile(value) {
  return String(value || "").replace(/\D+/g, "");
}

function isValidIndianMobile(value) {
  const digits = normalizedMobile(value);
  return /^[1-9]\d{9}$/.test(digits);
}

function assertPatientIdentityInput({ name, mobile, gender }, { requireGender = false } = {}) {
  if (!String(name || "").trim()) {
    const error = new Error("Patient name is required.");
    error.status = 400;
    throw error;
  }
  if (!isValidIndianMobile(mobile)) {
    const error = new Error("Enter a valid 10 digit mobile number that does not start with 0.");
    error.status = 400;
    throw error;
  }
  if (requireGender && !String(gender || "").trim()) {
    const error = new Error("Patient sex is required before registration.");
    error.status = 400;
    throw error;
  }
}

function findPatientRecord(state, name, mobile) {
  const key = patientIdentityKey(name, mobile);
  return (state.patients || []).find((patient) => patient.identityKey === key);
}

function patientHistoryForRecord(state, patient) {
  if (!patient) return { summary: "", visits: [], reports: [], prescriptions: [] };
  const visits = allVisitSnapshots(state)
    .filter((visit) => visit.patient?.id === patient.id)
    .sort((a, b) => String(b.id).localeCompare(String(a.id)));
  const reports = visits.flatMap((visit) => {
    const requestedTests = (visit.pathology?.requestedTests || []).map((test) => test.name).filter(Boolean).join(", ");
    const reportRows = (visit.pathology?.cbcRows || []).map((row) => `${row.parameter}: ${row.value} ${row.unit}`.trim());
    const reportFile = visit.pathology?.reportFile;
    if (!requestedTests && !reportRows.length && !reportFile) return [];
    return [{
      visitId: visit.id,
      date: visit.patient?.appointment || visit.journeyInstance?.startedAt || "",
      title: requestedTests || reportFile?.name || "Diagnostic report",
      status: visit.pathology?.status || "Not ordered",
      detail: reportFile?.content || reportRows.join("; ") || "No result rows recorded yet.",
      fileName: reportFile?.name || "",
      uploadedAt: reportFile?.uploadedAt || ""
    }];
  });
  const prescriptions = visits.flatMap((visit) => {
    const lines = visit.pharmacy?.prescriptionLines || [];
    if (!lines.length) return [];
    return [{
      visitId: visit.id,
      date: visit.patient?.appointment || visit.journeyInstance?.startedAt || "",
      title: `Prescription from ${visit.patient?.doctor || "doctor"}`,
      status: visit.pharmacy?.fulfilmentStatus || "Created",
      lines
    }];
  });
  return {
    summary: historySummaryForPatient(patient),
    visits: (patient.visits || []).slice(0, 10),
    reports,
    prescriptions
  };
}

function publicPatientRecord(state, patient) {
  if (!patient) return null;
  return {
    id: patient.id,
    name: patient.name,
    mobile: patient.mobile,
    age: patient.age,
    gender: patient.gender,
    history: patientHistoryForRecord(state, patient)
  };
}

function historySummaryForPatient(patient) {
  if (!patient) return "";
  if (patient.historySummary) return patient.historySummary;
  const visits = Array.isArray(patient.visits) ? patient.visits.slice(0, 5) : [];
  if (!visits.length) return "No previous visit history is recorded for this patient in this hospital.";
  return visits
    .map((visit) => `${visit.date}: ${visit.reason || "Reason not captured"}; ${visit.department || "department pending"}; ${visit.doctor || "doctor pending"}`)
    .join("\n");
}

function upsertPatientRecord(state, details) {
  if (!state.patients) state.patients = [];
  const identityKey = patientIdentityKey(details.name, details.mobile);
  const existing = state.patients.find((patient) => patient.identityKey === identityKey);
  const visitLine = {
    visitId: details.visitId,
    date: nowIso().slice(0, 10),
    reason: details.symptoms,
    department: details.department,
    doctor: details.doctor,
    appointment: details.appointment
  };
  if (existing) {
    existing.age = Number(details.age || existing.age || 0);
    existing.gender = details.gender || existing.gender || "";
    existing.updatedAt = nowIso();
    existing.visits = [visitLine, ...(existing.visits || []).filter((visit) => visit.visitId !== details.visitId)].slice(0, 20);
    existing.historySummary = existing.visits.length > 1
      ? existing.visits.slice(1, 6).map((visit) => `${visit.date}: ${visit.reason || "Reason not captured"}; ${visit.department || "department pending"}; ${visit.doctor || "doctor pending"}`).join("\n")
      : "First recorded visit in this hospital.";
    return { patient: existing, existing: true, historySummary: historySummaryForPatient(existing) };
  }
  const patient = {
    id: `patient-${Date.now()}`,
    identityKey,
    name: details.name,
    mobile: details.mobile,
    age: Number(details.age || 0),
    gender: details.gender || "",
    historySummary: "First recorded visit in this hospital.",
    visits: [visitLine],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  state.patients.unshift(patient);
  return { patient, existing: false, historySummary: patient.historySummary };
}

function nowIso() {
  return new Date().toISOString();
}

function stageForJourneyStatus(status) {
  const stepCode = statusStepMap[status] || "ARRIVAL";
  return journeyStepDefinitions.find((step) => step.code === stepCode)?.stage || "kiosk";
}

function initialJourneySteps(journeyInstanceId) {
  return journeyStepDefinitions.map((step, index) => ({
    id: `${journeyInstanceId}-${step.code.toLowerCase()}`,
    journeyInstanceId,
    stepCode: step.code,
    label: step.label,
    sequence: index + 1,
    status: index === 0 ? "ACTIVE" : "NOT_STARTED",
    ownerRole: step.ownerRole,
    readyAt: index === 0 ? nowIso() : "",
    startedAt: "",
    completedAt: "",
    blockedAt: "",
    blockingReason: "",
    skippable: ["DIAGNOSTICS", "PHARMACY", "PAYMENT", "FOLLOWUP"].includes(step.code),
    required: !["DIAGNOSTICS", "PHARMACY"].includes(step.code)
  }));
}

function ensureJourney(state) {
  if (!state.journeyInstance) {
    const status = state.patient.name ? "CHECKIN_PENDING" : "ARRIVED";
    state.journeyInstance = {
      id: `journey-${state.id || "pending"}`,
      visitId: state.id,
      workflowDefinitionId: "opd-golden-path-v1",
      status,
      currentStepCode: statusStepMap[status],
      startedAt: nowIso(),
      completedAt: "",
      version: 1
    };
  }
  state.journeyInstance.visitId = state.id;
  if (!journeyStatuses.includes(state.journeyInstance.status)) state.journeyInstance.status = state.patient.name ? "CHECKIN_PENDING" : "ARRIVED";
  state.journeyInstance.currentStepCode = statusStepMap[state.journeyInstance.status] || "ARRIVAL";
  if (!Array.isArray(state.journeySteps) || !state.journeySteps.length) state.journeySteps = initialJourneySteps(state.journeyInstance.id);
  if (!Array.isArray(state.journeyDomainEvents)) state.journeyDomainEvents = [];
  if (!Array.isArray(state.diagnosticOrders)) state.diagnosticOrders = [];
  if (!Array.isArray(state.prescriptions)) state.prescriptions = [];
  if (!Array.isArray(state.invoices)) state.invoices = [];
  if (!Array.isArray(state.payments)) state.payments = [];
}

function setJourneyStatus(state, status, request, eventType, metadata = {}) {
  if (!journeyStatuses.includes(status)) {
    const error = new Error(`Unsupported journey status ${status}`);
    error.status = 400;
    throw error;
  }
  ensureJourney(state);
  const previousState = state.journeyInstance.status;
  const previousStepCode = state.journeyInstance.currentStepCode;
  const newStepCode = statusStepMap[status] || previousStepCode;
  const at = nowIso();
  const newStepSequence = state.journeySteps.find((step) => step.stepCode === newStepCode)?.sequence;
  state.journeyInstance.status = status;
  state.journeyInstance.currentStepCode = newStepCode;
  state.journeyInstance.version = (state.journeyInstance.version || 0) + 1;
  if (status === "VISIT_COMPLETED") state.journeyInstance.completedAt = at;

  state.journeySteps = state.journeySteps.map((step) => {
    if (newStepSequence && step.sequence && step.sequence < newStepSequence && step.status !== "COMPLETED" && step.status !== "SKIPPED") {
      return { ...step, status: "COMPLETED", completedAt: step.completedAt || at };
    }
    if (step.stepCode === previousStepCode && previousStepCode !== newStepCode && step.status === "ACTIVE") {
      return { ...step, status: "COMPLETED", completedAt: at };
    }
    if (step.stepCode === newStepCode && step.status === "NOT_STARTED") {
      return { ...step, status: "ACTIVE", readyAt: step.readyAt || at, startedAt: step.startedAt || at };
    }
    if (step.stepCode === newStepCode && step.status === "COMPLETED" && status !== "VISIT_COMPLETED") {
      return { ...step, status: "ACTIVE", readyAt: step.readyAt || at };
    }
    return step;
  });
  if (status === "VISIT_COMPLETED") {
    state.journeySteps = state.journeySteps.map((step) => step.status === "ACTIVE" || step.stepCode === "COMPLETION" ? { ...step, status: "COMPLETED", completedAt: step.completedAt || at } : step);
  }
  state.activeStage = stageForJourneyStatus(status);
  state.patient.status = status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  state.journeyDomainEvents.unshift({
    id: `journey-event-${Date.now()}-${state.journeyDomainEvents.length + 1}`,
    journeyInstanceId: state.journeyInstance.id,
    visitId: state.id,
    eventType,
    sourceModule: stageForJourneyStatus(status),
    actorUserId: currentUserEmail(request) || roleFor(request),
    actorRole: roleFor(request),
    previousState,
    newState: status,
    timestamp: at,
    metadata,
    correlationId: request.headers["x-correlation-id"] || null
  });
}

function nextActionFor(state) {
  ensureJourney(state);
  const status = state.journeyInstance.status;
  const actions = {
    ARRIVED: ["START_INTAKE", "Begin guided intake", "PATIENT"],
    INTAKE_REQUIRED: ["START_INTAKE", "Begin guided intake", "PATIENT"],
    INTAKE_IN_PROGRESS: ["COMPLETE_INTAKE", "Complete intake questions", "PATIENT"],
    INTAKE_COMPLETED: ["REVIEW_ROUTING", "Reception reviews recommendation", "RECEPTIONIST"],
    ROUTING_REVIEW_REQUIRED: ["APPROVE_ROUTING", "Accept routing recommendation", "RECEPTIONIST"],
    ROUTED: ["CREATE_VISIT", "Create visit and prepare check-in", "RECEPTIONIST"],
    VISIT_CREATED: ["CHECK_IN", "Check in patient and generate token", "RECEPTIONIST"],
    CHECKIN_PENDING: ["CHECK_IN", "Check in patient and generate token", "RECEPTIONIST"],
    CHECKED_IN: ["WAIT_FOR_CONSULTATION", "Patient is waiting for consultation", "DOCTOR"],
    WAITING_FOR_CONSULTATION: ["START_CONSULTATION", "Start consultation", "DOCTOR"],
    CONSULTATION_IN_PROGRESS: ["CONFIRM_DIAGNOSTIC_ORDER", "Confirm diagnostic order", "DOCTOR"],
    DIAGNOSTIC_ORDERED: ["COLLECT_SAMPLE", "Collect sample", "LAB_TECHNICIAN"],
    WAITING_FOR_SAMPLE: ["COLLECT_SAMPLE", "Collect sample", "LAB_TECHNICIAN"],
    SAMPLE_COLLECTED: ["START_PROCESSING", "Start diagnostic processing", "LAB_TECHNICIAN"],
    DIAGNOSTIC_PROCESSING: ["AUTHORIZE_REPORT", "Authorize report", "LAB_TECHNICIAN"],
    DIAGNOSTIC_REPORT_REVIEW: ["AUTHORIZE_REPORT", "Authorize report", "LAB_TECHNICIAN"],
    DIAGNOSTIC_REPORT_READY: ["REVIEW_REPORT", "Doctor reviews report", "DOCTOR"],
    WAITING_FOR_DOCTOR_REVIEW: ["FINALIZE_PRESCRIPTION", "Finalize prescription", "DOCTOR"],
    PRESCRIPTION_CREATED: ["APPROVE_PRESCRIPTION", "Pharmacist reviews prescription", "PHARMACIST"],
    PHARMACIST_REVIEW_REQUIRED: ["APPROVE_PRESCRIPTION", "Pharmacist approves prescription", "PHARMACIST"],
    PHARMACY_APPROVED: ["PREPARE_MEDICATION", "Prepare medication", "PHARMACIST"],
    MEDICATION_READY: ["DISPENSE_MEDICATION", "Dispense medication", "PHARMACIST"],
    MEDICATION_DISPENSED: ["GENERATE_INVOICE", "Generate invoice", "CASHIER"],
    BILLING_PENDING: ["GENERATE_INVOICE", "Generate invoice", "CASHIER"],
    INVOICE_CREATED: ["COLLECT_PAYMENT", "Collect payment", "CASHIER"],
    PAYMENT_PENDING: ["COLLECT_PAYMENT", "Collect payment", "CASHIER"],
    PAYMENT_COMPLETED: ["DECIDE_FOLLOWUP", "Record follow-up decision", "DOCTOR"],
    FOLLOWUP_DECISION_PENDING: ["SCHEDULE_FOLLOWUP", "Schedule follow-up", "CARE_COORDINATOR"],
    FOLLOWUP_REQUIRED: ["SCHEDULE_FOLLOWUP", "Schedule follow-up", "CARE_COORDINATOR"],
    FOLLOWUP_SCHEDULED: ["COMPLETE_VISIT", "Complete visit", "CARE_COORDINATOR"],
    VISIT_COMPLETION_PENDING: ["COMPLETE_VISIT", "Complete visit", "CARE_COORDINATOR"],
    VISIT_COMPLETED: ["NONE", "Visit completed", "OPERATIONS_MANAGER"]
  };
  const [code, label, ownerRole] = actions[status] || ["NONE", "No next action available", "OPERATIONS_MANAGER"];
  return {
    code,
    label,
    ownerRole,
    currentStep: state.journeyInstance.currentStepCode,
    currentStatus: status,
    blockingReason: null,
    availableActions: code === "NONE" ? [] : [code]
  };
}

function persist(state) {
  saveCurrentVisitToStore(state);
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function setupIdentity(setup) {
  const tenantId = String(setup?.tenant?.id || "").trim().toLowerCase();
  const tenantName = String(setup?.tenant?.name || "").trim().toLowerCase();
  const facilityIds = (setup?.facilities || []).map((facility) => String(facility.id || "").trim().toLowerCase()).filter(Boolean).sort();
  const facilityNames = (setup?.facilities || []).map((facility) => String(facility.name || "").trim().toLowerCase()).filter(Boolean).sort();
  return JSON.stringify({ tenantId, tenantName, facilityIds, facilityNames });
}

function isDemoHospitalSetup(setup) {
  return String(setup?.tenant?.id || "").toLowerCase() === "tenant-arogya-city"
    || String(setup?.tenant?.name || "").toLowerCase().includes("arogya city")
    || (setup?.facilities || []).some((facility) => String(facility.id || "").toLowerCase() === "facility-jaipur" || String(facility.name || "").toLowerCase().includes("arogya city"));
}

function hasOperationalData(state) {
  return Boolean(
    state.patient?.id
    || state.patient?.name
    || state.id !== seedVisit.id
    || (state.appointments || []).length
    || (state.patients || []).length
    || (state.messages || []).length
    || Object.keys(state.visitStore || {}).length
    || (state.reception?.queue || []).length
  );
}

function blankStateForSetup(setup) {
  const next = clone(seedVisit);
  next.adminSetup = setup;
  next.tenantId = setup.tenant?.id || seedVisit.tenantId;
  next.facilityId = setup.facilities?.[0]?.id || seedVisit.facilityId;
  next.patient.hospital = setup.facilities?.[0]?.name || setup.tenant?.name || "Configured hospital";
  next.journeySteps = initialJourneySteps(next.journeyInstance.id);
  return normalizeState(next);
}

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy(new Error("Payload too large"));
    });
    request.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function roleFor(request) {
  return String(request.headers["x-role"] || "PATIENT").toUpperCase();
}

function requirePermission(request, permission) {
  const role = roleFor(request);
  const allowed = config.permissions[role] || [];
  if (!allowed.includes(permission)) {
    const error = new Error(`Role ${role} cannot perform ${permission}`);
    error.status = 403;
    throw error;
  }
  return role;
}

function currentUserEmail(request) {
  return String(request.headers["x-user-email"] || "").toLowerCase();
}

function currentUser(state, request) {
  const email = currentUserEmail(request);
  return state.adminSetup.users.find((user) => user.email.toLowerCase() === email);
}

function comparableDoctorName(value) {
  return String(value || "").toLowerCase().replace(/^dr\.?\s+/, "").replace(/\s+/g, " ").trim();
}

function doctorCanAccessVisit(state, request) {
  if (roleFor(request) !== "DOCTOR") return true;
  const user = currentUser(state, request);
  if (!user || !state.patient.doctor) return false;
  const assignedDoctor = state.adminSetup.doctors.find((doctor) => comparableDoctorName(doctor.name) === comparableDoctorName(state.patient.doctor));
  return assignedDoctor?.loginEmail
    ? assignedDoctor.loginEmail === user.email.toLowerCase()
    : comparableDoctorName(user.name) === comparableDoctorName(state.patient.doctor);
}

function assertDoctorCanAccessVisit(state, request) {
  if (!doctorCanAccessVisit(state, request)) {
    const error = new Error("This patient is assigned to another doctor.");
    error.status = 403;
    throw error;
  }
}

function visibleUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    facilityIds: user.facilityIds,
    status: user.status
  };
}

function visibleSetup(setup) {
  return {
    ...setup,
    integrations: {
      ...setup.integrations,
      openAiApiKey: setup.integrations?.openAiApiKey ? "********" : "",
      openAiConfigured: Boolean(setup.integrations?.openAiApiKey || process.env.OPENAI_API_KEY)
    }
  };
}

function sanitizeSecrets(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeSecrets(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    key.toLowerCase().includes("apikey") || key.toLowerCase().includes("api_key") ? (entry ? "********" : "") : sanitizeSecrets(entry)
  ]));
}

function visibleAuditEvents(events = []) {
  return events.map((event) => sanitizeSecrets(event));
}

function redactedVisitForDoctor(state) {
  const redacted = decorateVisit({
    ...clone(state),
    patient: {
      ...state.patient,
      id: "",
      name: "",
      age: 0,
      gender: "",
      reason: "",
      doctor: "",
      department: "",
      appointment: "",
      token: "",
      status: "No patient assigned"
    },
    intake: { ...state.intake, answers: [], recommendation: "", reviewedByStaff: false, status: "No assigned patient" },
    reception: { ...state.reception, queue: [] },
    consultation: { ...state.consultation, note: "", provisionalDiagnosis: "", advice: "", labRequests: [], pharmacyRequests: [] },
    pathology: { ...state.pathology, requestedTests: [], cbcRows: [], status: "Not ordered" },
    pharmacy: { ...state.pharmacy, prescriptionLines: [], prescriptionLabel: "No prescription assigned.", fulfilmentStatus: "No request" },
    activeStage: "doctor"
  });
  redacted.worklists = buildWorklists(state);
  return redacted;
}

function filterWorklistsForRequest(visit, state, request) {
  if (roleFor(request) !== "DOCTOR") return visit;
  const user = currentUser(state, request);
  if (!user) return { ...visit, worklists: { ...visit.worklists, doctor: [] }, reception: { ...visit.reception, queue: [] } };
  const allowedDoctorRows = (visit.worklists?.doctor || []).filter((row) => {
    const assignedDoctor = state.adminSetup.doctors.find((doctor) => comparableDoctorName(doctor.name) === comparableDoctorName(row.doctor || ""));
    return assignedDoctor?.loginEmail
      ? assignedDoctor.loginEmail === user.email.toLowerCase()
      : comparableDoctorName(user.name) === comparableDoctorName(row.doctor || "");
  });
  return {
    ...visit,
    worklists: { ...visit.worklists, doctor: allowedDoctorRows },
    reception: { ...visit.reception, queue: allowedDoctorRows }
  };
}

function fallbackSpecialty(state, symptoms) {
  const configured = state.adminSetup.specialties;
  if (!configured.length) return "";
  const text = symptoms.toLowerCase();
  const generalMedicine = generalMedicineSpecialty(state);
  const clinicalGuard = guardedSpecialtyForSymptoms(state, symptoms);
  if (clinicalGuard) return clinicalGuard.name;
  const match = configured.find((specialty) => {
    const haystack = `${specialty.name} ${specialty.description}`.toLowerCase();
    return haystack.split(/[^a-z0-9]+/).filter((word) => word.length > 3).some((word) => text.includes(word));
  });
  return match?.name || generalMedicine?.name || configured[0].name;
}

async function routeSpecialty(state, symptoms) {
  const fallback = fallbackSpecialty(state, symptoms);
  const clinicalGuard = guardedSpecialtyForSymptoms(state, symptoms);
  const apiKey = state.adminSetup.integrations?.openAiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || !state.adminSetup.specialties.length) {
    return { specialty: fallback, source: clinicalGuard ? "Clinical routing guard" : "Configured fallback" };
  }
  const specialtyNames = state.adminSetup.specialties.map((specialty) => specialty.name);
  const specialtyOptions = state.adminSetup.specialties
    .map((specialty) => `- ${specialty.name}: ${specialty.description || "No routing description configured."}`)
    .join("\n");
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: state.adminSetup.integrations?.openAiModel || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "Select exactly one hospital specialty from the provided list for OPD routing. This is not a diagnosis. If symptoms do not clearly match any configured specialty, or the relevant specialty is not available in this hospital, select General Medicine. Return only the specialty name."
          },
          {
            role: "user",
            content: `Available specialties:\n${specialtyOptions}\n\nPatient context, symptoms and history:\n${symptoms}`
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`OpenAI routing failed with ${response.status}`);
    const payload = await response.json();
    const text = String(payload.output_text || payload.output?.[0]?.content?.[0]?.text || "").trim();
    const matched = specialtyNames.find((name) => name.toLowerCase() === text.toLowerCase());
    if (clinicalGuard && matched && matched !== clinicalGuard.name) {
      return { specialty: clinicalGuard.name, source: `Clinical routing guard overrode OpenAI ${matched}` };
    }
    return matched
      ? { specialty: matched, source: "OpenAI" }
      : { specialty: fallback, source: "General Medicine fallback after unmatched OpenAI response" };
  } catch {
    return { specialty: fallback, source: clinicalGuard ? "Clinical routing guard after OpenAI error" : "Configured fallback after OpenAI error" };
  }
}

function doctorsForSpecialty(state, specialty) {
  return state.doctorDirectory.filter((doctor) => doctor.specialty === specialty);
}

function normalizedSpecialtyName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function specialtyByNormalizedName(state, names) {
  const wanted = new Set(names.map(normalizedSpecialtyName));
  return (state.adminSetup?.specialties || []).find((specialty) => wanted.has(normalizedSpecialtyName(specialty.name)));
}

function guardedSpecialtyForSymptoms(state, symptoms) {
  const text = String(symptoms || "").toLowerCase();
  const rules = [
    {
      specialtyNames: ["Gastroenterology"],
      patterns: [/\babdomen\b/, /\babdominal\b/, /\bstomach\b/, /\bstomachache\b/, /\bbelly\b/, /\bgastric\b/, /\bgas\b/, /\bgases\b/, /\bbloating\b/, /\bflatulence\b/, /\bacidity\b/, /\bheartburn\b/, /\bindigestion\b/, /\bvomit/, /\bnausea\b/, /\bdiarrh/, /\bloose motion/, /\bloose stool/, /\bconstipat/, /\bjaundice\b/, /\bliver\b/]
    },
    {
      specialtyNames: ["Cardiology"],
      patterns: [/\bchest pain\b/, /\bpalpitation/, /\bheart\b/, /\bcardiac\b/]
    },
    {
      specialtyNames: ["Neurology"],
      patterns: [/\bseizure\b/, /\bstroke\b/, /\bparalysis\b/, /\bnumbness\b/, /\btremor\b/, /\bmigraine\b/, /\bsevere headache\b/, /\bworst headache\b/, /\bheadache with weakness\b/, /\bheadache with confusion\b/, /\bheadache with vision\b/]
    },
    {
      specialtyNames: ["Pulmonology"],
      patterns: [/\bbreathless/, /\bshortness of breath\b/, /\basthma\b/, /\bcough\b/, /\bwheez/]
    },
    {
      specialtyNames: ["Orthopedics"],
      patterns: [/\bfracture\b/, /\bsprain\b/, /\bjoint\b/, /\bknee\b/, /\bshoulder\b/, /\bback pain\b/, /\bneck pain\b/, /\bhip\b/, /\bbone\b/]
    },
    {
      specialtyNames: ["Dermatology"],
      patterns: [/\brash\b/, /\bitch/, /\bacne\b/, /\bskin\b/, /\bhair fall\b/]
    },
    {
      specialtyNames: ["ENT"],
      patterns: [/\bear\b/, /\bthroat\b/, /\bsinus\b/, /\bnose\b/, /\btonsil\b/, /\bhearing\b/]
    },
    {
      specialtyNames: ["Ophthalmology"],
      patterns: [/\beye\b/, /\bvision\b/, /\bblurred vision\b/, /\bredness in eye\b/]
    },
    {
      specialtyNames: ["Urology", "Nephrology"],
      patterns: [/\burine\b/, /\burinary\b/, /\bkidney stone\b/, /\bprostate\b/]
    }
  ];
  const rule = rules.find((item) => item.patterns.some((pattern) => pattern.test(text)));
  return rule ? specialtyByNormalizedName(state, rule.specialtyNames) : null;
}

function generalMedicineSpecialty(state) {
  return (state.adminSetup?.specialties || []).find((specialty) => {
    const name = normalizedSpecialtyName(specialty.name);
    return name === "generalmedicine" || name === "internalmedicine" || name === "familymedicine" || name === "primarycare";
  });
}

function generalMedicineDoctors(state) {
  const fallback = generalMedicineSpecialty(state);
  return fallback ? doctorsForSpecialty(state, fallback.name) : [];
}

function queueEntryForVisit(state) {
  return (state.reception.queue || []).find((entry) => entry.visitId === state.id || entry.token === state.patient.token);
}

function upsertQueueEntryForVisit(state, patch = {}) {
  const entry = {
    token: state.patient.token,
    patient: state.patient.name,
    appointment: String(state.patient.appointment || "").replace(" today", "") || "Walk-in",
    department: state.patient.department,
    status: state.patient.status || "Queued",
    visitId: state.id,
    doctor: state.patient.doctor,
    reason: state.patient.reason,
    age: state.patient.age,
    gender: state.patient.gender,
    ...patch
  };
  const index = (state.reception.queue || []).findIndex((item) => item.visitId === entry.visitId || item.token === entry.token);
  if (index >= 0) {
    state.reception.queue[index] = { ...state.reception.queue[index], ...entry };
  } else {
    state.reception.queue.unshift(entry);
  }
  return state.reception.queue.find((item) => item.visitId === entry.visitId || item.token === entry.token);
}

function completeBefore(state, stageId) {
  const nextIndex = config.stageOrder.indexOf(stageId);
  return new Set(config.stageOrder.slice(0, Math.max(nextIndex, 0)));
}

function decorateVisit(state) {
  ensureJourney(state);
  const activeStep = state.journeyInstance.currentStepCode;
  const completed = config.stageOrder.filter((stageId) => {
    const stepsForStage = state.journeySteps.filter((step) => journeyStepDefinitions.find((definition) => definition.code === step.stepCode)?.stage === stageId);
    return stepsForStage.length && stepsForStage.every((step) => step.status === "COMPLETED" || step.status === "SKIPPED");
  });
  const stageState = Object.fromEntries(config.stageOrder.map((stageId) => [
    stageId,
    stageId === state.activeStage ? "current" : completed.includes(stageId) ? "complete" : "pending"
  ]));
  const nextAction = nextActionFor(state);
  const worklists = buildWorklists(state);

  return {
    ...state,
    adminSetup: visibleSetup(state.adminSetup),
    auditEvents: visibleAuditEvents(state.auditEvents),
    worklists,
    reception: {
      ...state.reception,
      queue: worklists.reception
    },
    completedStages: completed,
    stageState,
    nextAction,
    journeyEvents: state.journeySteps.map((step) => {
      const definition = journeyStepDefinitions.find((item) => item.code === step.stepCode);
      const stage = definition?.stage || "operations";
      return {
        stage,
        stepCode: step.stepCode,
        title: definition?.label || step.stepCode,
        owner: step.ownerRole,
        status: step.stepCode === activeStep ? "current" : step.status === "COMPLETED" || step.status === "SKIPPED" ? "complete" : "pending",
        detail: detailForJourneyStep(state, step.stepCode),
        timestamp: step.completedAt ? "Done" : step.stepCode === activeStep ? "Now" : step.status === "SKIPPED" ? "Skipped" : "Pending"
      };
    })
  };
}

function detailForJourneyStep(state, stepCode) {
  const details = {
    ARRIVAL: state.patient.name ? `${state.patient.name} identified for visit ${state.patient.visitId || state.id}.` : "Patient can identify, register, or request doctor finding at the kiosk.",
    INTAKE: state.intake.answers.length ? `${state.intake.answers.length} intake answer(s) captured; recommendation: ${state.intake.recommendation || "pending"}.` : "Guided intake is waiting for patient symptoms.",
    ROUTING: state.intake.reviewedByStaff ? `Reception approved ${state.patient.department || state.intake.recommendation}.` : "Reception must review AI-assisted routing before check-in.",
    CHECKIN: state.reception.checkedIn ? `Token ${state.patient.token} checked in; directions shared.` : "Reception check-in and token generation pending.",
    CONSULTATION: state.consultation.note ? "Consultation notes saved; doctor decisions drive orders and follow-up." : "Doctor must start consultation and record clinical plan.",
    DIAGNOSTICS: state.pathology.requestedTests.length ? `${state.pathology.requestedTests.map((test) => test.name).join(", ")} status: ${state.pathology.status}.` : "No diagnostic order is actionable yet.",
    PHARMACY: state.pharmacy.prescriptionLines.length ? `${state.pharmacy.prescriptionLines.length} prescription line(s); ${state.pharmacy.fulfilmentStatus}.` : "No finalized prescription is actionable yet.",
    PAYMENT: state.billing.status === "Paid" ? `Payment completed by ${state.billing.paymentMode || "configured mode"}.` : `${state.billing.lines.length} billable line(s); invoice/payment pending.`,
    FOLLOWUP: state.followUp.scheduled ? `Follow-up scheduled: ${state.followUp.appointment}.` : "Follow-up decision is pending.",
    COMPLETION: state.journeyInstance.status === "VISIT_COMPLETED" ? "Visit completed and visible in operations history." : "Completion waits until required steps are satisfied."
  };
  return details[stepCode] || "Journey step pending.";
}

function detailForStage(state, stageId) {
  const details = {
    kiosk: state.patient.status === "Not started" ? "Hospital kiosk is ready after setup; no patient appointment is active." : `Patient appointment status: ${state.patient.status}.`,
    intake: state.intake.reviewedByStaff ? `Reception reviewed intake and confirmed ${state.intake.recommendation}.` : "Intake answers captured; staff review pending.",
    reception: state.reception.checkedIn ? `Token ${state.patient.token} checked in and directions shared.` : "Patient is waiting in the arrival queue.",
    doctor: state.consultation.labRequests.length || state.consultation.pharmacyRequests.length
      ? `Doctor saved consultation and sent ${state.consultation.labRequests.length} lab request(s), ${state.consultation.pharmacyRequests.length} pharmacy request(s).`
      : "Doctor can record notes, diagnosis, advice, lab requests, and prescriptions.",
    pathology: state.pathology.requestedTests.length ? `${state.pathology.requestedTests.length} test(s) requested; status: ${state.pathology.status}.` : "No lab test has been requested yet.",
    pharmacy: state.pharmacy.prescriptionLines.length ? `${state.pharmacy.prescriptionLines.length} prescription line(s); fulfilment: ${state.pharmacy.fulfilmentStatus}.` : "No prescription has been sent to pharmacy yet.",
    patient: state.followUp.scheduled ? "Follow-up scheduled and reminders configured." : "Visit summary will be visible after payment and follow-up scheduling.",
    operations: "Operations view summarizes owners and statuses from the same visit record."
  };
  return details[stageId];
}

function timestampForStage(state, stageId) {
  const completed = completeBefore(state, state.activeStage);
  if (completed.has(stageId)) return "Done";
  if (state.activeStage === stageId) return "Now";
  return "Pending";
}

function audit(state, request, action, previous, next, metadata = {}) {
  const role = roleFor(request);
  state.auditEvents.unshift({
    id: `audit-${Date.now()}-${state.auditEvents.length + 1}`,
    occurredAt: new Date().toISOString(),
    actorRole: role,
    tenantId: state.tenantId,
    facilityId: state.facilityId,
    patientId: state.patient.id,
    visitId: state.id,
    action,
    resourceType: "Visit",
    resourceId: state.id,
    previous,
    next,
    correlationId: request.headers["x-correlation-id"] || null,
    idempotencyKey: request.headers["idempotency-key"] || null,
    metadata
  });
}

const demoSpecialties = [
  ["spec-general-medicine", "General Medicine", "Default OPD triage, fever, fatigue, dizziness, infections, chronic disease review and unclear symptoms that need first physician assessment."],
  ["spec-internal-medicine", "Internal Medicine", "Complex adult medical illness, diabetes, hypertension, thyroid disorders, multi-system symptoms and longitudinal physician care."],
  ["spec-cardiology", "Cardiology", "Chest discomfort, palpitations, breathlessness on exertion, hypertension complications, heart failure symptoms and cardiac follow-up."],
  ["spec-neurology", "Neurology", "Headache, seizure, weakness, numbness, tremor, dizziness, stroke follow-up and neurological symptom evaluation."],
  ["spec-orthopedics", "Orthopedics", "Bone, joint, spine, fracture, sports injury, arthritis, back pain and musculoskeletal complaints."],
  ["spec-ent", "ENT", "Ear pain, hearing issues, vertigo, sinus, throat, tonsil, voice, nose bleed and head-neck OPD complaints."],
  ["spec-ophthalmology", "Ophthalmology", "Eye pain, redness, blurred vision, cataract review, refraction, glaucoma screening and diabetic eye checks."],
  ["spec-dermatology", "Dermatology", "Rash, itching, acne, hair fall, pigmentation, allergy, fungal infections and skin lesion review."],
  ["spec-pediatrics", "Pediatrics", "Child fever, cough, growth, vaccination, feeding issues, pediatric infections and child development concerns."],
  ["spec-obstetrics-gynecology", "Obstetrics & Gynecology", "Pregnancy care, menstrual concerns, pelvic pain, fertility counselling, menopause and women's health OPD care."],
  ["spec-gastroenterology", "Gastroenterology", "Abdominal pain, acidity, vomiting, diarrhea, constipation, jaundice, liver disease and digestive symptoms."],
  ["spec-pulmonology", "Pulmonology", "Cough, asthma, COPD, breathlessness, sleep breathing issues, pneumonia follow-up and respiratory symptoms."],
  ["spec-nephrology", "Nephrology", "Kidney disease, abnormal creatinine, urinary protein, dialysis review, electrolyte problems and resistant hypertension."],
  ["spec-urology", "Urology", "Urinary pain, stones, prostate symptoms, male urinary issues, hematuria and urologic follow-up."],
  ["spec-endocrinology", "Endocrinology", "Diabetes, thyroid, obesity, hormonal disorders, osteoporosis and endocrine medication review."],
  ["spec-psychiatry", "Psychiatry", "Anxiety, depression, sleep issues, behavioral concerns, substance use and mental health review."],
  ["spec-dentistry", "Dentistry", "Tooth pain, gum disease, oral ulcers, dental infections, preventive dental care and oral procedure review."],
  ["spec-oncology", "Oncology", "Cancer evaluation, chemotherapy follow-up, survivorship care, suspicious lumps and oncology referral coordination."],
  ["spec-rheumatology", "Rheumatology", "Joint swelling, autoimmune disease, inflammatory arthritis, lupus symptoms and chronic pain with inflammation."],
  ["spec-physiotherapy", "Physiotherapy", "Rehabilitation, mobility training, post-operative exercises, posture correction, pain therapy and functional recovery."],
  ["spec-diet-nutrition", "Diet & Nutrition", "Diet plans for diabetes, weight, pregnancy, renal disease, cardiac risk, child nutrition and recovery support."],
  ["spec-emergency-medicine", "Emergency Medicine", "Urgent assessment, trauma, severe acute symptoms, stabilization and emergency triage before specialist care."]
].map(([id, name, description]) => ({ id, name, description }));

const doctorFirstNames = ["Aarav", "Aditi", "Arjun", "Bhavna", "Charu", "Dev", "Esha", "Farhan", "Gauri", "Harsh"];
const doctorLastNames = ["Mehta", "Rao", "Kapoor", "Iyer", "Khan", "Sharma", "Nair", "Bose", "Saxena", "Menon"];
const slotTemplates = [
  ["09:00 AM", "09:20 AM", "09:40 AM", "10:00 AM"],
  ["10:10 AM", "10:30 AM", "10:50 AM", "11:10 AM"],
  ["11:20 AM", "11:40 AM", "12:00 PM", "12:20 PM"],
  ["02:00 PM", "02:20 PM", "02:40 PM", "03:00 PM"],
  ["03:10 PM", "03:30 PM", "03:50 PM", "04:10 PM"]
];

const demoLabTests = [
  ["test-cbc", "Complete Blood Count (CBC)", "Hematology", "EDTA whole blood"],
  ["test-esr", "Erythrocyte Sedimentation Rate (ESR)", "Hematology", "Citrated blood"],
  ["test-crp", "C-Reactive Protein (CRP)", "Immunology", "Serum"],
  ["test-blood-group", "Blood Group & Rh Typing", "Hematology", "EDTA whole blood"],
  ["test-fasting-glucose", "Fasting Blood Glucose", "Biochemistry", "Fluoride plasma"],
  ["test-pp-glucose", "Post-Prandial Blood Glucose", "Biochemistry", "Fluoride plasma"],
  ["test-hba1c", "HbA1c", "Diabetes", "EDTA whole blood"],
  ["test-lipid-profile", "Lipid Profile", "Biochemistry", "Serum"],
  ["test-lft", "Liver Function Test", "Biochemistry", "Serum"],
  ["test-kft", "Kidney Function Test", "Biochemistry", "Serum"],
  ["test-electrolytes", "Serum Electrolytes", "Biochemistry", "Serum"],
  ["test-thyroid-profile", "Thyroid Profile (T3/T4/TSH)", "Endocrinology", "Serum"],
  ["test-vitamin-d", "Vitamin D", "Endocrinology", "Serum"],
  ["test-vitamin-b12", "Vitamin B12", "Biochemistry", "Serum"],
  ["test-iron-profile", "Iron Profile", "Biochemistry", "Serum"],
  ["test-urine-routine", "Urine Routine & Microscopy", "Clinical Pathology", "Urine"],
  ["test-urine-culture", "Urine Culture", "Microbiology", "Urine"],
  ["test-blood-culture", "Blood Culture", "Microbiology", "Blood culture bottle"],
  ["test-sputum-culture", "Sputum Culture", "Microbiology", "Sputum"],
  ["test-malaria", "Malaria Parasite / Antigen", "Infectious Disease", "Blood"],
  ["test-dengue-ns1", "Dengue NS1 Antigen", "Infectious Disease", "Serum"],
  ["test-dengue-igm", "Dengue IgM/IgG", "Infectious Disease", "Serum"],
  ["test-typhoid", "Typhoid IgM / Widal", "Infectious Disease", "Serum"],
  ["test-covid-rtpcr", "COVID-19 RT-PCR", "Molecular", "Nasopharyngeal swab"],
  ["test-influenza", "Influenza A/B Antigen", "Infectious Disease", "Nasopharyngeal swab"],
  ["test-hbsag", "HBsAg", "Serology", "Serum"],
  ["test-hcv", "Anti-HCV", "Serology", "Serum"],
  ["test-hiv", "HIV I & II", "Serology", "Serum"],
  ["test-pt-inr", "PT/INR", "Coagulation", "Citrated plasma"],
  ["test-aptt", "APTT", "Coagulation", "Citrated plasma"],
  ["test-troponin", "Troponin I", "Cardiac", "Serum"],
  ["test-ckmb", "CK-MB", "Cardiac", "Serum"],
  ["test-bnp", "BNP / NT-proBNP", "Cardiac", "Plasma"],
  ["test-d-dimer", "D-Dimer", "Coagulation", "Citrated plasma"],
  ["test-pregnancy", "Urine Pregnancy Test", "Obstetrics", "Urine"],
  ["test-beta-hcg", "Beta hCG", "Obstetrics", "Serum"],
  ["test-pap-smear", "Pap Smear", "Cytology", "Cervical smear"],
  ["test-semen-analysis", "Semen Analysis", "Andrology", "Semen"],
  ["test-stool-routine", "Stool Routine", "Clinical Pathology", "Stool"],
  ["test-stool-occult", "Stool Occult Blood", "Clinical Pathology", "Stool"],
  ["test-calcium", "Serum Calcium", "Biochemistry", "Serum"],
  ["test-uric-acid", "Uric Acid", "Biochemistry", "Serum"],
  ["test-ra-factor", "Rheumatoid Factor", "Immunology", "Serum"],
  ["test-ana", "ANA Profile", "Immunology", "Serum"],
  ["test-allergy-panel", "Allergy Screening Panel", "Immunology", "Serum"],
  ["test-histopathology", "Histopathology Small Biopsy", "Pathology", "Tissue"],
  ["test-fnac", "FNAC Cytology", "Cytology", "Aspirate smear"],
  ["test-abg", "Arterial Blood Gas", "Critical Care", "Heparinized arterial blood"]
].map(([id, name, category, sampleType]) => ({ id, name, category, sampleType, status: "Active" }));

function demoDoctorEmail(name, specialtyName, index) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.+|\.+$/g, "")}.${specialtyName.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.+|\.+$/g, "")}${index + 1}@arogyacity.local`;
}

function buildDemoDoctors() {
  return demoSpecialties.flatMap((specialty, specialtyIndex) => {
    return Array.from({ length: 10 }, (_, doctorIndex) => {
      const isGoldenDoctor = specialty.id === "spec-general-medicine" && doctorIndex === 0;
      const name = isGoldenDoctor ? "Dr Ananya Rao" : `Dr ${doctorFirstNames[doctorIndex]} ${doctorLastNames[(doctorIndex + specialtyIndex) % doctorLastNames.length]}`;
      return {
        id: isGoldenDoctor ? "doc-ananya-rao" : `doc-${specialty.id.replace(/^spec-/, "")}-${String(doctorIndex + 1).padStart(2, "0")}`,
        name,
        loginEmail: isGoldenDoctor ? "ananya.rao@arogyacity.local" : demoDoctorEmail(name, specialty.name, doctorIndex),
        room: isGoldenDoctor ? "Room 108" : `OPD-${String(specialtyIndex + 1).padStart(2, "0")}${String(doctorIndex + 1).padStart(2, "0")}`,
        specialtyIds: [specialty.id],
        availableSlots: slotTemplates[(doctorIndex + specialtyIndex) % slotTemplates.length],
        qualification: doctorIndex % 3 === 0 ? "MBBS, MD" : doctorIndex % 3 === 1 ? "MBBS, DNB" : "MBBS, MS",
        experienceYears: 5 + ((doctorIndex + specialtyIndex) % 18),
        profile: `${specialty.name} consultant focused on ${specialty.description.toLowerCase()}`,
        status: "Active"
      };
    });
  });
}

function buildDemoUsers(doctors) {
  return [
    { id: "user-admin", name: "Application Admin", email: "admin@arogyacity.local", role: "ADMIN", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-reception", name: "Sunil Verma", email: "sunil.verma@arogyacity.local", role: "RECEPTIONIST", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-care", name: "Care Coordinator", email: "care@arogyacity.local", role: "CARE_COORDINATOR", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-ops", name: "Operations Manager", email: "ops@arogyacity.local", role: "OPERATIONS_MANAGER", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-lab-core", name: "Rajesh Kumar", email: "core.lab@arogyacity.local", role: "LAB_TECHNICIAN", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-lab-advanced", name: "Meera Lab Desk", email: "advanced.lab@arogyacity.local", role: "LAB_TECHNICIAN", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-pharmacy-opd", name: "Priyanka Shah", email: "opd.pharmacy@arogyacity.local", role: "PHARMACIST", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-pharmacy-ipd", name: "Naveen Pharmacy", email: "ipd.pharmacy@arogyacity.local", role: "PHARMACIST", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-cashier-opd", name: "OPD Cashier", email: "opd.cashier@arogyacity.local", role: "CASHIER", facilityIds: ["facility-jaipur"], status: "Active" },
    { id: "user-cashier-ipd", name: "IPD Cashier", email: "ipd.cashier@arogyacity.local", role: "CASHIER", facilityIds: ["facility-jaipur"], status: "Active" },
    ...doctors.map((doctor) => ({
      id: `user-${doctor.id}`,
      name: doctor.name.replace(/^Dr\s+/, ""),
      email: doctor.loginEmail,
      role: "DOCTOR",
      facilityIds: ["facility-jaipur"],
      status: "Active"
    }))
  ];
}

function goldenDemoState(request) {
  const visit = clone(seedVisit);
  const demoDoctors = buildDemoDoctors();
  visit.id = "AL-2026-1048";
  visit.tenantId = "tenant-arogya-city";
  visit.facilityId = "facility-jaipur";
  visit.activeStage = "kiosk";
  visit.patient = {
    id: "patient-meera-sharma",
    name: "Meera Sharma",
    age: 46,
    gender: "Female",
    visitId: "AL-2026-1048",
    hospital: "Arogya City Hospital, Jaipur",
    reason: "Persistent fatigue and dizziness",
    doctor: "Dr Ananya Rao",
    department: "General Medicine",
    appointment: "10:30 AM today",
    token: "B-14",
    status: "Arrived"
  };
  visit.intake = {
    ...visit.intake,
    status: "Not started",
    answers: [],
    recommendation: "",
    reviewedByStaff: false
  };
  visit.reception = {
    checkedIn: false,
    tokenPrinted: false,
    room: "Room 108",
    directions: "Proceed to Room 108 for Dr Ananya Rao after reception calls token B-14.",
    queue: []
  };
  visit.followUp.appointment = "Day 14 review with Dr Ananya Rao";
  visit.adminSetup = {
    ...visit.adminSetup,
    tenant: {
      id: "tenant-arogya-city",
      name: "Arogya City Hospital",
      deploymentType: "Single hospital",
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      currency: "INR"
    },
    facilities: [
      {
        id: "facility-jaipur",
        name: "Arogya City Hospital, Jaipur",
        city: "Jaipur",
        hospitalType: "General hospital",
        departments: [...demoSpecialties.map((specialty) => specialty.name), "Pathology", "Pharmacy", "Billing"],
        queuePrefix: "B",
        enabledModules: clone(config.stageOrder)
      }
    ],
    users: buildDemoUsers(demoDoctors),
    specialties: clone(demoSpecialties),
    doctors: demoDoctors,
    serviceUnits: {
      pathLabs: [
        { id: "lab-core-diagnostics", name: "Core Diagnostics Lab", location: "Ground Floor", testIds: demoLabTests.filter((test) => !["Molecular", "Cytology", "Pathology"].includes(test.category)).map((test) => test.id), status: "Active" },
        { id: "lab-advanced-reference", name: "Advanced Reference Lab", location: "Second Floor", testIds: demoLabTests.map((test) => test.id), status: "Active" }
      ],
      pharmacies: [
        { id: "pharmacy-opd", name: "OPD Pharmacy", location: "Ground Floor", status: "Active" },
        { id: "pharmacy-ipd", name: "Inpatient & Specialty Pharmacy", location: "First Floor", status: "Active" }
      ],
      cashiers: [
        { id: "cashier-opd", name: "OPD Cashier", location: "Ground Floor", status: "Active" },
        { id: "cashier-ipd", name: "IPD Billing Cashier", location: "First Floor", status: "Active" }
      ]
    },
    labTests: clone(demoLabTests),
    integrations: clone(seedVisit.adminSetup.integrations),
    goLiveChecklist: seedVisit.adminSetup.goLiveChecklist.map((item) => ({ ...item, complete: true }))
  };
  visit.journeyInstance = {
    id: "journey-AL-2026-1048",
    visitId: visit.id,
    workflowDefinitionId: "opd-golden-path-v1",
    status: "ARRIVED",
    currentStepCode: "ARRIVAL",
    startedAt: nowIso(),
    completedAt: "",
    version: 1
  };
  visit.journeySteps = initialJourneySteps(visit.journeyInstance.id);
  visit.journeyDomainEvents = [];
  visit.diagnosticOrders = [];
  visit.prescriptions = [];
  visit.invoices = [];
  visit.payments = [];
  audit(visit, request, "GOLDEN_DEMO_RESET", {}, { visitId: visit.id, patient: visit.patient.name }, { area: "golden-path" });
  return normalizeState(visit);
}

function runCommand(request, state, permission, action, mutator) {
  const role = requirePermission(request, permission);
  const key = request.headers["idempotency-key"];
  if (key && state.idempotency[key]) return state;

  const previous = mutator(state, role) || {};
  audit(state, request, action, previous.previous, previous.next, previous.metadata);
  if (key) state.idempotency[key] = { action, at: new Date().toISOString() };
  persist(state);
  return state;
}

async function handlePost(request, response, path) {
  const state = ensureState();
  const visitPath = path.replace(/^\/api\/visits\/[^/]+/, `/api/visits/${state.id}`);
  let body = {};
  try {
    body = await readBody(request);
  } catch {
    return json(response, 400, { error: "Invalid JSON payload" });
  }

  const command = async () => {
    if (path === "/api/public/patient-lookup") {
      const patientName = String(body.patientName || "").trim();
      const mobile = normalizedMobile(body.mobile);
      assertPatientIdentityInput({ name: patientName, mobile });
      const patient = findPatientRecord(state, patientName, mobile);
      return {
        publicResult: {
          found: Boolean(patient),
          patient: publicPatientRecord(state, patient),
          message: patient
            ? "Existing patient found. Select this patient to continue guided intake, or correct the name/mobile."
            : "No existing patient found for this name and mobile. Register this patient before guided intake."
        }
      };
    }

    if (path === "/api/public/register-patient") {
      const patientName = String(body.patientName || "").trim();
      const mobile = normalizedMobile(body.mobile);
      const gender = String(body.gender || "").trim();
      const age = Number(body.age || 0);
      assertPatientIdentityInput({ name: patientName, mobile, gender }, { requireGender: true });
      const existingPatient = findPatientRecord(state, patientName, mobile);
      if (existingPatient) {
        return {
          publicResult: {
            existing: true,
            patient: publicPatientRecord(state, existingPatient),
            message: "Existing patient found. Select the existing patient to continue, or change name/mobile if these details are incorrect."
          }
        };
      }
      const patient = {
        id: `patient-${Date.now()}`,
        identityKey: patientIdentityKey(patientName, mobile),
        name: patientName,
        mobile,
        age,
        gender,
        historySummary: "New patient record. No previous visit history is recorded in this hospital.",
        visits: [],
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.patients.unshift(patient);
      persist(state);
      return {
        publicResult: {
          existing: false,
          patient: publicPatientRecord(state, patient),
          message: "New patient registered. Continue to guided intake and triage."
        }
      };
    }

    if (path === "/api/public/find-doctors") {
      const symptoms = String(body.symptoms || "").trim();
      const patientName = String(body.patientName || "").trim();
      const mobile = normalizedMobile(body.mobile);
      const age = Number(body.age || 0);
      const gender = String(body.gender || "").trim();
      const language = String(body.language || "en").trim();
      assertPatientIdentityInput({ name: patientName, mobile });
      const existingPatient = findPatientRecord(state, patientName, mobile);
      if (!existingPatient) {
        return {
          publicResult: {
            specialty: "",
            explanation: "Register this patient before guided intake. Patient identity is required so history, reports and prescriptions can follow the visit.",
            doctors: [],
            existingPatient: false,
            requiresRegistration: true,
            historySummary: "",
            emergencyNotice: null
          }
        };
      }
      const patientHistory = patientHistoryForRecord(state, existingPatient);
      const historySummary = patientHistory.summary;
      const routingText = [
        symptoms,
        age ? `Age: ${age}` : "",
        (gender || existingPatient.gender) ? `Sex/Gender: ${gender || existingPatient.gender}` : "",
        language === "hi" ? "Patient language: Hindi" : "Patient language: English",
        historySummary ? `Prior hospital history summary: ${historySummary}` : ""
      ].filter(Boolean).join("\n");
      const routing = await routeSpecialty(state, routingText);
      let specialty = routing.specialty;
      let doctors = doctorsForSpecialty(state, specialty);
      const fallbackDoctors = generalMedicineDoctors(state);
      if (!doctors.length && fallbackDoctors.length) {
        specialty = generalMedicineSpecialty(state)?.name || specialty;
        doctors = fallbackDoctors;
        routing.source = `${routing.source}; General Medicine fallback for doctor availability`;
      }
      return {
        publicResult: {
          specialty,
          explanation: specialty
            ? `${routing.source} specialty routing. Final department confirmation is done by reception staff.`
            : "No specialties are configured yet. Ask the application admin to configure specialties and doctors before kiosk booking.",
          doctors,
          existingPatient: Boolean(existingPatient),
          patient: publicPatientRecord(state, existingPatient),
          history: patientHistory,
          historySummary,
          emergencyNotice: "If severe chest pain, stroke-like symptoms, heavy bleeding or severe breathing difficulty are present, contact hospital staff immediately."
        }
      };
    }

    if (path === "/api/public/book-appointment") {
      const symptoms = String(body.symptoms || "").trim();
      const mobile = normalizedMobile(body.mobile);
      const patientName = String(body.patientName || "").trim();
      const age = Number(body.age || 0);
      const gender = String(body.gender || "").trim();
      const language = String(body.language || "en").trim();
      assertPatientIdentityInput({ name: patientName, mobile });
      const registeredPatient = findPatientRecord(state, patientName, mobile);
      if (!registeredPatient) {
        const error = new Error("Register or select the patient before booking an appointment.");
        error.status = 409;
        throw error;
      }
      if (body.patientId && String(body.patientId) !== registeredPatient.id) {
        const error = new Error("Selected patient does not match the entered name and mobile number.");
        error.status = 409;
        throw error;
      }
      const specialty = String(body.specialty || (await routeSpecialty(state, symptoms)).specialty);
      const selectedDoctor = state.doctorDirectory.find((doctor) => doctor.id === body.doctorId) || doctorsForSpecialty(state, specialty)[0] || generalMedicineDoctors(state)[0];
      if (!patientName || !mobile || !symptoms) {
        const error = new Error("Patient name, mobile number and symptoms are required before booking.");
        error.status = 400;
        throw error;
      }
      if (!selectedDoctor) {
        const error = new Error("No active doctor slots are configured for this specialty.");
        error.status = 400;
        throw error;
      }
      const slot = String(body.slot || selectedDoctor.availableSlots[0] || "10:30 AM");
      const token = `${state.adminSetup.facilities[0]?.queuePrefix || "Q"}-${String(state.appointments.length + 1).padStart(3, "0")}`;
      const visitId = `AL-${Date.now()}`;
      const patientRecordResult = upsertPatientRecord(state, {
        name: patientName,
        mobile,
        age,
        gender,
        symptoms,
        visitId,
        department: selectedDoctor.specialty,
        doctor: selectedDoctor.name,
        appointment: `${slot} today`
      });
      const patientHistory = patientHistoryForRecord(state, patientRecordResult.patient);
      const appointment = {
        id: `appt-${Date.now()}`,
        visitId,
        patientId: patientRecordResult.patient.id,
        patientName,
        mobile,
        age,
        gender,
        symptoms,
        specialty: selectedDoctor.specialty,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        room: selectedDoctor.room,
        slot,
        status: "Confirmed appointment",
        existingPatient: patientRecordResult.existing,
        historySummary: patientHistory.summary,
        createdAt: new Date().toISOString()
      };
      const previous = { activeStage: state.activeStage, reason: state.patient.reason };
      saveCurrentVisitToStore(state);
      state.appointments.unshift(appointment);
      state.messages.unshift({
        id: `msg-${Date.now()}`,
        to: mobile,
        template: "APPOINTMENT_BOOKED",
        body: `ArogyaLoop: Appointment booked for ${patientName} with ${selectedDoctor.name}, ${selectedDoctor.specialty}, ${slot}, ${selectedDoctor.room}. Visit ${visitId}.`,
        status: "Queued",
        createdAt: new Date().toISOString()
      });
      state.id = visitId;
      state.patient.id = patientRecordResult.patient.id;
      state.patient.name = patientName;
      state.patient.age = age || patientRecordResult.patient.age || 0;
      state.patient.gender = gender || patientRecordResult.patient.gender || "";
      state.patient.reason = symptoms;
      state.patient.historySummary = patientHistory.summary;
      state.patient.department = selectedDoctor.specialty;
      state.patient.doctor = selectedDoctor.name;
      state.patient.appointment = `${slot} today`;
      state.patient.visitId = visitId;
      state.patient.hospital = state.adminSetup.facilities[0]?.name || "Configured hospital";
      state.patient.token = token;
      state.patient.status = "Confirmed appointment";
      state.reception = {
        ...state.reception,
        checkedIn: false,
        tokenPrinted: false,
        room: selectedDoctor.room,
        directions: `Proceed to ${selectedDoctor.room} for ${selectedDoctor.name}. Reception staff will call token ${state.patient.token} before sending the patient to the doctor.`
      };
      state.intake.status = "Appointment booked from kiosk";
      state.intake.recommendation = selectedDoctor.specialty;
      state.intake.reviewedByStaff = false;
      state.intake.answers = [
        { question: "What brings you to the hospital today?", hindi: "आज अस्पताल आने का मुख्य कारण?", answer: symptoms },
        { question: "Patient age and sex", hindi: "मरीज की उम्र और लिंग", answer: `${state.patient.age || "Not captured"} / ${state.patient.gender || "Not captured"}` },
        { question: "Preferred kiosk language", hindi: "कियोस्क भाषा", answer: language === "hi" ? "Hindi" : "English" },
        { question: "Prior hospital history summary", hindi: "पिछले इलाज का सारांश", answer: patientHistory.summary },
        { question: "Preferred doctor / appointment slot", hindi: "चयनित डॉक्टर / समय", answer: `${selectedDoctor.name}, ${slot}` },
        { question: "Mobile number for booking message", hindi: "मोबाइल नंबर", answer: mobile }
      ];
      state.consultation = {
        ...state.consultation,
        vitals: [],
        note: "",
        provisionalDiagnosis: "",
        advice: "",
        labRequests: [],
        pharmacyRequests: [],
        cbcOrdered: false,
        prescriptionQueued: false,
        priorHistorySummary: patientHistory.summary,
        priorReports: patientHistory.reports
      };
      state.pathology = {
        ...state.pathology,
        status: "Not ordered",
        requestedTests: [],
        selectedPathLabId: "",
        cbcRows: [],
        reportFile: null
      };
      state.pharmacy = {
        ...state.pharmacy,
        reviewCompleted: false,
        fulfilmentStatus: "Review pending",
        prescriptionLabel: "Prescription linked to visit; pharmacist review required before fulfilment.",
        selectedPharmacyId: "",
        prescriptionLines: []
      };
      state.billing = {
        ...state.billing,
        status: "Pending",
        paymentMode: null,
        lines: []
      };
      state.followUp = {
        ...state.followUp,
        scheduled: false,
        appointment: "",
        remindersOn: true
      };
      upsertQueueEntryForVisit(state, { status: "Routing review required" });
      state.activeStage = "reception";
      setJourneyStatus(state, "ROUTING_REVIEW_REQUIRED", request, "INTAKE_COMPLETED", { recommendation: selectedDoctor.specialty });
      audit(state, request, "PUBLIC_APPOINTMENT_BOOKED", previous, { appointmentId: appointment.id, doctor: selectedDoctor.name, specialty: selectedDoctor.specialty, slot }, { area: "public-kiosk" });
      persist(state);
      return { publicResult: { appointment, visit: decorateVisit(state) } };
    }

    if (path === "/api/public/scan-appointment") {
      const queueEntry = queueEntryForVisit(state);
      if (!queueEntry) {
        const error = new Error("No appointment exists to scan yet.");
        error.status = 404;
        throw error;
      }
      const previous = { queueStatus: queueEntry.status };
      queueEntry.status = "Arrived at kiosk";
      state.patient.status = "Queued";
      state.activeStage = "reception";
      setJourneyStatus(state, "CHECKIN_PENDING", request, "PATIENT_IDENTIFIED", { source: "appointment-scan" });
      audit(state, request, "PUBLIC_APPOINTMENT_SCANNED", previous, { queueStatus: queueEntry.status }, { area: "public-kiosk" });
      persist(state);
      return { publicResult: { visit: decorateVisit(state), message: "Appointment found. Patient added to reception arrival queue." } };
    }

    if (path === "/api/auth/login") {
      const email = String(body.email || "").toLowerCase();
      const user = state.adminSetup.users.find((item) => item.email.toLowerCase() === email && item.status === "Active");
      if (!user) {
        const error = new Error("No active user exists for this email");
        error.status = 401;
        throw error;
      }
      return { authUser: visibleUser(user) };
    }

    if (path === "/api/visits/select") {
      requirePermission(request, "visit:read");
      const visitId = String(body.visitId || "");
      switchActiveVisit(state, visitId);
      persist(state);
      return state;
    }

    if (path === "/api/admin/setup") {
      return runCommand(request, state, "admin:setup", "ADMIN_SETUP_UPDATED", (visit) => {
        const previous = clone(visit.adminSetup);
        const nextSetup = {
          ...visit.adminSetup,
          tenant: { ...visit.adminSetup.tenant, ...(body.tenant || {}) },
          facilities: body.facilities || visit.adminSetup.facilities,
          specialties: body.specialties || visit.adminSetup.specialties,
          doctors: body.doctors || visit.adminSetup.doctors,
          serviceUnits: body.serviceUnits || visit.adminSetup.serviceUnits,
          labTests: body.labTests || visit.adminSetup.labTests,
          integrations: {
            ...visit.adminSetup.integrations,
            ...(body.integrations || {}),
            openAiApiKey: body.integrations?.openAiApiKey === "********"
              ? visit.adminSetup.integrations.openAiApiKey
              : (body.integrations?.openAiApiKey ?? visit.adminSetup.integrations.openAiApiKey)
          },
          goLiveChecklist: body.goLiveChecklist || visit.adminSetup.goLiveChecklist
        };
        const hospitalIdentityChanged = setupIdentity(previous) !== setupIdentity(nextSetup);
        const clearOperationalData = hospitalIdentityChanged && (isDemoHospitalSetup(previous) || hasOperationalData(visit));
        if (clearOperationalData) {
          const previousOperational = {
            activeVisitId: visit.id,
            patient: visit.patient?.name || "",
            appointmentCount: (visit.appointments || []).length,
            messageCount: (visit.messages || []).length,
            storedVisitCount: Object.keys(visit.visitStore || {}).length
          };
          const fresh = blankStateForSetup(nextSetup);
          for (const key of Object.keys(visit)) delete visit[key];
          Object.assign(visit, fresh);
          return { previous, next: clone(visit.adminSetup), metadata: { area: "hospital-setup", operationalDataCleared: true, previousOperational } };
        }
        visit.adminSetup = nextSetup;
        normalizeState(visit);
        return { previous, next: clone(visit.adminSetup), metadata: { area: "hospital-setup", operationalDataCleared: false } };
      });
    }

    if (path === "/api/admin/users") {
      return runCommand(request, state, "admin:users", "ADMIN_USER_CREATED", (visit) => {
        const user = {
          id: `user-${Date.now()}`,
          name: String(body.name || "New user"),
          email: String(body.email || "new.user@hospital.local"),
          role: String(body.role || "RECEPTIONIST").toUpperCase(),
          facilityIds: body.facilityIds || [visit.facilityId],
          status: "Active"
        };
        const previous = { userCount: visit.adminSetup.users.length };
        visit.adminSetup.users.unshift(user);
        return { previous, next: user, metadata: { area: "user-management" } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/demo/select-doctor-finder`) {
      return runCommand(request, state, "demo:doctorFinder", "DEMO_DOCTOR_FINDER_SELECTED", (visit) => {
        const symptoms = String(body.symptoms || visit.patient.reason).trim();
        const duration = String(body.duration || "3 weeks").trim();
        const redFlags = String(body.redFlags || "No acute red-flag symptoms reported.").trim();
        const conditions = String(body.conditions || "No additional conditions entered.").trim();
        const previous = { activeStage: visit.activeStage, reason: visit.patient.reason, answers: visit.intake.answers };
        visit.patient.reason = symptoms;
        visit.intake.answers = [
          {
            question: "What brings you to the hospital today?",
            hindi: "आज अस्पताल आने का मुख्य कारण?",
            answer: symptoms
          },
          {
            question: "How long has this been happening?",
            hindi: "यह कब से हो रहा है?",
            answer: duration
          },
          {
            question: "Any chest pain, sudden numbness, severe breathing distress or emergency symptoms?",
            hindi: "सीने में दर्द, अचानक सुन्नपन या गंभीर सांस फूलना?",
            answer: redFlags,
            safe: !/chest|severe|faint|unconscious|stroke|bleeding/i.test(redFlags)
          },
          {
            question: "Any ongoing medicines or known conditions?",
            hindi: "कोई नियमित दवाइयाँ या पुरानी बीमारी?",
            answer: conditions
          }
        ];
        visit.intake.status = "Patient submitted";
        visit.intake.recommendation = fallbackSpecialty(visit, symptoms);
        visit.patient.department = visit.intake.recommendation;
        visit.patient.doctor = doctorsForSpecialty(visit, visit.intake.recommendation)[0]?.name || "";
        upsertQueueEntryForVisit(visit, { status: "Routing review required" });
        visit.activeStage = "intake";
        setJourneyStatus(visit, "ROUTING_REVIEW_REQUIRED", request, "INTAKE_COMPLETED", { recommendation: visit.intake.recommendation });
        return { previous, next: { activeStage: visit.activeStage, reason: visit.patient.reason, recommendation: visit.intake.recommendation, doctor: visit.patient.doctor } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/routing/recommend`) {
      const symptoms = String(body.symptoms || state.patient.reason || "").trim();
      const routingText = [
        symptoms,
        state.patient.age ? `Age: ${state.patient.age}` : "",
        state.patient.gender ? `Sex/Gender: ${state.patient.gender}` : "",
        state.patient.historySummary ? `Prior hospital history summary: ${state.patient.historySummary}` : ""
      ].filter(Boolean).join("\n");
      const routing = await routeSpecialty(state, routingText);
      return runCommand(request, state, "routing:review", "RECEPTION_ROUTING_RECOMMENDED", (visit) => {
        const previous = { recommendation: visit.intake.recommendation, department: visit.patient.department, doctor: visit.patient.doctor };
        const doctors = doctorsForSpecialty(visit, routing.specialty);
        const selectedDoctor = doctors[0] || generalMedicineDoctors(visit)[0];
        visit.patient.reason = symptoms || visit.patient.reason;
        visit.intake.recommendation = routing.specialty;
        visit.patient.department = selectedDoctor?.specialty || routing.specialty;
        visit.patient.doctor = selectedDoctor?.name || "";
        visit.reception.room = selectedDoctor?.room || visit.reception.room;
        visit.reception.directions = selectedDoctor
          ? `Proceed to ${selectedDoctor.room} for ${selectedDoctor.name}. Reception staff will call token ${visit.patient.token} before sending the patient to the doctor.`
          : "Reception supervisor must assign a doctor before check-in.";
        upsertQueueEntryForVisit(visit, { status: "Routing review required" });
        return { previous, next: { recommendation: visit.intake.recommendation, department: visit.patient.department, doctor: visit.patient.doctor }, metadata: { source: routing.source } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/intake/review`) {
      return runCommand(request, state, "routing:review", "ROUTING_APPROVED", (visit) => {
        const previous = { reviewedByStaff: visit.intake.reviewedByStaff, activeStage: visit.activeStage, department: visit.patient.department, doctor: visit.patient.doctor };
        const specialty = String(body.specialty || "").trim();
        const doctorId = String(body.doctorId || "").trim();
        if (!specialty || !doctorId) {
          const error = new Error("Reception must select both final specialty and final doctor before confirming the route.");
          error.status = 400;
          throw error;
        }
        const selectedDoctor = doctorId
          ? visit.doctorDirectory.find((doctor) => doctor.id === doctorId && (!specialty || doctor.specialty === specialty))
          : (specialty ? doctorsForSpecialty(visit, specialty)[0] : null);
        if (!selectedDoctor) {
          const error = new Error("Selected doctor is not mapped to the selected specialty.");
          error.status = 400;
          throw error;
        }
        if (specialty) {
          visit.intake.recommendation = specialty;
          visit.patient.department = selectedDoctor?.specialty || specialty;
        }
        if (selectedDoctor) {
          visit.patient.doctor = selectedDoctor.name;
          visit.reception.room = selectedDoctor.room;
          visit.reception.directions = `Proceed to ${selectedDoctor.room} for ${selectedDoctor.name}. Reception staff will call token ${visit.patient.token} before sending the patient to the doctor.`;
        }
        visit.intake.reviewedByStaff = true;
        visit.intake.status = "Staff reviewed";
        visit.activeStage = "reception";
        if (!visit.patient.visitId) visit.patient.visitId = visit.id;
        upsertQueueEntryForVisit(visit, { status: "Check-in pending" });
        setJourneyStatus(visit, "CHECKIN_PENDING", request, "ROUTING_APPROVED", { recommendation: visit.intake.recommendation, department: visit.patient.department });
        return { previous, next: { reviewedByStaff: true, activeStage: visit.activeStage, recommendation: visit.intake.recommendation, doctor: visit.patient.doctor } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/check-in`) {
      return runCommand(request, state, "visit:checkIn", "PATIENT_CHECKED_IN", (visit) => {
        const activeQueueEntry = queueEntryForVisit(visit);
        const previous = { checkedIn: visit.reception.checkedIn, queueStatus: activeQueueEntry?.status };
        if (!visit.patient.name || !visit.patient.department) {
          const error = new Error("Patient identity and routing must be completed before check-in.");
          error.status = 409;
          throw error;
        }
        if (!visit.patient.token) visit.patient.token = `${visit.adminSetup.facilities[0]?.queuePrefix || "B"}-14`;
        visit.reception.checkedIn = true;
        visit.reception.tokenPrinted = true;
        upsertQueueEntryForVisit(visit, { status: "Waiting for consultation" });
        visit.activeStage = "doctor";
        if (visit.journeyInstance.status !== "WAITING_FOR_CONSULTATION") {
          setJourneyStatus(visit, "WAITING_FOR_CONSULTATION", request, "PATIENT_CHECKED_IN", { token: visit.patient.token, room: visit.reception.room });
        }
        return { previous, next: { checkedIn: true, token: visit.patient.token, activeStage: visit.activeStage } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/start-consultation`) {
      assertDoctorCanAccessVisit(state, request);
      return runCommand(request, state, "consultation:start", "CONSULTATION_STARTED", (visit) => {
        if (!["WAITING_FOR_CONSULTATION", "CHECKED_IN"].includes(visit.journeyInstance.status)) {
          const error = new Error("Consultation can start only after the patient is checked in and waiting.");
          error.status = 409;
          throw error;
        }
        const previous = { journeyStatus: visit.journeyInstance.status };
        upsertQueueEntryForVisit(visit, { status: "Consultation in progress" });
        visit.activeStage = "doctor";
        setJourneyStatus(visit, "CONSULTATION_IN_PROGRESS", request, "CONSULTATION_STARTED", { doctor: visit.patient.doctor });
        return { previous, next: { journeyStatus: visit.journeyInstance.status } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/consultation/save-note`) {
      assertDoctorCanAccessVisit(state, request);
      return runCommand(request, state, "consultation:order", "CONSULTATION_NOTE_SAVED", (visit) => {
        const previous = {
          note: visit.consultation.note,
          provisionalDiagnosis: visit.consultation.provisionalDiagnosis,
          advice: visit.consultation.advice
        };
        visit.consultation.note = String(body.note || "");
        visit.consultation.provisionalDiagnosis = String(body.provisionalDiagnosis || "");
        visit.consultation.advice = String(body.advice || "");
        if (!["WAITING_FOR_CONSULTATION", "CONSULTATION_IN_PROGRESS", "WAITING_FOR_DOCTOR_REVIEW"].includes(visit.journeyInstance.status)) {
          setJourneyStatus(visit, "CONSULTATION_IN_PROGRESS", request, "CONSULTATION_NOTE_SAVED", { draft: true });
        }
        return { previous, next: { note: visit.consultation.note, provisionalDiagnosis: visit.consultation.provisionalDiagnosis, advice: visit.consultation.advice } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/consultation/lab-request`) {
      assertDoctorCanAccessVisit(state, request);
      return runCommand(request, state, "consultation:order", "LAB_REQUEST_SENT", (visit) => {
        const selectedTestIds = Array.isArray(body.testIds) ? body.testIds : [];
        const selectedPathLabId = String(body.pathLabId || "");
        const tests = visit.adminSetup.labTests.filter((test) => selectedTestIds.includes(test.id));
        if (!tests.length) {
          const error = new Error("Select at least one lab test before sending a pathlab request.");
          error.status = 400;
          throw error;
        }
        if (!selectedPathLabId) {
          const error = new Error("Select a pathlab before sending the lab request.");
          error.status = 400;
          throw error;
        }
        const previous = { labRequests: visit.consultation.labRequests, pathologyStatus: visit.pathology.status };
        const requestRecord = {
          id: `labreq-${Date.now()}`,
          visitId: visit.id,
          patientId: visit.patient.id,
          pathLabId: selectedPathLabId,
          tests,
          status: "SENT_TO_LAB",
          requestedAt: new Date().toISOString()
        };
        visit.consultation.labRequests.unshift(requestRecord);
        visit.diagnosticOrders.unshift(requestRecord);
        visit.consultation.cbcOrdered = true;
        visit.pathology.selectedPathLabId = selectedPathLabId;
        visit.pathology.requestedTests = tests;
        visit.pathology.status = "Requested";
        visit.pathology.reportFile = null;
        upsertQueueEntryForVisit(visit, { status: "Diagnostic ordered" });
        visit.activeStage = "pathology";
        setJourneyStatus(visit, "WAITING_FOR_SAMPLE", request, "DIAGNOSTIC_ORDER_CREATED", { diagnosticOrderId: requestRecord.id, tests: tests.map((test) => test.name) });
        return { previous, next: { labRequestId: requestRecord.id, status: visit.pathology.status, activeStage: visit.activeStage } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/consultation/pharmacy-request`) {
      assertDoctorCanAccessVisit(state, request);
      return runCommand(request, state, "consultation:order", "PHARMACY_REQUEST_SENT", (visit) => {
        const selectedPharmacyId = String(body.pharmacyId || "");
        const lines = Array.isArray(body.prescriptionLines)
          ? body.prescriptionLines.map((line) => String(line).trim()).filter(Boolean)
          : String(body.prescriptionLines || "").split("\n").map((line) => line.trim()).filter(Boolean);
        if (!selectedPharmacyId) {
          const error = new Error("Select a pharmacy before sending the prescription.");
          error.status = 400;
          throw error;
        }
        if (!lines.length) {
          const error = new Error("Enter at least one prescription line before sending to pharmacy.");
          error.status = 400;
          throw error;
        }
        const previous = { pharmacyRequests: visit.consultation.pharmacyRequests, fulfilmentStatus: visit.pharmacy.fulfilmentStatus };
        const requestRecord = {
          id: `rx-${Date.now()}`,
          visitId: visit.id,
          patientId: visit.patient.id,
          pharmacyId: selectedPharmacyId,
          lines,
          status: "FINAL",
          requestedAt: new Date().toISOString()
        };
        visit.consultation.pharmacyRequests.unshift(requestRecord);
        visit.prescriptions.unshift(requestRecord);
        visit.consultation.prescriptionQueued = true;
        visit.pharmacy.selectedPharmacyId = selectedPharmacyId;
        visit.pharmacy.prescriptionLines = lines;
        visit.pharmacy.prescriptionLabel = `${lines.length} prescription line(s) sent for pharmacist review.`;
        visit.pharmacy.fulfilmentStatus = "Awaiting pharmacist review";
        upsertQueueEntryForVisit(visit, { status: "Consultation complete" });
        visit.activeStage = "pharmacy";
        setJourneyStatus(visit, "PHARMACIST_REVIEW_REQUIRED", request, "PRESCRIPTION_FINALIZED", { prescriptionId: requestRecord.id, lineCount: lines.length });
        return { previous, next: { pharmacyRequestId: requestRecord.id, fulfilmentStatus: visit.pharmacy.fulfilmentStatus } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/consultation/confirm-orders`) {
      assertDoctorCanAccessVisit(state, request);
      return runCommand(request, state, "consultation:order", "CONSULTATION_ORDERS_CONFIRMED", (visit) => {
        const previous = { cbcOrdered: visit.consultation.cbcOrdered, prescriptionQueued: visit.consultation.prescriptionQueued };
        if (!visit.consultation.labRequests.length) {
          const error = new Error("Create a diagnostic order before confirming downstream pathology work.");
          error.status = 409;
          throw error;
        }
        visit.activeStage = "pathology";
        if (body.note) visit.consultation.note = String(body.note);
        return { previous, next: { cbcOrdered: true, prescriptionQueued: true, activeStage: visit.activeStage } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/pathology/status`) {
      return runCommand(request, state, "pathology:update", "PATHOLOGY_STATUS_UPDATED", (visit) => {
        const requestedStatus = String(body.status || "");
        if (!config.pathologyStatuses.includes(requestedStatus)) {
          const error = new Error("Unsupported pathology status");
          error.status = 400;
          throw error;
        }
        const previous = { status: visit.pathology.status };
        const reportName = String(body.reportName || "").trim();
        const reportContent = String(body.reportContent || "").trim();
        if (reportName || reportContent) {
          visit.pathology.reportFile = {
            name: reportName || `diagnostic-report-${visit.patient.token || visit.id}.txt`,
            uploadedAt: nowIso(),
            content: reportContent || "Report file uploaded by pathlab."
          };
        }
        if (requestedStatus === "Report ready" && !visit.pathology.reportFile) {
          const error = new Error("Upload the diagnostic report before marking it ready for doctor review.");
          error.status = 409;
          throw error;
        }
        visit.pathology.status = requestedStatus;
        if (requestedStatus === "Sample collection pending") setJourneyStatus(visit, "WAITING_FOR_SAMPLE", request, "DIAGNOSTIC_ORDER_CREATED", { diagnosticOrderId: visit.consultation.labRequests[0]?.id });
        if (requestedStatus === "Sample collected") setJourneyStatus(visit, "SAMPLE_COLLECTED", request, "SAMPLE_COLLECTED", { sampleType: visit.pathology.requestedTests[0]?.sampleType || "Sample" });
        if (requestedStatus === "Processing") setJourneyStatus(visit, "DIAGNOSTIC_PROCESSING", request, "DIAGNOSTIC_PROCESSING_STARTED", {});
        if (requestedStatus === "Awaiting authorization") setJourneyStatus(visit, "DIAGNOSTIC_REPORT_REVIEW", request, "DIAGNOSTIC_RESULT_ENTERED", {});
        if (requestedStatus === "Report ready") {
          if (!visit.pathology.cbcRows.length) {
            visit.pathology.cbcRows = [
              { parameter: "Hemoglobin", value: "10.2", unit: "g/dL", interval: "12.0-15.0", flag: "Low" },
              { parameter: "RBC count", value: "3.8", unit: "mill/cumm", interval: "4.2-5.4", flag: "Low" },
              { parameter: "MCV", value: "76", unit: "fL", interval: "80-96", flag: "Low" },
              { parameter: "WBC count", value: "7,400", unit: "/cumm", interval: "4,000-11,000", flag: "Normal" }
            ];
          }
          visit.activeStage = "doctor";
          setJourneyStatus(visit, "WAITING_FOR_DOCTOR_REVIEW", request, "DIAGNOSTIC_REPORT_READY", { reportStatus: "Authorized" });
        }
        if (requestedStatus === "Reviewed") setJourneyStatus(visit, "WAITING_FOR_DOCTOR_REVIEW", request, "DIAGNOSTIC_REPORT_VIEWED", {});
        return { previous, next: { status: visit.pathology.status, activeStage: visit.activeStage } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/diagnostics/review-report`) {
      assertDoctorCanAccessVisit(state, request);
      return runCommand(request, state, "consultation:reviewReport", "DIAGNOSTIC_REPORT_REVIEWED", (visit) => {
        if (!["WAITING_FOR_DOCTOR_REVIEW", "DIAGNOSTIC_REPORT_READY"].includes(visit.journeyInstance.status)) {
          const error = new Error("No diagnostic report is waiting for doctor review.");
          error.status = 409;
          throw error;
        }
        const previous = { journeyStatus: visit.journeyInstance.status, pathologyStatus: visit.pathology.status };
        visit.pathology.status = "Reviewed";
        visit.activeStage = "doctor";
        setJourneyStatus(visit, "WAITING_FOR_DOCTOR_REVIEW", request, "DIAGNOSTIC_REPORT_REVIEWED", { reviewedBy: visit.patient.doctor });
        return { previous, next: { pathologyStatus: visit.pathology.status } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/pharmacy/review`) {
      return runCommand(request, state, "pharmacy:review", "PHARMACY_REVIEW_COMPLETED", (visit) => {
        if (!visit.pharmacy.prescriptionLines.length) {
          const error = new Error("No finalized prescription is available for pharmacist review.");
          error.status = 409;
          throw error;
        }
        const previous = { reviewCompleted: visit.pharmacy.reviewCompleted };
        visit.pharmacy.reviewCompleted = true;
        visit.pharmacy.fulfilmentStatus = "Medication ready";
        setJourneyStatus(visit, "MEDICATION_READY", request, "PHARMACY_APPROVED", { pharmacyId: visit.pharmacy.selectedPharmacyId });
        return { previous, next: { reviewCompleted: true, fulfilmentStatus: visit.pharmacy.fulfilmentStatus } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/pharmacy/dispense`) {
      return runCommand(request, state, "pharmacy:dispense", "MEDICATION_DISPENSED", (visit) => {
        if (!visit.pharmacy.reviewCompleted) {
          const error = new Error("Pharmacist approval is required before dispensing.");
          error.status = 409;
          throw error;
        }
        const previous = { fulfilmentStatus: visit.pharmacy.fulfilmentStatus };
        visit.pharmacy.fulfilmentStatus = "Dispensed";
        if (!visit.billing.lines.length) {
          visit.billing.lines = [
            { label: "Consultation", detail: visit.patient.doctor || "OPD consultation", amountMinor: 60000 },
            { label: visit.pathology.requestedTests[0]?.name || "Diagnostic service", detail: "Configured tariff", amountMinor: visit.pathology.requestedTests.length ? 45000 : 0 },
            { label: "Medication", detail: "Hospital pharmacy items", amountMinor: visit.pharmacy.prescriptionLines.length ? 29000 : 0 }
          ].filter((line) => line.amountMinor > 0);
        }
        visit.activeStage = "pharmacy";
        setJourneyStatus(visit, "BILLING_PENDING", request, "MEDICATION_DISPENSED", { lineCount: visit.pharmacy.prescriptionLines.length });
        return { previous, next: { fulfilmentStatus: visit.pharmacy.fulfilmentStatus, billingLines: visit.billing.lines.length } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/billing/invoice`) {
      return runCommand(request, state, "billing:invoice", "INVOICE_CREATED", (visit) => {
        if (!visit.billing.lines.length) {
          const error = new Error("No billable items are available for invoice generation.");
          error.status = 409;
          throw error;
        }
        const previous = { status: visit.billing.status, invoiceCount: visit.invoices.length };
        const invoice = {
          id: `invoice-${Date.now()}`,
          visitId: visit.id,
          patientId: visit.patient.id,
          lines: clone(visit.billing.lines),
          status: "PAYMENT_PENDING",
          currency: visit.adminSetup.tenant.currency || config.currency,
          createdAt: nowIso()
        };
        visit.invoices.unshift(invoice);
        visit.billing.status = "Payment pending";
        setJourneyStatus(visit, "PAYMENT_PENDING", request, "INVOICE_CREATED", { invoiceId: invoice.id });
        return { previous, next: { invoiceId: invoice.id, status: visit.billing.status } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/payment/record`) {
      return runCommand(request, state, "payment:record", "PAYMENT_RECORDED", (visit) => {
        if (!["PAYMENT_PENDING", "INVOICE_CREATED"].includes(visit.journeyInstance.status) && visit.billing.status !== "Payment pending") {
          const error = new Error("Invoice must be generated before payment can be recorded.");
          error.status = 409;
          throw error;
        }
        const previous = { status: visit.billing.status, paymentMode: visit.billing.paymentMode };
        const payment = {
          id: `payment-${Date.now()}`,
          visitId: visit.id,
          patientId: visit.patient.id,
          mode: body.paymentMode || "UPI",
          status: "SUCCESS",
          amountMinor: visit.billing.lines.reduce((sum, line) => sum + line.amountMinor, 0),
          createdAt: nowIso()
        };
        visit.payments.unshift(payment);
        visit.billing.status = "Paid";
        visit.billing.paymentMode = payment.mode;
        visit.activeStage = "patient";
        setJourneyStatus(visit, "FOLLOWUP_DECISION_PENDING", request, "PAYMENT_COMPLETED", { paymentId: payment.id, mode: payment.mode });
        return { previous, next: { status: visit.billing.status, paymentMode: visit.billing.paymentMode, activeStage: visit.activeStage } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/follow-up/schedule`) {
      return runCommand(request, state, "followup:schedule", "FOLLOW_UP_SCHEDULED", (visit) => {
        const previous = { scheduled: visit.followUp.scheduled, remindersOn: visit.followUp.remindersOn };
        visit.followUp.scheduled = true;
        visit.followUp.remindersOn = body.remindersOn ?? true;
        visit.followUp.appointment = visit.followUp.appointment || "Day 14 review with doctor";
        visit.activeStage = "operations";
        setJourneyStatus(visit, "VISIT_COMPLETION_PENDING", request, "FOLLOWUP_SCHEDULED", { appointment: visit.followUp.appointment, remindersOn: visit.followUp.remindersOn });
        return { previous, next: { scheduled: true, remindersOn: visit.followUp.remindersOn, activeStage: visit.activeStage } };
      });
    }

    if (visitPath === `/api/visits/${state.id}/complete`) {
      return runCommand(request, state, "visit:complete", "VISIT_COMPLETED", (visit) => {
        if (!visit.followUp.scheduled) {
          const error = new Error("Record the follow-up decision before completing the visit.");
          error.status = 409;
          throw error;
        }
        const previous = { journeyStatus: visit.journeyInstance.status };
        visit.activeStage = "operations";
        setJourneyStatus(visit, "VISIT_COMPLETED", request, "VISIT_COMPLETED", { completedBy: roleFor(request) });
        return { previous, next: { journeyStatus: visit.journeyInstance.status } };
      });
    }

    if (path === "/api/demo/advance") {
      return runCommand(request, state, "demo:advance", "DEMO_NEXT_STEP_ADVANCED", (visit) => {
        const previous = { journeyStatus: visit.journeyInstance.status, activeStage: visit.activeStage };
        const status = visit.journeyInstance.status;
        const firstLab = visit.adminSetup.serviceUnits.pathLabs[0];
        const firstTest = visit.adminSetup.labTests[0];
        const firstPharmacy = visit.adminSetup.serviceUnits.pharmacies[0];
        if (status === "ARRIVED") {
          visit.intake.answers = [
            { question: "What brings you to the hospital today?", hindi: "आज अस्पताल आने का मुख्य कारण?", answer: visit.patient.reason },
            { question: "How long has this been happening?", hindi: "यह कब से हो रहा है?", answer: "3 weeks" },
            { question: "Any emergency symptoms?", hindi: "कोई आपातकालीन लक्षण?", answer: "No chest pain, sudden weakness, severe breathlessness or fainting.", safe: true },
            { question: "Known condition?", hindi: "कोई पुरानी बीमारी?", answer: "Known thyroid history; routine OPD review requested." }
          ];
          visit.intake.status = "Completed";
          visit.intake.recommendation = "General Medicine";
          visit.activeStage = "intake";
          setJourneyStatus(visit, "ROUTING_REVIEW_REQUIRED", request, "INTAKE_COMPLETED", { recommendation: visit.intake.recommendation });
        } else if (status === "ROUTING_REVIEW_REQUIRED") {
          visit.intake.reviewedByStaff = true;
          visit.intake.status = "Staff reviewed";
          upsertQueueEntryForVisit(visit, { status: "Check-in pending" });
          visit.activeStage = "reception";
          setJourneyStatus(visit, "CHECKIN_PENDING", request, "ROUTING_APPROVED", { department: visit.patient.department });
        } else if (status === "CHECKIN_PENDING") {
          visit.reception.checkedIn = true;
          visit.reception.tokenPrinted = true;
          upsertQueueEntryForVisit(visit, { status: "Waiting for consultation" });
          visit.activeStage = "doctor";
          setJourneyStatus(visit, "WAITING_FOR_CONSULTATION", request, "PATIENT_CHECKED_IN", { token: visit.patient.token });
        } else if (status === "WAITING_FOR_CONSULTATION") {
          visit.consultation.note = visit.consultation.note || "Patient reports persistent fatigue and dizziness. No emergency warning symptoms reported at intake.";
          upsertQueueEntryForVisit(visit, { status: "Consultation in progress" });
          setJourneyStatus(visit, "CONSULTATION_IN_PROGRESS", request, "CONSULTATION_STARTED", { doctor: visit.patient.doctor });
        } else if (status === "CONSULTATION_IN_PROGRESS") {
          if (!firstLab || !firstTest) {
            const error = new Error("Configure at least one pathlab and lab test before diagnostic ordering.");
            error.status = 409;
            throw error;
          }
          const requestRecord = {
            id: `labreq-${Date.now()}`,
            visitId: visit.id,
            patientId: visit.patient.id,
            pathLabId: firstLab.id,
            tests: [firstTest],
            status: "SENT_TO_LAB",
            requestedAt: nowIso()
          };
          visit.consultation.labRequests.unshift(requestRecord);
          visit.diagnosticOrders.unshift(requestRecord);
          visit.pathology.selectedPathLabId = firstLab.id;
          visit.pathology.requestedTests = [firstTest];
          visit.pathology.status = "Requested";
          visit.activeStage = "pathology";
          setJourneyStatus(visit, "WAITING_FOR_SAMPLE", request, "DIAGNOSTIC_ORDER_CREATED", { diagnosticOrderId: requestRecord.id });
        } else if (status === "WAITING_FOR_SAMPLE") {
          visit.pathology.status = "Sample collected";
          setJourneyStatus(visit, "SAMPLE_COLLECTED", request, "SAMPLE_COLLECTED", { sampleType: firstTest?.sampleType || "EDTA whole blood" });
        } else if (status === "SAMPLE_COLLECTED") {
          visit.pathology.status = "Processing";
          setJourneyStatus(visit, "DIAGNOSTIC_PROCESSING", request, "DIAGNOSTIC_PROCESSING_STARTED", {});
        } else if (status === "DIAGNOSTIC_PROCESSING") {
          visit.pathology.status = "Awaiting authorization";
          setJourneyStatus(visit, "DIAGNOSTIC_REPORT_REVIEW", request, "DIAGNOSTIC_RESULT_ENTERED", {});
        } else if (status === "DIAGNOSTIC_REPORT_REVIEW") {
          visit.pathology.status = "Report ready";
          visit.pathology.cbcRows = [
            { parameter: "Hemoglobin", value: "10.2", unit: "g/dL", interval: "12.0-15.0", flag: "Low" },
            { parameter: "RBC count", value: "3.8", unit: "mill/cumm", interval: "4.2-5.4", flag: "Low" },
            { parameter: "MCV", value: "76", unit: "fL", interval: "80-96", flag: "Low" },
            { parameter: "WBC count", value: "7,400", unit: "/cumm", interval: "4,000-11,000", flag: "Normal" }
          ];
          visit.activeStage = "doctor";
          setJourneyStatus(visit, "WAITING_FOR_DOCTOR_REVIEW", request, "DIAGNOSTIC_REPORT_READY", {});
        } else if (status === "WAITING_FOR_DOCTOR_REVIEW") {
          if (!firstPharmacy) {
            const error = new Error("Configure at least one pharmacy before finalizing prescription.");
            error.status = 409;
            throw error;
          }
          visit.pathology.status = "Reviewed";
          const rx = {
            id: `rx-${Date.now()}`,
            visitId: visit.id,
            patientId: visit.patient.id,
            pharmacyId: firstPharmacy.id,
            lines: ["Ferrous ascorbate + folic acid - as prescribed by doctor", "B-complex - as prescribed by doctor"],
            status: "FINAL",
            requestedAt: nowIso()
          };
          visit.consultation.pharmacyRequests.unshift(rx);
          visit.prescriptions.unshift(rx);
          visit.pharmacy.selectedPharmacyId = firstPharmacy.id;
          visit.pharmacy.prescriptionLines = rx.lines;
          visit.pharmacy.prescriptionLabel = `${rx.lines.length} prescription line(s) sent for pharmacist review.`;
          visit.pharmacy.fulfilmentStatus = "Awaiting pharmacist review";
          visit.activeStage = "pharmacy";
          setJourneyStatus(visit, "PHARMACIST_REVIEW_REQUIRED", request, "PRESCRIPTION_FINALIZED", { prescriptionId: rx.id });
        } else if (status === "PHARMACIST_REVIEW_REQUIRED") {
          visit.pharmacy.reviewCompleted = true;
          visit.pharmacy.fulfilmentStatus = "Medication ready";
          setJourneyStatus(visit, "MEDICATION_READY", request, "PHARMACY_APPROVED", {});
        } else if (status === "MEDICATION_READY") {
          visit.pharmacy.fulfilmentStatus = "Dispensed";
          visit.billing.lines = [
            { label: "Consultation", detail: "Dr Ananya Rao OPD consultation", amountMinor: 60000 },
            { label: "Complete Blood Count (CBC)", detail: "Arogya Pathology Lab", amountMinor: 45000 },
            { label: "Medication", detail: "OPD Pharmacy", amountMinor: 29000 }
          ];
          setJourneyStatus(visit, "BILLING_PENDING", request, "MEDICATION_DISPENSED", {});
        } else if (status === "BILLING_PENDING") {
          const invoice = { id: `invoice-${Date.now()}`, visitId: visit.id, patientId: visit.patient.id, lines: clone(visit.billing.lines), status: "PAYMENT_PENDING", currency: "INR", createdAt: nowIso() };
          visit.invoices.unshift(invoice);
          visit.billing.status = "Payment pending";
          setJourneyStatus(visit, "PAYMENT_PENDING", request, "INVOICE_CREATED", { invoiceId: invoice.id });
        } else if (status === "PAYMENT_PENDING") {
          const payment = { id: `payment-${Date.now()}`, visitId: visit.id, patientId: visit.patient.id, mode: "UPI", status: "SUCCESS", amountMinor: visit.billing.lines.reduce((sum, line) => sum + line.amountMinor, 0), createdAt: nowIso() };
          visit.payments.unshift(payment);
          visit.billing.status = "Paid";
          visit.billing.paymentMode = "UPI";
          visit.activeStage = "patient";
          setJourneyStatus(visit, "FOLLOWUP_DECISION_PENDING", request, "PAYMENT_COMPLETED", { paymentId: payment.id });
        } else if (status === "FOLLOWUP_DECISION_PENDING") {
          visit.followUp.scheduled = true;
          visit.followUp.appointment = visit.followUp.appointment || "Day 14 review with Dr Ananya Rao";
          visit.activeStage = "operations";
          setJourneyStatus(visit, "VISIT_COMPLETION_PENDING", request, "FOLLOWUP_SCHEDULED", { appointment: visit.followUp.appointment });
        } else if (status === "VISIT_COMPLETION_PENDING") {
          visit.activeStage = "operations";
          setJourneyStatus(visit, "VISIT_COMPLETED", request, "VISIT_COMPLETED", {});
        }
        return { previous, next: { journeyStatus: visit.journeyInstance.status, activeStage: visit.activeStage } };
      });
    }

    if (path === "/api/demo/reset") {
      requirePermission(request, "demo:reset");
      const normalized = goldenDemoState(request);
      persist(normalized);
      return normalized;
    }

    const error = new Error("Not found");
    error.status = 404;
    throw error;
  };

  try {
    const result = await command();
    if (result?.authUser) return json(response, 200, { user: result.authUser, permissions: config.permissions[result.authUser.role] || [] });
    if (result?.publicResult) return json(response, 200, result.publicResult);
    return json(response, 200, { visit: filterWorklistsForRequest(decorateVisit(result), result, request) });
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || "Command failed" });
  }
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Role,X-User-Email,X-Correlation-Id,Idempotency-Key");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && ["/health/live", "/health/ready", "/api/health"].includes(path)) {
    return json(response, 200, { ok: true, service: "arogyaloop-backend", storage: "json-file-dev", timestamp: new Date().toISOString() });
  }

  if (request.method === "GET" && path === "/api/context") {
    return json(response, 200, {
      tenantId: seedVisit.tenantId,
      facilityId: config.facilityId,
      currentRole: roleFor(request),
      roles: Object.keys(config.permissions),
      permissions: config.permissions,
      demoMode: false
    });
  }

  if (request.method === "GET" && path === "/api/config") {
    return json(response, 200, config);
  }

  const state = ensureState();
  if (request.method === "GET" && path === "/api/public/kiosk") {
    return json(response, 200, {
      hospitalName: state.adminSetup.facilities[0]?.name || "Hospital setup pending",
      doctors: state.doctorDirectory,
      visit: decorateVisit(state)
    });
  }

  if (request.method === "GET" && path === "/api/auth/users") {
    return json(response, 200, {
      users: state.adminSetup.users.filter((user) => user.status === "Active").map(visibleUser),
      demoMode: false
    });
  }

  if (request.method === "GET" && path === "/api/admin/setup") {
    try {
      requirePermission(request, "admin:setup");
      return json(response, 200, {
        setup: visibleSetup(state.adminSetup),
        permissions: config.permissions,
        availableRoles: Object.keys(config.permissions),
        availableModules: config.stages.map((stage) => ({ id: stage.id, label: stage.label, owner: stage.owner }))
      });
    } catch (error) {
      return json(response, error.status || 500, { error: error.message });
    }
  }

  if (request.method === "GET" && (/^\/api\/visits\/[^/]+$/.test(path) || path === `/api/visit/${state.id}` || path === "/api/visit/current")) {
    try {
      requirePermission(request, "visit:read");
      if (roleFor(request) === "DOCTOR" && !doctorCanAccessVisit(state, request)) {
        return json(response, 200, { visit: filterWorklistsForRequest(redactedVisitForDoctor(state), state, request) });
      }
      return json(response, 200, { visit: filterWorklistsForRequest(decorateVisit(state), state, request) });
    } catch (error) {
      return json(response, error.status || 500, { error: error.message });
    }
  }

  if (request.method === "POST") {
    return handlePost(request, response, path);
  }

  return json(response, 404, { error: "Not found" });
});

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`ArogyaLoop backend API listening on http://127.0.0.1:${port}`);
});
