---
name: Clinical Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#41484d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#71787e'
  outline-variant: '#c0c7ce'
  surface-tint: '#2a6482'
  primary: '#00374e'
  on-primary: '#ffffff'
  primary-container: '#0b4f6c'
  on-primary-container: '#8ac0e1'
  inverse-primary: '#97cdef'
  secondary: '#006876'
  on-secondary: '#ffffff'
  secondary-container: '#92edff'
  on-secondary-container: '#006d7b'
  tertiary: '#003c27'
  on-tertiary: '#ffffff'
  tertiary-container: '#005539'
  on-tertiary-container: '#3dd197'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5e7ff'
  primary-fixed-dim: '#97cdef'
  on-primary-fixed: '#001e2d'
  on-primary-fixed-variant: '#054c69'
  secondary-fixed: '#9eefff'
  secondary-fixed-dim: '#77d4e5'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004e59'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: 0em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  currency-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The visual identity embodies clinical authority, operational efficiency, and calm reassurance tailored for high-volume Indian tertiary and secondary care hospitals. The interface serves doctors, triage nurses, ward administrators, and patient coordinators under high cognitive load, fluctuating lighting, and rapid shift transitions.

The design movement combines **Corporate / Modern** clinical rigor with subtle **Tactile / Surface Layering**—moving away from sterile, intimidating software toward a welcoming yet uncompromisingly precise clinical environment. 

### Core Attributes
- **Authoritative & Measured:** Deep medical teals establish clinical trust, sobriety, and institutional dependability.
- **Cognitive Clarity:** Dense hospital data (vitals, ward occupancy, ABDM sync status) is balanced through generous breathing room, structured visual rhythm, and zero ornamental noise.
- **Bilingual Contextual Sensitivity:** Designed natively to accommodate dual-script Indian contexts (English paired with Hindi Devanagari labels) without layout breaking or line-height clipping.
- **Accountable Intelligence:** AI-driven triage suggestions and automated notes are always visually framed as auxiliary recommendations through calm sky-blue badges reading *“AI-assisted, staff-reviewed.”*

## Colors

The palette delivers strict clinical hierarchy, separating primary brand identity, interactive actions, and clinical state tracking.

- **Primary (`#0B4F6C` - Deep Medical Teal):** Anchors headers, primary brand actions, clinical patient identification headers, and critical status containers.
- **Secondary (`#028090` - Verdigris / Clinical Cyan):** Applied to active navigation indicators, key clinical callouts, subheaders, and secondary actionable controls.
- **Tertiary (`#10B981` - Emerald Clinical Green):** Reserved strictly for operational confirmation: completed diagnostic reports, verified vitals, cleared discharge steps, and successful ABDM syncs.
- **Neutral (`#64748B` - Slate Neutral):** Provides precise legibility for secondary metadata, timestamps, and column dividers without high-contrast strain.

### Functional & Semantic Accents
- **Pending & Attention (`#F59E0B` - Warm Amber/Ochre):** In-progress lab analyses, pending doctor reviews, and critical queue wait states.
- **Urgent / Triaged Warning (`#EF4444` - Crimson Red):** Triage category 1/2 markers, allergy warnings, and abnormal vital thresholds.
- **AI Assist Badge Surface (`#E0F2FE` - Soft Sky Blue) & Text (`#0369A1`):** Applied exclusively to non-human algorithmic diagnostic recommendations, smart discharge summaries, and automated triage suggestions.
- **Surfaces:** Canvas runs on crisp warm neutral `#F8FAFC` (Slate 50), elevated cards on pure `#FFFFFF`, and high-density borders on `#E2E8F0` (Slate 200).

## Typography

The design system standardizes on **Plus Jakarta Sans** for its exceptional geometric neutrality, open counters, and high legibility on touch tablets and low-grade workstation monitors. 

### Bilingual Script Rendering
When paired with Hindi (Devanagari) micro-labels (e.g., *UHID / रोगी आईडी* or *Admitted / भर्ती*), Devanagari typography matches optical weight using systemic sans-serif stacks with `lineHeight` expanded by 10% on bilingual wrapper containers to prevent diacritic clipping (*matras*).

