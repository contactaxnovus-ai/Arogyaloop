import { useState, type ReactNode } from "react";
import type { AppConfig, HospitalUser, Patient, StageId } from "../types";
import { Icon } from "./Icon";
import { StatusChip } from "./StatusChip";

interface AppShellProps {
  activeStage: StageId; adminMode: boolean; config: AppConfig;
  completedStages: Set<StageId>; currentUser: HospitalUser; patient: Patient;
  journeyStatus: string; currentStep: string; nextActionLabel: string; children: ReactNode; showPatientContext?: boolean;
  onAdminSelect: () => void; onLogout: () => void;
  onStageSelect: (stage: StageId) => void; onNext: () => void; onReset: () => void;
}
const workspaceLabels: Partial<Record<StageId, string>> = {
  reception: "Reception Omni-Channel Hub", doctor: "Doctor Clinical Workspace",
  pathology: "Pathology Diagnostics", pharmacy: "Pharmacy Dispensing",
  operations: "Admin Operations Hub", patient: "Patient & Follow-up"
};
export function AppShell({ activeStage, adminMode, config, currentUser, patient, journeyStatus, nextActionLabel, children, onAdminSelect, onLogout, onStageSelect, showPatientContext = true }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const label = (id: StageId, fallback: string) => id === "pharmacy" && currentUser.role === "CASHIER" ? "Central Billing & Accounts" : workspaceLabels[id] || fallback;
  const active = config.stages.find((stage) => stage.id === activeStage);
  return (
    <div className={`app-shell clinical-shell ${menuOpen ? "navigation-open" : ""}`}>
      <header className="topbar"><div className="topbar-main">
        <button className="icon-button navigation-toggle" type="button" aria-label="Toggle workspaces" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
        <div className="brand-mark"><span className="brand-symbol"><Icon name="local_hospital" size={26} /></span><div><strong>{patient.hospital || config.hospitalName}</strong><span>{config.productName} by Axnovus</span></div></div>
        <div className="topbar-actions"><StatusChip tone="warning">{config.integrationLabel}</StatusChip><div className="staff-identity"><strong>{currentUser.name}</strong><span>{currentUser.role.replace(/_/g, " ")}</span></div><button type="button" className="icon-button" title="Log out" aria-label="Log out" onClick={onLogout}><Icon name="logout" /></button></div>
      </div></header>
      <aside className="sidebar" aria-label="Workspaces">
        <span className="sidebar-label">Workspaces</span>
        {config.stages.map((stage) => <button type="button" key={stage.id} aria-current={!adminMode && activeStage === stage.id ? "page" : undefined} className={`side-link ${!adminMode && activeStage === stage.id ? "side-link-active" : ""}`} onClick={() => { onStageSelect(stage.id); setMenuOpen(false); }}><Icon name={stage.icon} size={20} /><span>{label(stage.id, stage.label)}</span></button>)}
        {currentUser.role === "ADMIN" && <button type="button" aria-current={adminMode ? "page" : undefined} className={`side-link ${adminMode ? "side-link-active" : ""}`} onClick={() => { onAdminSelect(); setMenuOpen(false); }}><Icon name="settings" size={20} /><span>Hospital System Settings</span></button>}
        <div className="sidebar-note"><strong>{config.productName}</strong><span>{config.integrationLabel}</span></div>
      </aside>
      <main className={`workspace workspace-${adminMode ? "setup" : activeStage}`}>
        <div className="page-heading"><div className="workspace-title"><span className="workspace-icon"><Icon name={adminMode ? "settings" : active?.icon || "dashboard"} size={24} /></span><div><h1>{adminMode ? "Hospital Application Setup" : label(activeStage, active?.label || "Workspace")}</h1><p>{adminMode ? "Facility and master configuration" : patient.department || "Hospital patient services"}</p></div></div><StatusChip tone="info" icon="auto_awesome">{config.aiReviewLabel}</StatusChip></div>
        {!adminMode && showPatientContext && patient.name && <div className="visit-context" aria-label="Selected patient context"><span><strong>{patient.name}</strong><small>{patient.age || "Age not recorded"} / {patient.gender || "Sex not recorded"}</small></span><span><small>Visit</small><strong>{patient.visitId || "Not created"}</strong></span><span><small>Token</small><strong>{patient.token || "Not issued"}</strong></span><StatusChip tone="info">{journeyStatus.replace(/_/g, " ")}</StatusChip><span className="context-next"><small>Next action</small><strong>{nextActionLabel || "No pending action"}</strong></span></div>}
        {children}
      </main>
    </div>
  );
}
