import { useEffect, useMemo, useRef, useState } from "react";
import { bookPublicAppointment, commands, createHospitalUser, findDoctors, listLoginUsers, loadAdminSetup, loadConfig, loadPublicKiosk, loadVisit, loginWithEmail, lookupPublicPatient, registerPublicPatient, saveAdminSetup, scanPublicAppointment } from "./api/client";
import { AppShell } from "./components/AppShell";
import { Card } from "./components/Card";
import { Icon } from "./components/Icon";
import { StatusChip } from "./components/StatusChip";
import { QueueRail } from "./components/QueueRail";
import type { AdminSetupResponse, AppConfig, AuthSession, DoctorAvailability, HospitalUser, PathologyStatus, PublicKioskState, PublicPatientRecord, Role, StageId, Visit } from "./types";

const SESSION_KEY = "arogyaloop-demo-session";

const roleStages: Record<Role, StageId[]> = {
  PATIENT: ["kiosk", "patient"],
  RECEPTIONIST: ["reception"],
  DOCTOR: ["doctor"],
  LAB_TECHNICIAN: ["pathology"],
  PHARMACIST: ["pharmacy"],
  CASHIER: ["pharmacy"],
  CARE_COORDINATOR: ["patient"],
  OPERATIONS_MANAGER: ["operations"],
  ADMIN: ["kiosk", "intake", "reception", "doctor", "pathology", "pharmacy", "patient", "operations"]
};

function formatInrMinor(amountMinor: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amountMinor / 100);
}

function stagesForRole(role: Role, config: AppConfig) {
  return config.stageOrder.filter((stageId) => roleStages[role].includes(stageId));
}

function filterConfigForRole(config: AppConfig, role: Role): AppConfig {
  const allowed = new Set(stagesForRole(role, config));
  return {
    ...config,
    stageOrder: config.stageOrder.filter((stageId) => allowed.has(stageId)),
    stages: config.stages.filter((stage) => allowed.has(stage.id))
  };
}

function workspaceStageForRole(role: Role, visit: Visit, config: AppConfig): StageId {
  if (role === "ADMIN") return config.stageOrder.includes(visit.activeStage) ? visit.activeStage : "operations";
  if (role === "RECEPTIONIST") return "reception";
  if (role === "DOCTOR") return "doctor";
  if (role === "LAB_TECHNICIAN") return "pathology";
  if (role === "PHARMACIST" || role === "CASHIER") return "pharmacy";
  if (role === "CARE_COORDINATOR" || role === "PATIENT") return "patient";
  if (role === "OPERATIONS_MANAGER") return "operations";
  return config.stageOrder[0];
}

function comparableDoctorName(value: string) {
  return value.toLowerCase().replace(/^dr\.?\s+/, "").replace(/\s+/g, " ").trim();
}

