# ArogyaLoop by Axnovus — Comprehensive UX Architecture & System Specification
**Project Codex & Engineering Handoff Guide**  
**Target Domain:** Indian Multi-Specialty Hospital Patient Journey & Clinical Operations (ABDM / Ayushman Bharat M3 Compliant, NABH Accredited)  
**Document Version:** 4.2.0-Production  
**Author:** Axnovus Clinical Experience Architecture Team  

---

## 1. System Overview & Architectural Purpose

**ArogyaLoop by Axnovus** is an integrated, end-to-end hospital operational operating system designed specifically for the high-volume, multi-payer realities of Indian healthcare facilities. It solves critical hospital bottlenecks: long patient queues, fragmented billing across diagnostic/pharmacy departments, manual triage delays, and lack of real-time visibility for hospital administrators.

The user experience (UX) architecture is divided into **4 distinct, logically separated modules (folders)**:
1. **Module 01: Patient-Facing Self-Service Kiosk (Touch Terminal Fleet)**
2. **Module 02: Clinical & Departmental Operations Workspaces**
3. **Module 03: Revenue Cycle & Central Billing Desk**
4. **Module 04: Hospital Governance & System Master Setup**

Each module is detailed below with screen mappings, target user personas, technical workflows, data handoffs, and Codex/developer execution notes.

---

## 2. Logical Folders & UX Specification

```
📁 ArogyaLoop_UX_Master/
│
├── 📁 01_Patient_Self_Service_Kiosk/
│   ├── SCREEN_34: Reception Kiosk - Touch Terminal (Home / 3-Card Portal)
│   ├── SCREEN_24: Kiosk - Appointment QR Scan & Token Issue
│   ├── SCREEN_32: Kiosk - Register New Patient & ABDM ABHA Duplicate Check
│   ├── SCREEN_30: Kiosk - Find a Doctor & Department Directory
│   └── SCREEN_28: Kiosk - Guided Symptom Intake & Historical Records
│
├── 📁 02_Clinical_and_Departmental_Workspaces/
│   ├── SCREEN_26: Reception - Omni-Channel Hub & Assisted Desk
│   ├── SCREEN_16: Doctor - Clinical Workspace & CPOE (Outpatient Consultation Suite)
│   ├── SCREEN_20: Pathology Lab - CBC Diagnostic Bench & LIS Accessioning
│   └── SCREEN_18: Pharmacy - Dispensing, Clinical Safety & Billing Workspace
│
├── 📁 03_Revenue_Cycle_and_Administration/
│   ├── SCREEN_10: Central Billing & Accounts Workspace (Cashless, POS, Insurance Clearance)
│   └── SCREEN_14: Admin Operations Hub - Universal Access & Bottleneck Matrix
│
└── 📁 04_Hospital_Setup_and_Master_Configuration/
    ├── SCREEN_12: Tab 1 - Facility Legal Profile & Department Specialty Masters
    ├── SCREEN_08: Tab 2 - Doctor Duty Roster & Chamber Allocation Matrix
    ├── SCREEN_04: Tab 3 - Tariff Master, Payer Rate Matrix & Concession Policies
    ├── SCREEN_02: Tab 4 - Kiosk Fleet Hardware & Reception Terminal Config
    └── SCREEN_06: Tab 5 - Pathology LIS Analyzers & Pharmacy Master Config
```

---

### 📁 Folder 01: Patient-Facing Self-Service Kiosk (`01_Patient_Self_Service_Kiosk`)

* **Primary Persona:** Walk-in patients, pre-booked appointment holders, accompanying relatives (bilingual English/Hindi & regional dialects).
* **Hardware Target:** Standalone lobby kiosk terminals, 21.5"–32" vertical touch displays with 80mm ESC/POS thermal slip printer and 2D optical barcode/camera scanner.

#### 1.1 `SCREEN_34`: Reception Kiosk - Touch Terminal (Home Screen)
* **What it does:** The primary landing screen with zero visual clutter. Features high-contrast, tactile touch cards offering the three foundational patient entry points:
  1. *Scan Appointment QR / QR स्कैन करें*
  2. *Register New Patient & Create ABHA / नया मरीज पंजीकरण*
  3. *Find a Doctor & Consultation / डॉक्टर खोजें*
* **UX Nuances:** Features quick language toggling (English / Hindi / Regional dialect), accessibility audio cues, emergency red hotline bump button for immediate chest pain/trauma triage, and a 45-second auto-timeout countdown.

