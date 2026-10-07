# Patient Journey

The demo journey is deliberately linear for presentation, but the data model does not encode a universal OPD sequence as a clinical rule.

1. Patient selects doctor finder at kiosk.
2. Intake answers are captured with a non-diagnostic routing recommendation.
3. Reception staff reviews routing and checks in the visit.
4. Doctor reviews the patient and confirms a CBC order plus pharmacy queue item.
5. Pathology advances the CBC request through requested, sample collected, and report ready.
6. Pharmacist reviews the prescription before fulfilment.
7. Cashier records payment.
8. Care coordinator schedules follow-up and reminders.
9. Operations reads the same journey and audit stream.
