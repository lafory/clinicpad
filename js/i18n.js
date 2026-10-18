import { BRAND } from "./config.js";

export const DICT = {
  en: {
    title: "{brand}: paper forms, reinvented for the clinic",
    nav_how: "How it works", nav_safety: "Safety checklist", nav_benefits: "Benefits", nav_v2: "Version 2", nav_demo: "Request a demo",
    hero_eyebrow: "For therapy &amp; dental clinics · In development",
    hero_title: "Paper forms, <em>reinvented</em> for the clinic.",
    hero_sub: "{brand} is a tablet app that turns patient intake, provider notes, a mandatory safety checklist and signatures into one print-ready file. Then it wipes itself clean for the next patient.",
    hero_cta1: "Request a demo", hero_cta2: "See how it works", try_app: "Try the prototype",
    badge1: "Works offline", badge2: "Designed to store nothing", badge3: "English / Español",
    hero_scroll: "Scroll to step inside",
    stage1_title: "Every question. Every patient. Every time.",
    stage1_sub: "Print stays locked until the safety checklist is complete.",
    stage2_title: "Step into the paperless clinic.",
    stage2_sub: "Faster check-in for patients. Fewer forgotten steps for staff.",
    how_kicker: "How it works", how_title: "One tablet. Five steps. No paper piles.",
    s1_t: "“Enter your name to start”", s1_d: "The patient types their name. No clipboard, no hunting for a pen.",
    s2_t: "Scan the license", s2_d: "A photo of the driver's license auto-fills name, date of birth and address.",
    s3_t: "Patient history", s3_d: "Symptoms, what hurts, medical history and allergies, then a digital consent signature.",
    s4_t: "Provider mode (PIN)", s4_d: "The doctor or therapist sees what the patient reported, with allergy alerts in red at the top, and writes findings, diagnosis, treatment and medicines.",
    s5_t: "Sign, print, wipe", s5_d: "After the checklist and signature, {brand} exports a print-ready PDF for the clinic's file, then erases everything and resets.",
    safety_kicker: "Mandatory safety checklist",
    safety_title: "Print stays locked until every box is checked.",
    safety_sub: "Designed to help prevent missed allergy checks and skipped questions. Clinics can add their own required questions. Try it here →",
    ex_label: "Example scenario",
    ex1_q: "“Are you allergic to any medicine?”", ex1_a: "“Yes, penicillin.”", ex1_r: "“Then I can't give you that medicine. Let's use an alternative.”",
    ex2_t: "Reminder: check blood pressure before treatment",
    ex2_d: "A clinic can make a reminder like this a required step, so it isn't forgotten on a busy day.",
    dev_mode: "Provider · PIN ✓",
    alert_t: "⚠ Allergy reported by patient: Penicillin · Latex", alert_tag: "Example patient",
    c1: "Allergies asked: medicine, latex, anesthesia", c2: "Current medications reviewed",
    c3: "Conditions: diabetes, blood pressure, heart / pacemaker", c4: "Pregnancy asked", c5: "Recent surgeries",
    c6: "Blood thinners", c7: "Pain scale (1–10) recorded", c8: "Treatment explained and accepted",
    add_ph: "Add a clinic question, e.g. “Blood pressure checked”", add_btn: "Add",
    progress: "{n} of {t} required", missing: "Missing:", print_locked: "🔒 Print locked", print_ready: "Sign &amp; print PDF",
    print_done: "✓ Print-ready PDF exported (demo). Tablet wiped, ready for the next patient.",
    ben_kicker: "Built for the health industry", ben_title: "Designed to make every visit safer, faster and cleaner.",
    b1_t: "Fewer missed questions", b1_d: "Required safety questions are designed to help reduce errors from skipped steps, like an allergy nobody asked about or a forgotten blood-pressure check.",
    b2_t: "Less paper", b2_d: "Intake forms, notes and signatures live on one tablet. You print only the final file you keep.",
    b3_t: "Faster registration", b3_d: "License-photo auto-fill is designed to cut down on typing and handwriting at the front desk.",
    b4_t: "Staff accountability", b4_d: "Print stays locked until every required box is checked, so steps don't get skipped.",
    b5_t: "A modern look", b5_d: "Patients see a clean, bilingual tablet instead of a clipboard. First impressions matter.",
    b6_t: "No data stored", b6_d: "Version 1 is designed to run on the tablet and keep nothing: after export, it wipes and resets.",
    pr_kicker: "Privacy by design", pr_title: "Paper, made digital. Nothing left behind.",
    pr1: "Runs locally on the tablet: no cloud account and no patient database.",
    pr2: "The provider side is protected by a PIN.",
    pr3: "One print-ready PDF per visit, for the clinic's own file.",
    pr4: "Wipes and resets automatically after export.",
    pr_note: "The clinic stays in control of its printed or scanned records and of its own compliance.",
    v2_kicker: "Coming soon · Version 2", v2_title: "The full clinic platform.",
    v2_sub: "A hosted, HIPAA-ready version is planned, with:",
    v2_1: "Pre-visit forms from the patient's phone", v2_2: "Billing-code suggestions (CPT, ICD-10, CDT)",
    v2_3: "Insurance card scan and eligibility checks", v2_4: "Appointments and reminders",
    v2_5: "Secure hosting with a signed BAA", v2_6: "Reports for the clinic owner",
    demo_kicker: "Request a demo", demo_title: "See {brand} at your front desk.",
    demo_sub: "We're looking for a few therapy and dental clinics in Miami to try the first version.",
    f_name: "Your name", f_clinic: "Clinic name", f_type: "Clinic type",
    opt_therapy: "Physical therapy", opt_dental: "Dental", opt_chiro: "Chiropractic", opt_other: "Other",
    f_email: "Email", f_phone: "Phone (optional)", f_submit: "Request a demo",
    f_note: "Preview page: this form isn't connected yet and sends nothing.",
    f_err: "Please fill in your name, clinic and a valid email.",
    thanks_title: "Thank you, {name}!",
    thanks_body: "This is a preview, so nothing was sent yet. When the form goes live, this is where we'll confirm your demo.",
    disclaimer: "{brand} is a product in development and isn't available yet. Nothing on this page is medical or legal advice. Examples are illustrative and aren't real patients, customers or results. Clinics remain responsible for their own HIPAA and record-keeping compliance.",
    copy: "© 2026 {brand} (working name)",
    // tablet screen texture
    t_welcome: "Welcome", t_start: "Enter your name to start", t_name: "Your name", t_scan: "Scan driver's license",
    t_steps: ["Patient", "Provider", "Sign & print"], t_foot: "Stores nothing · Wipes after print",
    t_prov: "Provider · PIN ✓", t_alert: "ALLERGY: Penicillin · Latex", t_example: "Example patient",
    t_checks: ["Allergies: medicine, latex, anesthesia", "Current medications", "Diabetes · BP · Heart / pacemaker", "Pregnancy", "Recent surgeries", "Blood thinners", "Pain scale 1–10", "Treatment explained & accepted"],
    t_locked: "Print locked · 2 left"
  },
  es: {
    title: "{brand}: el papel de la clínica, reinventado",
    nav_how: "Cómo funciona", nav_safety: "Lista de seguridad", nav_benefits: "Beneficios", nav_v2: "Versión 2", nav_demo: "Pide una demo",
    hero_eyebrow: "Para clínicas de terapia y dentales · En desarrollo",
    hero_title: "El papel de la clínica, <em>reinventado</em>.",
    hero_sub: "{brand} es una app para tableta que junta el registro del paciente, las notas del profesional, una lista de seguridad obligatoria y las firmas en un solo documento listo para imprimir. Después se borra sola para el próximo paciente.",
    hero_cta1: "Pide una demo", hero_cta2: "Mira cómo funciona", try_app: "Prueba la demo",
    badge1: "Funciona sin internet", badge2: "Diseñada para no guardar nada", badge3: "English / Español",
    hero_scroll: "Desliza para entrar",
    stage1_title: "Cada pregunta. Cada paciente. Siempre.",
    stage1_sub: "No se puede imprimir hasta completar la lista de seguridad.",
    stage2_title: "Entra a la clínica sin papel.",
    stage2_sub: "Registro más rápido para el paciente. Menos pasos olvidados para el personal.",
    how_kicker: "Cómo funciona", how_title: "Una tableta. Cinco pasos. Sin montañas de papel.",
    s1_t: "“Ponga su nombre para comenzar”", s1_d: "El paciente escribe su nombre. Sin tabla y sin buscar bolígrafo.",
    s2_t: "Foto de la licencia", s2_d: "Una foto de la licencia de conducir llena sola el nombre, la fecha de nacimiento y la dirección.",
    s3_t: "Historial del paciente", s3_d: "Síntomas, qué le duele, historial médico y alergias. Luego firma el consentimiento.",
    s4_t: "Modo profesional (PIN)", s4_d: "El doctor o terapeuta ve lo que reportó el paciente, con las alergias en rojo arriba, y anota hallazgos, diagnóstico, tratamiento y medicinas.",
    s5_t: "Firma, imprime y borra", s5_d: "Después de la lista y la firma, {brand} exporta un PDF listo para imprimir y archivar. Luego borra todo y empieza de cero.",
    safety_kicker: "Lista de seguridad obligatoria",
    safety_title: "No imprime hasta que cada casilla esté marcada.",
    safety_sub: "Diseñada para ayudar a que no se olvide preguntar por alergias ni otras preguntas clave. Cada clínica puede agregar sus propias preguntas obligatorias. Pruébala aquí →",
    ex_label: "Escenario de ejemplo",
    ex1_q: "“¿Es alérgico a alguna medicina?”", ex1_a: "“Sí, a la penicilina.”", ex1_r: "“Entonces esa medicina no se la puedo dar. Vamos a usar otra.”",
    ex2_t: "Recordatorio: tomar la presión antes del tratamiento",
    ex2_d: "La clínica puede hacer obligatorio un recordatorio así para que no se olvide en un día ocupado.",
    dev_mode: "Profesional · PIN ✓",
    alert_t: "⚠ Alergia reportada por el paciente: Penicilina · Látex", alert_tag: "Paciente de ejemplo",
    c1: "Alergias: medicinas, látex, anestesia", c2: "Medicinas actuales revisadas",
    c3: "Condiciones: diabetes, presión, corazón / marcapasos", c4: "Embarazo", c5: "Cirugías recientes",
    c6: "Anticoagulantes", c7: "Escala de dolor (1–10) anotada", c8: "Tratamiento explicado y aceptado",
    add_ph: "Agrega una pregunta, ej. “Presión arterial tomada”", add_btn: "Agregar",
    progress: "{n} de {t} obligatorias", missing: "Falta:", print_locked: "🔒 Impresión bloqueada", print_ready: "Firmar e imprimir PDF",
    print_done: "✓ PDF listo para imprimir (demo). Tableta borrada y lista para el próximo paciente.",
    ben_kicker: "Hecha para el sector salud", ben_title: "Diseñada para que cada visita sea más segura, rápida y ordenada.",
    b1_t: "Menos preguntas olvidadas", b1_d: "Las preguntas obligatorias están diseñadas para ayudar a reducir errores por pasos saltados, como una alergia que nadie preguntó o la presión que no se tomó.",
    b2_t: "Menos papel", b2_d: "Formularios, notas y firmas en una sola tableta. Solo imprimes el documento final que archivas.",
    b3_t: "Registro más rápido", b3_d: "La foto de la licencia llena los datos sola, para escribir menos en la recepción.",
    b4_t: "Responsabilidad del personal", b4_d: "No se puede imprimir hasta marcar cada casilla obligatoria, así nadie se salta pasos.",
    b5_t: "Imagen moderna", b5_d: "El paciente ve una tableta limpia y bilingüe en vez de una tabla con papeles. La primera impresión cuenta.",
    b6_t: "No guarda datos", b6_d: "La versión 1 está diseñada para funcionar en la tableta sin guardar nada: después de exportar, se borra y se reinicia.",
    pr_kicker: "Privacidad desde el diseño", pr_title: "Papel digital. No queda nada guardado.",
    pr1: "Funciona en la tableta, sin cuenta en la nube y sin base de datos de pacientes.",
    pr2: "La parte del profesional está protegida con PIN.",
    pr3: "Un PDF por visita, listo para el archivo de la clínica.",
    pr4: "Se borra y se reinicia sola después de exportar.",
    pr_note: "La clínica mantiene el control de sus documentos impresos o escaneados y de su propio cumplimiento.",
    v2_kicker: "Próximamente · Versión 2", v2_title: "La plataforma completa para la clínica.",
    v2_sub: "Se planea una versión en la nube, preparada para HIPAA, con:",
    v2_1: "Formularios desde el teléfono del paciente antes de la cita", v2_2: "Sugerencia de códigos de facturación (CPT, ICD-10, CDT)",
    v2_3: "Foto de la tarjeta del seguro y verificación de cobertura", v2_4: "Citas y recordatorios",
    v2_5: "Hosting seguro con BAA firmado", v2_6: "Reportes para el dueño de la clínica",
    demo_kicker: "Pide una demo", demo_title: "Mira {brand} en tu recepción.",
    demo_sub: "Buscamos algunas clínicas de terapia y dentales en Miami para probar la primera versión.",
    f_name: "Tu nombre", f_clinic: "Nombre de la clínica", f_type: "Tipo de clínica",
    opt_therapy: "Terapia física", opt_dental: "Dental", opt_chiro: "Quiropráctica", opt_other: "Otra",
    f_email: "Correo electrónico", f_phone: "Teléfono (opcional)", f_submit: "Pedir demo",
    f_note: "Página de vista previa: este formulario todavía no está conectado y no envía nada.",
    f_err: "Escribe tu nombre, la clínica y un correo válido.",
    thanks_title: "¡Gracias, {name}!",
    thanks_body: "Esto es una vista previa, así que todavía no se envió nada. Cuando el formulario esté activo, aquí te confirmaremos la demo.",
    disclaimer: "{brand} es un producto en desarrollo y todavía no está disponible. Nada en esta página es consejo médico ni legal. Los ejemplos son ilustrativos y no son pacientes, clientes ni resultados reales. Cada clínica es responsable de su propio cumplimiento de HIPAA y de sus registros.",
    copy: "© 2026 {brand} (nombre provisional)",
    t_welcome: "Bienvenido", t_start: "Ponga su nombre para comenzar", t_name: "Su nombre", t_scan: "Foto de la licencia",
    t_steps: ["Paciente", "Profesional", "Firmar e imprimir"], t_foot: "No guarda nada · Se borra al imprimir",
    t_prov: "Profesional · PIN ✓", t_alert: "ALERGIA: Penicilina · Látex", t_example: "Paciente de ejemplo",
    t_checks: ["Alergias: medicinas, látex, anestesia", "Medicinas actuales", "Diabetes · Presión · Corazón", "Embarazo", "Cirugías recientes", "Anticoagulantes", "Escala de dolor 1–10", "Tratamiento explicado y aceptado"],
    t_locked: "Impresión bloqueada · faltan 2"
  }
};

let lang = "en";
const listeners = [];
export const getLang = () => lang;
export const t = (k, vars = {}) => {
  let s = DICT[lang][k] ?? DICT.en[k] ?? k;
  if (typeof s !== "string") return s;
  s = s.replaceAll("{brand}", BRAND);
  for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s;
};
export const onLang = (fn) => listeners.push(fn);

export function setLang(l) {
  lang = DICT[l] ? l : "en";
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = BRAND));
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  try { localStorage.setItem("cp-lang", lang); } catch (e) {}
  listeners.forEach((fn) => fn(lang));
}

export function initialLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && DICT[q]) return q;
  try { const s = localStorage.getItem("cp-lang"); if (s && DICT[s]) return s; } catch (e) {}
  return "en";
}