#### 1.2 `SCREEN_24`: Kiosk - Appointment QR Scan & Token Issue
* **What it does:** Instant 1-step token issuing for patients with pre-scheduled WhatsApp, SMS, or Arogya app appointments.
* **Functional Flow:**
  - Optical scanner reads appointment barcode/QR or accepts a 10-digit mobile number input.
  - Automatically fetches booked doctor (*e.g., Dr. Ananya Rao, MD*), chamber allocation (*Room 108, Ground Floor*), and generates consultation token (e.g. `#OPD-B42`).
  - Triggers the physical thermal printer to issue an 80mm slip with route directions and dispatches a live queue SMS alert.

#### 1.3 `SCREEN_32`: Kiosk - Register New Patient & ABDM ABHA Duplicate Check
* **What it does:** Allows walk-in patients to register in under 90 seconds while adhering to National Health Authority (NHA) ABDM M3 guidelines.
* **Functional Flow:**
  - Patient enters mobile number or Aadhaar number; triggers an OTP modal for biometric verification.
  - Automatically runs a deduplication check across existing Hospital Information System (HIS) records to prevent duplicate UHIDs (Unique Hospital Identification numbers).
  - Creates 14-digit ABHA ID, assigns Master UHID (`AL-2026-XXXX`), and routes the patient directly to guided specialty selection.

#### 1.4 `SCREEN_30`: Kiosk - Find a Doctor & Department Directory
* **What it does:** An intuitive interactive directory enabling patients to locate physicians by specialty (Cardiology, Orthopaedics, General Medicine, Pediatrics, Gynaecology) or doctor name.
* **Functional Flow:**
  - Displays live clinician availability indicators (*"Available Now"*, *"Chamber 108"*, *"Estimated Wait: ~15 mins"*).
  - Shows slot duration, consultation fee (₹600), and a 1-tap touch CTA to book the immediate next walk-in slot.

#### 1.5 `SCREEN_28`: Kiosk - Guided Symptom Intake & Historical Records
* **What it does:** Assisted symptom selector for patients unsure of which doctor to visit (e.g., chest tightness, joint pain, seasonal fever).
* **Functional Flow:**
  - Provides body map / visual symptom chips that recommend the appropriate clinical specialty.
  - Enables scanning of past paper prescriptions or previous discharge summaries via optical scanner to link to the patient's ABDM digital health locker.
  - Enforces a clinical safety guardrail: red-flag symptoms (e.g., crushing chest pain, SpO2 < 94%) bypass queue generation and alert the reception triage desk.

---

### 📁 Folder 02: Clinical & Departmental Operations Workspaces (`02_Clinical_and_Departmental_Workspaces`)

* **Primary Personas:** Reception duty officers, consulting physicians (MD/MS), laboratory pathologists, and licensed dispensing pharmacists.
* **Layout Paradigm:** High-density, clinical dashboard layout with persistent left navigation, shift status bar, and zero vertical clipping.

#### 2.1 `SCREEN_26`: Reception - Omni-Channel Hub & Assisted Desk
* **What it does:** The primary assisted operations console for hospital reception staff managing walk-ins, phone bookings, kiosk escalations, and VIP/geriatric overrides.
* **Functional Flow:**
  - Live desk queue overview with wait times and channel source breakdown (Walk-in vs Online vs Kiosk).
  - Quick action to manually issue tokens, reassign chambers, or execute an emergency triage bump.
  - Cash/Card POS interface for upfront OPD registration collection.

#### 2.2 `SCREEN_16`: Doctor - Clinical Workspace & CPOE (Outpatient Consultation Suite)
* **What it does:** High-efficiency consultation terminal for physicians (e.g., Dr. Ananya Rao, MD in Room 108).
* **Functional Flow:**
  - **Left Rail:** Real-time OPD queue list (`#B-14 Meera Sharma`, `#B-15 Rajesh Pareek`) with active consult timer and STAT alerts.
  - **Center Clinical Desk:** Comprehensive SOAP encounter notes (Subjective chief complaint, Objective vital signs with automatic BMI, Assessment with ICD-11 coding: *Iron Deficiency Anemia*).
  - **Right CPOE Rail:** 1-click Computerized Physician Order Entry:
    - Pathology order: Complete Blood Count (CBC with Peripheral Smear) marked STAT (₹420.00).
    - Pharmacy e-Prescription: Livogen-Z, Becosules-Z, and Thyronorm refill with automated drug allergy verification.
    - 14-day follow-up consultation scheduling.

#### 2.3 `SCREEN_20`: Pathology Lab - CBC Diagnostic Bench & LIS Accessioning
* **What it does:** Dedicated laboratory information system (LIS) workbench for medical technologists and certifying pathologists.
* **Functional Flow:**
  - Barcode scanning & sample accessioning (`#LAB-90412`, EDTA Lavender tube).
  - Bidirectional interface to diagnostic analyzers (Sysmex XN-1000) pulling raw WBC, RBC, Hemoglobin, Platelet counts.
  - Automated highlight of panic values (e.g. Hemoglobin 7.2 g/dL triggering an alert).
  - Pathologist electronic digital signature and instant broadcast of results to the doctor's CPOE and Central Billing.

