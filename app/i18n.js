// ClinicPad V1 — textos y catálogos bilingües (ES por defecto / EN)
window.I18N = {
  es: {
    appName: (window.BRAND || 'ClinicPad'), langBtn: 'English', footer: 'Prototipo de demostración. No es consejo médico ni un dispositivo médico. Diseñado para ayudar a prevenir que se pasen por alto alergias o tomas de presión. No guarda datos de pacientes.',
    next: 'Siguiente', back: 'Atrás', skip: 'Omitir', yes: 'Sí', no: 'No', notApplicable: 'No aplica', add: 'Agregar', clear: 'Borrar', save: 'Guardar', cancel: 'Cancelar', other: 'Otro (escriba)',
    setupTitle: 'Configuración del proveedor', setupIntro: 'Se configura una vez por tablet. Estos datos son del consultorio, no de pacientes.',
    docName: 'Nombre del doctor/proveedor', clinicName: 'Nombre de la clínica', clinicAddr: 'Dirección / teléfono de la clínica (opcional)', licenseNo: 'Número de licencia profesional', specialty: 'Especialidad principal',
    pin: 'PIN del personal (4–6 dígitos)', pin2: 'Repita el PIN', provSig: 'Firma del proveedor (se puede usar en cada visita)', customQ: 'Preguntas obligatorias propias de la clínica', customQHint: 'Una por línea. Se agregan al checklist de seguridad.', timeout: 'Auto-borrado por inactividad (minutos)',
    saveEnc: 'Recordar esta configuración en la tablet (cifrada con el PIN). Nunca incluye datos de pacientes.', startUsing: 'Guardar y empezar',
    unlockTitle: 'Configuración guardada encontrada', unlockIntro: 'Ingrese el PIN del personal para desbloquearla.', unlock: 'Desbloquear', forget: 'Borrar configuración guardada', badPin: 'PIN incorrecto', pinMismatch: 'Los PIN no coinciden o tienen menos de 4 dígitos', required: 'Complete los campos obligatorios',
    startTitle: 'Bienvenido', startPrompt: 'Ingrese su nombre para comenzar', namePh: 'Nombre y apellido', begin: 'Comenzar', staffSettings: 'Ajustes (personal)',
    licTitle: 'Licencia de conducir', licIntro: 'Tome una foto del reverso de su licencia (el código de barras grande) para llenar sus datos automáticamente. La foto no se guarda.', licTake: 'Tomar foto del reverso', licReading: 'Leyendo código de barras…', licOk: 'Datos leídos de la licencia. Revise y corrija si es necesario.', licFail: 'No se pudo leer el código. Intente otra foto con buena luz o escriba sus datos.', licManual: 'Escribir mis datos a mano',
    firstName: 'Nombre', lastName: 'Apellido', dob: 'Fecha de nacimiento', sex: 'Sexo', address: 'Dirección', city: 'Ciudad', state: 'Estado', zip: 'Código postal', dlNo: 'N.º de licencia', phone: 'Teléfono',
    symTitle: '¿Qué le trae hoy?', reason: 'Motivo de la visita (en sus palabras)', symptoms: 'Síntomas', duration: '¿Desde cuándo?', painScale: 'Nivel de dolor ahora (0 = nada, 10 = el peor)',
    bodyTitle: '¿Dónde le duele?', bodyIntro: 'Toque las zonas con dolor o molestia. Toque de nuevo para quitar.', front: 'Frente', backView: 'Espalda', selected: 'Seleccionado', none: 'Ninguno',
    histTitle: 'Historial médico', histIntro: 'Responda cada pregunta.', recentSurgeryDetail: '¿Qué cirugía y cuándo?', otherConditions: 'Otras condiciones',
    allTitle: 'Alergias', hasAllergies: '¿Tiene alguna alergia?', allergyList: 'Marque todas las que apliquen', allergyOther: 'Otras alergias / reacción',
    medTitle: 'Medicamentos actuales', medIntro: 'Incluya vitaminas y suplementos.', takesMeds: '¿Toma algún medicamento?', medPh: 'Nombre y dosis (ej. Lisinopril 10 mg)',
    consTitle: 'Consentimiento', consText: 'Autorizo al proveedor y su personal a realizar la evaluación y el tratamiento que se me explique. Confirmo que la información que di es correcta según mi conocimiento. Entiendo que puedo hacer preguntas y retirar mi consentimiento en cualquier momento. Esta tablet no guarda mis datos: el registro se imprime o se exporta para el expediente de la clínica.', consCheck: 'He leído y acepto', patSig: 'Firma del paciente', finish: 'Finalizar',
    handTitle: '¡Gracias!', handText: 'Por favor entregue la tablet al personal de la clínica.', staffAccess: 'Acceso del personal',
    pinTitle: 'PIN del personal', pinEnter: 'Ingrese el PIN', pinBack: 'Volver',
    provTitle: 'Revisión del proveedor', allergyBanner: 'ALERGIAS', noAllergies: 'Paciente reporta: sin alergias conocidas', allergyUnknown: 'Alergias: sin respuesta — confirmar con el paciente',
    patientSummary: 'Resumen del paciente', vitals: 'Signos vitales', bp: 'Presión arterial (mmHg)', pulse: 'Pulso (lpm)', temp: 'Temp. (°F)',
    findings: 'Hallazgos', diagnosis: 'Diagnóstico / impresión', treatment: 'Tratamiento', medicines: 'Medicamentos indicados', freeText: 'Notas (texto libre)', quickFor: 'Menú rápido:',
    checklist: 'Checklist de seguridad (obligatorio)', clLocked: 'Exportar e imprimir bloqueados: puntos pendientes: {n}', clUnlocked: 'Checklist completo', sigMissing: 'Falta la firma del proveedor',
    provSigTitle: 'Firma del proveedor', useSaved: 'Usar firma guardada', pdfLang: 'Idioma del PDF', exportPdf: 'Exportar PDF', printPdf: 'Imprimir', cancelVisit: 'Cancelar y borrar visita', confirmCancel: '¿Borrar todos los datos de esta visita?',
    doneTitle: 'Registro generado', doneText: 'El PDF se generó. Todos los datos de la visita se borraron de la tablet.', nextPatient: 'Siguiente paciente',
    idleTitle: '¿Sigue ahí?', idleText: 'Por privacidad, los datos se borrarán en {s} segundos.', idleKeep: 'Continuar',
    wiped: 'Datos borrados por inactividad.', painNone: 'Sin dolor', painWorst: 'Peor dolor'
  },
  en: {
    appName: (window.BRAND || 'ClinicPad'), langBtn: 'Español', footer: 'Demo prototype. Not medical advice or a medical device. Designed to help prevent missed allergy or blood-pressure checks. Does not store patient data.',
    next: 'Next', back: 'Back', skip: 'Skip', yes: 'Yes', no: 'No', notApplicable: 'N/A', add: 'Add', clear: 'Clear', save: 'Save', cancel: 'Cancel', other: 'Other (type)',
    setupTitle: 'Provider setup', setupIntro: 'Set up once per tablet. This is practice information, not patient data.',
    docName: 'Doctor/provider name', clinicName: 'Clinic name', clinicAddr: 'Clinic address / phone (optional)', licenseNo: 'Professional license number', specialty: 'Primary specialty',
    pin: 'Staff PIN (4–6 digits)', pin2: 'Repeat PIN', provSig: 'Provider signature (can be reused each visit)', customQ: 'Clinic-specific required questions', customQHint: 'One per line. Added to the safety checklist.', timeout: 'Inactivity auto-wipe (minutes)',
    saveEnc: 'Remember this setup on the tablet (encrypted with the PIN). Never includes patient data.', startUsing: 'Save and start',
    unlockTitle: 'Saved setup found', unlockIntro: 'Enter the staff PIN to unlock it.', unlock: 'Unlock', forget: 'Delete saved setup', badPin: 'Wrong PIN', pinMismatch: 'PINs do not match or are shorter than 4 digits', required: 'Please fill in the required fields',
    startTitle: 'Welcome', startPrompt: 'Enter your name to begin', namePh: 'First and last name', begin: 'Begin', staffSettings: 'Settings (staff)',
    licTitle: "Driver's license", licIntro: 'Take a photo of the back of your license (the large barcode) to fill in your details automatically. The photo is not saved.', licTake: 'Take photo of the back', licReading: 'Reading barcode…', licOk: 'Details read from the license. Please review and correct if needed.', licFail: 'Could not read the barcode. Try another photo in good light or type your details.', licManual: 'Type my details manually',
    firstName: 'First name', lastName: 'Last name', dob: 'Date of birth', sex: 'Sex', address: 'Address', city: 'City', state: 'State', zip: 'ZIP code', dlNo: 'License no.', phone: 'Phone',
    symTitle: 'What brings you in today?', reason: 'Reason for visit (in your words)', symptoms: 'Symptoms', duration: 'Since when?', painScale: 'Pain level now (0 = none, 10 = worst)',
    bodyTitle: 'Where does it hurt?', bodyIntro: 'Tap the areas with pain or discomfort. Tap again to remove.', front: 'Front', backView: 'Back', selected: 'Selected', none: 'None',
    histTitle: 'Medical history', histIntro: 'Please answer each question.', recentSurgeryDetail: 'Which surgery and when?', otherConditions: 'Other conditions',
    allTitle: 'Allergies', hasAllergies: 'Do you have any allergies?', allergyList: 'Check all that apply', allergyOther: 'Other allergies / reaction',
    medTitle: 'Current medications', medIntro: 'Include vitamins and supplements.', takesMeds: 'Do you take any medication?', medPh: 'Name and dose (e.g. Lisinopril 10 mg)',
    consTitle: 'Consent', consText: 'I authorize the provider and staff to perform the evaluation and treatment explained to me. I confirm the information I provided is correct to the best of my knowledge. I understand I may ask questions and withdraw consent at any time. This tablet does not store my data: the record is printed or exported for the clinic\'s file.', consCheck: 'I have read and agree', patSig: 'Patient signature', finish: 'Finish',
    handTitle: 'Thank you!', handText: 'Please hand the tablet back to the clinic staff.', staffAccess: 'Staff access',
    pinTitle: 'Staff PIN', pinEnter: 'Enter PIN', pinBack: 'Back',
    provTitle: 'Provider review', allergyBanner: 'ALLERGIES', noAllergies: 'Patient reports: no known allergies', allergyUnknown: 'Allergies: not answered — confirm with patient',
    patientSummary: 'Patient summary', vitals: 'Vital signs', bp: 'Blood pressure (mmHg)', pulse: 'Pulse (bpm)', temp: 'Temp. (°F)',
    findings: 'Findings', diagnosis: 'Diagnosis / impression', treatment: 'Treatment', medicines: 'Medicines prescribed/advised', freeText: 'Notes (free text)', quickFor: 'Quick picks:',
    checklist: 'Safety checklist (required)', clLocked: 'Export and print lockeditems left: {n}', clUnlocked: 'Checklist complete', sigMissing: 'Provider signature missing',
    provSigTitle: 'Provider signature', useSaved: 'Use saved signature', pdfLang: 'PDF language', exportPdf: 'Export PDF', printPdf: 'Print', cancelVisit: 'Cancel and wipe visit', confirmCancel: 'Wipe all data for this visit?',
    doneTitle: 'Record generated', doneText: 'The PDF was generated. All visit data has been wiped from the tablet.', nextPatient: 'Next patient',
    idleTitle: 'Still there?', idleText: 'For privacy, data will be wiped in {s} seconds.', idleKeep: 'Continue',
    wiped: 'Data wiped due to inactivity.', painNone: 'No pain', painWorst: 'Worst pain'
  }
};
const L = (es, en) => ({ es, en });
window.CATALOG = {
  specialties: { dental: L('Dental', 'Dental'), pt: L('Fisioterapia', 'Physical therapy'), chiro: L('Quiropráctica', 'Chiropractic'), therapy: L('Terapia (OT/habla/salud mental)', 'Therapy (OT/speech/mental health)') },
  sex: { M: L('Masculino', 'Male'), F: L('Femenino', 'Female'), X: L('Otro / no especificado', 'Other / not specified') },
  symptoms: { pain: L('Dolor', 'Pain'), swelling: L('Hinchazón', 'Swelling'), stiffness: L('Rigidez', 'Stiffness'), numbness: L('Entumecimiento / hormigueo', 'Numbness / tingling'), weakness: L('Debilidad', 'Weakness'), headache: L('Dolor de cabeza', 'Headache'), dizziness: L('Mareo', 'Dizziness'), toothSens: L('Sensibilidad dental', 'Tooth sensitivity'), bleedingGums: L('Sangrado de encías', 'Bleeding gums'), jawPain: L('Dolor de mandíbula', 'Jaw pain'), limitedMotion: L('Movimiento limitado', 'Limited motion'), anxiety: L('Ansiedad', 'Anxiety'), lowMood: L('Ánimo bajo', 'Low mood'), sleep: L('Problemas de sueño', 'Sleep problems'), speech: L('Dificultad para hablar / tragar', 'Speech / swallowing difficulty') },
  duration: { today: L('Hoy', 'Today'), days: L('Unos días', 'A few days'), weeks: L('Semanas', 'Weeks'), months: L('Meses', 'Months'), year: L('Más de un año', 'Over a year') },
  body: {
  f_head: L('Cabeza (frente)', 'Head (front)'), f_jaw: L('Mandíbula / dientes', 'Jaw / teeth'), f_neck: L('Cuello (frente)', 'Neck (front)'), f_shL: L('Hombro izquierdo', 'Left shoulder'), f_shR: L('Hombro derecho', 'Right shoulder'), f_chest: L('Pecho', 'Chest'), f_abd: L('Abdomen', 'Abdomen'), f_armL: L('Brazo izquierdo', 'Left arm'), f_armR: L('Brazo derecho', 'Right arm'), f_handL: L('Mano/muñeca izquierda', 'Left hand/wrist'), f_handR: L('Mano/muñeca derecha', 'Right hand/wrist'), f_hipL: L('Cadera izquierda', 'Left hip'), f_hipR: L('Cadera derecha', 'Right hip'), f_kneeL: L('Rodilla izquierda', 'Left knee'), f_kneeR: L('Rodilla derecha', 'Right knee'), f_footL: L('Tobillo/pie izquierdo', 'Left ankle/foot'), f_footR: L('Tobillo/pie derecho', 'Right ankle/foot'),
  b_head: L('Cabeza (atrás)', 'Head (back)'), b_neck: L('Cuello / cervical', 'Neck / cervical'), b_upper: L('Espalda alta / dorsal', 'Upper back / thoracic'), b_lower: L('Espalda baja / lumbar', 'Lower back / lumbar'), b_glute: L('Glúteos / sacro', 'Buttocks / sacrum'), b_thighL: L('Muslo post. izquierdo', 'Left back of thigh'), b_thighR: L('Muslo post. derecho', 'Right back of thigh'), b_calfL: L('Pantorrilla izquierda', 'Left calf'), b_calfR: L('Pantorrilla derecha', 'Right calf') },
  conditions: { diabetes: L('Diabetes', 'Diabetes'), hbp: L('Presión arterial alta', 'High blood pressure'), heart: L('Enfermedad del corazón / marcapasos', 'Heart disease / pacemaker'), pregnant: L('¿Embarazada o posible embarazo?', 'Pregnant or possibly pregnant?'), surgery: L('Cirugía reciente (últimos 12 meses)', 'Recent surgery (last 12 months)'), thinners: L('Anticoagulantes (warfarina, Eliquis, aspirina diaria…)', 'Blood thinners (warfarin, Eliquis, daily aspirin…)'), asthma: L('Asma / problemas respiratorios', 'Asthma / breathing problems'), bleeding: L('Problemas de sangrado', 'Bleeding problems'), osteo: L('Osteoporosis', 'Osteoporosis'), smoker: L('Fuma / vapea', 'Smokes / vapes') },
  allergies: { penicillin: L('Penicilina / amoxicilina', 'Penicillin / amoxicillin'), sulfa: L('Sulfas', 'Sulfa drugs'), nsaid: L('Aspirina / ibuprofeno (AINEs)', 'Aspirin / ibuprofen (NSAIDs)'), codeine: L('Codeína / opioides', 'Codeine / opioids'), latex: L('Látex', 'Latex'), anesthesia: L('Anestesia local (lidocaína…)', 'Local anesthesia (lidocaine…)'), genAnesth: L('Anestesia general', 'General anesthesia'), iodine: L('Yodo / contraste', 'Iodine / contrast'), adhesive: L('Adhesivos / cinta', 'Adhesives / tape'), food: L('Alimentos', 'Food') },
  checklist: {
    allergyMed: L('Alergias a medicamentos confirmadas con el paciente', 'Medication allergies confirmed with patient'),
    allergyLatex: L('Alergia al látex confirmada', 'Latex allergy confirmed'),
    allergyAnesth: L('Alergia a anestesia confirmada', 'Anesthesia allergy confirmed'),
    meds: L('Medicamentos actuales revisados', 'Current medications reviewed'),
    diabetes: L('Diabetes revisada', 'Diabetes reviewed'),
    bp: L('Presión arterial revisada / tomada', 'Blood pressure reviewed / taken'),
    heart: L('Corazón / marcapasos revisado', 'Heart / pacemaker reviewed'),
    pregnancy: L('Embarazo revisado (o no aplica)', 'Pregnancy reviewed (or N/A)'),
    surgery: L('Cirugía reciente revisada', 'Recent surgery reviewed'),
    thinners: L('Anticoagulantes revisados', 'Blood thinners reviewed'),
    pain: L('Escala de dolor 0–10 registrada', 'Pain scale 0–10 recorded'),
    explained: L('Tratamiento explicado y aceptado por el paciente', 'Treatment explained and accepted by patient')
  },
  quick: {
    dental: {
      findings: ['Caries|Caries', 'Gingivitis|Gingivitis', 'Enfermedad periodontal|Periodontal disease', 'Diente fracturado|Fractured tooth', 'Absceso|Abscess', 'Sarro / placa|Calculus / plaque', 'Restauración defectuosa|Defective restoration', 'Movilidad dental|Tooth mobility', 'Bruxismo|Bruxism', 'Tercer molar impactado|Impacted third molar'],
      diagnosis: ['Caries dental|Dental caries', 'Pulpitis reversible|Reversible pulpitis', 'Pulpitis irreversible|Irreversible pulpitis', 'Periodontitis|Periodontitis', 'Gingivitis|Gingivitis', 'Disfunción ATM|TMJ disorder', 'Sensibilidad dentinaria|Dentin hypersensitivity'],
      treatment: ['Limpieza / profilaxis|Cleaning / prophylaxis', 'Empaste (resina)|Filling (composite)', 'Tratamiento de conducto|Root canal', 'Extracción|Extraction', 'Corona|Crown', 'Raspado y alisado radicular|Scaling and root planing', 'Radiografías|X-rays', 'Aplicación de flúor|Fluoride application', 'Férula nocturna|Night guard'],
      medicines: ['Amoxicilina 500 mg|Amoxicillin 500 mg', 'Ibuprofeno 600 mg|Ibuprofen 600 mg', 'Acetaminofén 500 mg|Acetaminophen 500 mg', 'Clorhexidina enjuague 0.12%|Chlorhexidine rinse 0.12%', 'Lidocaína 2% con epinefrina|Lidocaine 2% with epinephrine', 'Articaína 4%|Articaine 4%']
    },
    pt: {
      findings: ['Rango de movimiento reducido|Reduced range of motion', 'Debilidad muscular|Muscle weakness', 'Espasmo muscular|Muscle spasm', 'Alteración de la marcha|Gait abnormality', 'Inflamación|Inflammation', 'Postura alterada|Postural dysfunction', 'Equilibrio reducido|Decreased balance'],
      diagnosis: ['Lumbalgia|Low back pain', 'Cervicalgia|Neck pain', 'Tendinitis|Tendinitis', 'Esguince de tobillo|Ankle sprain', 'Post-quirúrgico rodilla|Post-op knee', 'Síndrome del manguito rotador|Rotator cuff syndrome', 'Fascitis plantar|Plantar fasciitis'],
      treatment: ['Ejercicio terapéutico|Therapeutic exercise', 'Terapia manual|Manual therapy', 'Electroestimulación|Electrical stimulation', 'Ultrasonido|Ultrasound', 'Calor / frío|Heat / ice', 'Punción seca|Dry needling', 'Reeducación de la marcha|Gait training', 'Programa en casa|Home exercise program'],
      medicines: ['Ninguno indicado|None advised', 'Hielo 15–20 min|Ice 15–20 min', 'Analgésico de venta libre según médico|OTC analgesic per physician']
    },
    chiro: {
      findings: ['Subluxación vertebral|Vertebral subluxation', 'Restricción articular|Joint restriction', 'Espasmo paravertebral|Paraspinal spasm', 'Puntos gatillo|Trigger points', 'Postura antálgica|Antalgic posture', 'ROM cervical reducido|Reduced cervical ROM'],
      diagnosis: ['Lumbalgia mecánica|Mechanical low back pain', 'Cervicalgia|Neck pain', 'Ciática|Sciatica', 'Cefalea tensional|Tension headache', 'Latigazo cervical|Whiplash', 'Disfunción sacroilíaca|Sacroiliac dysfunction'],
      treatment: ['Ajuste quiropráctico|Chiropractic adjustment', 'Descompresión espinal|Spinal decompression', 'Terapia de tejido blando|Soft tissue therapy', 'Electroestimulación|Electrical stimulation', 'Tracción|Traction', 'Ejercicios en casa|Home exercises'],
      medicines: ['Ninguno indicado|None advised', 'Hielo / calor según indicación|Ice / heat as directed']
    },
    therapy: {
      findings: ['Ánimo deprimido|Depressed mood', 'Ansiedad elevada|Elevated anxiety', 'Retraso del lenguaje|Language delay', 'Dificultad de articulación|Articulation difficulty', 'Motricidad fina reducida|Reduced fine motor skills', 'Dificultades sensoriales|Sensory processing difficulties', 'Atención reducida|Reduced attention'],
      diagnosis: ['Trastorno de ansiedad (a evaluar)|Anxiety disorder (to assess)', 'Trastorno depresivo (a evaluar)|Depressive disorder (to assess)', 'Trastorno del habla/lenguaje|Speech/language disorder', 'Retraso del desarrollo|Developmental delay', 'Disfagia|Dysphagia', 'TDAH (a evaluar)|ADHD (to assess)'],
      treatment: ['Psicoterapia individual|Individual psychotherapy', 'Terapia cognitivo-conductual|Cognitive behavioral therapy', 'Terapia del habla|Speech therapy', 'Terapia ocupacional|Occupational therapy', 'Integración sensorial|Sensory integration', 'Plan en casa / tareas|Home plan / homework', 'Referido a psiquiatría|Psychiatry referral'],
      medicines: ['Ninguno indicado|None advised', 'Continúa medicación actual (prescriptor externo)|Continue current meds (outside prescriber)']
    }
  }
};