### Currency & Metric Conventions
- All Indian Rupee values employ the standardized symbol with tabular figures: `₹12,450.00` using `currency-bold`.
- Clinical vitals pair numeric values with explicit small unit labels (`120/80` `label-lg`, `mmHg` `label-sm` muted).

## Layout & Spacing

The system enforces a flexible 12-column layout on desktop viewports (collapsing to 8 columns on ward tablets and 4 columns on bedside handhelds).

- **Touch Surface Accommodations:** Minimum interactive touch target size is strictly 44px by 44px to allow rapid, error-free mobile rounds and tablet triage input.
- **High-Density Clinical Tables:** Row padding collapses strictly to `space-sm` vertically with `space-md` horizontally, maximizing the visible patient cohort per viewport without scroll fatigue.
- **Rhythm:** Layout spaces strictly adhere to an 8px base grid (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 32px).

## Elevation & Depth

Visual hierarchy uses **low-contrast outlines** paired with **ambient micro-shadows**, ensuring clarity under bright hospital fluorescent lighting and eliminating glare.

- **Level 0 (Base Canvas):** Background `#F8FAFC`.
- **Level 1 (Card & Module Resting):** Pure `#FFFFFF` surface bounded by a crisp `1px solid #E2E8F0` border. No dramatic drop shadow; subtle depth achieved via `0 1px 3px 0 rgba(11, 79, 108, 0.04)`.
- **Level 2 (Hovered & Active Queue Elements):** `0 4px 12px -2px rgba(11, 79, 108, 0.08)`, border shifts to `#CBD5E1`.
- **Level 3 (Modals, Vitals Overlay, Bed Allocation Flyouts):** `0 12px 24px -4px rgba(11, 79, 108, 0.14)`, border tint `#94A3B8`.

## Shapes

The roundedness level is set to `2` (Balanced Rounded).
- Standard components (buttons, input boxes, patient cards, clinical alerts) use `0.5rem` (8px) radius.
- Larger modular structural cards, clinical modal sheets, and bed layout panels utilize `1rem` (16px).
- Status badges, journey trackers, and triage indicators use complete pill radii (`9999px`) to immediately distinguish informational status markers from actionable inputs.

## Components

### Buttons
- **Primary:** Filled `#0B4F6C` with `#FFFFFF` text. Height: 44px desktop/mobile. Hover state: `#083B51`. Active: subtle inset depression.
- **Secondary:** Transparent surface with `1.5px solid #028090` border and `#028090` text.
- **Tertiary / Clinical Ghost:** Transparent surface with `#0B4F6C` text for inline list actions (e.g., "View Labs").

### Badges & Status Chips
- **AI Assist Badge:** Background `#E0F2FE`, border `1px solid #BAE6FD`, text `#0369A1` (`label-sm`). Always contains an inline sparkles/assist icon prefix: *“AI-assisted, staff-reviewed”*.
- **ABDM Integration Chip:** Background `#FEF3C7`, border `1px solid #FDE68A`, text `#92400E`: *“ABDM: Integration in progress”*.
- **Clinical Completion Chip:** Background `#ECFDF5`, border `1px solid #A7F3D0`, text `#065F46`: *“Discharge Cleared”*.

### Journey Step Trackers
- Horizontal multi-phase clinical progression indicators (e.g., Triage → Doctor Consultation → Diagnostics → Pharmacy → IPD Admission).
- **Completed Steps:** `#10B981` pill with white checkmark icon.
- **Current Step:** `#0B4F6C` ring with `#028090` pulsating core.
- **Pending Steps:** `#E2E8F0` connector bar and slate outline.

### High-Density Staff Tables
- Striped alternations disabled; separation enforced via `1px solid #E2E8F0` horizontal lines.
- Columns explicitly sized with fixed headers: UHID, Patient Name & Age/Gender, Triage Score, Assigned Doctor, Status, ABDM Link, and INR Bill Dues (`currency-bold` alignment right).

### Input Fields & Controls
- Form controls maintain a 44px touch boundary.
- Border is `1px solid #CBD5E1`, transitioning to `2px solid #028090` with zero offset on focus.
- Bilingual labels position the primary English label in `label-md` and the auxiliary Hindi label alongside in muted slate `label-sm` (e.g., **Primary Diagnosis** / *प्राथमिक निदान*).