#### 2.4 `SCREEN_18`: Pharmacy - Dispensing, Clinical Safety & Billing Workspace
* **What it does:** Outpatient pharmacy dispensing desk managing stock verification, drug safety checks, and medication labeling.
* **Functional Flow:**
  - Incoming queue connected directly to Doctor CPOE e-prescriptions.
  - 3-tier clinical safety check: Drug-drug interactions, contraindication alerts, and dosage verification.
  - Batch number and FEFO (First-Expiry-First-Out) tracking with 1-click packaging and thermal bilingual dosage instructions printing (English/Hindi).

---

### 📁 Folder 03: Revenue Cycle & Central Billing (`03_Revenue_Cycle_and_Administration`)

* **Primary Personas:** Hospital Billing Executives, TPA / Insurance Coordinators, Medical Superintendent, Hospital Administrator.

#### 3.1 `SCREEN_10`: Central Billing & Accounts Workspace
* **What it does:** Consolidated, single-invoice settlement desk aggregating charges across all hospital touchpoints for an encounter.
* **Functional Flow:**
  - **Unified Master Invoice:** Auto-aggregates OPD Consultation (₹600.00) + Pathology CBC/ESR tests (₹600.00) + Pharmacy medications (₹289.50) into a single master tax invoice (`₹1,489.50`).
  - **Multi-Tender Settlement:**
    - Live **Dynamic Bharat/UPI QR Code** that listens to banking webhooks for instant cashless settlement confirmation.
    - Cash tender quick calculator with exact change return computation.
    - Cashless TPA / Ayushman Bharat (PM-JAY) waiver clearance with zero patient co-pay.
  - Dispatches signed thermal receipts, WhatsApp invoices, and pushes records to the patient's ABDM health repository.

#### 3.2 `SCREEN_14`: Admin Operations Hub - Universal Access & Bottleneck Matrix
* **What it does:** High-level administrative command center providing oversight and 1-click administrative overrides across the entire hospital facility.
* **Functional Flow:**
  - **Universal Jump-Bar:** 1-click jump to any department (Reception, Doctor CPOE, Pathology, Pharmacy, Billing, IPD Beds, OT).
  - **Cross-Department Journey Bottleneck Matrix:** Live telemetry tracking queue depth, P90 wait times, and bottleneck alert states across Stages 01 to 05.
  - **Tamper-Evident Audit Log:** Real-time log of clinical escalations, queue priority overrides, and financial clearances.
  - **Executive Controls:** Surge routing triggers, emergency chamber reassignments, and shift cash lock.

---

### 📁 Folder 04: Hospital Setup & Master Configuration (`04_Hospital_Setup_and_Master_Configuration`)

* **Primary Personas:** Chief Information Officer (CIO), Hospital System Administrator, Head of Medical Records.
* **Layout Paradigm:** Multi-tab enterprise configuration suite with draft saving, rollback auditing, and live engine synchronization.

#### 4.1 `SCREEN_12`: Tab 1 - Facility Legal Profile & Department Specialty Masters
* **What it does:** Foundations of the hospital application setup. Configures legal entity data (Rohini Code, GSTIN, ABDM HFR Facility Registry ID `IN0810000423`), department clinical specialties (General Medicine, Cardiology, Ortho, Pathology, Pharmacy), chamber allocations, and token prefix codes (`B-`, `C-`, `A-`, `LAB-`, `PH-`).

#### 4.2 `SCREEN_08`: Tab 2 - Doctor Duty Roster & Chamber Allocation Matrix
* **What it does:** Manages clinician scheduling and physical chamber utilization.
* **Features:**
  - Doctor roster grid mapping clinicians to Morning/Evening shifts, slot timings (15/20 mins), and ABDM HPR registration.
  - Real-time chamber occupancy matrix (Chambers 101–108, 201–206, 301–305) with turnaround sanitization tracking.
  - 1-click Emergency Chamber Transfer & Queue Relay rule executor.
  - Quota division rules (40% App, 40% Kiosk Walk-in, 20% Emergency).