function openPrintableDocument(title: string, body: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.opener = null;
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; line-height: 1.5; }
          h1 { font-size: 22px; margin-bottom: 12px; }
          pre { white-space: pre-wrap; font-family: inherit; }
        </style>
      </head>
      <body><h1>${title}</h1><pre>${body.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] || char))}</pre></body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function downloadTextFile(filename: string, body: string) {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [session, setSession] = useState<AuthSession | null>(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as AuthSession : null;
  });
  const [loginUsers, setLoginUsers] = useState<HospitalUser[]>([]);
  const [publicKiosk, setPublicKiosk] = useState<PublicKioskState | null>(null);
  const [staffLoginMode, setStaffLoginMode] = useState(() => new URLSearchParams(window.location.search).get("staff") === "1");
  const [activeStage, setActiveStage] = useState<StageId>("kiosk");
  const [adminMode, setAdminMode] = useState(false);
  const [adminSetup, setAdminSetup] = useState<AdminSetupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workspaceRequest = useRef(0);

  async function refresh() {
    const request = ++workspaceRequest.current;
    setError(null);
    const nextConfig = await loadConfig();
    if (request !== workspaceRequest.current) return;
    setConfig(nextConfig);
    if (!session) {
      const [usersResponse, kioskResponse] = await Promise.all([listLoginUsers(), loadPublicKiosk()]);
      if (request !== workspaceRequest.current) return;
      setLoginUsers(usersResponse.users);
      setPublicKiosk(kioskResponse);
      setVisit(null);
      setAdminSetup(null);
      return;
    }

    const nextVisit = await loadVisit(session.user.role, session.user.email);
    const nextSetup = session.user.role === "ADMIN" ? await loadAdminSetup() : null;
    if (request !== workspaceRequest.current) return;
    setVisit(nextVisit);
    setAdminSetup(nextSetup);
    setActiveStage(workspaceStageForRole(session.user.role, nextVisit, nextConfig));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh().catch((err) => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; workspaceRequest.current++; };
  }, [session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("public") === "1") {
      setError(null);
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      setStaffLoginMode(false);
      params.delete("public");
      params.delete("staff");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
      return;
    }
    const loginEmail = new URLSearchParams(window.location.search).get("login");
    if (loginEmail && session?.user.email !== loginEmail) {
      login(loginEmail).then(() => window.history.replaceState(null, "", window.location.pathname));
    }
  }, [session]);

  useEffect(() => {
    function syncStaffMode() {
      setStaffLoginMode(new URLSearchParams(window.location.search).get("staff") === "1");
    }
    window.addEventListener("popstate", syncStaffMode);
    return () => window.removeEventListener("popstate", syncStaffMode);
  }, []);

  useEffect(() => {
    function syncHash() {
      setAdminMode(session?.user.role === "ADMIN" && window.location.hash === "#admin-setup");
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [session?.user.role]);

  const completedStages = useMemo(() => new Set(visit?.completedStages || []), [visit]);
  const visibleConfig = useMemo(() => config && session ? filterConfigForRole(config, session.user.role) : config, [config, session]);
  const userCommands = session ? commands(session.user.role, session.user.email) : null;

  async function perform(action: () => Promise<Visit>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setWorking(true);
    setError(null);
    try {
      const nextVisit = await action();
      setVisit(nextVisit);
      if (config && session) setActiveStage(workspaceStageForRole(session.user.role, nextVisit, config));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setWorking(false);
    }
  }

  function nextStage() {
    if (adminMode || !userCommands || session?.user.role !== "ADMIN") return;
    perform(userCommands.advanceDemo, visit?.nextAction?.label ? `Run next journey action: ${visit.nextAction.label}?` : undefined);
  }

  function selectStage(stage: StageId) {
    setAdminMode(false);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    setActiveStage(stage);
  }

  async function saveSetup(nextSetup: AdminSetupResponse["setup"]) {
    setWorking(true);
    setError(null);
    try {
      const nextVisit = await saveAdminSetup(nextSetup);
      setVisit(nextVisit);
      setAdminSetup(await loadAdminSetup());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup save failed");
    } finally {
      setWorking(false);
    }
  }

  async function addUser(user: { name: string; email: string; role: Role; facilityIds: string[] }) {
    setWorking(true);
    setError(null);
    try {
      const nextVisit = await createHospitalUser(user);
      setVisit(nextVisit);
      setAdminSetup(await loadAdminSetup());
    } catch (err) {
      setError(err instanceof Error ? err.message : "User creation failed");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <LoadingState title="Loading ArogyaLoop workflow" detail="Fetching configuration and the active visit from the backend API." />;
  }

  async function login(email: string) {
    setWorking(true);
    setError(null);
    try {
      const nextSession = await loginWithEmail(email);
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      workspaceRequest.current++;
      setVisit(null);
      setAdminSetup(null);
      setLoading(true);
      setSession(nextSession);
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setWorking(false);
    }
  }

  function logout() {
    workspaceRequest.current++;
    setVisit(null);
    setAdminSetup(null);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAdminMode(false);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }

  if (!config) {
    return <LoadingState title="Unable to load workflow" detail={error || "The API did not return the expected application state."} onRetry={() => refresh().catch((err) => setError(err.message))} />;
  }

  if (!session) {
    if (staffLoginMode) {
      return <LoginScreen users={loginUsers} config={config} error={error} working={working} onLogin={login} onBackToKiosk={() => {
        setStaffLoginMode(false);
        window.history.replaceState(null, "", window.location.pathname);
      }} />;
    }
    return <PublicKioskScreen
      config={config}
      kiosk={publicKiosk}
      error={error}
      working={working}
      onStaffLogin={() => {
        setStaffLoginMode(true);
        window.history.replaceState(null, "", `${window.location.pathname}?staff=1`);
      }}
      onFindDoctors={findDoctors}
      onLookupPatient={lookupPublicPatient}
      onRegisterPatient={registerPublicPatient}
      onBook={async (payload) => {
        setWorking(true);
        setError(null);
        try {
          const result = await bookPublicAppointment(payload);
          setPublicKiosk((current) => current ? { ...current, visit: result.visit } : current);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Booking failed");
        } finally {
          setWorking(false);
        }
      }}
      onScan={async () => {
        setWorking(true);
        setError(null);
        try {
          const result = await scanPublicAppointment();
          setPublicKiosk((current) => current ? { ...current, visit: result.visit } : current);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Scan failed");
        } finally {
          setWorking(false);
        }
      }}
    />;
  }

  if (!visibleConfig || !visit || !userCommands) {
    return <LoadingState title="Unable to load user workspace" detail={error || "The API did not return the expected user state."} onRetry={() => refresh().catch((err) => setError(err.message))} />;
  }

  return (
    <AppShell
      activeStage={activeStage}
      adminMode={adminMode}
      completedStages={completedStages}
      config={visibleConfig}
      currentUser={session.user}
      patient={visit.patient}
      showPatientContext={activeStage === "pathology" ? visit.worklists.pathology.some(row => row.visitId === visit.id) : activeStage === "pharmacy" ? (session.user.role === "CASHIER" ? visit.worklists.billing : session.user.role === "PHARMACIST" ? visit.worklists.pharmacy : [...visit.worklists.pharmacy, ...visit.worklists.billing]).some(row => row.visitId === visit.id) : true}
      journeyStatus={visit.journeyInstance.status}
      currentStep={visit.journeyInstance.currentStepCode}
      nextActionLabel={visit.nextAction.label}
      onAdminSelect={() => {
        window.location.hash = "admin-setup";
        setAdminMode(true);
      }}
      onLogout={logout}
      onStageSelect={selectStage}
      onNext={nextStage}
      onReset={() => perform(userCommands.resetDemo, "Reset the active visit back to the starting state?")}
    >
      {error ? <div className="error-banner"><Icon name="error" />{error}</div> : null}
      {working ? <div className="working-banner"><Icon name="sync" />Saving workflow action...</div> : null}
      {adminMode && adminSetup ? <AdminSetupScreen adminSetup={adminSetup} onSave={saveSetup} onAddUser={addUser} /> : null}
      {!adminMode && activeStage === "kiosk" && <KioskScreen visit={visit} onSubmit={(payload) => perform(() => userCommands.selectDoctorFinder(payload))} />}
      {!adminMode && activeStage === "intake" && <IntakeScreen visit={visit} config={config} onNext={() => perform(userCommands.reviewIntake)} />}
      {!adminMode && activeStage === "reception" && <ReceptionScreen
        visit={visit}
        working={working}
        onFindDoctors={findDoctors}
        onLookupPatient={lookupPublicPatient}
        onRegisterPatient={registerPublicPatient}
        onBook={async (payload) => {
          setWorking(true);
          setError(null);
          try {
            const result = await bookPublicAppointment(payload);
            setVisit(result.visit);
            setPublicKiosk((current) => current ? { ...current, visit: result.visit } : current);
            setActiveStage("reception");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Booking failed");
          } finally {
            setWorking(false);
          }
        }}
        onSelectVisit={(visitId) => perform(() => userCommands.selectVisit(visitId))}
        onRecommendRouting={(payload) => perform(() => userCommands.recommendRouting(payload))}
        onApproveRouting={(payload) => perform(() => userCommands.reviewIntake(payload), "Confirm this routing and move patient to check-in?")}
        onCheckIn={() => perform(userCommands.checkIn, `Check in ${visit.patient.name || "this patient"} and print token ${visit.patient.token || ""}?`)}
      />}
      {!adminMode && activeStage === "doctor" && <DoctorScreen
        key={visit.id}
        visit={visit}
        currentUser={session.user}
        onSelectVisit={(visitId) => perform(() => userCommands.selectVisit(visitId))}
        onStartConsultation={() => perform(userCommands.startConsultation, "Start recording the doctor-patient conversation and mark consultation in progress?")}
        onReviewReport={() => perform(userCommands.reviewReport, "Acknowledge and review the diagnostic report?")}
        onSaveConsultation={(payload) => perform(() => userCommands.saveConsultation(payload))}
        onSendLabRequest={(payload) => perform(() => userCommands.sendLabRequest(payload), "Send selected lab tests to the selected pathlab?")}
        onSendPharmacyRequest={(payload) => perform(() => userCommands.sendPharmacyRequest(payload), "Send prescription to the selected pharmacy?")}
      />}
      {!adminMode && activeStage === "pathology" && <PathologyScreen visit={visit} config={config} onSelectVisit={(visitId) => perform(() => userCommands.selectVisit(visitId))} setStatus={(payload) => perform(() => userCommands.updatePathology(payload), payload.status === "Report ready" ? "Mark this uploaded lab report ready for doctor and patient visibility?" : undefined)} />}
      {!adminMode && activeStage === "pharmacy" && <PharmacyScreen role={session.user.role} visit={visit} config={config} onSelectVisit={(visitId) => perform(() => userCommands.selectVisit(visitId))} onReview={() => perform(userCommands.reviewPharmacy, "Mark pharmacist review complete for this prescription?")} onDispense={() => perform(userCommands.dispenseMedication, "Dispense medication after pharmacist approval?")} onInvoice={() => perform(userCommands.generateInvoice, "Generate invoice for this visit?")} onPay={() => perform(() => userCommands.recordPayment("UPI"), "Record payment and move to patient follow-up?")} />}
      {!adminMode && activeStage === "patient" && <PatientScreen visit={visit} onToggleReminders={() => perform(() => userCommands.scheduleFollowUp(!visit.followUp.remindersOn))} onNext={() => perform(() => userCommands.scheduleFollowUp(visit.followUp.remindersOn), "Schedule Day 14 follow-up?")} onComplete={() => perform(userCommands.completeVisit, "Complete the visit after follow-up is recorded?")} />}
      {!adminMode && activeStage === "operations" && <OperationsScreen visit={visit} onSelectVisit={(id) => perform(() => userCommands.selectVisit(id))} onWorkspace={session.user.role === "ADMIN" ? selectStage : undefined} />}
    </AppShell>
  );
}

function LoadingState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  return (
    <main className="load-state">
      <Card>
        <StatusChip tone={onRetry ? "danger" : "primary"}>{onRetry ? "API unavailable" : "Please wait"}</StatusChip>
        <h1>{title}</h1>
        <p>{detail}</p>
        {onRetry ? <button className="primary-action" type="button" onClick={onRetry}>Retry</button> : null}
      </Card>
    </main>
  );
}

const kioskCopy = {
  en: {
    staffLogin: "Staff login",
    badge: "No-login patient kiosk",
    title: "Arrive, find the right doctor, or book an OPD slot",
    subtitle: "The kiosk starts the patient journey without staff login. Booking enters the receptionist queue and the selected doctor's worklist.",
    tokenLabel: "Current visit token",
    tokenEmpty: "Pending",
    tokenHelp: "Book or scan an appointment",
    scanTitle: "I have an appointment",
    scanText: "Scan QR or confirm arrival and join the reception queue.",
    findTitle: "Find a doctor",
    findText: "Describe symptoms to find a specialty and available doctor slots.",
    registerTitle: "Register new patient",
    registerText: "Capture age, sex and contact details before booking.",
    formTitleFind: "Guided intake routing",
    formTitleRegister: "Patient registration",
    name: "Patient name",
    mobile: "Mobile number",
    age: "Age",
    sex: "Sex",
    duration: "Symptom duration",
    conditions: "Known conditions / medicines",
    symptoms: "Main symptoms in patient words",
    redFlags: "Red-flag screening",
    search: "Search specialty and doctor availability",
    record: "Record Hindi symptoms",
    recording: "Listening...",
    recommendation: "Recommended specialty",
    bookPrefix: "Book",
    bookSuffix: "and queue SMS",
    historyFound: "Existing patient found",
    historyNew: "New patient record",
    afterBooking: "After booking",
    availableDoctors: "Available OPD doctors"
    ,
    appointmentArrival: "Appointment arrival",
    receptionQueue: "Reception queue",
    qrHeading: "Scan appointment QR or enter appointment ID",
    qrText: "The scan button marks the active appointment as arrived and makes it visible for reception staff.",
    appointmentId: "Appointment ID / mobile",
    confirmArrival: "Confirm arrival",
    updating: "Updating kiosk journey...",
    liveState: "Live journey state",
    useGuided: "Use guided intake to create a visit.",
    doctor: "Doctor",
    department: "Department",
    appointment: "Appointment",
    queue: "Queue",
    notSelected: "Not selected",
    pending: "Pending",
    notQueued: "Not queued",
    smsFlow: "SMS/outbound message is recorded for the patient mobile.",
    receptionFlow: "Reception staff sees the token in queue order.",
    doctorFlow: "Doctor sees the patient routed to their OPD worklist.",
    downstreamFlow: "Orders continue to lab, pharmacy, billing, and follow-up.",
    configured: "configured"
    ,
    select: "Select",
    female: "Female",
    male: "Male",
    other: "Other",
    patient: "Patient",
    next: "next"
  },
  hi: {
    staffLogin: "स्टाफ लॉगिन",
    badge: "बिना लॉगिन मरीज कियोस्क",
    title: "आगमन दर्ज करें, सही डॉक्टर खोजें या ओपीडी स्लॉट बुक करें",
    subtitle: "कियोस्क बिना स्टाफ लॉगिन मरीज यात्रा शुरू करता है। बुकिंग रिसेप्शन कतार और चुने गए डॉक्टर की वर्कलिस्ट में जाती है।",
    tokenLabel: "वर्तमान विजिट टोकन",
    tokenEmpty: "लंबित",
    tokenHelp: "अपॉइंटमेंट बुक या स्कैन करें",
    scanTitle: "मेरा अपॉइंटमेंट है",
    scanText: "क्यूआर स्कैन करें या आगमन पुष्टि कर रिसेप्शन कतार में जुड़ें।",
    findTitle: "डॉक्टर खोजें",
    findText: "लक्षण लिखकर विभाग और उपलब्ध डॉक्टर स्लॉट खोजें।",
    registerTitle: "नया मरीज पंजीकरण",
    registerText: "बुकिंग से पहले उम्र, लिंग और संपर्क विवरण दर्ज करें।",
    formTitleFind: "गाइडेड इनटेक रूटिंग",
    formTitleRegister: "मरीज पंजीकरण",
    name: "मरीज का नाम",
    mobile: "मोबाइल नंबर",
    age: "उम्र",
    sex: "लिंग",
    duration: "लक्षण की अवधि",
    conditions: "पुरानी बीमारी / दवाइयां",
    symptoms: "मरीज के शब्दों में मुख्य लक्षण",
    redFlags: "इमरजेंसी लक्षण जांच",
    search: "विभाग और डॉक्टर उपलब्धता खोजें",
    record: "हिंदी लक्षण रिकॉर्ड करें",
    recording: "सुन रहा है...",
    recommendation: "सुझाया गया विभाग",
    bookPrefix: "बुक करें",
    bookSuffix: "और एसएमएस कतार में डालें",
    historyFound: "पुराना मरीज मिला",
    historyNew: "नया मरीज रिकॉर्ड",
    afterBooking: "बुकिंग के बाद",
    availableDoctors: "उपलब्ध ओपीडी डॉक्टर",
    appointmentArrival: "अपॉइंटमेंट आगमन",
    receptionQueue: "रिसेप्शन कतार",
    qrHeading: "अपॉइंटमेंट क्यूआर स्कैन करें या आईडी दर्ज करें",
    qrText: "स्कैन बटन अपॉइंटमेंट को arrived करता है और रिसेप्शन स्टाफ को दिखाता है।",
    appointmentId: "अपॉइंटमेंट आईडी / मोबाइल",
    confirmArrival: "आगमन पुष्टि करें",
    updating: "कियोस्क यात्रा अपडेट हो रही है...",
    liveState: "लाइव यात्रा स्थिति",
    useGuided: "विजिट बनाने के लिए गाइडेड इनटेक इस्तेमाल करें।",
    doctor: "डॉक्टर",
    department: "विभाग",
    appointment: "अपॉइंटमेंट",
    queue: "कतार",
    notSelected: "चयनित नहीं",
    pending: "लंबित",
    notQueued: "कतार में नहीं",
    smsFlow: "मरीज के मोबाइल पर एसएमएस/संदेश रिकॉर्ड होता है।",
    receptionFlow: "रिसेप्शन स्टाफ को टोकन कतार क्रम में दिखता है।",
    doctorFlow: "डॉक्टर को मरीज अपनी ओपीडी वर्कलिस्ट में दिखता है।",
    downstreamFlow: "ऑर्डर लैब, फार्मेसी, बिलिंग और फॉलो-अप तक चलते हैं।",
    configured: "कॉन्फिगर",
    select: "चुनें",
    female: "महिला",
    male: "पुरुष",
    other: "अन्य",
    patient: "मरीज",
    next: "अगला"
  }
};

function PublicKioskScreen({ config, kiosk, error, working, onStaffLogin, onFindDoctors, onLookupPatient, onRegisterPatient, onBook, onScan }: {
  config: AppConfig;
  kiosk: PublicKioskState | null;
  error: string | null;
  working: boolean;
  onStaffLogin: () => void;
  onFindDoctors: (payload: { symptoms: string; patientName?: string; mobile?: string; age?: number; gender?: string; language?: string }) => Promise<{ specialty: string; explanation: string; doctors: DoctorAvailability[]; emergencyNotice: string | null; existingPatient?: boolean; requiresRegistration?: boolean; patient?: PublicPatientRecord; historySummary?: string }>;
  onLookupPatient: (payload: { patientName: string; mobile: string }) => Promise<{ found: boolean; patient: PublicPatientRecord | null; message: string }>;
  onRegisterPatient: (payload: { patientName: string; mobile: string; age?: number; gender: string }) => Promise<{ existing: boolean; patient: PublicPatientRecord; message: string }>;
  onBook: (payload: { symptoms: string; mobile: string; patientName: string; patientId?: string; age?: number; gender?: string; language?: string; specialty: string; doctorId: string; slot: string }) => Promise<void>;
  onScan: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"home" | "scan" | "find" | "register">("home");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [redFlags, setRedFlags] = useState("");
  const [conditions, setConditions] = useState("");
  const [recommendation, setRecommendation] = useState<{ specialty: string; explanation: string; doctors: DoctorAvailability[]; emergencyNotice: string | null; existingPatient?: boolean; historySummary?: string } | null>(null);
  const [identityPatient, setIdentityPatient] = useState<PublicPatientRecord | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [identityNotice, setIdentityNotice] = useState<{ tone: "info" | "success" | "warning"; title: string; message: string; patient?: PublicPatientRecord | null; action: "use-existing" | "register-new" | "none" } | null>(null);
  const [localValidation, setLocalValidation] = useState("");
  const [identityLookupStatus, setIdentityLookupStatus] = useState<"idle" | "checking" | "matched" | "new" | "error">("idle");
  const [identityLookupMessage, setIdentityLookupMessage] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [recording, setRecording] = useState(false);
  const [speechMessage, setSpeechMessage] = useState("");
  const bookedVisit = identityConfirmed && kiosk && kiosk.visit.patient.id === identityPatient?.id ? kiosk.visit : undefined;
  const selectedDoctor = recommendation?.doctors.find((doctor) => doctor.id === selectedDoctorId);
  const t = kioskCopy[language];

  function resetIdentity() {
    setIdentityConfirmed(false);
    setIdentityPatient(null);
    setRecommendation(null);
    setIdentityLookupStatus("idle");
    setIdentityLookupMessage("");
  }

  function validateIdentity(requireSex: boolean) {
    const digits = mobile.replace(/\D+/g, "");
    if (!patientName.trim()) return "Patient name is required.";
    if (!/^[1-9]\d{9}$/.test(digits)) return "Enter a valid 10 digit mobile number that does not start with 0.";
    if (requireSex && !gender) return "Patient sex is required for registration.";
    return "";
  }

  function acceptExistingPatient(patient: PublicPatientRecord) {
    setIdentityPatient(patient);
    setIdentityConfirmed(true);
    setPatientName(patient.name);
    setMobile(patient.mobile);
    setAge(patient.age ? String(patient.age) : "");
    setGender(patient.gender || gender);
    setIdentityNotice(null);
    setLocalValidation("");
    setIdentityLookupStatus("matched");
    setIdentityLookupMessage(`Selected existing patient ${patient.id}.`);
    setMode("find");
  }

  useEffect(() => {
    const normalizedName = patientName.trim();
    const normalizedMobile = mobile.replace(/\D+/g, "");
    if (!normalizedName || !/^[1-9]\d{9}$/.test(normalizedMobile)) {
      setIdentityLookupStatus("idle");
      setIdentityLookupMessage("");
      return;
    }
    if (identityConfirmed && identityPatient?.name === normalizedName && identityPatient.mobile === normalizedMobile) {
      setIdentityLookupStatus("matched");
      setIdentityLookupMessage(`Selected existing patient ${identityPatient.id}.`);
      return;
    }
    let cancelled = false;
    setIdentityLookupStatus("checking");
    setIdentityLookupMessage("Checking patient record...");
    const timer = window.setTimeout(() => {
      onLookupPatient({ patientName: normalizedName, mobile: normalizedMobile })
        .then((result) => {
          if (cancelled) return;
          if (result.found && result.patient) {
            setIdentityLookupStatus("matched");
            setIdentityLookupMessage("Existing patient found. Select this patient to continue.");
            setIdentityConfirmed(false);
            setIdentityPatient(null);
            setRecommendation(null);
            setIdentityNotice({
              tone: "info",
              title: "Existing patient found",
              message: result.message,
              patient: result.patient,
              action: "use-existing"
            });
            return;
          }
          setIdentityLookupStatus("new");
          setIdentityLookupMessage(mode === "register" ? "No existing patient found. Continue registration." : "No patient found. Registration is required before guided intake.");
          setIdentityConfirmed(false);
          setIdentityPatient(null);
          setRecommendation(null);
          if (mode === "find") {
            setIdentityNotice({
              tone: "warning",
              title: "Patient not registered",
              message: result.message,
              patient: null,
              action: "register-new"
            });
          }
        })
        .catch((error: Error) => {
          if (cancelled) return;
          setIdentityLookupStatus("error");
          setIdentityLookupMessage(error.message || "Patient lookup failed.");
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [patientName, mobile, mode, identityConfirmed, identityPatient, onLookupPatient]);

  async function continueToGuidedIntake() {
    const validation = validateIdentity(false);
    setLocalValidation(validation);
    if (validation) return;
    const result = await onLookupPatient({ patientName, mobile });
    setLocalValidation("");
    if (result.found && result.patient) {
      setIdentityNotice({
        tone: "info",
        title: "Existing patient found",
        message: result.message,
        patient: result.patient,
        action: "use-existing"
      });
      return;
    }
    setIdentityNotice({
      tone: "warning",
      title: "Patient not registered",
      message: result.message,
      patient: null,
      action: "register-new"
    });
  }

  async function registerPatientAndContinue() {
    const validation = validateIdentity(true);
    setLocalValidation(validation);
    if (validation) return;
    const result = await onRegisterPatient({ patientName, mobile, age: Number(age || 0), gender });
    setLocalValidation("");
    if (result.existing) {
      setIdentityNotice({
        tone: "info",
        title: "Existing patient found",
        message: result.message,
        patient: result.patient,
        action: "use-existing"
      });
      return;
    }
    setIdentityPatient(result.patient);
    setIdentityConfirmed(true);
    setIdentityNotice(null);
    setMode("find");
  }

  useEffect(() => {
    if (!selectedDoctorId && recommendation?.doctors[0]) {
      setSelectedDoctorId(recommendation.doctors[0].id);
      setSelectedSlot(recommendation.doctors[0].availableSlots[0] || "");
    }
  }, [recommendation, selectedDoctorId]);

  function clinicalNarrative() {
    return [
      symptoms,
      age ? `Age: ${age}` : "",
      gender ? `Sex/Gender: ${gender}` : "",
      duration ? `Duration: ${duration}` : "",
      redFlags ? `Red flags: ${redFlags}` : "",
      conditions ? `Known conditions: ${conditions}` : ""
    ].filter(Boolean).join("\n");
  }

  async function runDoctorSearch() {
    const clinicalText = clinicalNarrative();
    const result = await onFindDoctors({ symptoms: clinicalText, patientName, mobile, age: Number(age || 0), gender, language });
    if (result.requiresRegistration) {
      setIdentityConfirmed(false);
      setIdentityNotice({
        tone: "warning",
        title: "Registration required",
        message: result.explanation,
        patient: null,
        action: "register-new"
      });
      return;
    }
    if (result.patient && !identityPatient) {
      setIdentityPatient(result.patient);
      setIdentityConfirmed(true);
    }
    setRecommendation(result);
    setSelectedDoctorId(result.doctors[0]?.id || "");
    setSelectedSlot(result.doctors[0]?.availableSlots[0] || "");
  }

  function recordHindiSymptoms() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechMessage(language === "hi" ? "इस ब्राउजर में आवाज रिकॉर्डिंग उपलब्ध नहीं है। कृपया हिंदी में टाइप करें।" : "Voice capture is not available in this browser. Please type the symptoms.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.onstart = () => {
      setRecording(true);
      setSpeechMessage("");
    };
    recognition.onerror = () => {
      setRecording(false);
      setSpeechMessage(language === "hi" ? "रिकॉर्डिंग पूरी नहीं हुई। कृपया फिर कोशिश करें या टाइप करें।" : "Recording could not be completed. Please try again or type.");
    };
    recognition.onend = () => setRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0]?.transcript || "").join(" ").trim();
      if (transcript) setSymptoms((current) => [current, transcript].filter(Boolean).join("\n"));
    };
    recognition.start();
  }

  async function bookAppointment() {
    if (!recommendation || !selectedDoctorId || !selectedSlot) return;
    await onBook({
      symptoms: clinicalNarrative(),
      mobile,
      patientName,
      patientId: identityPatient?.id,
      age: Number(age || 0),
      gender,
      language,
      specialty: recommendation.specialty,
      doctorId: selectedDoctorId,
      slot: selectedSlot
    });
  }

  return (
    <main className={`public-page ${mode === "home" ? "kiosk-home" : "kiosk-task"}`}>
      <header className="public-header">
        <div className="brand-mark" aria-label={config.productName}>
          <span className="brand-symbol">AL</span>
          <div>
            <strong>{config.productName}</strong>
            <span>{kiosk?.hospitalName || config.hospitalName}</span>
          </div>
        </div>
        <button className="secondary-action" type="button" onClick={onStaffLogin}>
          <Icon name="login" size={18} />
          {t.staffLogin}
        </button>
      </header>

      {mode !== "home" && <button className="secondary-action kiosk-back" type="button" onClick={() => setMode("home")}><Icon name="arrow_back" size={18} />{language === "hi" ? "मुख्य पृष्ठ" : "Kiosk home"}</button>}
      <section className="public-hero">
        <div>
          <StatusChip tone="primary">{t.badge}</StatusChip>
          <h1>{mode === "home" ? kiosk?.hospitalName || config.hospitalName : mode === "register" ? t.registerTitle : mode === "scan" ? t.scanTitle : t.findTitle}</h1>
          <div className="segmented language-switch" aria-label="Kiosk language">
            <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>English</button>
            <button type="button" className={language === "hi" ? "selected" : ""} onClick={() => setLanguage("hi")}>हिन्दी</button>
          </div>
        </div>
        <div className="public-token">
          <span>{t.tokenLabel}</span>
          <strong>{bookedVisit?.patient.token || t.tokenEmpty}</strong>
          <small>{bookedVisit?.patient.appointment || t.tokenHelp}</small>
        </div>
      </section>

      {error ? <div className="error-banner"><Icon name="error" />{error}</div> : null}
      {working ? <div className="working-banner"><Icon name="sync" />{t.updating}</div> : null}
      {identityNotice ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <StatusChip tone={identityNotice.tone}>{identityNotice.title}</StatusChip>
            <h2>{identityNotice.patient?.name || identityNotice.title}</h2>
            <p>{identityNotice.message}</p>
            {identityNotice.patient ? (
              <div className="mini-grid">
                <MiniFact label="Patient ID" value={identityNotice.patient.id} />
                <MiniFact label="Mobile" value={identityNotice.patient.mobile} />
                <MiniFact label="Sex" value={identityNotice.patient.gender || "Not captured"} />
                <MiniFact label="Past visits" value={String(identityNotice.patient.history.visits.length)} />
              </div>
            ) : null}
            <div className="action-row">
              {identityNotice.action === "use-existing" && identityNotice.patient ? (
                <button className="primary-action" type="button" onClick={() => acceptExistingPatient(identityNotice.patient!)}>
                  <Icon name="check_circle" size={18} />
                  Select this patient
                </button>
              ) : null}
              {identityNotice.action === "register-new" ? (
                <button className="primary-action" type="button" onClick={() => {
                  setMode("register");
                  setIdentityNotice(null);
                }}>
                  <Icon name="person_add" size={18} />
                  Go to registration form
                </button>
              ) : null}
              <button className="secondary-action" type="button" onClick={() => setIdentityNotice(null)}>
                <Icon name="edit" size={18} />
                Change entered details
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="public-mode-grid" aria-label="Kiosk choices">
        <button className={`public-mode ${mode === "scan" ? "public-mode-active" : ""}`} type="button" onClick={() => setMode("scan")}>
          <Icon name="qr_code_scanner" size={24} />
          <strong>{t.scanTitle}</strong>
          <span>{t.scanText}</span>
        </button>
        <button className={`public-mode ${mode === "find" ? "public-mode-active" : ""}`} type="button" onClick={() => setMode("find")}>
          <Icon name="manage_search" size={24} />
          <strong>{t.findTitle}</strong>
          <span>{t.findText}</span>
        </button>
        <button className={`public-mode ${mode === "register" ? "public-mode-active" : ""}`} type="button" onClick={() => setMode("register")}>
          <Icon name="person_add" size={24} />
          <strong>{t.registerTitle}</strong>
          <span>{t.registerText}</span>
        </button>
      </section>

      <div className={`public-workspace ${identityConfirmed ? "guided-workspace" : "identity-workspace"}`}>
        <section className="screen-stack">
          {mode === "scan" ? (
            <Card>
              <div className="section-title"><h2>{t.appointmentArrival}</h2><StatusChip tone="info">{t.receptionQueue}</StatusChip></div>
              <div className="scan-panel">
                <div className="fake-qr large" aria-hidden="true" />
                <div>
                  <h3>{t.qrHeading}</h3>
                  <p>{t.qrText}</p>
                  <label className="field"><span>{t.appointmentId}</span><input defaultValue="" /></label>
                  <button className="primary-action wide" type="button" disabled={working} onClick={onScan}>
                    <Icon name="how_to_reg" size={18} />
                    {t.confirmArrival}
                  </button>
                </div>
              </div>
            </Card>
          ) : null}

          {mode === "find" || mode === "register" ? (
            <Card>
              <div className="section-title"><h2>{mode === "register" ? t.formTitleRegister : t.formTitleFind}</h2><StatusChip tone="warning">{config.aiReviewLabel}</StatusChip></div>
              <div className="form-grid" hidden={identityConfirmed}>
                <label className="field"><span>{t.name} *</span><input value={patientName} onChange={(event) => {
                  setPatientName(event.target.value);
                  resetIdentity();
                }} /></label>
                <label className="field"><span>{t.mobile} *</span><input inputMode="numeric" value={mobile} onChange={(event) => {
                  setMobile(event.target.value.replace(/\D+/g, "").slice(0, 10));
                  resetIdentity();
                }} /></label>
                <label className="field"><span>{t.age}</span><input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value.replace(/\D+/g, "").slice(0, 3))} /></label>
                <label className="field"><span>{t.sex}{mode === "register" ? " *" : ""}</span><select value={gender} onChange={(event) => setGender(event.target.value)}><option value="">{t.select}</option><option value="Female">{t.female}</option><option value="Male">{t.male}</option><option value="Other">{t.other}</option></select></label>
              </div>
              {localValidation ? <div className="error-banner"><Icon name="error" />{localValidation}</div> : null}
              <div className="action-row" hidden={identityConfirmed}>
                {mode === "register" ? (
                  <button className="primary-action" type="button" disabled={working} onClick={registerPatientAndContinue}>
                    <Icon name="person_add" size={18} />
                    Register patient and continue to guided intake
                  </button>
                ) : (
                  <button className="primary-action" type="button" disabled={working} onClick={continueToGuidedIntake}>
                    <Icon name="badge" size={18} />
                    Continue to guided intake
                  </button>
                )}
                {identityConfirmed && identityPatient ? (
                  <StatusChip tone="success">Selected: {identityPatient.name} · {identityPatient.id}</StatusChip>
                ) : identityLookupStatus === "checking" ? (
                  <StatusChip tone="info">Checking patient record...</StatusChip>
                ) : identityLookupStatus === "new" ? (
                  <StatusChip tone={mode === "register" ? "success" : "warning"}>{identityLookupMessage}</StatusChip>
                ) : identityLookupStatus === "error" ? (
                  <StatusChip tone="danger">{identityLookupMessage}</StatusChip>
                ) : (
                  <StatusChip tone="warning">Patient identity required</StatusChip>
                )}
              </div>
              {identityConfirmed && <div className="section-title"><StatusChip tone="success">{patientName}</StatusChip><button className="secondary-action" type="button" onClick={resetIdentity}>Edit patient details</button></div>}
              <div hidden={!identityConfirmed}>
                <div className="form-grid">
                  <label className="field"><span>{t.duration}</span><input value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
                  <label className="field"><span>{t.conditions}</span><input value={conditions} onChange={(event) => setConditions(event.target.value)} /></label>
                </div>
              <label className="field">
                <span>{t.symptoms}</span>
                <textarea rows={4} lang={language === "hi" ? "hi" : "en"} value={symptoms} onChange={(event) => setSymptoms(event.target.value)} disabled={!identityConfirmed} />
              </label>
              <button className="secondary-action" type="button" onClick={recordHindiSymptoms} disabled={!identityConfirmed}>
                <Icon name="mic" size={18} />
                {recording ? t.recording : t.record}
              </button>
              {speechMessage ? <p className="muted-copy">{speechMessage}</p> : null}
              <label className="field">
                <span>{t.redFlags}</span>
                <input value={redFlags} onChange={(event) => setRedFlags(event.target.value)} disabled={!identityConfirmed} />
              </label>
              <button className="primary-action wide" type="button" disabled={!identityConfirmed || !symptoms || working} onClick={runDoctorSearch}>
                <Icon name="manage_search" size={18} />
                {t.search}
              </button>
              </div>
            </Card>
          ) : null}

          {recommendation ? (
            <Card>
              <div className="section-title">
                <div><StatusChip tone="primary">{t.recommendation}</StatusChip><h2>{recommendation.specialty}</h2></div>
                <StatusChip tone={recommendation.emergencyNotice ? "danger" : "success"}>{recommendation.emergencyNotice ? "Escalate" : "Bookable OPD"}</StatusChip>
              </div>
              <p className="muted-copy">{recommendation.explanation}</p>
              <div className="note-block">
                <StatusChip tone={recommendation.existingPatient ? "info" : "success"}>{recommendation.existingPatient ? t.historyFound : t.historyNew}</StatusChip>
                <p>{recommendation.historySummary || "No previous hospital history matched this name and mobile."}</p>
              </div>
              <div className="doctor-choice-grid">
                {recommendation.doctors.map((doctor) => (
                  <article key={doctor.id} className={`doctor-choice ${selectedDoctorId === doctor.id ? "doctor-choice-selected" : ""}`}>
                    <button type="button" onClick={() => {
                      setSelectedDoctorId(doctor.id);
                      setSelectedSlot(doctor.availableSlots[0] || "");
                    }}>
                      <strong>{doctor.name}</strong>
                      <span>{doctor.specialty} · {doctor.room}</span>
                    </button>
                    <div className="slot-row">
                      {doctor.availableSlots.map((slot) => (
                        <button key={slot} type="button" className={selectedDoctorId === doctor.id && selectedSlot === slot ? "slot-selected" : ""} onClick={() => {
                          setSelectedDoctorId(doctor.id);
                          setSelectedSlot(slot);
                        }}>{slot}</button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <button className="primary-action wide" type="button" disabled={!identityConfirmed || !selectedDoctor || !selectedSlot || !patientName || !mobile || working} onClick={bookAppointment}>
                <Icon name="event_available" size={18} />
                {t.bookPrefix} {selectedDoctor?.name || "doctor"} at {selectedSlot || "selected slot"} {t.bookSuffix}
              </button>
            </Card>
          ) : null}
        </section>

        <aside className="screen-stack">
              {identityPatient ? (
                <div className="history-panel">
                  <div className="section-title">
                    <h3>Previous visit context</h3>
                    <StatusChip tone="info">{identityPatient.history.visits.length} visit(s)</StatusChip>
                  </div>
                  <p>{identityPatient.history.summary}</p>
                  <div className="mini-grid">
                    <MiniFact label="Reports" value={identityPatient.history.reports.length ? identityPatient.history.reports.map((report) => `${report.title}: ${report.status}`).join("; ") : "No previous reports recorded"} />
                    <MiniFact label="Prescriptions" value={identityPatient.history.prescriptions.length ? identityPatient.history.prescriptions.map((rx) => `${rx.title}: ${rx.lines.join(", ")}`).join("; ") : "No previous prescriptions recorded"} />
                  </div>
                </div>
              ) : null}
          <Card className="patient-panel" hidden={!bookedVisit}>
            <StatusChip tone="primary">{t.liveState}</StatusChip>
            <h2>{bookedVisit?.patient.name || t.patient}</h2>
            <p>{bookedVisit?.patient.reason || t.useGuided}</p>
            <div className="mini-grid">
              <MiniFact label={t.doctor} value={bookedVisit?.patient.doctor || t.notSelected} />
              <MiniFact label={t.department} value={bookedVisit?.patient.department || t.pending} />
              <MiniFact label={t.appointment} value={bookedVisit?.patient.appointment || t.pending} />
              <MiniFact label={t.queue} value={bookedVisit?.reception.queue[0]?.status || t.notQueued} />
            </div>
          </Card>
          <Card tone="muted" hidden={identityConfirmed}>
            <h3>{t.afterBooking}</h3>
            <div className="flow-list">
              <span><Icon name="sms" size={18} /> {t.smsFlow}</span>
              <span><Icon name="how_to_reg" size={18} /> {t.receptionFlow}</span>
              <span><Icon name="stethoscope" size={18} /> {t.doctorFlow}</span>
              <span><Icon name="biotech" size={18} /> {t.downstreamFlow}</span>
            </div>
          </Card>
          <Card hidden={identityConfirmed}>
            <div className="section-title"><h3>{t.availableDoctors}</h3><StatusChip tone="info">{kiosk?.doctors.length || 0} {t.configured}</StatusChip></div>
            <div className="compact-list">
              {kiosk?.doctors.map((doctor) => (
                <span key={doctor.id}><strong>{doctor.name}</strong>{doctor.specialty} · {t.next} {doctor.availableSlots[0]}</span>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}

function LoginScreen({ users, config, error, working, onLogin, onBackToKiosk }: {
  users: HospitalUser[];
  config: AppConfig;
  error: string | null;
  working: boolean;
  onLogin: (email: string) => void;
  onBackToKiosk: () => void;
}) {
  const [email, setEmail] = useState(users[0]?.email || "");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const matchingUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(userSearch.toLowerCase()));

  useEffect(() => {
    if (!email && users[0]?.email) setEmail(users[0].email);
  }, [users, email]);

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-mark" aria-label={config.productName}>
          <span className="brand-symbol">AL</span>
          <div>
            <strong>{config.productName}</strong>
            <span>{config.hospitalName}</span>
          </div>
        </div>
        <div>
          <StatusChip tone="primary">Configured hospital login</StatusChip>
          <h1>Sign in as a hospital user</h1>
          <p>Select one of the users created in Application Setup. This development login uses configured users directly; production should replace it with passwords/SSO/MFA.</p>
        </div>
        <button className="secondary-action wide" type="button" onClick={onBackToKiosk}>
          <Icon name="touch_app" size={18} />
          Back to public kiosk
        </button>
        {error ? <div className="error-banner"><Icon name="error" />{error}</div> : null}
        <label className="field">
          <span>User login</span>
          <select value={email} onChange={(event) => setEmail(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.email}>{user.name} · {user.role} · {user.email}</option>
            ))}
          </select>
        </label>
        <button className="primary-action wide" type="button" disabled={!email || working} onClick={() => onLogin(email)}>
          <Icon name="login" size={18} />
          {working ? "Signing in..." : "Login to role workspace"}
        </button>
      </section>
      <section className="screen-stack login-directory">
        <label className="field"><span>Find staff member</span><input value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setUserPage(0); }} placeholder="Name, role or email" /></label>
        <div className="login-users">
        {matchingUsers.slice(userPage * 12, (userPage + 1) * 12).map((user) => (
          <Card key={user.id} className="login-user-card">
            <StatusChip tone={user.role === "ADMIN" ? "primary" : "info"}>{user.role}</StatusChip>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
            <span>{user.facilityIds.join(", ")}</span>
            <a className="secondary-action wide" href={`?login=${encodeURIComponent(user.email)}`} onClick={(event) => {
              event.preventDefault();
              onLogin(user.email);
            }}>
              Login as {user.role}
            </a>
          </Card>
        ))}
        </div>
        {!matchingUsers.length && <p>No matching staff members.</p>}
        <div className="action-row"><button className="secondary-action" type="button" disabled={userPage === 0} onClick={() => setUserPage(userPage - 1)}><Icon name="chevron_left" />Previous</button><span>{matchingUsers.length} users · Page {userPage + 1} of {Math.max(1, Math.ceil(matchingUsers.length / 12))}</span><button className="secondary-action" type="button" disabled={(userPage + 1) * 12 >= matchingUsers.length} onClick={() => setUserPage(userPage + 1)}>Next<Icon name="chevron_right" /></button></div>
      </section>
    </main>
  );
}

function AdminSetupScreen({ adminSetup, onSave, onAddUser }: {
  adminSetup: AdminSetupResponse;
  onSave: (setup: AdminSetupResponse["setup"]) => void;
  onAddUser: (user: { name: string; email: string; role: Role; facilityIds: string[] }) => void;
}) {
  const [draft, setDraft] = useState(adminSetup.setup);
  const [setupTab, setSetupTab] = useState("facility");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [labSearch, setLabSearch] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "RECEPTIONIST" as Role,
    facilityIds: [adminSetup.setup.facilities[0]?.id || ""]
  });
  useEffect(() => {
    setDraft(adminSetup.setup);
  }, [adminSetup.setup]);
  const facility = draft.facilities[0];
  const [newSpecialty, setNewSpecialty] = useState({ name: "", description: "" });
  const [newDoctor, setNewDoctor] = useState({ name: "", loginEmail: "", room: "", specialtyIds: [] as string[], availableSlots: "09:00 AM, 10:00 AM", qualification: "", experienceYears: "5", profile: "", photoUrl: "" });
  const [newLabTest, setNewLabTest] = useState({ name: "", category: "", sampleType: "" });
  const [newUnit, setNewUnit] = useState({ type: "pathLabs" as keyof AdminSetupResponse["setup"]["serviceUnits"], name: "", location: "", testIds: [] as string[] });

  function updateTenant(key: keyof typeof draft.tenant, value: string) {
    setDraft({ ...draft, tenant: { ...draft.tenant, [key]: value } });
  }

  function updateFacility(key: keyof typeof facility, value: string | string[]) {
    const facilities = draft.facilities.map((item, index) => index === 0 ? { ...item, [key]: value } : item);
    setDraft({ ...draft, facilities });
  }

  function toggleModule(moduleId: StageId) {
    const enabledModules = facility.enabledModules.includes(moduleId)
      ? facility.enabledModules.filter((id) => id !== moduleId)
      : [...facility.enabledModules, moduleId];
    updateFacility("enabledModules", enabledModules);
  }

  function toggleChecklist(id: string) {
    setDraft({
      ...draft,
      goLiveChecklist: draft.goLiveChecklist.map((item) => item.id === id ? { ...item, complete: !item.complete } : item)
    });
  }

  function addSpecialty() {
    if (!newSpecialty.name) return;
    const specialty = {
      id: `spec-${Date.now()}`,
      name: newSpecialty.name,
      description: newSpecialty.description
    };
    setDraft({ ...draft, specialties: [...draft.specialties, specialty] });
    setNewSpecialty({ name: "", description: "" });
  }

  function removeSpecialty(id: string) {
    setDraft({
      ...draft,
      specialties: draft.specialties.filter((specialty) => specialty.id !== id),
      doctors: draft.doctors.map((doctor) => ({ ...doctor, specialtyIds: doctor.specialtyIds.filter((specialtyId) => specialtyId !== id) }))
    });
  }

  function toggleDoctorSpecialty(id: string) {
    setNewDoctor({
      ...newDoctor,
      specialtyIds: newDoctor.specialtyIds.includes(id)
        ? newDoctor.specialtyIds.filter((specialtyId) => specialtyId !== id)
        : [...newDoctor.specialtyIds, id]
    });
  }

  function addDoctor() {
    if (!newDoctor.name || !newDoctor.specialtyIds.length) return;
    setDraft({
      ...draft,
      doctors: [
        ...draft.doctors,
        {
          id: `doc-${Date.now()}`,
          name: newDoctor.name,
          loginEmail: newDoctor.loginEmail.toLowerCase(),
          room: newDoctor.room,
          specialtyIds: newDoctor.specialtyIds,
          availableSlots: newDoctor.availableSlots.split(",").map((item) => item.trim()).filter(Boolean),
          qualification: newDoctor.qualification,
          experienceYears: Number(newDoctor.experienceYears || 0),
          profile: newDoctor.profile,
          photoUrl: newDoctor.photoUrl,
          status: "Active"
        }
      ]
    });
    setNewDoctor({ name: "", loginEmail: "", room: "", specialtyIds: [], availableSlots: "09:00 AM, 10:00 AM", qualification: "", experienceYears: "5", profile: "", photoUrl: "" });
  }

  function readDoctorPhoto(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNewDoctor((current) => ({ ...current, photoUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function removeDoctor(id: string) {
    setDraft({ ...draft, doctors: draft.doctors.filter((doctor) => doctor.id !== id) });
  }

  function addServiceUnit() {
    if (!newUnit.name) return;
    const unit = newUnit.type === "pathLabs"
      ? { id: `unit-${Date.now()}`, name: newUnit.name, location: newUnit.location, testIds: newUnit.testIds, status: "Active" }
      : { id: `unit-${Date.now()}`, name: newUnit.name, location: newUnit.location, status: "Active" };
    setDraft({
      ...draft,
      serviceUnits: {
        ...draft.serviceUnits,
        [newUnit.type]: [
          ...draft.serviceUnits[newUnit.type],
          unit
        ]
      }
    });
    setNewUnit({ ...newUnit, name: "", location: "", testIds: [] });
  }

  function removeServiceUnit(type: keyof typeof draft.serviceUnits, id: string) {
    setDraft({
      ...draft,
      serviceUnits: {
        ...draft.serviceUnits,
        [type]: draft.serviceUnits[type].filter((unit) => unit.id !== id)
      }
    });
  }

  function updateIntegration(key: keyof typeof draft.integrations, value: string) {
    setDraft({ ...draft, integrations: { ...draft.integrations, [key]: value } });
  }

  function addLabTest() {
    if (!newLabTest.name) return;
    setDraft({
      ...draft,
      labTests: [...draft.labTests, { id: `test-${Date.now()}`, name: newLabTest.name, category: newLabTest.category, sampleType: newLabTest.sampleType, status: "Active" }]
    });
    setNewLabTest({ name: "", category: "", sampleType: "" });
  }

  function removeLabTest(id: string) {
    setDraft({
      ...draft,
      labTests: draft.labTests.filter((test) => test.id !== id),
      serviceUnits: {
        ...draft.serviceUnits,
        pathLabs: draft.serviceUnits.pathLabs.map((lab) => ({ ...lab, testIds: lab.testIds.filter((testId) => testId !== id) }))
      }
    });
  }

  function toggleNewUnitTest(id: string) {
    setNewUnit({
      ...newUnit,
      testIds: newUnit.testIds.includes(id) ? newUnit.testIds.filter((testId) => testId !== id) : [...newUnit.testIds, id]
    });
  }

  return (
    <div className="screen-stack">
      <Card className="admin-hero">
        <div>
          <StatusChip tone="primary">Application Admin</StatusChip>
          <h2>Hospital configuration</h2>
        </div>
        <button className="primary-action" type="button" onClick={() => onSave(draft)}>
          <Icon name="save" size={18} />
          Save setup
        </button>
      </Card>

      <nav className="setup-tabs" aria-label="Setup sections">
        {[["facility", "domain", "Facility & departments"], ["doctors", "badge", "Doctor roster & chambers"], ["services", "biotech", "Pathology & pharmacy"], ["routing", "psychology", "AI routing"], ["access", "admin_panel_settings", "Users & access"]].map(([id, icon, label]) => <button key={id} type="button" aria-pressed={setupTab === id} onClick={() => setSetupTab(id)} className={setupTab === id ? "selected" : ""}><Icon name={icon} size={18} />{label}</button>)}
      </nav>
      <div className="setup-grid" hidden={setupTab !== "facility"}>
        <Card>
          <div className="section-title"><h2>1. Tenant profile</h2><StatusChip tone="info">{draft.tenant.id}</StatusChip></div>
          <div className="form-grid">
            <label className="field"><span>Hospital group name</span><input value={draft.tenant.name} onChange={(event) => updateTenant("name", event.target.value)} /></label>
            <label className="field"><span>Deployment type</span><select value={draft.tenant.deploymentType} onChange={(event) => updateTenant("deploymentType", event.target.value)}><option>Single hospital</option><option>Multi-branch hospital group</option><option>Clinic network</option><option>Specialty hospital</option><option>Diagnostic centre</option></select></label>
            <label className="field"><span>Timezone</span><input value={draft.tenant.timezone} onChange={(event) => updateTenant("timezone", event.target.value)} /></label>
            <label className="field"><span>Locale / currency</span><input value={`${draft.tenant.locale} / ${draft.tenant.currency}`} readOnly /></label>
          </div>
        </Card>

        <Card>
          <div className="section-title"><h2>2. Facility</h2><StatusChip tone="warning">Tenant scoped</StatusChip></div>
          <div className="form-grid">
            <label className="field"><span>Facility name</span><input value={facility.name} onChange={(event) => updateFacility("name", event.target.value)} /></label>
            <label className="field"><span>City</span><input value={facility.city} onChange={(event) => updateFacility("city", event.target.value)} /></label>
            <label className="field"><span>Hospital type</span><select value={facility.hospitalType} onChange={(event) => updateFacility("hospitalType", event.target.value)}><option>General hospital</option><option>Multi-speciality hospital</option><option>Super-speciality hospital</option><option>Clinic</option><option>Diagnostic centre</option><option>Day-care hospital</option></select></label>
            <label className="field"><span>Queue prefix</span><input value={facility.queuePrefix} onChange={(event) => updateFacility("queuePrefix", event.target.value)} /></label>
            <label className="field"><span>Departments</span><input value={facility.departments.join(", ")} onChange={(event) => updateFacility("departments", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
          </div>
        </Card>
      </div>

      <Card hidden={setupTab !== "facility"}>
        <div className="section-title"><h2>3. Enabled modules</h2><StatusChip tone="info">Controls role navigation</StatusChip></div>
        <div className="module-grid">
          {adminSetup.availableModules.map((module) => (
            <label key={module.id} className="module-toggle">
              <input type="checkbox" checked={facility.enabledModules.includes(module.id)} onChange={() => toggleModule(module.id)} />
              <span><strong>{module.label}</strong><small>{module.owner}</small></span>
            </label>
          ))}
        </div>
      </Card>

      <div className="setup-section-layout">
        <Card hidden={setupTab !== "facility"}>
          <div className="section-title"><h2>4. Specialities</h2><StatusChip tone="primary">Clinical master</StatusChip></div>
          <div className="user-create">
            <label className="field"><span>Speciality name</span><input value={newSpecialty.name} onChange={(event) => setNewSpecialty({ ...newSpecialty, name: event.target.value })} placeholder="e.g. Cardiology" /></label>
            <label className="field"><span>Routing description</span><input value={newSpecialty.description} onChange={(event) => setNewSpecialty({ ...newSpecialty, description: event.target.value })} placeholder="Symptoms, scope, OPD routing notes" /></label>
            <button className="primary-action" type="button" onClick={addSpecialty} disabled={!newSpecialty.name}>Add speciality</button>
          </div>
          <table className="data-table">
            <thead><tr><th>Speciality</th><th>Description</th><th></th></tr></thead>
            <tbody>{draft.specialties.map((specialty) => <tr key={specialty.id}><td>{specialty.name}</td><td>{specialty.description}</td><td><button className="secondary-action" type="button" onClick={() => removeSpecialty(specialty.id)}>Remove</button></td></tr>)}</tbody>
          </table>
        </Card>

        <Card hidden={setupTab !== "routing"}>
          <div className="section-title"><h2>5. OpenAI routing</h2><StatusChip tone={draft.integrations.openAiConfigured ? "success" : "warning"}>{draft.integrations.openAiConfigured ? "Configured" : "Required for AI"}</StatusChip></div>
          <div className="form-grid">
            <label className="field"><span>OpenAI API key</span><input type="password" value={draft.integrations.openAiApiKey} onChange={(event) => updateIntegration("openAiApiKey", event.target.value)} placeholder="sk-..." /></label>
            <label className="field"><span>Model</span><input value={draft.integrations.openAiModel} onChange={(event) => updateIntegration("openAiModel", event.target.value)} /></label>
          </div>
          <p className="muted-copy">The key is stored only in the local backend state for this development build. In production this should move to a secret manager, not PostgreSQL.</p>
        </Card>
      </div>

      <Card hidden={setupTab !== "doctors"}>
        <div className="section-title"><h2>6. Doctor profiles</h2><StatusChip tone="info">Many-to-many specialities</StatusChip></div>
        <div className="user-create">
          <label className="field"><span>Doctor name</span><input value={newDoctor.name} onChange={(event) => setNewDoctor({ ...newDoctor, name: event.target.value })} placeholder="Doctor full name" /></label>
          <label className="field"><span>Linked login email</span><input value={newDoctor.loginEmail} onChange={(event) => setNewDoctor({ ...newDoctor, loginEmail: event.target.value })} placeholder="doctor@hospital.in" /></label>
          <label className="field"><span>Room / location</span><input value={newDoctor.room} onChange={(event) => setNewDoctor({ ...newDoctor, room: event.target.value })} placeholder="OPD room" /></label>
          <label className="field"><span>Available slots</span><input value={newDoctor.availableSlots} onChange={(event) => setNewDoctor({ ...newDoctor, availableSlots: event.target.value })} /></label>
          <label className="field"><span>Qualification</span><input value={newDoctor.qualification} onChange={(event) => setNewDoctor({ ...newDoctor, qualification: event.target.value })} placeholder="MBBS, MD" /></label>
          <label className="field"><span>Experience years</span><input value={newDoctor.experienceYears} onChange={(event) => setNewDoctor({ ...newDoctor, experienceYears: event.target.value })} placeholder="8" /></label>
          <label className="field"><span>Profile summary</span><input value={newDoctor.profile} onChange={(event) => setNewDoctor({ ...newDoctor, profile: event.target.value })} placeholder="Clinical focus and OPD scope" /></label>
          <label className="field"><span>Doctor photo</span><input type="file" accept="image/*" onChange={(event) => readDoctorPhoto(event.target.files?.[0] || null)} /></label>
          {newDoctor.photoUrl ? <div className="doctor-photo-preview"><img src={newDoctor.photoUrl} alt="New doctor preview" /><button className="secondary-action" type="button" onClick={() => setNewDoctor({ ...newDoctor, photoUrl: "" })}>Remove photo</button></div> : null}
          <button className="primary-action" type="button" onClick={addDoctor} disabled={!newDoctor.name || !newDoctor.specialtyIds.length}>Add doctor</button>
        </div>
        <div className="module-grid">
          {draft.specialties.map((specialty) => (
            <label key={specialty.id} className="module-toggle">
              <input type="checkbox" checked={newDoctor.specialtyIds.includes(specialty.id)} onChange={() => toggleDoctorSpecialty(specialty.id)} />
              <span><strong>{specialty.name}</strong><small>{specialty.description || "Selectable for doctor profile"}</small></span>
            </label>
          ))}
        </div>
        <table className="data-table">
          <caption><label className="field"><span>Search doctor roster</span><input value={doctorSearch} onChange={(event) => setDoctorSearch(event.target.value)} placeholder="Doctor, email or chamber" /></label></caption>
          <thead><tr><th>Doctor</th><th>Specialities</th><th>Profile</th><th>Slots</th><th></th></tr></thead>
          <tbody>{draft.doctors.filter((doctor) => `${doctor.name} ${doctor.loginEmail} ${doctor.room}`.toLowerCase().includes(doctorSearch.toLowerCase())).map((doctor) => <tr key={doctor.id}><td><div className="doctor-cell">{doctor.photoUrl ? <img src={doctor.photoUrl} alt={doctor.name} /> : <span className="doctor-avatar-fallback">{doctor.name.slice(0, 2).toUpperCase()}</span>}<div>{doctor.name}<span>{doctor.loginEmail || "No linked login"} · {doctor.room}</span></div></div></td><td>{doctor.specialtyIds.map((id) => draft.specialties.find((specialty) => specialty.id === id)?.name || id).join(", ")}</td><td>{doctor.qualification || "Qualification pending"}<span>{doctor.experienceYears ? `${doctor.experienceYears} yrs` : "Experience pending"} · {doctor.profile || "Profile pending"}</span></td><td>{doctor.availableSlots.join(", ")}</td><td><button className="secondary-action" type="button" onClick={() => removeDoctor(doctor.id)}>Remove</button></td></tr>)}</tbody>
        </table>
      </Card>

      <Card hidden={setupTab !== "services"}>
        <div className="section-title"><h2>7. Lab test master</h2><StatusChip tone="primary">Pathology catalogue</StatusChip></div>
        <div className="user-create">
          <label className="field"><span>Test name</span><input value={newLabTest.name} onChange={(event) => setNewLabTest({ ...newLabTest, name: event.target.value })} placeholder="e.g. CBC, HbA1c, LFT" /></label>
          <label className="field"><span>Category</span><input value={newLabTest.category} onChange={(event) => setNewLabTest({ ...newLabTest, category: event.target.value })} placeholder="Hematology, Biochemistry" /></label>
          <label className="field"><span>Sample type</span><input value={newLabTest.sampleType} onChange={(event) => setNewLabTest({ ...newLabTest, sampleType: event.target.value })} placeholder="Blood, urine, swab" /></label>
          <button className="primary-action" type="button" onClick={addLabTest} disabled={!newLabTest.name}>Add lab test</button>
        </div>
        <table className="data-table">
          <caption><label className="field"><span>Search lab test catalogue</span><input value={labSearch} onChange={(event) => setLabSearch(event.target.value)} placeholder="Test name or category" /></label></caption>
          <thead><tr><th>Test</th><th>Category</th><th>Sample</th><th></th></tr></thead>
          <tbody>{draft.labTests.filter((test) => `${test.name} ${test.category}`.toLowerCase().includes(labSearch.toLowerCase())).map((test) => <tr key={test.id}><td>{test.name}</td><td>{test.category}</td><td>{test.sampleType}</td><td><button className="secondary-action" type="button" onClick={() => removeLabTest(test.id)}>Remove</button></td></tr>)}</tbody>
        </table>
      </Card>

      <Card hidden={setupTab !== "services"}>
        <div className="section-title"><h2>8. Service units</h2><StatusChip tone="primary">Path lab, pharmacy, cashier</StatusChip></div>
        <div className="user-create">
          <label className="field"><span>Unit type</span><select value={newUnit.type} onChange={(event) => setNewUnit({ ...newUnit, type: event.target.value as keyof typeof draft.serviceUnits })}><option value="pathLabs">Path lab</option><option value="pharmacies">Pharmacy</option><option value="cashiers">Cashier</option></select></label>
          <label className="field"><span>Name</span><input value={newUnit.name} onChange={(event) => setNewUnit({ ...newUnit, name: event.target.value })} /></label>
          <label className="field"><span>Location</span><input value={newUnit.location} onChange={(event) => setNewUnit({ ...newUnit, location: event.target.value })} /></label>
          <button className="primary-action" type="button" onClick={addServiceUnit} disabled={!newUnit.name}>Add unit</button>
        </div>
        {newUnit.type === "pathLabs" ? (
          <div className="module-grid">
            {draft.labTests.map((test) => (
              <label key={test.id} className="module-toggle">
                <input type="checkbox" checked={newUnit.testIds.includes(test.id)} onChange={() => toggleNewUnitTest(test.id)} />
                <span><strong>{test.name}</strong><small>{test.category || "Lab test"} · {test.sampleType || "sample not specified"}</small></span>
              </label>
            ))}
          </div>
        ) : null}
        <div className="setup-grid">
          {(["pathLabs", "pharmacies", "cashiers"] as Array<keyof typeof draft.serviceUnits>).map((type) => (
            <div key={type} className="unit-panel">
              <h3>{type === "pathLabs" ? "Path labs" : type === "pharmacies" ? "Pharmacies" : "Cashiers"}</h3>
              <div className="compact-list">
                {draft.serviceUnits[type].map((unit) => <span key={unit.id}><strong>{unit.name}</strong>{unit.location}{type === "pathLabs" && "testIds" in unit ? ` · ${unit.testIds.length} tests` : ""} <button className="secondary-action" type="button" onClick={() => removeServiceUnit(type, unit.id)}>Remove</button></span>)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="setup-section-layout">
        <Card hidden={setupTab !== "access"}>
          <div className="section-title"><h2>9. User logins</h2><StatusChip tone="primary">Hospital scoped</StatusChip></div>
          <div className="user-create">
            <label className="field"><span>Name</span><input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="e.g. Lab Technician" /></label>
            <label className="field"><span>Email</span><input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="user@hospital.in" /></label>
            <label className="field"><span>Role</span><select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as Role })}>{adminSetup.availableRoles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <button className="primary-action" type="button" onClick={() => onAddUser(newUser)} disabled={!newUser.name || !newUser.email}>Create login</button>
          </div>
          <table className="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Facility scope</th><th>Status</th></tr></thead>
            <tbody>{draft.users.map((user) => <tr key={user.id}><td>{user.name}<span>{user.email}</span></td><td>{user.role}</td><td>{user.facilityIds.join(", ")}</td><td><StatusChip tone="success">{user.status}</StatusChip></td></tr>)}</tbody>
          </table>
        </Card>

        <aside className="screen-stack" hidden={setupTab !== "access"}>
          <Card hidden={setupTab !== "access"}>
            <div className="section-title"><h2>10. Role permissions</h2><StatusChip tone="warning">Backend enforced</StatusChip></div>
            <div className="permission-list">
              {adminSetup.availableRoles.map((role) => (
                <div key={role}>
                  <strong>{role}</strong>
                  <span>{(adminSetup.permissions[role] || []).join(", ")}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card hidden={setupTab !== "access"}>
            <div className="section-title"><h2>11. Go-live checklist</h2><StatusChip tone="info">Readiness</StatusChip></div>
            <div className="checklist">
              {draft.goLiveChecklist.map((item) => (
                <label key={item.id}>
                  <input type="checkbox" checked={item.complete} onChange={() => toggleChecklist(item.id)} />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function KioskScreen({ visit, onSubmit }: {
  visit: Visit;
  onSubmit: (payload: { symptoms: string; duration: string; redFlags: string; conditions: string }) => void;
}) {
  const [symptoms, setSymptoms] = useState(visit.patient.reason);
  const [duration, setDuration] = useState("3 weeks");
  const [redFlags, setRedFlags] = useState("No chest pain, sudden numbness, fainting, severe breathing distress or emergency symptoms.");
  const [conditions, setConditions] = useState("Mild thyroid history and overdue routine check-up.");
  const likelyDepartment = /chest|palpitation|heart/i.test(symptoms)
    ? "Cardiology"
    : /thyroid|sugar|diabetes|hormone/i.test(symptoms)
      ? "Endocrinology"
      : "General Medicine";

  return (
    <div className="screen-stack">
      <section className="kiosk-hero">
        <div>
          <StatusChip tone="success" icon="radio_button_checked">OPD self-service terminal K-04</StatusChip>
          <h2>Welcome to {visit.patient.hospital || "the hospital"}</h2>
          <p>A guided patient arrival flow for walk-in and appointment visitors.</p>
        </div>
        <div className="segmented">
          <button type="button" className="selected">English</button>
          <button type="button">हिन्दी</button>
          <button type="button" aria-label="Audio help"><Icon name="volume_up" /></button>
        </div>
      </section>
      <div className="two-column wide-left">
        <Card>
          <div className="section-title">
            <div>
              <StatusChip tone="info" icon="psychology">Doctor finder</StatusChip>
              <h2>Tell us what is happening</h2>
            </div>
            <StatusChip tone="warning">Not a diagnosis</StatusChip>
          </div>
          <div className="form-grid kiosk-form">
            <label className="field full-span">
              <span>Symptoms or reason for visit</span>
              <textarea rows={4} value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Example: tiredness, dizziness, mild breathlessness while climbing stairs" />
            </label>
            <label className="field">
              <span>Duration</span>
              <input value={duration} onChange={(event) => setDuration(event.target.value)} />
            </label>
            <label className="field">
              <span>Known conditions / medicines</span>
              <input value={conditions} onChange={(event) => setConditions(event.target.value)} />
            </label>
            <label className="field full-span">
              <span>Emergency warning symptoms</span>
              <textarea rows={3} value={redFlags} onChange={(event) => setRedFlags(event.target.value)} />
            </label>
          </div>
          <Card tone="muted" className="safety-card">
            <Icon name="policy" />
            <div>
              <strong>Clinical safety boundary</strong>
              <p>This finder only routes the patient to a department for staff review. Emergency symptoms should be escalated to hospital staff immediately.</p>
            </div>
          </Card>
        </Card>

        <aside className="screen-stack">
          <Card className="routing-card">
            <StatusChip tone="primary">Likely routing</StatusChip>
            <h2>{likelyDepartment}</h2>
            <p>Based on the entered symptoms, the kiosk will create an intake record and send it to reception for staff review.</p>
            <div className="doctor-row">
              <div className="avatar">AR</div>
              <div><strong>{likelyDepartment === "General Medicine" ? "Dr Ananya Rao" : "Department doctor"}</strong><span>{likelyDepartment} · Staff confirmation required</span></div>
            </div>
            <button className="primary-action wide" type="button" disabled={!symptoms.trim()} onClick={() => onSubmit({ symptoms, duration, redFlags, conditions })}>
              Search doctor and create intake
              <Icon name="arrow_forward" size={18} />
            </button>
          </Card>
          <Card>
            <h3>What happens next</h3>
            <div className="mini-grid">
              <MiniFact label="1" value="Reception reviews intake" />
              <MiniFact label="2" value="Patient check-in/token" />
              <MiniFact label="3" value="Doctor consultation" />
              <MiniFact label="4" value="Lab/pharmacy/billing follow" />
            </div>
          </Card>
        </aside>
      </div>
      <div className="helper-strip">
        <MiniAction icon="accessible_forward" title="Wheelchair assistance" detail="Helpdesk can arrange support" />
        <MiniAction icon="support_agent" title="Reception helpdesk" detail="Desk 3, 15 meters right" />
        <MiniAction icon="mic" title="Voice assistance" detail="Tap to speak" />
      </div>
    </div>
  );
}

function IntakeScreen({ visit, config, onNext }: { visit: Visit; config: AppConfig; onNext: () => void }) {
  return (
    <div className="two-column">
      <section className="screen-stack">
        <Card>
          <div className="section-title">
            <div>
              <StatusChip tone="info" icon="auto_awesome">{config.aiReviewLabel}</StatusChip>
              <h2>Conversational intake</h2>
            </div>
          </div>
          {visit.intake.answers.map((answer, index) => (
            <Question key={answer.question} number={String(index + 1)} title={answer.question} hindi={answer.hindi} answer={answer.answer} success={answer.safe} />
          ))}
        </Card>
        <Card tone="muted" className="safety-card">
          <Icon name="policy" />
          <div>
            <strong>Clinical safety boundary</strong>
            <p>{visit.intake.disclaimer}</p>
          </div>
        </Card>
      </section>
      <aside className="screen-stack">
        <Card className="routing-card">
          <StatusChip tone={visit.intake.reviewedByStaff ? "success" : "primary"}>{visit.intake.reviewedByStaff ? "Staff reviewed" : "Routing recommendation"}</StatusChip>
          <h2>{visit.intake.recommendation}</h2>
          <p>Recommended because the entered symptoms need staff-reviewed routing before consultation.</p>
          <div className="doctor-row">
            <div className="avatar">AR</div>
            <div><strong>{visit.patient.doctor}</strong><span>{visit.patient.department} · {visit.reception.room}</span></div>
          </div>
          <label className="field">
            <span>Hospital staff override</span>
            <select defaultValue="general-medicine">
              <option value="general-medicine">General Medicine (recommended)</option>
              <option value="cardiology">Cardiology OPD</option>
              <option value="endocrinology">Endocrinology</option>
              <option value="reception-review">Reception supervisor review</option>
            </select>
          </label>
          <button className="primary-action wide" type="button" onClick={onNext} disabled={visit.intake.reviewedByStaff}>
            Confirm and send to reception desk
            <Icon name="arrow_forward" size={18} />
          </button>
        </Card>
        <Card>
          <h3>Likely next step</h3>
          <div className="mini-grid">
            <MiniFact label="Care plan" value="Doctor-selected tests after consultation" />
            <MiniFact label="Token prepared" value={`#${visit.patient.token}`} />
            <MiniFact label="Department" value={visit.patient.department} />
            <MiniFact label="Review" value="Staff required" />
          </div>
        </Card>
      </aside>
    </div>
  );
}

function ReceptionAssistedIntake({ working, onFindDoctors, onLookupPatient, onRegisterPatient, onBook }: {
  working: boolean;
  onFindDoctors: (payload: { symptoms: string; patientName?: string; mobile?: string; age?: number; gender?: string; language?: string }) => Promise<{ specialty: string; explanation: string; doctors: DoctorAvailability[]; emergencyNotice: string | null; existingPatient?: boolean; requiresRegistration?: boolean; patient?: PublicPatientRecord; historySummary?: string }>;
  onLookupPatient: (payload: { patientName: string; mobile: string }) => Promise<{ found: boolean; patient: PublicPatientRecord | null; message: string }>;
  onRegisterPatient: (payload: { patientName: string; mobile: string; age?: number; gender: string }) => Promise<{ existing: boolean; patient: PublicPatientRecord; message: string }>;
  onBook: (payload: { symptoms: string; mobile: string; patientName: string; patientId?: string; age?: number; gender?: string; language?: string; specialty: string; doctorId: string; slot: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"find" | "register">("find");
  const [patientName, setPatientName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [redFlags, setRedFlags] = useState("");
  const [conditions, setConditions] = useState("");
  const [identityPatient, setIdentityPatient] = useState<PublicPatientRecord | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "success" | "warning" | "danger"; text: string }>({ tone: "warning", text: "Enter patient name and mobile to begin." });
  const [validation, setValidation] = useState("");
  const [recommendation, setRecommendation] = useState<{ specialty: string; explanation: string; doctors: DoctorAvailability[]; emergencyNotice: string | null; historySummary?: string } | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const selectedDoctor = recommendation?.doctors.find((doctor) => doctor.id === selectedDoctorId);

  useEffect(() => {
    if (!selectedDoctorId && recommendation?.doctors[0]) {
      setSelectedDoctorId(recommendation.doctors[0].id);
      setSelectedSlot(recommendation.doctors[0].availableSlots[0] || "");
    }
  }, [recommendation, selectedDoctorId]);

  function resetClinicalResult() {
    setIdentityPatient(null);
    setIdentityConfirmed(false);
    setRecommendation(null);
    setSelectedDoctorId("");
    setSelectedSlot("");
  }

  function validateIdentity(requireSex: boolean) {
    const digits = mobile.replace(/\D+/g, "");
    if (!patientName.trim()) return "Patient name is required.";
    if (!/^[1-9]\d{9}$/.test(digits)) return "Enter a valid 10 digit mobile number that does not start with 0.";
    if (requireSex && !gender) return "Patient sex is required for registration.";
    return "";
  }

  function acceptPatient(patient: PublicPatientRecord) {
    setIdentityPatient(patient);
    setIdentityConfirmed(true);
    setPatientName(patient.name);
    setMobile(patient.mobile);
    setAge(patient.age ? String(patient.age) : age);
    setGender(patient.gender || gender);
    setNotice({ tone: "success", text: `Selected existing patient ${patient.id}. Continue guided intake below.` });
    setValidation("");
  }

  function clinicalNarrative() {
    return [
      symptoms,
      age ? `Age: ${age}` : "",
      gender ? `Sex/Gender: ${gender}` : "",
      duration ? `Duration: ${duration}` : "",
      redFlags ? `Red flags: ${redFlags}` : "",
      conditions ? `Known conditions: ${conditions}` : "",
      identityPatient?.history.summary ? `Past AI summary: ${identityPatient.history.summary}` : ""
    ].filter(Boolean).join("\n");
  }

  async function lookupForFindDoctor() {
    const identityError = validateIdentity(false);
    setValidation(identityError);
    if (identityError) return;
    const result = await onLookupPatient({ patientName, mobile });
    if (result.found && result.patient) {
      acceptPatient(result.patient);
      return;
    }
    setMode("register");
    setNotice({ tone: "warning", text: "No patient record exists for this name and mobile. Register the patient here, then continue guided intake." });
  }

  async function registerPatient() {
    const identityError = validateIdentity(true);
    setValidation(identityError);
    if (identityError) return;
    const result = await onRegisterPatient({ patientName, mobile, age: Number(age || 0), gender });
    if (result.existing) {
      acceptPatient(result.patient);
      setMode("find");
      setNotice({ tone: "info", text: "Existing patient found. Reception must use the existing patient record for this visit." });
      return;
    }
    acceptPatient(result.patient);
    setMode("find");
    setNotice({ tone: "success", text: `New patient ${result.patient.id} registered. Continue guided intake below.` });
  }

  async function runGuidedSearch() {
    if (!identityConfirmed) {
      setValidation("Select or register the patient before guided intake.");
      return;
    }
    if (!symptoms.trim()) {
      setValidation("Enter the patient's symptoms before searching for a doctor.");
      return;
    }
    setValidation("");
    const result = await onFindDoctors({
      symptoms: clinicalNarrative(),
      patientName,
      mobile,
      age: Number(age || 0),
      gender,
      language: "en"
    });
    if (result.requiresRegistration) {
      setMode("register");
      setIdentityConfirmed(false);
      setNotice({ tone: "warning", text: result.explanation });
      return;
    }
    if (result.patient && !identityPatient) acceptPatient(result.patient);
    setRecommendation(result);
    setSelectedDoctorId(result.doctors[0]?.id || "");
    setSelectedSlot(result.doctors[0]?.availableSlots[0] || "");
  }

  async function bookAssistedAppointment() {
    if (!recommendation || !selectedDoctorId || !selectedSlot) {
      setValidation("Select a doctor and available slot before booking.");
      return;
    }
    await onBook({
      symptoms: clinicalNarrative(),
      mobile,
      patientName,
      patientId: identityPatient?.id,
      age: Number(age || 0),
      gender,
      language: "en",
      specialty: recommendation.specialty,
      doctorId: selectedDoctorId,
      slot: selectedSlot
    });
    setNotice({ tone: "success", text: "Appointment booked and added to the reception queue." });
    setSymptoms("");
    setDuration("");
    setRedFlags("");
    setConditions("");
    setRecommendation(null);
  }

  return (
    <div className="embedded-intake">
      <div className="segmented compact-tabs" aria-label="Reception patient entry mode">
        <button type="button" className={mode === "find" ? "selected" : ""} onClick={() => setMode("find")}>
          Find doctor
        </button>
        <button type="button" className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>
          Register patient
        </button>
      </div>
      <div className="form-grid">
        <label className="field"><span>Name *</span><input value={patientName} onChange={(event) => {
          setPatientName(event.target.value);
          resetClinicalResult();
        }} /></label>
        <label className="field"><span>Mobile *</span><input inputMode="numeric" value={mobile} onChange={(event) => {
          setMobile(event.target.value.replace(/\D+/g, "").slice(0, 10));
          resetClinicalResult();
        }} /></label>
        <label className="field"><span>Age</span><input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value.replace(/\D+/g, "").slice(0, 3))} /></label>
        <label className="field"><span>Sex{mode === "register" ? " *" : ""}</span><select value={gender} onChange={(event) => setGender(event.target.value)}>
          <option value="">Select</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Other">Other</option>
        </select></label>
      </div>
      <div className="action-row">
        {mode === "find" ? (
          <button className="primary-action" type="button" disabled={working} onClick={lookupForFindDoctor}>
            <Icon name="badge" size={18} />
            Select patient and continue
          </button>
        ) : (
          <button className="primary-action" type="button" disabled={working} onClick={registerPatient}>
            <Icon name="person_add" size={18} />
            Register/select patient
          </button>
        )}
        <StatusChip tone={notice.tone}>{notice.text}</StatusChip>
      </div>
      {validation ? <div className="error-banner"><Icon name="error" />{validation}</div> : null}
      {identityPatient ? (
        <div className="history-panel compact-history">
          <div className="section-title">
            <h3>Patient history available</h3>
            <StatusChip tone="info">{identityPatient.history.visits.length} visit(s)</StatusChip>
          </div>
          <p>{identityPatient.history.summary}</p>
        </div>
      ) : null}
      <div className="form-grid">
        <label className="field full-span"><span>Main symptoms in patient words</span><textarea rows={3} value={symptoms} onChange={(event) => setSymptoms(event.target.value)} disabled={!identityConfirmed} /></label>
        <label className="field"><span>Duration</span><input value={duration} onChange={(event) => setDuration(event.target.value)} disabled={!identityConfirmed} /></label>
        <label className="field"><span>Known conditions</span><input value={conditions} onChange={(event) => setConditions(event.target.value)} disabled={!identityConfirmed} /></label>
        <label className="field full-span"><span>Red flags / staff observations</span><textarea rows={2} value={redFlags} onChange={(event) => setRedFlags(event.target.value)} disabled={!identityConfirmed} /></label>
      </div>
      <div className="action-row">
        <button className="secondary-action" type="button" disabled={working || !identityConfirmed} onClick={runGuidedSearch}>
          <Icon name="manage_search" size={18} />
          Run guided intake doctor search
        </button>
        {recommendation ? <StatusChip tone={recommendation.emergencyNotice ? "danger" : "primary"}>{recommendation.specialty}</StatusChip> : null}
      </div>
      {recommendation ? (
        <div className="doctor-results">
          <p className="muted-copy">{recommendation.explanation}</p>
          {recommendation.emergencyNotice ? <div className="error-banner"><Icon name="warning" />{recommendation.emergencyNotice}</div> : null}
          <div className="doctor-card-grid">
            {recommendation.doctors.map((doctor) => (
              <button key={doctor.id} className={`doctor-option ${selectedDoctorId === doctor.id ? "selected-row" : ""}`} type="button" onClick={() => {
                setSelectedDoctorId(doctor.id);
                setSelectedSlot(doctor.availableSlots[0] || "");
              }}>
                <strong>{doctor.name}</strong>
                <span>{doctor.specialty} · {doctor.room}</span>
                <small>{doctor.availableSlots.join(", ") || "No open slot"}</small>
              </button>
            ))}
          </div>
          <div className="form-grid">
            <label className="field"><span>Doctor</span><input value={selectedDoctor?.name || ""} readOnly /></label>
            <label className="field"><span>Slot</span><select value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)}>
              {(selectedDoctor?.availableSlots || []).map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select></label>
          </div>
          <button className="primary-action wide" type="button" disabled={working || !selectedDoctorId || !selectedSlot} onClick={bookAssistedAppointment}>
            <Icon name="event_available" size={18} />
            Book appointment and add to reception queue
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReceptionScreen({ visit, working, onFindDoctors, onLookupPatient, onRegisterPatient, onBook, onSelectVisit, onRecommendRouting, onApproveRouting, onCheckIn }: {
  visit: Visit;
  working: boolean;
  onFindDoctors: (payload: { symptoms: string; patientName?: string; mobile?: string; age?: number; gender?: string; language?: string }) => Promise<{ specialty: string; explanation: string; doctors: DoctorAvailability[]; emergencyNotice: string | null; existingPatient?: boolean; requiresRegistration?: boolean; patient?: PublicPatientRecord; historySummary?: string }>;
  onLookupPatient: (payload: { patientName: string; mobile: string }) => Promise<{ found: boolean; patient: PublicPatientRecord | null; message: string }>;
  onRegisterPatient: (payload: { patientName: string; mobile: string; age?: number; gender: string }) => Promise<{ existing: boolean; patient: PublicPatientRecord; message: string }>;
  onBook: (payload: { symptoms: string; mobile: string; patientName: string; patientId?: string; age?: number; gender?: string; language?: string; specialty: string; doctorId: string; slot: string }) => Promise<void>;
  onSelectVisit: (visitId: string) => void;
  onRecommendRouting: (payload: { symptoms: string }) => void;
  onApproveRouting: (payload: { specialty?: string; doctorId?: string }) => void;
  onCheckIn: () => void;
}) {
  const queue = visit.worklists?.reception || visit.reception.queue;
  const todayVisits = (visit.worklists?.operations || queue).filter((row) => !row.demoOnly);
  const activeInToday = todayVisits.some((row) => row.visitId === visit.id);
  const [selectedVisitId, setSelectedVisitId] = useState(activeInToday ? visit.id : todayVisits[0]?.visitId || "");
  const [routingSymptoms, setRoutingSymptoms] = useState(visit.patient.reason || "");
  const [overrideSpecialty, setOverrideSpecialty] = useState(visit.patient.department || visit.intake.recommendation || "");
  const [overrideDoctorId, setOverrideDoctorId] = useState("");
  const [routingValidation, setRoutingValidation] = useState("");
  useEffect(() => {
    setSelectedVisitId(activeInToday ? visit.id : todayVisits[0]?.visitId || "");
  }, [activeInToday, todayVisits, visit.id]);
  useEffect(() => {
    setRoutingSymptoms(visit.patient.reason || "");
    setOverrideSpecialty(visit.patient.department || visit.intake.recommendation || "");
    const assignedDoctor = visit.adminSetup.doctors.find((doctor) => comparableDoctorName(doctor.name) === comparableDoctorName(visit.patient.doctor));
    setOverrideDoctorId(assignedDoctor?.id || "");
  }, [visit.id, visit.patient.reason, visit.patient.department, visit.patient.doctor, visit.intake.recommendation, visit.adminSetup.doctors]);
  const selectedQueueEntry = todayVisits.find((row) => row.visitId === selectedVisitId) || todayVisits[0] || queue[0];
  const activeVisitSelected = selectedQueueEntry?.visitId === visit.id;
  const selectedIsReceptionAction = queue.some((row) => row.visitId === selectedQueueEntry?.visitId);
  const pendingCheckIns = queue.filter((row) => /pending|review|required|arrived|queued/i.test(row.status)).length;
  const checkInCompleted = visit.reception.checkedIn && visit.journeyInstance.status === "WAITING_FOR_CONSULTATION";
  const specialtyOptions = visit.adminSetup.specialties;
  const doctorsForOverride = visit.adminSetup.doctors.filter((doctor) => !overrideSpecialty || doctor.specialtyIds.some((id) => specialtyOptions.find((specialty) => specialty.id === id)?.name === overrideSpecialty));
  const canConfirmRoute = Boolean(overrideSpecialty && overrideDoctorId);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [queueSearch, setQueueSearch] = useState("");
  const matchingVisits = todayVisits.filter((row) => `${row.patient} ${row.token} ${row.department} ${row.status}`.toLowerCase().includes(queueSearch.toLowerCase()));
  return (
    <div className="two-column wide-left reception-layout">
      <section className="screen-stack">
        <div className="assisted-entry">
          <div className="section-title">
            <button className="primary-action" type="button" aria-expanded={assistedOpen} onClick={() => setAssistedOpen(!assistedOpen)}><Icon name={assistedOpen ? "close" : "person_add"} size={18} />{assistedOpen ? "Close assisted entry" : "Registration & assisted intake"}</button>
            <StatusChip tone="info">{todayVisits.length} visits</StatusChip>
          </div>
          <div hidden={!assistedOpen}>
          <ReceptionAssistedIntake
            working={working}
            onFindDoctors={onFindDoctors}
            onLookupPatient={onLookupPatient}
            onRegisterPatient={onRegisterPatient}
            onBook={onBook}
          />
          </div>
        </div>
        <div className="metrics-grid">
          <Metric icon="confirmation_number" label="Reception actions" value={String(queue.length)} detail="Needs front-desk work" />
          <Metric icon="groups" label="Today's visits" value={String(todayVisits.length)} detail="All tracked patients" />
          <Metric icon="hourglass_top" label="Pending check-in" value={String(pendingCheckIns)} detail="Reception desk" />
        </div>
        <Card>
          <div className="section-title">
            <h2>Patient visit roster</h2>
            <StatusChip tone="info">{todayVisits.length} patient(s)</StatusChip>
          </div>
          <label className="field">
            <span>Select any patient visit</span>
            <select value={selectedVisitId} onChange={(event) => {
              setSelectedVisitId(event.target.value);
              onSelectVisit(event.target.value);
            }}>
              {matchingVisits.map((row) => (
                <option key={`${row.visitId || row.token}-${row.token}`} value={row.visitId}>{row.token} · {row.patient} · {row.appointment} · {row.status}</option>
              ))}
            </select>
          </label>
          <label className="field"><span>Search patient, token or department</span><input value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Search visits" /></label>
          <table className="data-table">
            <thead><tr><th>Token</th><th>Patient</th><th>Appointment</th><th>Department</th><th>Status</th></tr></thead>
            <tbody>
              {matchingVisits.map((row) => (
                <tr key={`${row.visitId || row.token}-${row.token}`} className={row.visitId === visit.id ? "selected-row" : ""}>
                  <td><button className="queue-token" type="button" onClick={() => row.visitId && onSelectVisit(row.visitId)}>#{row.token}</button></td>
                  <td>{row.patient}<span>{row.demoOnly ? "Reference queue" : `${row.age || "-"} Y / ${row.gender || "-"}`}</span></td>
                  <td>{row.appointment}</td>
                  <td>{row.department}</td>
                  <td><StatusChip tone={row.status === "Checked in" || row.status === "Inside room" ? "success" : "warning"}>{row.status}</StatusChip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <div className="section-title">
            <h2>Routing and check-in action queue</h2>
            <StatusChip tone="warning">{queue.length} pending</StatusChip>
          </div>
          <table className="data-table">
            <thead><tr><th>Token</th><th>Patient</th><th>Appointment</th><th>Status</th></tr></thead>
            <tbody>
              {queue.map((row) => (
                <tr key={`${row.visitId || row.token}-${row.token}`} className={row.visitId === visit.id ? "selected-row" : ""}>
                  <td>#{row.token}</td>
                  <td>{row.patient}</td>
                  <td>{row.appointment}</td>
                  <td><StatusChip tone={row.status === "Checked in" || row.status === "Inside room" ? "success" : "warning"}>{row.status}</StatusChip></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!queue.length ? <p className="muted-copy">No visit is waiting for front-desk action right now. Patients already checked in remain visible in Today's visit tracker.</p> : <p className="muted-copy">Patients remain here until reception completes the next action: routing review or check-in.</p>}
        </Card>
      </section>
      <aside className="screen-stack">
        <Card className="patient-panel">
          <StatusChip tone={activeVisitSelected ? "primary" : "warning"}>{activeVisitSelected ? "Selected active journey" : "Visit preview"}</StatusChip>
          <h2>{selectedQueueEntry?.patient || visit.patient.name}</h2>
          <p>{selectedQueueEntry?.reason || visit.patient.reason || "No reason captured on this queue row."}</p>
          <div className="mini-grid">
            <MiniFact label="Visit ID" value={selectedQueueEntry?.visitId || visit.patient.visitId || "Not created"} />
            <MiniFact label="Doctor" value={selectedQueueEntry?.doctor || visit.patient.doctor || "Not assigned"} />
            <MiniFact label="Room" value={visit.reception.room} />
            <MiniFact label="Appointment" value={selectedQueueEntry?.appointment || visit.patient.appointment} />
            <MiniFact label="Next action" value={activeVisitSelected ? visit.nextAction.label : "Open selected patient"} />
          </div>
          {!activeVisitSelected ? <p className="muted-copy">Selecting this row opens that visit before actions are enabled.</p> : null}
          {activeVisitSelected && selectedIsReceptionAction ? (
            <button className={`primary-action wide ${checkInCompleted ? "success-action" : ""}`} type="button" onClick={onCheckIn} disabled={checkInCompleted}>
              <Icon name={checkInCompleted ? "check_circle" : "how_to_reg"} size={18} />
              {checkInCompleted ? "Checked in · sent to doctor" : visit.reception.checkedIn ? "Complete check-in handoff to doctor" : "Check in patient and generate token"}
            </button>
          ) : null}
          {activeVisitSelected && !selectedIsReceptionAction ? <p className="muted-copy">This visit is visible for tracking, but there is no reception action pending for the current status.</p> : null}
          {!activeVisitSelected && selectedQueueEntry?.visitId ? (
            <button className="secondary-action wide" type="button" onClick={() => onSelectVisit(selectedQueueEntry.visitId!)}>
              <Icon name="open_in_new" size={18} />
              Open selected patient
            </button>
          ) : null}
        </Card>
        {activeVisitSelected ? (
          <Card>
            <div className="section-title">
              <h2>Guided routing review</h2>
              <StatusChip tone="warning">Reception editable</StatusChip>
            </div>
            <label className="field">
              <span>Symptoms / patient explanation</span>
              <textarea rows={4} value={routingSymptoms} onChange={(event) => setRoutingSymptoms(event.target.value)} />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Final specialty</span>
                <select value={overrideSpecialty} onChange={(event) => {
                  setOverrideSpecialty(event.target.value);
                  setOverrideDoctorId("");
                }}>
                  <option value="">Select specialty</option>
                  {specialtyOptions.map((specialty) => <option key={specialty.id} value={specialty.name}>{specialty.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Final doctor</span>
                <select value={overrideDoctorId} onChange={(event) => setOverrideDoctorId(event.target.value)}>
                  <option value="">Select doctor</option>
                  {doctorsForOverride.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.room}</option>)}
                </select>
              </label>
            </div>
            <div className="action-row">
              <button className="secondary-action" type="button" onClick={() => onRecommendRouting({ symptoms: routingSymptoms })}>
                <Icon name="manage_search" size={18} />
                Run AI routing assist
              </button>
              <button className="primary-action" type="button" disabled={!canConfirmRoute} onClick={() => {
                if (!canConfirmRoute) {
                  setRoutingValidation("Select both final specialty and final doctor before confirming the route.");
                  return;
                }
                setRoutingValidation("");
                onApproveRouting({ specialty: overrideSpecialty, doctorId: overrideDoctorId });
              }}>
                <Icon name="verified" size={18} />
                Confirm final route
              </button>
            </div>
            {routingValidation ? <div className="error-banner"><Icon name="error" />{routingValidation}</div> : null}
          </Card>
        ) : null}
        <Card tone="muted">
          <h3>Patient-facing directions</h3>
          <p>{activeVisitSelected ? visit.reception.directions : "Open the selected patient to show the current token, room, and check-in action for that visit."}</p>
          <p className="muted-copy">After reception check-in, the visit appears in the assigned doctor's worklist. Reception cannot manually push a patient into a later department.</p>
        </Card>
      </aside>
    </div>
  );
}

function DoctorScreen({ visit, currentUser, onSelectVisit, onStartConsultation, onReviewReport, onSaveConsultation, onSendLabRequest, onSendPharmacyRequest }: {
  visit: Visit;
  currentUser: HospitalUser;
  onSelectVisit: (visitId: string) => void;
  onStartConsultation: () => void;
  onReviewReport: () => void;
  onSaveConsultation: (payload: { note: string; provisionalDiagnosis: string; advice: string }) => void;
  onSendLabRequest: (payload: { pathLabId: string; testIds: string[] }) => void;
  onSendPharmacyRequest: (payload: { pharmacyId: string; prescriptionLines: string[] }) => void;
}) {
  const [note, setNote] = useState(visit.consultation.note);
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(visit.consultation.provisionalDiagnosis);
  const [advice, setAdvice] = useState(visit.consultation.advice);
  const [selectedPathLabId, setSelectedPathLabId] = useState(visit.pathology.selectedPathLabId || visit.adminSetup.serviceUnits.pathLabs[0]?.id || "");
  const [selectedLabTestIds, setSelectedLabTestIds] = useState<string[]>(visit.pathology.requestedTests.map((test) => test.id));
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(visit.pharmacy.selectedPharmacyId || visit.adminSetup.serviceUnits.pharmacies[0]?.id || "");
  const [prescriptionText, setPrescriptionText] = useState(visit.pharmacy.prescriptionLines.join("\n"));
  const [testSearch, setTestSearch] = useState("");
  const routedPatients = useMemo(() => (visit.worklists?.doctor || visit.reception.queue).filter((entry) => !entry.demoOnly), [visit.reception.queue, visit.worklists?.doctor]);
  const [selectedAppointmentVisitId, setSelectedAppointmentVisitId] = useState(visit.id || routedPatients[0]?.visitId || "");
  const selectedAppointment = routedPatients.find((entry) => entry.visitId === selectedAppointmentVisitId) || routedPatients[0];
  const assignedDoctorProfile = visit.adminSetup.doctors.find((doctor) => comparableDoctorName(doctor.name) === comparableDoctorName(visit.patient.doctor));
  const isAssignedDoctor = Boolean(visit.patient.name && (
    currentUser.role === "ADMIN" || (assignedDoctorProfile?.loginEmail
      ? assignedDoctorProfile.loginEmail.toLowerCase() === currentUser.email.toLowerCase()
      : comparableDoctorName(currentUser.name) === comparableDoctorName(visit.patient.doctor))
  ));
  const selectedPathLab = visit.adminSetup.serviceUnits.pathLabs.find((lab) => lab.id === selectedPathLabId);
  const availableTests = selectedPathLab?.testIds.length
    ? visit.adminSetup.labTests.filter((test) => selectedPathLab.testIds.includes(test.id))
    : visit.adminSetup.labTests;
  const activeAppointmentSelected = selectedAppointment?.visitId === visit.id;
  const labRequestText = [
    `Patient: ${visit.patient.name}`,
    `Token: ${visit.patient.token}`,
    `Doctor: ${visit.patient.doctor}`,
    `Department: ${visit.patient.department}`,
    `Requested pathlab: ${selectedPathLab?.name || "Patient may use outside lab"}`,
    "",
    "Tests:",
    ...(visit.pathology.requestedTests.length ? visit.pathology.requestedTests.map((test) => `- ${test.name} (${test.sampleType || "sample as advised"})`) : availableTests.filter((test) => selectedLabTestIds.includes(test.id)).map((test) => `- ${test.name} (${test.sampleType || "sample as advised"})`))
  ].join("\n");
  const prescriptionPrintText = [
    `Patient: ${visit.patient.name}`,
    `Token: ${visit.patient.token}`,
    `Doctor: ${visit.patient.doctor}`,
    `Department: ${visit.patient.department}`,
    "",
    "Prescription:",
    ...(prescriptionText.trim() ? prescriptionText.split("\n").map((line) => `- ${line.trim()}`).filter((line) => line !== "-") : visit.pharmacy.prescriptionLines.map((line) => `- ${line}`))
  ].join("\n");
  const diagnosticReportText = visit.pathology.reportFile?.content || [
    `Diagnostic report for ${visit.patient.name}`,
    `Token: ${visit.patient.token}`,
    `Tests: ${visit.pathology.requestedTests.map((test) => test.name).join(", ") || "Not specified"}`,
    "",
    ...visit.pathology.cbcRows.map((row) => `${row.parameter}: ${row.value} ${row.unit} (${row.interval}) ${row.flag}`)
  ].join("\n");

  useEffect(() => {
    const activeQueuedAppointment = routedPatients.some((entry) => entry.visitId === visit.id);
    setSelectedAppointmentVisitId(activeQueuedAppointment ? visit.id : routedPatients[0]?.visitId || "");
  }, [routedPatients, visit.id]);

  function toggleLabTest(id: string) {
    setSelectedLabTestIds((current) => current.includes(id) ? current.filter((testId) => testId !== id) : [...current, id]);
  }

  return (
    <div className="clinical-columns doctor-layout">
      <QueueRail title="Live OPD queue" entries={routedPatients} activeId={visit.id} onSelect={onSelectVisit} />
      <section className="screen-stack">
        {!isAssignedDoctor ? (
          <Card>
            <div className="section-title">
              <h2>No patient assigned to this doctor</h2>
              <StatusChip tone="info">{currentUser.name}</StatusChip>
            </div>
            <p className="muted-copy">Patients booked with another doctor are hidden from this workspace. Book or route a patient to this doctor, or update the doctor-user mapping in Application Setup.</p>
            {routedPatients.length ? (
              <>
                <label className="field">
                  <span>Select patient from your doctor worklist</span>
                  <select value={selectedAppointmentVisitId} onChange={(event) => {
                    setSelectedAppointmentVisitId(event.target.value);
                    onSelectVisit(event.target.value);
                  }}>
                    {routedPatients.map((entry) => (
                      <option key={`${entry.visitId || entry.token}-${entry.token}`} value={entry.visitId}>{entry.token} · {entry.patient} · {entry.appointment} · {entry.status}</option>
                    ))}
                  </select>
                </label>
                {selectedAppointment?.visitId ? <button className="secondary-action wide" type="button" onClick={() => onSelectVisit(selectedAppointment.visitId!)}>Open selected patient</button> : null}
              </>
            ) : null}
          </Card>
        ) : null}
        {isAssignedDoctor ? (
          <Card>
            <div className="section-title">
              <h2>{visit.patient.name}</h2>
              <StatusChip tone="primary">{routedPatients.length} appointment(s)</StatusChip>
            </div>
            <label className="field">
              <span>Doctor worklist appointment</span>
              <select value={selectedAppointmentVisitId} onChange={(event) => {
                setSelectedAppointmentVisitId(event.target.value);
                onSelectVisit(event.target.value);
              }}>
                {routedPatients.map((entry) => (
                  <option key={`${entry.visitId || entry.token}-${entry.token}`} value={entry.visitId}>{entry.token} · {entry.patient} · {entry.appointment} · {entry.status}</option>
                ))}
              </select>
            </label>
            <div className="reason-panel">
              <span>Symptoms / reason captured at kiosk</span>
              <p>{visit.patient.reason || "No symptom text captured yet."}</p>
            </div>
            <details className="clinical-history">
              <summary>Previous history & reports ({visit.consultation.priorReports?.length || 0})</summary>
            <div className="reason-panel">
              <span>Prior hospital history AI summary</span>
              <p>{visit.consultation.priorHistorySummary || visit.patient.historySummary || "No previous history matched this patient identity."}</p>
            </div>
            <div className="reason-panel">
              <span>Prior hospital pathlab reports</span>
              {visit.consultation.priorReports?.length ? (
                <div className="compact-list">
                  {visit.consultation.priorReports.map((report) => (
                    <span key={`${report.visitId}-${report.title}`}>
                      <strong>{report.title}</strong>
                      {report.status} · {report.fileName || "Hospital report"} · {report.date || report.uploadedAt || "Date unavailable"}
                      <button className="secondary-action inline-action" type="button" onClick={() => downloadTextFile(`${report.fileName || report.visitId || "pathlab-report"}.txt`, report.detail)}>
                        Download
                      </button>
                      <button className="secondary-action inline-action" type="button" onClick={() => openPrintableDocument("Prior pathlab report", report.detail)}>
                        Print
                      </button>
                    </span>
                  ))}
                </div>
              ) : <p>No previous hospital pathlab reports found for this patient.</p>}
            </div>
            </details>
            {!activeAppointmentSelected && selectedAppointment?.visitId ? <button className="secondary-action wide" type="button" onClick={() => onSelectVisit(selectedAppointment.visitId!)}>Open selected appointment</button> : null}
          </Card>
        ) : null}
        {isAssignedDoctor ? <Card>
          <div className="section-title">
            <h2>Consultation workspace</h2>
            <StatusChip tone="warning">Clinician authored</StatusChip>
          </div>
          {visit.journeyInstance.status === "WAITING_FOR_CONSULTATION" ? (
            <button className="primary-action wide" type="button" onClick={onStartConsultation}>
              <Icon name="mic" size={18} />
              Record conversation for selected patient
            </button>
          ) : null}
          <label className="field">
            <span>Clinical notes / examination</span>
            <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Provisional diagnosis</span>
              <input value={provisionalDiagnosis} onChange={(event) => setProvisionalDiagnosis(event.target.value)} />
            </label>
            <label className="field">
              <span>Advice / follow-up instruction</span>
              <input value={advice} onChange={(event) => setAdvice(event.target.value)} />
            </label>
          </div>
          <button className="primary-action" type="button" onClick={() => onSaveConsultation({ note, provisionalDiagnosis, advice })}>
            <Icon name="save" size={18} />
            Save consultation note
          </button>
        </Card> : null}

        {isAssignedDoctor && visit.pathology.status === "Report ready" ? <Card>
          <div className="section-title"><h2>Diagnostic report available</h2><StatusChip tone="success">Doctor review required</StatusChip></div>
          {visit.pathology.reportFile ? <p className="muted-copy">Uploaded report: {visit.pathology.reportFile.name}</p> : null}
          <table className="data-table">
            <thead><tr><th>Parameter</th><th>Value</th><th>Interval</th><th>Flag</th></tr></thead>
            <tbody>{visit.pathology.cbcRows.map((row) => <tr key={row.parameter}><td>{row.parameter}</td><td>{row.value} {row.unit}</td><td>{row.interval}</td><td><StatusChip tone={row.flag === "Low" ? "warning" : "success"}>{row.flag}</StatusChip></td></tr>)}</tbody>
          </table>
          <div className="action-row">
            <button className="secondary-action" type="button" onClick={() => downloadTextFile(`${visit.patient.token || visit.id}-diagnostic-report.txt`, diagnosticReportText)}>
              <Icon name="download" size={18} />
              Download report
            </button>
            <button className="secondary-action" type="button" onClick={() => openPrintableDocument("Diagnostic report", diagnosticReportText)}>
              <Icon name="print" size={18} />
              Print report
            </button>
          </div>
          <button className="primary-action" type="button" onClick={onReviewReport}>
            <Icon name="fact_check" size={18} />
            Review report and continue care plan
          </button>
        </Card> : null}

      </section>
      <aside className="screen-stack order-rail">
        {isAssignedDoctor ? <Card>
          <div className="section-title"><h2>Laboratory diagnostics order</h2><StatusChip tone={visit.consultation.labRequests.length ? "success" : "info"}>{visit.pathology.status}</StatusChip></div>
          <div className="form-grid">
            <label className="field">
              <span>Send to pathlab</span>
              <select value={selectedPathLabId} onChange={(event) => {
                setSelectedPathLabId(event.target.value);
                setSelectedLabTestIds([]);
              }}>
                <option value="">Select pathlab</option>
                {visit.adminSetup.serviceUnits.pathLabs.map((lab) => <option key={lab.id} value={lab.id}>{lab.name} · {lab.location}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>Search tests ({selectedLabTestIds.length} selected)</span><input value={testSearch} onChange={(event) => setTestSearch(event.target.value)} placeholder="Test name or category" /></label>
          <div className="module-grid test-picker">
            {availableTests.filter((test) => `${test.name} ${test.category}`.toLowerCase().includes(testSearch.toLowerCase())).map((test) => (
              <label key={test.id} className="module-toggle">
                <input type="checkbox" checked={selectedLabTestIds.includes(test.id)} onChange={() => toggleLabTest(test.id)} />
                <span><strong>{test.name}</strong><small>{test.category || "Lab test"} · {test.sampleType || "sample not specified"}</small></span>
              </label>
            ))}
          </div>
          {!availableTests.length ? <p className="muted-copy">No lab tests are configured for this pathlab. Configure lab tests in Application Setup first.</p> : null}
          <button className="primary-action" type="button" disabled={!selectedPathLabId || !selectedLabTestIds.length} onClick={() => onSendLabRequest({ pathLabId: selectedPathLabId, testIds: selectedLabTestIds })}>
            <Icon name="biotech" size={18} />
            Confirm diagnostic order
          </button>
          <button className="secondary-action" type="button" disabled={!selectedLabTestIds.length && !visit.pathology.requestedTests.length} onClick={() => openPrintableDocument("Pathlab test request", labRequestText)}>
            <Icon name="print" size={18} />
            Print outside lab request
          </button>
        </Card> : null}

        {isAssignedDoctor ? <Card>
          <div className="section-title"><h2>Prescription / pharmacy request</h2><StatusChip tone={visit.consultation.pharmacyRequests.length ? "success" : "info"}>{visit.pharmacy.fulfilmentStatus}</StatusChip></div>
          <label className="field">
            <span>Send to pharmacy</span>
            <select value={selectedPharmacyId} onChange={(event) => setSelectedPharmacyId(event.target.value)}>
              <option value="">Select pharmacy</option>
              {visit.adminSetup.serviceUnits.pharmacies.map((pharmacy) => <option key={pharmacy.id} value={pharmacy.id}>{pharmacy.name} · {pharmacy.location}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Prescription lines</span>
            <textarea rows={5} value={prescriptionText} onChange={(event) => setPrescriptionText(event.target.value)} placeholder="One medicine/instruction per line" />
          </label>
          <button className="primary-action" type="button" disabled={!selectedPharmacyId || !prescriptionText.trim()} onClick={() => onSendPharmacyRequest({ pharmacyId: selectedPharmacyId, prescriptionLines: prescriptionText.split("\n").map((line) => line.trim()).filter(Boolean) })}>
            <Icon name="local_pharmacy" size={18} />
            Finalize prescription to pharmacy
          </button>
          <button className="secondary-action" type="button" disabled={!prescriptionText.trim() && !visit.pharmacy.prescriptionLines.length} onClick={() => openPrintableDocument("Prescription", prescriptionPrintText)}>
            <Icon name="print" size={18} />
            Print outside prescription
          </button>
        </Card> : null}
        {isAssignedDoctor ? <Card>
          <div className="section-title"><h2>Requests sent</h2><StatusChip tone="info">Separate queues</StatusChip></div>
          <OrderItem icon="biotech" title="Pathlab requests" detail={visit.consultation.labRequests.length ? `${visit.pathology.requestedTests.map((test) => test.name).join(", ")} sent to lab.` : "No lab request sent yet."} />
          <OrderItem icon="medication" title="Pharmacy requests" detail={visit.pharmacy.prescriptionLines.length ? `${visit.pharmacy.prescriptionLines.length} prescription line(s) queued.` : "No prescription sent yet."} />
        </Card> : null}
        {visit.consultation.labRequests.length ? <Card tone="muted"><h3>Next steps visible</h3><p>Selected tests appear in the pathology worklist. Prescriptions appear in pharmacy after the doctor sends them separately.</p></Card> : null}
      </aside>
    </div>
  );
}

function PathologyScreen({ visit, config, onSelectVisit, setStatus }: { visit: Visit; config: AppConfig; onSelectVisit: (visitId: string) => void; setStatus: (payload: { status: PathologyStatus; reportName?: string; reportContent?: string }) => void }) {
  const currentStatusIndex = Math.max(config.pathologyStatuses.indexOf(visit.pathology.status), -1);
  const selectedLab = visit.adminSetup.serviceUnits.pathLabs.find((lab) => lab.id === visit.pathology.selectedPathLabId);
  const pathologyQueue = visit.worklists?.pathology || [];
  const activeInPathologyQueue = pathologyQueue.some((row) => row.visitId === visit.id);
  const [selectedPathologyVisitId, setSelectedPathologyVisitId] = useState(activeInPathologyQueue ? visit.id : pathologyQueue[0]?.visitId || "");
  const selectedPathologyEntry = pathologyQueue.find((row) => row.visitId === selectedPathologyVisitId) || pathologyQueue[0];
  const [reportName, setReportName] = useState(visit.pathology.reportFile?.name || "");
  const [reportContent, setReportContent] = useState(visit.pathology.reportFile?.content || "");
  useEffect(() => {
    setSelectedPathologyVisitId(activeInPathologyQueue ? visit.id : pathologyQueue[0]?.visitId || "");
  }, [activeInPathologyQueue, pathologyQueue, visit.id]);
  useEffect(() => {
    setReportName(visit.pathology.reportFile?.name || "");
    setReportContent(visit.pathology.reportFile?.content || "");
  }, [visit.id, visit.pathology.reportFile?.name, visit.pathology.reportFile?.content]);
  function submitPathologyStatus(status: PathologyStatus) {
    setStatus({ status, reportName, reportContent });
  }
  async function readReportFile(file: File | null) {
    if (!file) return;
    setReportName(file.name);
    if (file.type.startsWith("text/")) {
      setReportContent(await file.text());
      return;
    }
    setReportContent(`Uploaded file: ${file.name}\nType: ${file.type || "unknown"}\nSize: ${file.size} bytes\n\nBinary report file captured for doctor download/print workflow.`);
  }
  if (!activeInPathologyQueue) return <div className="clinical-columns pathology-layout"><QueueRail title="Accession queue" entries={pathologyQueue} activeId="" onSelect={onSelectVisit} /><Card><h2>{pathologyQueue.length ? "Select a diagnostic request" : "No pending diagnostic requests"}</h2></Card></div>;
  return (
    <div className="clinical-columns pathology-layout">
      <QueueRail title="Accession queue" entries={pathologyQueue} activeId={visit.id} onSelect={onSelectVisit} />
      <section className="screen-stack">
        <Card>
          <div className="section-title">
            <div><StatusChip tone="primary">Lab request</StatusChip><h2>{visit.patient.name || "No active patient"}</h2></div>
            <StatusChip tone={visit.pathology.status === "Report ready" ? "success" : "warning"}>{visit.pathology.status}</StatusChip>
          </div>
          <p className="muted-copy">{selectedLab ? `Assigned to ${selectedLab.name}, ${selectedLab.location}` : "No pathlab has been selected yet."}</p>
          <div className="status-stepper">
            {config.pathologyStatuses.map((step) => (
              <button key={step} type="button" onClick={() => submitPathologyStatus(step)} disabled={step === "Report ready" && !reportName.trim() && !visit.pathology.reportFile} className={config.pathologyStatuses.indexOf(step) <= currentStatusIndex ? "step-done" : ""}>
                <Icon name={config.pathologyStatuses.indexOf(step) <= currentStatusIndex ? "check" : "radio_button_unchecked"} />
                {step}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <div className="section-title"><h2>Report upload</h2><StatusChip tone={visit.pathology.reportFile ? "success" : "warning"}>{visit.pathology.reportFile ? "Uploaded" : "Required before ready"}</StatusChip></div>
          <label className="field">
            <span>Upload report file</span>
            <input type="file" onChange={(event) => readReportFile(event.target.files?.[0] || null)} />
          </label>
          <label className="field">
            <span>Report file name</span>
            <input value={reportName} onChange={(event) => setReportName(event.target.value)} placeholder="CBC-report.pdf" />
          </label>
          <label className="field">
            <span>Report summary / extracted text</span>
            <textarea rows={5} value={reportContent} onChange={(event) => setReportContent(event.target.value)} placeholder="Paste report findings or upload a text report." />
          </label>
          <button className="primary-action wide" type="button" disabled={!reportName.trim()} onClick={() => submitPathologyStatus("Report ready")}>
            <Icon name="upload_file" size={18} />
            Submit uploaded report to doctor
          </button>
        </Card>
      </section>
      <aside className="screen-stack">
        <Card>
          <div className="section-title"><h2>Requested tests</h2><StatusChip tone="warning">{visit.pathology.requestedTests.length} test(s)</StatusChip></div>
          <table className="data-table">
            <thead><tr><th>Test</th><th>Category</th><th>Sample</th><th>Status</th></tr></thead>
            <tbody>{visit.pathology.requestedTests.map((test) => <tr key={test.id}><td>{test.name}</td><td>{test.category}</td><td>{test.sampleType}</td><td><StatusChip tone="info">{visit.pathology.status}</StatusChip></td></tr>)}</tbody>
          </table>
          {!visit.pathology.requestedTests.length ? <p className="muted-copy">No tests have been sent by the doctor yet.</p> : null}
        </Card>
        <Card tone="muted"><h3>Loop broadcast</h3><p>When reports are ready, they become visible in doctor review and patient follow-up.</p><button className="primary-action wide" type="button" disabled={!reportName.trim() && !visit.pathology.reportFile} onClick={() => submitPathologyStatus("Report ready")}>Submit report to doctor</button></Card>
      </aside>
    </div>
  );
}

function PharmacyScreen({ visit, config, role, onSelectVisit, onReview, onDispense, onInvoice, onPay }: { visit: Visit; config: AppConfig; role: Role; onSelectVisit: (visitId: string) => void; onReview: () => void; onDispense: () => void; onInvoice: () => void; onPay: () => void }) {
  const [billingView, setBillingView] = useState(false);
  const cashier = role === "CASHIER" || (role === "ADMIN" && billingView);
  const canBill = cashier || role === "ADMIN";
  const queue = cashier ? visit.worklists?.billing || [] : visit.worklists?.pharmacy || [];
  const total = visit.billing.lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const activeInQueue = queue.some(row => row.visitId === visit.id);
  return <div className="screen-stack">
    {role === "ADMIN" && <nav className="setup-tabs" aria-label="Dispensing and billing"><button type="button" className={!billingView ? "selected" : ""} onClick={() => setBillingView(false)}>Pharmacy dispensing</button><button type="button" className={billingView ? "selected" : ""} onClick={() => setBillingView(true)}>Central billing & accounts</button></nav>}
    <div className="clinical-columns pharmacy-layout">
    <QueueRail title={cashier ? "Billing queue" : "Prescription queue"} entries={queue} activeId={visit.id} onSelect={onSelectVisit} />
    {!activeInQueue ? <Card><h2>{queue.length ? "Select a patient from the queue" : "No pending visits"}</h2></Card> : <>
    <section className="screen-stack">
      {cashier ? <Card>
        <div className="section-title"><h2>Consolidated invoice</h2><StatusChip tone="info">{visit.billing.status}</StatusChip></div>
        <div className="bill-list">{visit.billing.lines.map((line) => <div key={line.label}><span><strong>{line.label}</strong><small>{line.detail}</small></span><strong>{formatInrMinor(line.amountMinor)}</strong></div>)}</div>
        {!visit.billing.lines.length && <p className="muted-copy">No invoice items for this visit.</p>}
        <div className="bill-total"><span>Net payable</span><strong>{formatInrMinor(total)}</strong></div>
      </Card> : <Card>
        <div className="section-title"><h2>Clinical prescription verification</h2><StatusChip tone={visit.pharmacy.reviewCompleted ? "success" : "warning"}>{visit.pharmacy.fulfilmentStatus}</StatusChip></div>
        <div className="reason-panel"><span>Prescribing doctor</span><p>{visit.patient.doctor || "Not assigned"}</p></div>
        <h3>Prescribed items</h3>
        <div className="prescription-items">{visit.pharmacy.prescriptionLines.map((line, index) => <div key={index}><Icon name="medication" size={20} /><p>{line}</p></div>)}</div>
        {!visit.pharmacy.prescriptionLines.length && <p className="muted-copy">No prescription for this visit.</p>}
        <label className="review-check"><input type="checkbox" checked={visit.pharmacy.reviewCompleted} onChange={onReview} disabled={visit.pharmacy.reviewCompleted || !visit.pharmacy.prescriptionLines.length} /><span>Prescription reviewed by pharmacist</span></label>
        <button className="primary-action wide" type="button" disabled={!visit.pharmacy.reviewCompleted || visit.pharmacy.fulfilmentStatus === "Dispensed"} onClick={onDispense}><Icon name="task_alt" size={18} />{visit.pharmacy.fulfilmentStatus === "Dispensed" ? "Medication dispensed" : "Confirm dispensing"}</button>
      </Card>}
    </section>
    <aside className="screen-stack"><Card>
      <div className="section-title"><h2>{cashier ? "Tender & settlement" : "Visit invoice summary"}</h2><StatusChip tone={visit.billing.status === "Paid" ? "success" : "warning"}>{visit.billing.status}</StatusChip></div>
      {!cashier && <div className="bill-list">{visit.billing.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong>{formatInrMinor(line.amountMinor)}</strong></div>)}</div>}
      <div className="bill-total"><span>Total payable</span><strong>{formatInrMinor(total)}</strong></div>
      {canBill && <><button className="secondary-action wide" type="button" disabled={!visit.billing.lines.length || visit.billing.status !== "Pending"} onClick={onInvoice}><Icon name="receipt_long" size={18} />Generate invoice</button><button className="primary-action wide" type="button" disabled={visit.billing.status !== "Payment pending"} onClick={onPay}><Icon name="payments" size={18} />{visit.billing.status === "Paid" ? "Payment recorded" : "Record received UPI payment"}</button></>}
      <button className="secondary-action wide" type="button" disabled={!visit.billing.lines.length} onClick={() => openPrintableDocument("Visit invoice", [visit.patient.hospital, visit.patient.name, "Visit: " + visit.patient.visitId, ...visit.billing.lines.map((line) => line.label + ": " + formatInrMinor(line.amountMinor)), "Total: " + formatInrMinor(total), "Status: " + visit.billing.status].join("\n"))}><Icon name="print" size={18} />Print invoice</button>
    </Card></aside></>}
  </div></div>;
}

function PatientScreen({ visit, onToggleReminders, onNext, onComplete }: { visit: Visit; onToggleReminders: () => void; onNext: () => void; onComplete: () => void }) {
  return (
    <div className="two-column wide-left">
      <section className="screen-stack">
        <Card className="patient-hero"><StatusChip tone="primary">{visit.journeyInstance.status.replaceAll("_", " ")}</StatusChip><h2>Namaste, {visit.patient.name}</h2><p>Your visit summary for {visit.patient.appointment} with {visit.patient.doctor} at {visit.patient.hospital}.</p></Card>
        <div className="timeline-list">{visit.journeyEvents.map((event, index) => <Card key={`${event.stepCode || event.stage}-${index}`} className="timeline-card"><StatusChip tone={event.status === "complete" ? "success" : "primary"}>{event.timestamp}</StatusChip><div><h3>{event.title}</h3><p>{event.detail}</p></div></Card>)}</div>
      </section>
      <aside className="screen-stack">
        <Card className="phone-preview"><div className="phone-frame"><div className="phone-screen"><div className="phone-top"><strong>{visit.patient.name}</strong><Icon name="notifications" /></div><div className="phone-card"><span>Today's visit</span><strong>{visit.patient.doctor}</strong><small>Lab {visit.pathology.status.toLowerCase()} · Billing {visit.billing.status.toLowerCase()}</small></div><div className="phone-row"><Icon name="lab_profile" /> {visit.pathology.requestedTests.length} lab test(s) in record</div><div className="phone-row"><Icon name="receipt_long" /> Invoice {visit.billing.status.toLowerCase()}</div><div className="phone-row"><Icon name="event_repeat" /> {visit.followUp.scheduled ? "Follow-up scheduled" : "Follow-up pending"}</div></div></div></Card>
        <Card>
          <h3>Follow-up care</h3>
          <MiniFact label="Appointment" value={visit.followUp.scheduled ? visit.followUp.appointment : "Not scheduled"} />
          <MiniFact label="Reminder" value={visit.followUp.remindersOn ? "WhatsApp/SMS reminder on" : "Reminder muted"} />
          <button className="secondary-action" type="button" onClick={onToggleReminders}>{visit.followUp.remindersOn ? "Turn reminder off" : "Turn reminder on"}</button>
          <button className="primary-action wide" type="button" onClick={onNext} disabled={visit.followUp.scheduled}>Schedule follow-up</button>
          <button className="secondary-action wide" type="button" onClick={onComplete} disabled={!visit.followUp.scheduled || visit.journeyInstance.status === "VISIT_COMPLETED"}>Complete visit</button>
        </Card>
      </aside>
    </div>
  );
}

function OperationsScreen({ visit, onSelectVisit, onWorkspace }: { visit: Visit; onSelectVisit: (id: string) => void; onWorkspace?: (stage: StageId) => void }) {
  const departments = [["reception", "Reception", "how_to_reg"], ["doctor", "Doctor consultations", "stethoscope"], ["pathology", "Pathology", "biotech"], ["pharmacy", "Pharmacy", "medication"], ["billing", "Central billing", "receipt_long"]] as const;
  return (
    <div className="screen-stack">
      {onWorkspace && <nav className="workspace-launch" aria-label="Open workspace">{departments.map(([key, label, icon]) => <button className="secondary-action" key={key} type="button" onClick={() => onWorkspace(key === "billing" ? "pharmacy" : key)}><Icon name={icon} size={18} />{label}</button>)}</nav>}
      <div className="metrics-grid department-metrics">{departments.map(([key, label, icon]) => <Metric key={key} icon={icon} label={label} value={String(visit.worklists?.[key]?.length || 0)} detail="Pending visits" />)}</div>
      <Card><div className="section-title"><h2>Hospital visit roster</h2><StatusChip tone="info">{visit.worklists?.operations.length || 0} visits</StatusChip></div><label className="field"><span>Selected patient journey</span><select value={visit.id} onChange={(event) => onSelectVisit(event.target.value)}>{!visit.worklists?.operations.some(row => row.visitId === visit.id) && <option value={visit.id}>Select visit</option>}{visit.worklists?.operations.map(row => <option key={row.visitId} value={row.visitId}>{row.token} · {row.patient} · {row.status}</option>)}</select></label></Card>
      <Card>
        <div className="section-title"><h2>Next action engine</h2><StatusChip tone="primary">{visit.nextAction.currentStatus.replace(/_/g, " ")}</StatusChip></div>
        <div className="appointment-detail-grid">
          <MiniFact label="Current step" value={visit.nextAction.currentStep} />
          <MiniFact label="Next action" value={visit.nextAction.label} />
          <MiniFact label="Owner" value={visit.nextAction.ownerRole} />
          <MiniFact label="Visit" value={visit.patient.visitId || visit.id} />
        </div>
      </Card>
      <div className="ops-grid">{visit.journeyEvents.map((event, index) => <Card key={`${event.stepCode || event.stage}-${index}`} className="ops-card"><div className="ops-number">{index + 1}</div><div><h3>{event.title}</h3><p>{event.detail}</p><StatusChip tone={event.status === "pending" ? "warning" : event.status === "current" ? "primary" : "success"}>{event.status}</StatusChip></div><strong>{event.owner}</strong></Card>)}</div>
      <Card>
        <div className="section-title"><h2>Recent audit events</h2><StatusChip tone="info">Backend-enforced actions</StatusChip></div>
        <table className="data-table">
          <thead><tr><th>When</th><th>Role</th><th>Action</th><th>Correlation</th></tr></thead>
          <tbody>{visit.auditEvents.slice(0, 6).map((event) => <tr key={event.id}><td>{new Date(event.occurredAt).toLocaleString()}</td><td>{event.actorRole}</td><td>{event.action}</td><td>{event.correlationId || "-"}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  );
}

function ChoiceCard({ icon, title, hindi, detail, featured = false, action, onClick }: { icon: string; title: string; hindi: string; detail: string; featured?: boolean; action?: string; onClick?: () => void }) {
  return <Card className={`choice-card ${featured ? "choice-featured" : ""}`}>{featured ? <StatusChip tone="info" icon="touch_app">Primary action</StatusChip> : null}<Icon name={icon} size={34} /><div><h3>{title}</h3><p className="hindi">{hindi}</p><p>{detail}</p></div>{action ? <button className="primary-action" type="button" onClick={onClick}>{action}<Icon name="arrow_forward" size={18} /></button> : <span className="card-link">Available at kiosk</span>}</Card>;
}

function Question({ number, title, hindi, answer, success = false }: { number: string; title: string; hindi: string; answer: string; success?: boolean }) {
  return <div className="question-row"><span className={success ? "question-number success-dot" : "question-number"}>{number}</span><div><strong>{title}</strong><small>{hindi}</small><p>{answer}</p></div></div>;
}

function Metric({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return <Card className="metric-card"><Icon name={icon} /><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></Card>;
}

function MiniAction({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="mini-action"><Icon name={icon} /><div><strong>{title}</strong><span>{detail}</span></div></div>;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="mini-fact"><span>{label}</span><strong>{value}</strong></div>;
}

function NoteBlock({ title, text }: { title: string; text: string }) {
  return <div className="note-block"><strong>{title}</strong><p>{text}</p></div>;
}

function OrderItem({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return <div className="order-item"><Icon name={icon} /><div><strong>{title}</strong><span>{detail}</span></div></div>;
}

export default App;