#### 4.3 `SCREEN_04`: Tab 3 - Tariff Master, Payer Rate Matrix & Concession Policies
* **What it does:** Comprehensive financial governance and service catalog engine.
* **Features:**
  - 2,490 active service SKUs across OPD, Pathology, Radiology, Pharmacy, and Daycare procedures.
  - Multi-payer comparative rate engine: Standard Private Walk-in vs CGHS / Corporate TPA (-20% to -25%) vs PM-JAY Ayushman Bharat package bundling.
  - Surcharge and concession policy automation (Night emergency +25%, Senior citizen 10% discount, Staff 100% waiver, 7-day free follow-up).
  - POS payment gateway & QR webhook settings (ICICI SmartPOS, Pine Labs, Paytm Soundbox).

#### 4.4 `SCREEN_02`: Tab 4 - Kiosk Fleet Hardware & Reception Terminal Config
* **What it does:** Remote hardware management and edge device telemetry for physical lobby terminals.
* **Features:**
  - Terminal fleet manager monitoring static IPs, touch latency (target < 20ms), optical scanner calibration, and thermal roll paper percentages.
  - Workflow customization toggles (1-step QR scan, ABHA creation via OTP, guided symptom intake guardrails).
  - Live 80mm ESC/POS Thermal Token Slip Print Designer preview.
  - Reception desk supervisor PIN overrides and fast-track triage rules.

#### 4.5 `SCREEN_06`: Tab 5 - Pathology LIS Analyzers & Pharmacy Master Config
* **What it does:** Master technical configuration for hospital diagnostic laboratory and pharmacy retail dispensing.
* **Features:**
  - Bi-directional ASTM / HL7 interface setup for automated laboratory analyzers (Sysmex XN-1000, Roche Cobas c311, Bio-Rad D-10 HPLC).
  - STAT panic value notification thresholds (Hemoglobin < 7.0 g/dL, Platelets < 20,000 /cumm, Potassium < 2.5 mEq/L) triggering instant physician push and SMS alerts.
  - Vacutainer color barcode routing (`LAB-EDTA-`, `LAB-SER-`, `LAB-GLU-`).
  - Pharmacy 3-level clinical AI safety guardrail hierarchy and cold-chain IoT temperature tracking (2°C–8°C).

---

## 3. End-to-End Data Flow & State Hand-Off Schema (Codex Reference)

```
[Patient Arrival]
   │
   ├─► SCREEN_34 (Kiosk Home) ──► SCREEN_24 (Scan QR) ──┐
   │                                                     │
   ├─► SCREEN_32 (New Patient ABHA Registration) ────────┼──► [Token #B-14 Generated]
   │                                                     │    [Slip Printed via ESC/POS]
   └─► SCREEN_28 (Guided Symptom Intake & Routing) ──────┘
                                                         │
                                                         ▼
[Consultation Phase]                              SCREEN_26 (Reception Desk Monitor)
                                                         │
                                                         ▼
                                                  SCREEN_16 (Doctor CPOE Workspace)
                                                         │
                             ┌───────────────────────────┴───────────────────────────┐
                             ▼                                                       ▼
                      [Pathology Order]                                       [e-Prescription]
                      (CBC STAT Barcode)                                      (Livogen-Z, Becosules)
                             │                                                       │
                             ▼                                                       ▼
                     SCREEN_20 (LIS Bench)                                   SCREEN_18 (Pharmacy Desk)
                     (Sysmex XN-1000 Sync)                                   (FEFO Batch & Safety)
                             │                                                       │
                             └───────────────────────────┬───────────────────────────┘
                                                         ▼
[Settlement & Discharge]                          SCREEN_10 (Central Billing Workspace)
                                                  (Consolidated Invoice ₹1,489.50)
                                                  (Dynamic UPI QR / TPA Cashless Settle)
                                                         │
                                                         ▼
[Governance & Configuration]                      SCREEN_14 (Admin Operations Hub)
                                                  SCREEN_12, 08, 04, 02, 06 (System Setup Tabs)
```

---

## 4. Key Implementation Rules for Codex / Developers
1. **Top Bar Clearance:** Every workspace screen MUST maintain a minimum of `80px` to `96px` (`pt-24` or `pt-28`) top padding to avoid clipping beneath the fixed global hospital navigation bar.
2. **Design System Adherence:** Use the tokens defined in `{{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}` (*Clinical Precision*), featuring light-mode clinical surfaces (`#f8f9ff`), primary deep teal/navy (`#0b4f6c`), and standard 8px roundness (`rounded-lg`).
3. **ABDM Milestone 3 Compliance:** All patient registration components must store both internal `UHID` (`AL-YYYY-XXXX`) and National `ABHA` (14-digit identifier and `@abdm` address).
4. **Thermal Slip Formatting:** All receipt and token print actions must adhere to 80mm ESC/POS fixed-width canvas formats with high-contrast monochrome rendering.
5. **Real-Time Webhooks:** Central billing dynamic QR codes require sub-500ms webhook callbacks for payment settlement without manual screen reloads.
