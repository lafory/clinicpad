/* ClinicPad V1 prototype — no backend, patient data lives ONLY in memory (state.patient / state.provider). */
(() => {
'use strict';
const T = k => (I18N[state.lang][k] ?? k);
const TL = (lang, k) => (I18N[lang][k] ?? k);
const C = window.CATALOG;
const cat = (group, key, lang) => (C[group][key] ? C[group][key][lang || state.lang] : key);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qs = new URLSearchParams(location.search);
const SETTINGS_KEY = 'clinicpad.settings.v1'; // encrypted provider config only (opt-in). Never patient data.

// ---------- device detection ----------
function detectDevice() {
  const ua = navigator.userAgent || '';
  const w = Math.min(screen.width || innerWidth, screen.height || innerHeight);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPod|Android.+Mobile|Windows Phone/i.test(ua) || (coarse && w < 600)) return 'phone';
  if (/iPad|Tablet|Android(?!.*Mobile)|Silk|Kindle/i.test(ua) || iPadOS || (coarse && !fine)) return 'tablet';
  return 'desktop';
}

// ---------- state ----------
const newPatient = () => ({
  name: '', first: '', last: '', dob: '', sex: '', address: '', city: '', state: '', zip: '', dlNo: '', phone: '', licSource: '',
  reason: '', symptoms: [], duration: '', pain: null, body: [],
  cond: {}, surgeryDetail: '', otherCond: '',
  hasAllergies: null, allergies: [], allergyOther: '',
  takesMeds: null, meds: [], medInput: '',
  consent: false, patientSig: ''
});
const newProvider = () => ({
  bpSys: '', bpDia: '', pulse: '', temp: '', pain: null,
  pick: { findings: [], diagnosis: [], treatment: [], medicines: [] },
  notes: { findings: '', diagnosis: '', treatment: '', medicines: '' },
  check: {}, sig: '', pdfLang: null, spec: null, staffId: null, showMissing: false, visitId: (crypto.randomUUID ? crypto.randomUUID() : 'v' + Date.now() + Math.random().toString(36).slice(2))
});
const newDraft = () => ({ name: '', logo: '', logoW: 0, logoH: 0, address: '', phone: '', specialty: 'dental', customText: '', timeoutMin: 2, retention: 'eod', closeTime: '23:59', adminPin: '', adminPin2: '', saveEnc: false, staff: [], pass: '', importPass: '' });
const newStaff = () => ({ id: '', name: '', role: 'dentist', license: '', photo: '', sig: '', pin: '', pin2: '' });
const state = {
  lang: 'es', device: detectDevice(), reception: false, inputMode: null, screen: 'clinic', config: null,
  draft: newDraft(), staffDraft: newStaff(), selStaff: null, importText: '',
  patient: newPatient(), provider: newProvider(), pinBuf: '', pinTarget: 'provider', msg: null, lastActivity: Date.now(), idleCount: 0
};
state.reception = state.device === 'desktop';
window.__clinicpad = state; // exposed for automated tests only

const PATIENT_STEPS = ['license', 'symptoms', 'body', 'history', 'allergies', 'meds', 'consent'];

// ---------- helpers ----------
function setPath(path, value) { const parts = path.split('.'); let o = state; while (parts.length > 1) o = o[parts.shift()]; o[parts[0]] = value; }
function getPath(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state); }
function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }
function toast(t, ms = 2600) { const el = document.getElementById('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), ms); }
function go(screen) { if (state.inputMode !== 'pen') state.inputMode = null; /* re-detect on each screen; a detected stylus stays sticky for palm rejection */ state.screen = screen; state.msg = null; render(); window.scrollTo(0, 0); }
const field = (key, path, type = 'text', attrs = '') => `<label class="f" for="${path}">${T(key)}</label><input id="${path}" type="${type}" data-bind="${path}" value="${esc(getPath(path))}" ${attrs}>`;
const chip = (on, label, action, val, extra = '') => `<button type="button" class="chip ${on ? 'on' : ''} ${extra}" data-action="${action}" data-val="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
const yn = (path, withNA) => { const v = getPath(path); return `<div class="yn" role="group">${chip(v === 'yes', T('yes'), 'setVal', 'yes', 'sm').replace('data-val', `data-path="${path}" data-val`)}${chip(v === 'no', T('no'), 'setVal', 'no').replace('data-val', `data-path="${path}" data-val`)}${withNA ? chip(v === 'na', T('notApplicable'), 'setVal', 'na').replace('data-val', `data-path="${path}" data-val`) : ''}</div>`; };
const navBtns = (backTo, nextAction = 'next', nextLabel = T('next')) => `<div class="nav">${backTo ? `<button class="btn ghost xl" data-action="goto" data-val="${backTo}">← ${T('back')}</button>` : '<span></span>'}<button class="btn primary xl" data-action="${nextAction}" data-enter="1">${nextLabel} →</button></div>`;
const progress = () => { const i = PATIENT_STEPS.indexOf(state.screen); return i < 0 ? '' : `<div class="progress">${PATIENT_STEPS.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>`; };
const msgBox = () => state.msg ? `<div class="msg ${state.msg.type}" role="status">${esc(state.msg.text)}</div>` : '';
const recNote = k => state.reception ? `<p class="small rec">🖥️ ${state.lang === 'es' ? 'Modo recepción: pregunte al paciente y escriba sus respuestas. Enter = siguiente.' : 'Front desk mode: ask the patient and type the answers. Enter = next.'}</p>` : '';
const roleOf = k => C.roles[k] || { es: k, en: k, spec: null };
const roleLabel = (k, lang) => roleOf(k)[lang || state.lang];
const isClinician = st => st.role !== 'reception';
const initials = n => esc(String(n || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase());
const avatar = (st, cls = '') => st.photo ? `<img class="avatar ${cls}" src="${st.photo}" alt="">` : `<span class="avatar ini ${cls}" aria-hidden="true">${initials(st.name)}</span>`;
const curStaff = () => state.viewStaff || (state.config && state.config.staff.find(x => x.id === state.provider.staffId)) || null;
const clinicHead = () => { const c = state.config ? state.config.clinic : state.draft; return `<div class="clinic-head">${c.logo ? `<img src="${c.logo}" alt="">` : ''}<div><b>${esc(c.name)}</b>${c.address || c.phone ? `<span>${esc([c.address, c.phone].filter(Boolean).join(' · '))}</span>` : ''}</div></div>`; };
const pick = s => { const [es, en] = s.split('|'); return { es, en: en || es }; };

// ---------- screens ----------
const screens = {
  clinic() {
    const d = state.draft, editing = !!state.config;
    return `<div class="card"><h1>${T('clinicTitle')}</h1><p class="lead">${T('clinicIntro')}</p>${msgBox()}
      <div class="grid2"><div>${field('clinicName', 'draft.name', 'text', 'autocomplete="off"')}</div><div>${field('clinicPhone', 'draft.phone', 'tel')}</div></div>
      ${field('clinicAddr', 'draft.address')}
      <label class="f">${T('logo')}</label>
      <div class="row logo-row"><div class="logo-prev" id="logoPrev">${d.logo ? `<img src="${d.logo}" alt="logo">` : `<span class="small">${state.lang === 'es' ? 'Sin logo' : 'No logo'}</span>`}</div>
        <span class="btn ghost filebtn">🖼️ ${T('logoUpload')}<input type="file" id="logoFile" accept="image/*" aria-label="${T('logoUpload')}"></span>
        ${d.logo ? `<button class="btn ghost" data-action="removeLogo">${T('logoRemove')}</button>` : ''}</div><p class="small">${T('logoHint')}</p>
      <label class="f">${T('specialty')}</label><div class="chips">${Object.keys(C.specialties).map(k => chip(d.specialty === k, cat('specialties', k), 'setVal', k).replace('data-val', 'data-path="draft.specialty" data-val')).join('')}</div>
      <label class="f" for="cq">${T('customQ')}</label><textarea id="cq" data-bind="draft.customText" placeholder="${state.lang === 'es' ? 'Ej.: ¿Paciente en ayunas?\nEj.: ¿Rayos X previos revisados?' : 'E.g.: Patient fasting?\nE.g.: Prior X-rays reviewed?'}">${esc(d.customText)}</textarea><p class="small">${T('customQHint')}</p>
      <div class="grid2"><div>${field('timeout', 'draft.timeoutMin', 'number', 'min="1" max="30"')}</div></div>
      <div class="card retention-box" id="retentionBox"><h3>🗂️ ${T('retTitle')}</h3><p class="small">${T('retIntro')}</p>
        <div class="chips">${RETENTIONS.map(r => chip(d.retention === r, T('ret_' + r), 'setVal', r).replace('data-val', 'data-path="draft.retention" data-val')).join('')}</div>
        ${d.retention === 'eod' ? `<label class="f" for="closeTime">${T('closeTime')}</label><input type="time" id="closeTime" data-bind="draft.closeTime" value="${esc(d.closeTime)}" style="max-width:200px">` : ''}
        <p class="small">${T('retPrivacy')}</p>${editing ? `<button class="btn danger" data-action="wipeAllVisits">🧹 ${T('closeDay')}</button>` : ''}</div>
      <div class="grid2"><div>${field('adminPin', 'draft.adminPin', 'password', 'inputmode="numeric" maxlength="8" autocomplete="new-password"')}</div><div>${field('adminPin2', 'draft.adminPin2', 'password', 'inputmode="numeric" maxlength="8" autocomplete="new-password"')}</div></div>
      <p class="small">${T('adminPinHint')}${editing || d._adminPin ? (state.lang === 'es' ? ' Déjelo en blanco para mantener el actual.' : ' Leave blank to keep the current one.') : ''}</p>
      ${editing ? '' : importBlock()}
      <div class="nav">${editing ? `<button class="btn ghost xl" data-action="goto" data-val="start">${T('cancel')}</button>` : '<span></span>'}<button class="btn primary xl" data-action="clinicNext" data-enter="1">${T('continueStaff')} →</button></div></div>`;
  },
  staff() {
    const d = state.draft;
    const list = d.staff.length ? d.staff.map(st => `<div class="staff-row">${avatar(st)}<div class="who"><b>${esc(st.name)}</b><span class="small">${esc(roleLabel(st.role))}${st.license ? ' · ' + (state.lang === 'es' ? 'Lic. ' : 'Lic. ') + esc(st.license) : ''}${st.sig ? ' · ✍️' : ''}</span></div>
        <button class="btn ghost" data-action="editStaff" data-val="${esc(st.id)}">${T('editStaff')}</button><button class="btn danger" data-action="delStaff" data-val="${esc(st.id)}" aria-label="${T('delStaff')} ${esc(st.name)}">✕</button></div>`).join('') : `<p class="msg info">${T('noStaff')}</p>`;
    return `<div class="card">${clinicHead()}<h1>${T('staffTitle')}</h1><p class="lead">${T('staffIntro')}</p>${msgBox()}
      <div id="staffList">${list}</div>
      <button class="btn primary" data-action="addStaff" style="margin-top:12px">＋ ${T('addStaff')}</button></div>
      <div class="card"><h2>${T('storageTitle')}</h2>
      <label class="check ${d.saveEnc ? 'done' : ''}"><input type="checkbox" data-bind="draft.saveEnc" ${d.saveEnc ? 'checked' : ''} ${crypto.subtle ? '' : 'disabled'}><span>${T('saveEnc')}${crypto.subtle ? '' : `<span class="hint flag">${state.lang === 'es' ? 'No disponible: requiere HTTPS o localhost.' : 'Unavailable: requires HTTPS or localhost.'}</span>`}</span></label>
      <h3>${T('exportTitle')}</h3><p class="small">${T('exportIntro')}</p>
      <div class="row"><input type="password" id="exportPass" data-bind="draft.pass" value="${esc(d.pass)}" placeholder="${T('passphrase')}" aria-label="${T('passphrase')}" autocomplete="new-password" style="flex:1;min-width:240px"><button class="btn ghost" data-action="exportConfig" ${crypto.subtle ? '' : 'disabled'}>🔐 ${T('exportBtn')}</button></div>
      <div class="nav"><button class="btn ghost xl" data-action="goto" data-val="clinic">${T('backToClinic')}</button><button class="btn primary xl" id="saveSetupBtn" data-action="saveSetup" data-enter="1">${T('startUsing')} →</button></div></div>`;
  },
  staffEdit() {
    const s = state.staffDraft, isNew = !state.draft.staff.some(x => x.id === s.id);
    return `<div class="card"><h1>${T('staffEditTitle')}</h1>${msgBox()}
      <div class="row photo-row"><div id="photoPrev">${avatar(s, 'lg')}</div><div><label class="f" style="margin-top:0">${T('photo')}</label>
        <div class="row"><span class="btn ghost filebtn">📷 ${state.lang === 'es' ? 'Cámara' : 'Camera'}<input type="file" id="photoCam" accept="image/*" capture="user" aria-label="${T('photoTake')}"></span>
        <span class="btn ghost filebtn">🖼️ ${state.lang === 'es' ? 'Subir' : 'Upload'}<input type="file" id="photoFile" accept="image/*" aria-label="${T('photoTake')}"></span></div><p class="small">${T('photoHint')}</p></div></div>
      <div class="grid2"><div>${field('staffName', 'staffDraft.name', 'text', 'autocomplete="off"')}</div><div>${field('staffLicense', 'staffDraft.license')}</div></div>
      <label class="f">${T('role')}</label><div class="chips">${Object.keys(C.roles).map(k => chip(s.role === k, roleLabel(k), 'setVal', k).replace('data-val', 'data-path="staffDraft.role" data-val')).join('')}</div>
      <div class="grid2"><div>${field('staffPin', 'staffDraft.pin', 'password', 'inputmode="numeric" maxlength="6" autocomplete="new-password"')}</div><div>${field('staffPin2', 'staffDraft.pin2', 'password', 'inputmode="numeric" maxlength="6" autocomplete="new-password"')}</div></div>
      ${isNew ? '' : `<p class="small">${state.lang === 'es' ? 'Deje el PIN en blanco para mantener el actual.' : 'Leave the PIN blank to keep the current one.'}</p>`}
      <label class="f">${T('staffSig')}</label>${sigPad('staffDraft.sig')}
      <div class="nav"><button class="btn ghost xl" data-action="goto" data-val="staff">${T('cancel')}</button><button class="btn primary xl" data-action="saveStaff" data-enter="1">${T('saveStaff')} ✓</button></div></div>`;
  },
  selectStaff() {
    const list = state.config.staff.filter(isClinician);
    return `<div class="card center">${clinicHead()}<h1>${T('selectStaffTitle')}</h1><p class="lead">${T('selectStaffIntro')}</p>
      <div class="staff-grid">${list.map(st => `<button class="staff-tile" data-action="pickStaff" data-val="${esc(st.id)}">${avatar(st, 'lg')}<b>${esc(st.name)}</b><span>${esc(roleLabel(st.role))}</span></button>`).join('')}</div>
      <button class="btn ghost" data-action="goto" data-val="handoff" style="margin-top:16px">${T('pinBack')}</button></div>`;
  },
  unlock() {
    return `<div class="card center"><h1>${T('unlockTitle')}</h1><p class="lead">${T('unlockIntro')}</p>${msgBox()}${pinPad()}
      <div class="row" style="justify-content:center"><button class="btn danger" data-action="forgetSettings">${T('forget')}</button></div></div>`;
  },
  start() {
    const devLbl = { phone: state.lang === 'es' ? 'Teléfono' : 'Phone', tablet: 'Tablet', desktop: state.lang === 'es' ? 'Computadora' : 'Desktop' }[state.device];
    return `<div class="card hero">${clinicHead()}
      <div class="big">${T('startPrompt')}</div>${recNote()}${state.device === 'phone' ? `<p class="msg warn phone-note">📱 ${state.lang === 'es' ? 'Está usando un teléfono. Funciona, pero para firmar y para la pantalla del proveedor recomendamos una tablet o computadora.' : 'You are on a phone. It works, but a tablet or computer is recommended for signing and the provider screen.'}</p>` : ''}
      <input id="startName" type="text" data-bind="patient.name" value="${esc(state.patient.name)}" placeholder="${T('namePh')}" autocomplete="off" autofocus aria-label="${T('startPrompt')}">
      ${msgBox()}<button class="btn primary xl" data-action="begin" data-enter="1">${T('begin')} →</button>
      <div class="row" style="justify-content:center;margin-top:28px">
        <span class="tag" id="deviceTag">${state.lang === 'es' ? 'Dispositivo' : 'Device'}: ${devLbl}</span>
        <label class="check" style="margin:0;min-height:52px"><input type="checkbox" id="recToggle" data-bind="reception" ${state.reception ? 'checked' : ''}><span>${state.lang === 'es' ? 'Modo recepción (el personal escribe)' : 'Front desk mode (staff types)'}</span></label>
        ${retention() !== 'now' ? `<button class="btn ghost" data-action="todayAccess" id="todayBtn">📋 ${T('todayBtn')}</button>` : ''}
        <button class="btn ghost" data-action="settings">⚙️ ${T('staffSettings')}</button></div></div>`;
  },
  license() {
    const p = state.patient;
    return `${progress()}<div class="card"><h2>${T('licTitle')}</h2><p class="lead">${T('licIntro')}</p>${recNote()}
      <div class="row"><span class="btn primary filebtn">📷 ${state.reception ? (state.lang === 'es' ? 'Subir foto/escaneo del reverso' : 'Upload photo/scan of the back') : T('licTake')}<input type="file" id="licFile" accept="image/*" ${state.device === 'desktop' ? '' : 'capture="environment"'} aria-label="${T('licTake')}"></span>
      <span class="small">PDF417 · AAMVA</span></div>
      <div id="licStatus">${msgBox()}</div>
      <div class="grid2"><div>${field('firstName', 'patient.first')}</div><div>${field('lastName', 'patient.last')}</div></div>
      <div class="grid3"><div>${field('dob', 'patient.dob', 'date')}</div><div><label class="f" for="patient.sex">${T('sex')}</label><select id="patient.sex" data-bind="patient.sex"><option value=""></option>${Object.keys(C.sex).map(k => `<option value="${k}" ${p.sex === k ? 'selected' : ''}>${cat('sex', k)}</option>`).join('')}</select></div><div>${field('phone', 'patient.phone', 'tel')}</div></div>
      ${field('address', 'patient.address')}
      <div class="grid3"><div>${field('city', 'patient.city')}</div><div>${field('state', 'patient.state', 'text', 'maxlength="2"')}</div><div>${field('zip', 'patient.zip', 'text', 'inputmode="numeric"')}</div></div>
      ${field('dlNo', 'patient.dlNo')}
      ${navBtns('start')}</div>`;
  },
  symptoms() {
    const p = state.patient;
    return `${progress()}<div class="card"><h2>${T('symTitle')}</h2>${recNote()}
      <label class="f" for="reason">${T('reason')}</label><textarea id="reason" data-bind="patient.reason">${esc(p.reason)}</textarea>
      <label class="f">${T('symptoms')}</label><div class="chips">${Object.keys(C.symptoms).map(k => chip(p.symptoms.includes(k), cat('symptoms', k), 'toggleArr', k).replace('data-val', 'data-path="patient.symptoms" data-val')).join('')}</div>
      <label class="f">${T('duration')}</label><div class="chips">${Object.keys(C.duration).map(k => chip(p.duration === k, cat('duration', k), 'setVal', k).replace('data-val', 'data-path="patient.duration" data-val')).join('')}</div>
      <label class="f">${T('painScale')}</label>${painScale('patient.pain')}
      ${navBtns('license')}</div>`;
  },
  body() {
    const sel = state.patient.body;
    return `${progress()}<div class="card"><h2>${T('bodyTitle')}</h2><p class="lead">${T('bodyIntro')}</p>
      <div class="bodywrap">${bodySvg('f')}${bodySvg('b')}</div>
      <p><b>${T('selected')}:</b> <span id="bodySel">${sel.length ? sel.map(k => `<span class="tag red">${esc(cat('body', k))}</span>`).join(' ') : T('none')}</span></p>
      ${navBtns('symptoms')}</div>`;
  },
  history() {
    const p = state.patient;
    const rows = Object.keys(C.conditions).map(k => `<div class="qrow"><span class="q">${cat('conditions', k)}</span>${yn('patient.cond.' + k, k === 'pregnant')}</div>
      ${k === 'surgery' && p.cond.surgery === 'yes' ? `<input type="text" data-bind="patient.surgeryDetail" value="${esc(p.surgeryDetail)}" placeholder="${T('recentSurgeryDetail')}" aria-label="${T('recentSurgeryDetail')}">` : ''}`).join('');
    return `${progress()}<div class="card"><h2>${T('histTitle')}</h2><p class="lead">${T('histIntro')}</p>${recNote()}${rows}
      <label class="f" for="oc">${T('otherConditions')}</label><input id="oc" type="text" data-bind="patient.otherCond" value="${esc(p.otherCond)}">
      ${navBtns('body')}</div>`;
  },
  allergies() {
    const p = state.patient;
    return `${progress()}<div class="card"><h2>${T('allTitle')}</h2>${recNote()}${msgBox()}
      <div class="qrow"><span class="q">${T('hasAllergies')}</span>${yn('patient.hasAllergies')}</div>
      ${p.hasAllergies === 'yes' ? `<label class="f">${T('allergyList')}</label><div class="chips">${Object.keys(C.allergies).map(k => chip(p.allergies.includes(k), cat('allergies', k), 'toggleArr', k, 'danger').replace('data-val', 'data-path="patient.allergies" data-val')).join('')}</div>
      <label class="f" for="ao">${T('allergyOther')}</label><input id="ao" type="text" data-bind="patient.allergyOther" value="${esc(p.allergyOther)}">` : ''}
      ${navBtns('history')}</div>`;
  },
  meds() {
    const p = state.patient;
    return `${progress()}<div class="card"><h2>${T('medTitle')}</h2><p class="lead">${T('medIntro')}</p>${recNote()}
      <div class="qrow"><span class="q">${T('takesMeds')}</span>${yn('patient.takesMeds')}</div>
      ${p.takesMeds === 'yes' ? `<div class="row" style="margin-top:12px"><input id="medInput" type="text" data-bind="patient.medInput" value="${esc(p.medInput)}" placeholder="${T('medPh')}" style="flex:1" data-enter-action="addMed"><button class="btn primary" data-action="addMed">+ ${T('add')}</button></div>
      <div class="chips" style="margin-top:12px">${p.meds.map((m, i) => `<button class="chip on" data-action="removeMed" data-val="${i}">${esc(m)} ✕</button>`).join('')}</div>` : ''}
      ${navBtns('allergies')}</div>`;
  },
  consent() {
    const p = state.patient;
    return `${progress()}<div class="card">${clinicHead()}<h2>${T('consTitle')}</h2>${msgBox()}<p style="font-size:20px">${T('consText')}</p>
      <label class="check ${p.consent ? 'done' : ''}"><input type="checkbox" data-bind="patient.consent" ${p.consent ? 'checked' : ''}><span><b>${T('consCheck')}</b></span></label>
      <label class="f">${T('patSig')} — ${esc(p.name)}</label>${sigPad('patient.patientSig')}
      ${state.reception ? `<p class="small">${state.lang === 'es' ? 'El paciente puede firmar con el mouse/trackpad, o entréguele una tablet.' : 'The patient can sign with the mouse/trackpad, or hand them a tablet.'}</p>` : ''}
      ${navBtns('meds', 'finishPatient', T('finish'))}</div>`;
  },
  handoff() {
    return `<div class="card hero"><div style="font-size:64px">✅</div><div class="big">${T('handTitle')}</div><p class="lead" style="font-size:22px">${T('handText')}</p>
      <button class="btn primary xl" data-action="staffAccess" data-enter="1">🔒 ${T('staffAccess')}</button></div>`;
  },
  pin() {
    const st = (state.pinTarget === 'provider' || state.pinTarget === 'today') && state.config.staff.find(x => x.id === state.selStaff);
    return `<div class="card center">${st ? `<div class="pin-who">${avatar(st, 'lg')}<b>${esc(st.name)}</b><span>${esc(roleLabel(st.role))}</span></div><h1>${T('pinFor')} ${esc(st.name.split(' ')[0])}</h1>` : `<h1>${state.pinTarget === 'settings' || state.selStaff === 'admin' ? T('adminPin').replace(/\s*\(.*\)/, '') : T('pinTitle')}</h1>`}<p class="lead">${T('pinEnter')}</p>${msgBox()}${pinPad()}
      <button class="btn ghost" data-action="pinCancel">${T('pinBack')}</button></div>`;
  },
  provider() {
    const p = state.patient, v = state.provider, cfg = state.config;
    const st = curStaff() || { name: '', role: '' }; const spec = v.spec || roleOf(st.role).spec || cfg.clinic.specialty;
    const yesList = Object.keys(C.conditions).filter(k => p.cond[k] === 'yes');
    const sections = ['findings', 'diagnosis', 'treatment', 'medicines'].map(sec => `<h3>${T(sec)}</h3>
      <div class="chips">${C.quick[spec][sec].map(s => { const o = pick(s); return chip(v.pick[sec].includes(s), o[state.lang], 'togglePick', s).replace('data-val', `data-sec="${sec}" data-val`); }).join('')}</div>
      <textarea data-bind="provider.notes.${sec}" placeholder="${T('freeText')}" aria-label="${T(sec)} — ${T('freeText')}" style="margin-top:10px;min-height:70px">${esc(v.notes[sec])}</textarea>`).join('');
    const items = checklistItems();
    const left = items.filter(i => !v.check[i.key]).length;
    const ready = left === 0 && !!v.sig;
    const lang = v.pdfLang || state.lang;
    return `<div class="card summary"><div class="row between"><h2>${T('patientSummary')}</h2><span class="tag prov-tag">${avatar(st, 'sm')}${esc(st.name)} · ${esc(roleLabel(st.role))}</span></div>
      <dl><dt>${T('namePh')}</dt><dd><b>${esc(fullName())}</b></dd>
      <dt>${T('dob')}</dt><dd>${esc(p.dob) || '—'} ${p.licSource ? `<span class="tag">${state.lang === 'es' ? 'leído de licencia' : 'read from license'}</span>` : ''}</dd>
      <dt>${T('reason')}</dt><dd>${esc(p.reason) || '—'}</dd>
      <dt>${T('symptoms')}</dt><dd>${p.symptoms.map(k => cat('symptoms', k)).join(', ') || '—'} ${p.duration ? '· ' + cat('duration', p.duration) : ''}</dd>
      <dt>${T('painScale').split('(')[0]}</dt><dd>${p.pain ?? '—'}/10</dd>
      <dt>${T('bodyTitle')}</dt><dd>${p.body.map(k => cat('body', k)).join(', ') || '—'}</dd>
      <dt>${T('histTitle')}</dt><dd>${yesList.length ? yesList.map(k => `<span class="tag red">${cat('conditions', k)}</span>`).join(' ') : '—'} ${p.surgeryDetail ? '· ' + esc(p.surgeryDetail) : ''} ${p.otherCond ? '· ' + esc(p.otherCond) : ''}</dd>
      <dt>${T('medTitle')}</dt><dd>${p.takesMeds === 'no' ? T('no') : (p.meds.map(esc).join(', ') || '—')}</dd>
      <dt>${T('consTitle')}</dt><dd>${p.consent && p.patientSig ? '✅ ' + (state.lang === 'es' ? 'Firmado' : 'Signed') : '<span class="flag">⚠</span>'}</dd></dl></div>
      <div class="card"><h2>${T('vitals')}</h2><div class="grid3">
        <div><label class="f">${T('bp')}</label><div class="row" style="flex-wrap:nowrap"><input type="number" data-bind="provider.bpSys" value="${esc(v.bpSys)}" placeholder="120" aria-label="Sys"> / <input type="number" data-bind="provider.bpDia" value="${esc(v.bpDia)}" placeholder="80" aria-label="Dia"></div></div>
        <div>${field('pulse', 'provider.pulse', 'number')}</div><div>${field('temp', 'provider.temp', 'number', 'step="0.1"')}</div></div>
        <label class="f">${T('painScale')}</label>${painScale('provider.pain')}</div>
      <div class="card"><div class="row between"><h2>${state.lang === 'es' ? 'Evaluación y plan' : 'Assessment and plan'}</h2>
        <div class="tabs"><span class="small">${T('quickFor')}</span>${Object.keys(C.specialties).map(k => chip(spec === k, cat('specialties', k), 'setVal', k).replace('data-val', 'data-path="provider.spec" data-val')).join('')}</div></div>${sections}</div>
      <div class="card" id="checklistCard"><h2>${T('checklist')}</h2>
        ${items.map(i => `<label class="check ${v.check[i.key] ? 'done' : (v.showMissing ? 'missing' : '')}" data-key="${i.key}"><input type="checkbox" data-bind="provider.check.${i.key}" data-rerender="1" ${v.check[i.key] ? 'checked' : ''}><span>${esc(i.label)}${i.hint ? `<span class="hint ${i.flag ? 'flag' : ''}">${esc(i.hint)}</span>` : ''}</span></label>`).join('')}
        <h3>${T('provSigTitle')}</h3>${st.sig ? `<button class="btn ghost" data-action="useSavedSig" style="margin-bottom:10px">✍️ ${T('useSaved')}</button>` : ''}<div id="provSigWrap" class="${!v.sig && v.showMissing ? 'missing-sig' : ''}">${sigPad('provider.sig')}</div>
        <div id="lockbar" class="lockbar ${ready ? 'open' : 'locked'}" role="status">${ready ? '🔓 ' + T('clUnlocked') : `<div>🔒 ${T('clLocked').replace('{n}', left)}${v.sig ? '' : ' · ' + T('sigMissing')}${v.showMissing ? `<ul class="missing-list">${items.filter(i => !v.check[i.key]).map(i => `<li>${esc(i.label)}</li>`).join('')}${v.sig ? '' : `<li>${T('sigMissing')}</li>`}</ul>` : `<div class="small">${T('lockHint')}</div>`}</div>`}</div>
        <label class="f">${T('pdfLang')}</label><div class="chips">${chip(lang === 'es', 'Español', 'setVal', 'es').replace('data-val', 'data-path="provider.pdfLang" data-val')}${chip(lang === 'en', 'English', 'setVal', 'en').replace('data-val', 'data-path="provider.pdfLang" data-val')}</div>
        <div class="nav"><button class="btn danger" data-action="cancelVisit">🗑️ ${T('cancelVisit')}</button>
          <div class="row"><button class="btn primary xl ${ready ? '' : 'is-locked'}" id="printBtn" data-action="printPdf" data-locked="${!ready}" aria-describedby="lockbar">${ready ? '' : '<span class="lock">🔒</span>'}🖨️ ${T('printPdf')}</button>
          <button class="btn ghost xl ${ready ? '' : 'is-locked'}" id="exportBtn" data-action="exportPdf" data-locked="${!ready}" aria-describedby="lockbar">${ready ? '' : '<span class="lock">🔒</span>'}📄 ${T('exportPdf')}</button></div></div></div>`;
  },
  todayWho() {
    const list = state.config.staff.filter(isClinician);
    return `<div class="card center">${clinicHead()}<h1>📋 ${T('todayTitle')}</h1><p class="lead">${T('todayWhoIntro')}</p>
      <div class="staff-grid">${list.map(x => `<button class="staff-tile" data-action="todayPick" data-val="${x.id}">${avatar(x, 'lg')}<b>${esc(x.name)}</b><span>${esc(roleLabel(x.role))}</span></button>`).join('')}
      <button class="staff-tile" data-action="todayPick" data-val="admin"><span class="avatar lg ini">🛡️</span><b>${T('adminAll')}</b><span>${T('adminAllHint')}</span></button></div>
      <button class="btn ghost" data-action="goto" data-val="start" style="margin-top:16px">${T('pinBack')}</button></div>`;
  },
  today() {
    const t = state.today || { list: [] }; const admin = t.who === 'admin'; const who = admin ? T('adminAll') : (state.config.staff.find(x => x.id === t.who) || {}).name || '';
    const rows = t.list.map(r => `<div class="visit-row" data-id="${r.id}"><div class="vtime">${esc(new Date(r.createdAt).toLocaleTimeString(state.lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit' }))}</div>
      <div class="who"><b>${esc(r.name)}</b><span>${esc(r.staffName)}${r.staffRole ? ' · ' + esc(roleLabel(r.staffRole)) : ''}</span></div>
      ${r.allergy === 'yes' ? `<span class="atag red">⚠️ ${T('allergyFlag')}</span>` : r.allergy === 'no' ? `<span class="atag ok">✓ ${T('noAllergyFlag')}</span>` : `<span class="atag warn">? ${T('allergyUnknownFlag')}</span>`}
      <button class="btn ghost" data-action="openVisit" data-val="${r.id}">👁️ ${T('openVisit')}</button></div>`).join('');
    return `<div class="card">${clinicHead()}<h1>📋 ${T('todayTitle')}</h1><p class="lead">${esc(who)} · <b id="todayCount">${t.list.length}</b> ${T(t.list.length === 1 ? 'patientOne' : 'patientMany')}</p>
      ${msgBox()}<div id="todayList">${rows || `<p class="msg info">${T('todayEmpty')}</p>`}</div>
      <p class="small">🔐 ${T('todayInfo').replace('{t}', esc(retentionLabel()))}</p>
      <div class="nav"><button class="btn ghost xl" data-action="todayClose">← ${T('todayExit')}</button>${admin ? `<button class="btn danger" data-action="wipeAllVisits" id="wipeAllBtn">🧹 ${T('closeDay')}</button>` : ''}</div></div>`;
  },
  visitView() {
    const r = state.viewRec; if (!r) return '';
    return `<div class="card"><div class="ro-tag">🔒 ${T('readOnly')}</div><div class="pv-screen">${withRecord(r, () => buildPrintHtml(r.lang))}</div>
      <div class="nav"><button class="btn ghost xl" data-action="backToday">← ${T('backList')}</button><div class="row"><button class="btn ghost xl" data-action="viewExport" id="viewExportBtn">📄 ${T('exportPdf')}</button><button class="btn primary xl" data-action="viewPrint" id="viewPrintBtn">🖨️ ${T('printPdf')}</button></div></div></div>`;
  },
  done() {
    return `<div class="card hero"><div style="font-size:64px">🧾</div><div class="big">${T('doneTitle')}</div><p class="lead" style="font-size:20px">${retention() === 'now' ? T('doneText') : T('doneTextKept').replace('{t}', esc(expiryLabel()))}</p>
      <button class="btn primary xl" data-action="nextPatient" data-enter="1">${T('nextPatient')} →</button></div>`;
  }
};

// ---------- components ----------
function painScale(path) {
  const v = getPath(path);
  const col = n => `hsl(${120 - n * 12},70%,${n > 6 ? 42 : 40}%)`;
  return `<div class="pain" role="radiogroup">${Array.from({ length: 11 }, (_, n) => `<button type="button" class="${v === n ? 'on' : ''}" style="${v === n ? `background:${col(n)}` : ''}" data-action="setPain" data-path="${path}" data-val="${n}" aria-pressed="${v === n}">${n}</button>`).join('')}</div><div class="painlbl"><span>${T('painNone')}</span><span>${T('painWorst')}</span></div>`;
}
function sigPad(path) { return `<div class="sigmode" data-mode="${state.inputMode || 'none'}" aria-live="polite">${modeText()}</div><div class="sigwrap"><canvas data-sig="${path}" aria-label="signature"></canvas><div class="sigx"></div></div><div class="row end" style="margin-top:6px"><button class="btn ghost" data-action="clearSig" data-val="${path}">${T('clear')}</button></div>`; }
function pinPad() {
  const n = state.pinBuf.length;
  return `<div class="pindots">${Array.from({ length: Math.max(4, n) }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
  <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-action="pinDigit" data-val="${d}">${d}</button>`).join('')}<button data-action="pinDel" aria-label="delete">⌫</button><button data-action="pinDigit" data-val="0">0</button><button data-action="pinOk" style="background:var(--teal);color:#fff">OK</button></div>
  <p class="small">${state.lang === 'es' ? 'También puede escribir el PIN con el teclado y presionar Enter.' : 'You can also type the PIN on the keyboard and press Enter.'}</p>`;
}
function bodySvg(side) {
  const sel = state.patient.body;
  const R = (id, shape) => shape.replace('<x ', `<${shape.startsWith('<x c') ? '' : ''}`).replace(/^<(\w+)/, `<$1 class="rg ${sel.includes(id) ? 'on' : ''}" data-action="toggleBody" data-val="${id}" tabindex="0" role="button" aria-label="${esc(cat('body', id))}"`);
  const S = s => s.replace(/^<(\w+)/, '<$1 class="static"');
  let g;
  if (side === 'f') g = [R('f_head', '<ellipse cx="100" cy="34" rx="24" ry="26"/>'), R('f_jaw', '<rect x="84" y="52" width="32" height="16" rx="7"/>'), R('f_neck', '<rect x="89" y="70" width="22" height="16" rx="4"/>'),
    R('f_shR', '<circle cx="62" cy="98" r="16"/>'), R('f_shL', '<circle cx="138" cy="98" r="16"/>'), R('f_chest', '<rect x="72" y="88" width="56" height="52" rx="8"/>'), R('f_abd', '<rect x="74" y="141" width="52" height="48" rx="8"/>'),
    R('f_armR', '<rect x="40" y="114" width="20" height="88" rx="9"/>'), R('f_armL', '<rect x="140" y="114" width="20" height="88" rx="9"/>'), R('f_handR', '<ellipse cx="50" cy="216" rx="12" ry="15"/>'), R('f_handL', '<ellipse cx="150" cy="216" rx="12" ry="15"/>'),
    R('f_hipR', '<rect x="72" y="190" width="27" height="30" rx="6"/>'), R('f_hipL', '<rect x="101" y="190" width="27" height="30" rx="6"/>'), S('<rect x="74" y="221" width="24" height="64" rx="8"/>'), S('<rect x="102" y="221" width="24" height="64" rx="8"/>'),
    R('f_kneeR', '<circle cx="86" cy="298" r="14"/>'), R('f_kneeL', '<circle cx="114" cy="298" r="14"/>'), S('<rect x="77" y="313" width="18" height="60" rx="8"/>'), S('<rect x="105" y="313" width="18" height="60" rx="8"/>'),
    R('f_footR', '<ellipse cx="85" cy="386" rx="15" ry="10"/>'), R('f_footL', '<ellipse cx="115" cy="386" rx="15" ry="10"/>'), '<text x="30" y="70" font-size="14" fill="#64748b">D</text><text x="162" y="70" font-size="14" fill="#64748b">I</text>'];
  else g = [R('b_head', '<ellipse cx="100" cy="34" rx="24" ry="26"/>'), R('b_neck', '<rect x="88" y="62" width="24" height="24" rx="5"/>'), S('<circle cx="62" cy="98" r="16"/>'), S('<circle cx="138" cy="98" r="16"/>'),
    R('b_upper', '<rect x="72" y="88" width="56" height="60" rx="8"/>'), R('b_lower', '<rect x="74" y="149" width="52" height="40" rx="8"/>'), R('b_glute', '<rect x="72" y="190" width="56" height="32" rx="10"/>'),
    S('<rect x="40" y="114" width="20" height="88" rx="9"/>'), S('<rect x="140" y="114" width="20" height="88" rx="9"/>'), S('<ellipse cx="50" cy="216" rx="12" ry="15"/>'), S('<ellipse cx="150" cy="216" rx="12" ry="15"/>'),
    R('b_thighL', '<rect x="74" y="223" width="24" height="76" rx="8"/>'), R('b_thighR', '<rect x="102" y="223" width="24" height="76" rx="8"/>'), R('b_calfL', '<rect x="76" y="302" width="20" height="72" rx="9"/>'), R('b_calfR', '<rect x="104" y="302" width="20" height="72" rx="9"/>'),
    S('<ellipse cx="85" cy="386" rx="15" ry="10"/>'), S('<ellipse cx="115" cy="386" rx="15" ry="10"/>'), '<text x="30" y="70" font-size="14" fill="#64748b">I</text><text x="162" y="70" font-size="14" fill="#64748b">D</text>'];
  return `<div class="bodyfig"><div class="lbl">${side === 'f' ? T('front') : T('backView')}</div><svg viewBox="0 0 200 405" role="group" aria-label="${side === 'f' ? T('front') : T('backView')}">${g.join('')}</svg></div>`;
}
function fullName() { const p = state.patient; return [p.first, p.last].filter(Boolean).join(' ') || p.name; }
function allergyLabels(lang) { const p = state.patient; return p.allergies.map(k => cat('allergies', k, lang)).concat(p.allergyOther ? [p.allergyOther] : []); }
function checklistItems() {
  const p = state.patient, cl = k => cat('checklist', k), pt = state.lang === 'es' ? 'Paciente: ' : 'Patient: ';
  const ans = k => p.cond[k] ? pt + (p.cond[k] === 'yes' ? T('yes') : p.cond[k] === 'no' ? T('no') : T('notApplicable')) : (state.lang === 'es' ? 'Sin respuesta del paciente' : 'Not answered by patient');
  const has = k => p.allergies.includes(k);
  const v = state.provider;
  const items = [
    { key: 'allergyMed', label: cl('allergyMed'), hint: p.hasAllergies === 'yes' ? pt + (allergyLabels().join(', ') || T('yes')) : p.hasAllergies === 'no' ? pt + T('no') : T('allergyUnknown'), flag: p.hasAllergies !== 'no' },
    { key: 'allergyLatex', label: cl('allergyLatex'), hint: has('latex') ? pt + (state.lang === 'es' ? 'ALÉRGICO AL LÁTEX' : 'LATEX ALLERGY') : '', flag: has('latex') },
    { key: 'allergyAnesth', label: cl('allergyAnesth'), hint: has('anesthesia') || has('genAnesth') ? pt + allergyLabels().filter((_, i) => ['anesthesia', 'genAnesth'].includes(p.allergies[i])).join(', ') : '', flag: has('anesthesia') || has('genAnesth') },
    { key: 'meds', label: cl('meds'), hint: p.takesMeds === 'yes' ? pt + (p.meds.join(', ') || T('yes')) : p.takesMeds === 'no' ? pt + T('no') : '' },
    { key: 'diabetes', label: cl('diabetes'), hint: ans('diabetes'), flag: p.cond.diabetes === 'yes' },
    { key: 'bp', label: cl('bp'), hint: (v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia} mmHg · ` : (state.lang === 'es' ? 'PA no registrada · ' : 'BP not recorded · ')) + ans('hbp'), flag: p.cond.hbp === 'yes' || !(v.bpSys && v.bpDia) },
    { key: 'heart', label: cl('heart'), hint: ans('heart'), flag: p.cond.heart === 'yes' },
    { key: 'pregnancy', label: cl('pregnancy'), hint: ans('pregnant'), flag: p.cond.pregnant === 'yes' },
    { key: 'surgery', label: cl('surgery'), hint: ans('surgery') + (p.surgeryDetail ? ' · ' + p.surgeryDetail : ''), flag: p.cond.surgery === 'yes' },
    { key: 'thinners', label: cl('thinners'), hint: ans('thinners'), flag: p.cond.thinners === 'yes' },
    { key: 'pain', label: cl('pain'), hint: (v.pain ?? p.pain) != null ? `${v.pain ?? p.pain}/10` : (state.lang === 'es' ? 'Sin registrar' : 'Not recorded'), flag: (v.pain ?? p.pain) == null },
    { key: 'explained', label: cl('explained') }
  ];
  (state.config.clinic.custom || []).forEach((q, i) => items.push({ key: 'c' + i, label: '★ ' + q }));
  return items;
}

// ---------- signature pads (pen vs finger vs mouse) ----------
// state.inputMode: null until the first stroke, then 'pen' | 'finger' | 'mouse' (device property, memory only).
// Pen mode: touch pointers are rejected (palm/finger), width follows pressure. Finger mode: thicker line.
const MODE_TXT = { es: { none: 'Firme con el lápiz, el dedo o el mouse', pen: '✒️ Lápiz detectado', finger: '☝️ Usando el dedo', mouse: '🖱️ Usando el mouse' }, en: { none: 'Sign with a stylus, finger or mouse', pen: '✒️ Stylus detected', finger: '☝️ Using finger', mouse: '🖱️ Using mouse' } };
function modeText() { return MODE_TXT[state.lang][state.inputMode || 'none']; }
function updateModeTags() { document.querySelectorAll('.sigmode').forEach(t => { t.textContent = modeText(); t.dataset.mode = state.inputMode || 'none'; }); document.body.dataset.input = state.inputMode || 'none'; }
function strokeWidth(e) {
  if (state.inputMode === 'pen') { const pr = e.pressure > 0 ? e.pressure : 0.5; return 0.8 + pr * 4.2; }
  if (state.inputMode === 'finger') return 5;
  return 2.6;
}
function initSigPads() {
  updateModeTags();
  document.querySelectorAll('canvas[data-sig]').forEach(cv => {
    const path = cv.dataset.sig, ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect(); cv.width = rect.width * dpr; cv.height = rect.height * dpr; ctx.scale(dpr, dpr);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
    const existing = getPath(path);
    if (existing) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, rect.width, rect.height); im.src = existing; }
    let active = null, last = null, dirty = false; cv.__rejected = 0;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const t = e.pointerType === 'pen' ? 'pen' : e.pointerType === 'touch' ? 'finger' : 'mouse';
      if (state.inputMode === 'pen' && t === 'finger') { cv.__rejected++; return; } // palm / finger rejection
      if (active !== null) return; // one stroke at a time (ignore extra contacts)
      if (state.inputMode !== t && (state.inputMode !== 'pen' || t === 'pen')) { state.inputMode = t; updateModeTags(); } // first stroke decides; a pen always upgrades
      active = e.pointerId; last = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerId !== active) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (evs.length ? evs : [e]).forEach(ev => {
        const p = pos(ev); ctx.lineWidth = strokeWidth(ev); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; dirty = true; });
    });
    const end = e => { if (e.pointerId !== active) return; active = null; if (dirty) { setPath(path, cv.toDataURL('image/png')); if (path === 'provider.sig') refreshLock(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  });
}
function refreshLock() { if (isReady()) state.provider.showMissing = false; if (state.screen !== 'provider') return; const y = scrollY; render(); scrollTo(0, y); }

// ---------- license (PDF417 / AAMVA) ----------
function parseAAMVA(raw) {
  const txt = raw.replace(/\r/g, '\n');
  const get = code => { const m = txt.match(new RegExp('(?:^|\\n|DL|ID)' + code + '([^\\n]*)')); return m ? m[1].trim() : ''; };
  let first = get('DAC'), middle = get('DAD'), last = get('DCS');
  if (!first && get('DCT')) { const parts = get('DCT').split(/[ ,]+/); first = parts[0]; middle = parts.slice(1).join(' '); }
  if (!last && get('DAB')) last = get('DAB');
  if (!first && !last && get('DAA')) { const parts = get('DAA').split(/[,$]/); last = parts[0]; first = parts[1] || ''; }
  const dobRaw = get('DBB'); let dob = '';
  if (/^\d{8}$/.test(dobRaw)) dob = /^(19|20)/.test(dobRaw) && !/^(0[1-9]|1[0-2])/.test(dobRaw) ? `${dobRaw.slice(0, 4)}-${dobRaw.slice(4, 6)}-${dobRaw.slice(6)}` : `${dobRaw.slice(4)}-${dobRaw.slice(0, 2)}-${dobRaw.slice(2, 4)}`;
  const sexRaw = get('DBC'); const sex = sexRaw === '1' || /^M/i.test(sexRaw) ? 'M' : sexRaw === '2' || /^F/i.test(sexRaw) ? 'F' : sexRaw ? 'X' : '';
  const zip = get('DAK').replace(/[^0-9]/g, '').slice(0, 5);
  const title = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return { first: title(first), last: title(last), middle, dob, sex, address: title(get('DAG')), city: title(get('DAI')), state: get('DAJ').toUpperCase().slice(0, 2), zip, dlNo: get('DAQ') };
}
async function decodeLicenseFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    if ('BarcodeDetector' in window) {
      try { const fm = await BarcodeDetector.getSupportedFormats(); if (fm.includes('pdf417')) { const r = await new BarcodeDetector({ formats: ['pdf417'] }).detect(img); if (r[0]?.rawValue) return { text: r[0].rawValue, engine: 'BarcodeDetector' }; } } catch (e) { /* fall through */ }
    }
    const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.PDF_417]); hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    const reader = new ZXing.PDF417Reader();
    for (const maxW of [1600, 2400, 1000, img.naturalWidth]) for (const rot of [0, 90, 270]) {
      const sc = Math.min(1, maxW / img.naturalWidth), w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
      const cv = document.createElement('canvas'); const swap = rot % 180 !== 0; cv.width = swap ? h : w; cv.height = swap ? w : h;
      const ctx = cv.getContext('2d'); ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(rot * Math.PI / 180); ctx.drawImage(img, -w / 2, -h / 2, w, h);
      try { const lum = new ZXing.HTMLCanvasElementLuminanceSource(cv); const bmp = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(lum)); const r = reader.decode(bmp, hints); if (r?.getText()) return { text: r.getText(), engine: 'ZXing' }; } catch (e) { /* try next */ }
      cv.width = cv.height = 0;
    }
    return null;
  } finally { URL.revokeObjectURL(url); }
}
async function onLicenseFile(input) {
  const file = input.files && input.files[0]; if (!file) return;
  state.msg = { type: 'info', text: T('licReading') }; document.getElementById('licStatus').innerHTML = msgBox();
  let res = null; try { res = await decodeLicenseFile(file); } catch (e) { res = null; }
  input.value = ''; // the photo is never kept
  if (res) {
    const d = parseAAMVA(res.text); const p = state.patient;
    ['first', 'last', 'dob', 'sex', 'address', 'city', 'state', 'zip', 'dlNo'].forEach(k => { if (d[k]) p[k] = d[k]; });
    p.licSource = res.engine; state.msg = { type: 'ok', text: T('licOk') + ` (${res.engine})` };
  } else state.msg = { type: 'err', text: T('licFail') };
  const m = state.msg; render(); state.msg = m; document.getElementById('licStatus').innerHTML = msgBox();
}

// ---------- encrypted settings (clinic + staff config only; NEVER patient data) ----------
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => { const a = new Uint8Array(buf); let str = ''; for (let i = 0; i < a.length; i += 0x8000) str += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(str); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const KDF_ITER = 150000;
async function keyFromSecret(secret, salt, iter = KDF_ITER) { const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
async function encryptJSON(obj, secret, extra = {}) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFromSecret(secret, salt), enc.encode(JSON.stringify(obj)));
  return { ...extra, v: 2, kdf: 'PBKDF2-SHA256', iter: KDF_ITER, alg: 'AES-GCM-256', salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}
async function decryptJSON(o, secret) { const key = await keyFromSecret(secret, unb64(o.salt), o.iter || KDF_ITER); return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct)))); }
// config v1 (single provider) -> v2 (clinic + staff)
function migrateConfig(c) {
  if (c && c.clinic && typeof c.clinic === 'object' && Array.isArray(c.staff)) return c;
  const roleBySpec = { dental: 'dentist', pt: 'physio', chiro: 'chiro', therapy: 'therapist' };
  return { adminPin: c.pin, clinic: { name: c.clinic || '', logo: '', logoW: 0, logoH: 0, address: c.clinicAddr || '', phone: '', specialty: c.specialty || 'dental', custom: c.custom || [], timeoutMin: c.timeoutMin || 2 },
    staff: [{ id: 's1', name: c.doctorName || '', role: roleBySpec[c.specialty] || 'physician', license: c.license || '', photo: '', sig: c.sig || '', pin: c.pin }] };
}
function validConfig(c) { return c && c.clinic && typeof c.clinic.name === 'string' && Array.isArray(c.staff) && c.staff.every(x => x && x.id && typeof x.pin === 'string') && typeof c.adminPin === 'string'; }
async function saveSettings(cfg) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(await encryptJSON(cfg, cfg.adminPin))); }
async function loadSettings(pin) { return migrateConfig(await decryptJSON(JSON.parse(localStorage.getItem(SETTINGS_KEY)), pin)); }
function configToDraft(c) {
  const k = c.clinic;
  state.draft = Object.assign(newDraft(), { name: k.name, logo: k.logo || '', logoW: k.logoW || 0, logoH: k.logoH || 0, address: k.address || '', phone: k.phone || '', specialty: k.specialty || 'dental',
    customText: (k.custom || []).join('\n'), timeoutMin: k.timeoutMin || 2, retention: k.retention || 'eod', closeTime: k.closeTime || '23:59', saveEnc: !!localStorage.getItem(SETTINGS_KEY), staff: c.staff.map(x => ({ ...x })), _adminPin: c.adminPin });
}
// ---------- images (resized client-side; never patient images) ----------
function loadImage(file) { return new Promise((res, rej) => { const url = URL.createObjectURL(file); const im = new Image(); im.onload = () => { URL.revokeObjectURL(url); res(im); }; im.onerror = e => { URL.revokeObjectURL(url); rej(e); }; im.src = url; }); }
async function resizeLogo(file) {
  const im = await loadImage(file); const sc = Math.min(1, 480 / im.naturalWidth, 200 / im.naturalHeight);
  const w = Math.max(1, Math.round(im.naturalWidth * sc)), h = Math.max(1, Math.round(im.naturalHeight * sc));
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
  return { data: c.toDataURL('image/png'), w, h };
}
async function makeAvatar(file, size = 160) {
  const im = await loadImage(file); const s = Math.min(im.naturalWidth, im.naturalHeight);
  const sx = (im.naturalWidth - s) / 2, sy = Math.max(0, (im.naturalHeight - s) * 0.35); // portraits: bias toward the face
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
  ctx.drawImage(im, sx, sy, s, s, 0, 0, size, size);
  return c.toDataURL('image/png');
}
function download(name, text, type = 'application/octet-stream') { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
function importBlock() {
  return `<div class="import-box"><p class="small"><b>${T('clinicSetupHint')}</b></p><div class="row"><span class="btn ghost filebtn">📂 ${T('importFile')}<input type="file" id="importFile" accept=".cpcfg,application/json,.json" aria-label="${T('importFile')}"></span><span class="small" id="importName">${state.importText ? '✓' : ''}</span></div>
    <div class="row" style="margin-top:8px"><input type="password" id="importPass" data-bind="draft.importPass" value="${esc(state.draft.importPass)}" placeholder="${T('passphrase')}" aria-label="${T('passphrase')}" style="flex:1;min-width:240px" autocomplete="off"><button class="btn ghost" data-action="importConfig">🔓 ${T('importBtn')}</button></div></div>`;
}

// ---------- PDF ----------
function buildPdf(lang) {
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const p = state.patient, v = state.provider, cfg = state.config, L2 = k => TL(lang, k);
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 46; let y = M;
  const st = curStaff() || { name: '', role: '', license: '', photo: '' }; const k = cfg.clinic; const now = new Date();
  const header = () => {
    let x = M; const top = 30;
    if (k.logo) { const ratio = (k.logoW && k.logoH) ? k.logoW / k.logoH : 1, lw = Math.min(130, 42 * ratio), lh = lw / ratio; try { doc.addImage(k.logo, 'PNG', M, top + (42 - lh) / 2, lw, lh, 'cp_logo', 'FAST'); x = M + lw + 10; } catch (e) {} }
    const avail = W - M - 190 - x, nm = k.name || 'Clinic'; let fz = 15; doc.setTextColor(11, 37, 64); doc.setFont('helvetica', 'bold'); doc.setFontSize(fz);
    while (doc.getTextWidth(nm) > avail && fz > 10.5) { fz -= 0.5; doc.setFontSize(fz); }
    const nl = doc.splitTextToSize(nm, avail).slice(0, 2); doc.text(nl, x, top + 15); const subY = top + 15 + nl.length * fz * 0.95 + 1;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80); const sub = [k.address, k.phone].filter(Boolean).join(' · '); if (sub) doc.text(doc.splitTextToSize(sub, avail).slice(0, nl.length > 1 ? 1 : 2), x, subY);
    const ps = 42, px = W - M - ps; if (st.photo) { try { doc.addImage(st.photo, 'PNG', px, top, ps, ps, 'cp_photo', 'FAST'); } catch (e) {} }
    const tx = st.photo ? px - 8 : W - M; doc.setTextColor(11, 37, 64); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(st.name || '', tx, top + 12, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(80); doc.text(st.role ? roleLabel(st.role, lang) : '', tx, top + 24, { align: 'right' }); if (st.license) doc.text(`${lang === 'es' ? 'Licencia' : 'License'}: ${st.license}`, tx, top + 35, { align: 'right' });
    doc.setTextColor(0); doc.setDrawColor(15, 163, 163); doc.setLineWidth(1.5); doc.line(M, top + 50, W - M, top + 50);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(11, 37, 64); doc.text(lang === 'es' ? 'Registro de visita del paciente' : 'Patient visit record', M, top + 66);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80); doc.text(now.toLocaleString(lang === 'es' ? 'es-US' : 'en-US'), W - M, top + 66, { align: 'right' }); doc.setTextColor(0);
    y = top + 86;
  };
  const newPage = () => { doc.addPage(); header(); };
  const ensure = h => { if (y + h > H - 60) newPage(); };
  const footer = () => { doc.setFontSize(8); doc.setTextColor(100); doc.text(doc.splitTextToSize(L2('footer'), W - 2 * M - 60), M, H - 34); doc.setTextColor(0); };
  const h2 = t => { ensure(30); y += 8; doc.setFillColor(240, 253, 250); doc.rect(M, y - 12, W - 2 * M, 20, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 118, 110); doc.text(t, M + 6, y + 2); doc.setTextColor(0); y += 18; };
  const line = (label, val, opts = {}) => { doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); const lw = 175; const ll = doc.splitTextToSize(String(label), lw - 10); doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(String(val || '—'), W - 2 * M - lw); const n = Math.max(ll.length, lines.length); ensure(n * 13 + 4); doc.setFont('helvetica', 'bold'); doc.text(ll, M, y); doc.setFont('helvetica', 'normal'); if (opts.red) doc.setTextColor(185, 28, 28); doc.text(lines, M + lw, y); doc.setTextColor(0); y += n * 13 + 3; };
  const yn = k => p.cond[k] === 'yes' ? L2('yes') : p.cond[k] === 'no' ? L2('no') : p.cond[k] === 'na' ? L2('notApplicable') : '—';
  header();
  // allergies box
  const al = allergyLabels(lang); const alTxt = p.hasAllergies === 'yes' ? `${L2('allergyBanner')}: ${al.join(', ') || L2('yes')}` : p.hasAllergies === 'no' ? L2('noAllergies') : L2('allergyUnknown');
  doc.setFillColor(...(p.hasAllergies === 'no' ? [220, 252, 231] : [254, 226, 226])); doc.setDrawColor(...(p.hasAllergies === 'no' ? [22, 163, 74] : [220, 38, 38]));
  const alLines = doc.splitTextToSize(alTxt, W - 2 * M - 20); doc.roundedRect(M, y, W - 2 * M, alLines.length * 15 + 14, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...(p.hasAllergies === 'no' ? [21, 128, 61] : [153, 27, 27])); doc.text(alLines, M + 10, y + 18); doc.setTextColor(0); y += alLines.length * 15 + 24;
  h2(lang === 'es' ? 'Datos del paciente' : 'Patient information');
  line(lang === 'es' ? 'Nombre' : 'Name', fullName()); line(L2('dob'), p.dob); line(L2('sex'), p.sex ? cat('sex', p.sex, lang) : '');
  line(L2('address'), [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')); line(L2('phone'), p.phone); line(L2('dlNo'), p.dlNo + (p.licSource ? (lang === 'es' ? '  (leído de la licencia)' : '  (read from license)') : ''));
  h2(lang === 'es' ? 'Motivo y síntomas' : 'Reason and symptoms');
  line(L2('reason'), p.reason); line(L2('symptoms'), p.symptoms.map(k => cat('symptoms', k, lang)).join(', ')); line(L2('duration'), p.duration ? cat('duration', p.duration, lang) : '');
  line(lang === 'es' ? 'Dolor (paciente)' : 'Pain (patient)', p.pain != null ? p.pain + '/10' : ''); line(lang === 'es' ? 'Zonas de dolor' : 'Pain locations', p.body.map(k => cat('body', k, lang)).join(', '));
  h2(L2('histTitle'));
  Object.keys(C.conditions).forEach(k => line(cat('conditions', k, lang).replace(/\s*\(.*\)/, '').replace(/[¿?]/g, ''), yn(k) + (k === 'surgery' && p.surgeryDetail ? ' — ' + p.surgeryDetail : ''), { red: p.cond[k] === 'yes' }));
  if (p.otherCond) line(L2('otherConditions'), p.otherCond);
  line(L2('medTitle'), p.takesMeds === 'no' ? L2('no') : p.meds.join(', '));
  h2(L2('vitals')); line(L2('bp'), v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia}` : ''); line(L2('pulse'), v.pulse); line(L2('temp'), v.temp); line(lang === 'es' ? 'Dolor (proveedor)' : 'Pain (provider)', (v.pain ?? p.pain) != null ? (v.pain ?? p.pain) + '/10' : '');
  h2(lang === 'es' ? 'Evaluación y plan' : 'Assessment and plan');
  ['findings', 'diagnosis', 'treatment', 'medicines'].forEach(sec => line(L2(sec), v.pick[sec].map(s => pick(s)[lang]).concat(v.notes[sec] ? [v.notes[sec]] : []).join('; ')));
  h2(L2('checklist').replace(/\s*\(.*\)/, ''));
  const saveLang = state.lang; state.lang = lang; const items = checklistItems(); state.lang = saveLang;
  items.forEach(i => { const lines = doc.splitTextToSize(`[${v.check[i.key] ? 'X' : ' '}] ${i.label}${i.hint ? ' — ' + i.hint : ''}`, W - 2 * M); ensure(lines.length * 13); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(lines, M, y); y += lines.length * 13 + 2; });
  newPage(); h2(L2('consTitle')); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); const ct = doc.splitTextToSize(L2('consText'), W - 2 * M); ensure(ct.length * 12); doc.text(ct, M, y); y += ct.length * 12 + 6;
  line(lang === 'es' ? 'Consentimiento' : 'Consent', p.consent ? (lang === 'es' ? 'Aceptado por el paciente en la tablet' : 'Accepted by patient on tablet') : '');
  ensure(110); const sw = (W - 2 * M - 30) / 2;
  [[p.patientSig, `${L2('patSig')}: ${fullName()}`], [v.sig, `${L2('provSigTitle')}: ${st.name}${st.role ? ' (' + roleLabel(st.role, lang) + ')' : ''}`]].forEach(([img, lbl], i) => { const x = M + i * (sw + 30); if (img) doc.addImage(img, 'PNG', x, y, sw, 70, 'cp_sig' + i, 'FAST'); doc.setDrawColor(150); doc.line(x, y + 74, x + sw, y + 74); doc.setFontSize(9); doc.text(lbl, x, y + 88); });
  y += 100;
  const n = doc.internal.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); footer(); doc.setFontSize(8); doc.setTextColor(100); doc.text(`${i}/${n}`, W - M, H - 34, { align: 'right' }); doc.setTextColor(0); }
  return doc;
}
// ---------- print-ready HTML (window.print -> AirPrint on iPad/iPhone, Mopria / system print on Android; works offline) ----------
function buildPrintHtml(lang) {
  const p = state.patient, v = state.provider, k = state.config.clinic, L2 = key => TL(lang, key), es = lang === 'es';
  const st = curStaff() || { name: '', role: '', license: '', photo: '' }; const now = new Date();
  const row = (l, val, red) => `<tr${red ? ' class="red"' : ''}><th>${esc(l)}</th><td>${esc(val || '—')}</td></tr>`;
  const sec = (t, rows) => `<h2>${esc(t)}</h2><table>${rows.join('')}</table>`;
  const yn = c => p.cond[c] === 'yes' ? L2('yes') : p.cond[c] === 'no' ? L2('no') : p.cond[c] === 'na' ? L2('notApplicable') : '—';
  const al = allergyLabels(lang); const alTxt = p.hasAllergies === 'yes' ? `${L2('allergyBanner')}: ${al.join(', ') || L2('yes')}` : p.hasAllergies === 'no' ? L2('noAllergies') : L2('allergyUnknown');
  const saveLang = state.lang; state.lang = lang; const items = checklistItems(); state.lang = saveLang;
  const head = `<header class="pv-head">${k.logo ? `<img class="pv-logo" src="${k.logo}" alt="">` : ''}<div class="pv-clinic"><b>${esc(k.name || 'Clinic')}</b><span>${esc([k.address, k.phone].filter(Boolean).join(' · '))}</span></div>
    <div class="pv-prov"><b>${esc(st.name || '')}</b><span>${esc(st.role ? roleLabel(st.role, lang) : '')}</span>${st.license ? `<span>${es ? 'Licencia' : 'License'}: ${esc(st.license)}</span>` : ''}</div>${st.photo ? `<img class="pv-photo" src="${st.photo}" alt="">` : ''}</header>
    <div class="pv-title"><b>${es ? 'Registro de visita del paciente' : 'Patient visit record'}</b><span>${esc(now.toLocaleString(es ? 'es-US' : 'en-US'))}</span></div>`;
  return `${head}<div class="pv-allergy ${p.hasAllergies === 'no' ? 'ok' : ''}">${esc(alTxt)}</div>
  ${sec(es ? 'Datos del paciente' : 'Patient information', [row(es ? 'Nombre' : 'Name', fullName()), row(L2('dob'), p.dob), row(L2('sex'), p.sex ? cat('sex', p.sex, lang) : ''), row(L2('address'), [p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')), row(L2('phone'), p.phone), row(L2('dlNo'), p.dlNo)])}
  ${sec(es ? 'Motivo y síntomas' : 'Reason and symptoms', [row(L2('reason'), p.reason), row(L2('symptoms'), p.symptoms.map(x => cat('symptoms', x, lang)).join(', ')), row(L2('duration'), p.duration ? cat('duration', p.duration, lang) : ''), row(es ? 'Dolor (paciente)' : 'Pain (patient)', p.pain != null ? p.pain + '/10' : ''), row(es ? 'Zonas de dolor' : 'Pain locations', p.body.map(x => cat('body', x, lang)).join(', '))])}
  ${sec(L2('histTitle'), Object.keys(C.conditions).map(c => row(cat('conditions', c, lang).replace(/\s*\(.*\)/, '').replace(/[¿?]/g, ''), yn(c) + (c === 'surgery' && p.surgeryDetail ? ' — ' + p.surgeryDetail : ''), p.cond[c] === 'yes')).concat(p.otherCond ? [row(L2('otherConditions'), p.otherCond)] : [], [row(L2('medTitle'), p.takesMeds === 'no' ? L2('no') : p.meds.join(', '))]))}
  ${sec(L2('vitals'), [row(L2('bp'), v.bpSys && v.bpDia ? `${v.bpSys}/${v.bpDia}` : ''), row(L2('pulse'), v.pulse), row(L2('temp'), v.temp), row(es ? 'Dolor (proveedor)' : 'Pain (provider)', (v.pain ?? p.pain) != null ? (v.pain ?? p.pain) + '/10' : '')])}
  ${sec(es ? 'Evaluación y plan' : 'Assessment and plan', ['findings', 'diagnosis', 'treatment', 'medicines'].map(x => row(L2(x), v.pick[x].map(q => pick(q)[lang]).concat(v.notes[x] ? [v.notes[x]] : []).join('; '))))}
  <h2>${esc(L2('checklist').replace(/\s*\(.*\)/, ''))}</h2><ul class="pv-check">${items.map(i => `<li>${v.check[i.key] ? '☑' : '☐'} ${esc(i.label)}${i.hint ? ' — ' + esc(i.hint) : ''}</li>`).join('')}</ul>
  <section class="pv-consent">${head}<h2>${esc(L2('consTitle'))}</h2><p>${esc(L2('consText'))}</p><p><b>${es ? 'Consentimiento' : 'Consent'}:</b> ${p.consent ? (es ? 'Aceptado por el paciente en la tablet' : 'Accepted by patient on tablet') : '—'}</p>
  <div class="pv-sigs"><figure>${p.patientSig ? `<img src="${p.patientSig}" alt="">` : ''}<figcaption>${esc(L2('patSig'))}: ${esc(fullName())}</figcaption></figure><figure>${v.sig ? `<img src="${v.sig}" alt="">` : ''}<figcaption>${esc(L2('provSigTitle'))}: ${esc(st.name)}${st.role ? ' (' + esc(roleLabel(st.role, lang)) + ')' : ''}</figcaption></figure></div></section>
  <footer class="pv-foot">${esc(L2('footer'))}</footer>`;
}
function printNow() {
  const pv = document.getElementById('printView'); pv.innerHTML = buildPrintHtml(state.provider.pdfLang || state.lang);
  document.body.classList.add('printing'); window.print(); // class stays until the panel closes (iOS prints asynchronously)
}
// ---------- "Visitas de hoy": encrypted on-device store (IndexedDB, AES-GCM; keys derived from PINs; auto-purge) ----------
const RETENTIONS = ['eod', '24h', 'now'];
const retention = () => (state.config && state.config.clinic.retention) || 'eod';
const closeTimeOf = () => (state.config && state.config.clinic.closeTime) || '23:59';
function expiryFor(created) {
  if (retention() === '24h') return created + 24 * 3600e3;
  const [h, m] = closeTimeOf().split(':').map(Number); const d = new Date(created); d.setHours(h, m, 0, 0); if (d.getTime() <= created) d.setDate(d.getDate() + 1); return d.getTime();
}
const fmtTime = ms => new Date(ms).toLocaleString(state.lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const expiryLabel = () => fmtTime(expiryFor(Date.now()));
const retentionLabel = () => retention() === '24h' ? T('ret_24h') : T('ret_eodAt').replace('{t}', closeTimeOf());
const VDB = 'clinicpad-visits';
function vdb() { return new Promise((res, rej) => { const r = indexedDB.open(VDB, 1); r.onupgradeneeded = () => { r.result.createObjectStore('visits', { keyPath: 'id' }); r.result.createObjectStore('meta'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function vtx(store, mode, fn) { const db = await vdb(); return new Promise((res, rej) => { const tx = db.transaction(store, mode); const st = tx.objectStore(store); let out; Promise.resolve(fn(st, v => (out = v))).catch(rej); tx.oncomplete = () => { db.close(); res(out); }; tx.onerror = () => { db.close(); rej(tx.error); }; }); }
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function vAll() { return vtx('visits', 'readonly', (st, set) => reqP(st.getAll()).then(set)); }
async function deviceSalt() {
  let salt = await vtx('meta', 'readonly', (st, set) => reqP(st.get('salt')).then(set));
  if (!salt) { salt = b64(crypto.getRandomValues(new Uint8Array(16))); await vtx('meta', 'readwrite', st => st.put(salt, 'salt')); } return unb64(salt);
}
const kekCache = new Map();
async function kek(pin) { const k = 'k' + pin; if (!kekCache.has(k)) kekCache.set(k, await keyFromSecret('clinicpad-visit:' + pin, await deviceSalt())); return kekCache.get(k); }
async function wrapKey(raw, pin) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), wk: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await kek(pin), raw)) }; }
async function hasVisit(id) { try { return !!(await vtx('visits', 'readonly', (st, set) => reqP(st.getKey(id)).then(set))); } catch (e) { return false; } }
function storeVisit() { const v = state.provider; if (!v._saving) v._saving = storeVisitNow().catch(e => { v._saving = null; throw e; }); return v._saving; }
async function storeVisitNow() {
  if (retention() === 'now' || !crypto.subtle || !window.indexedDB) return null;
  const v = state.provider, st = curStaff(); if (!st || !v.visitId || await hasVisit(v.visitId)) return null;
  const created = Date.now(), pdfB64 = exp && exp.blob ? b64(await exp.blob.arrayBuffer()) : '';
  const payload = { v: 1, createdAt: created, lang: v.pdfLang || state.lang, patient: { ...state.patient }, provider: { ...v, showMissing: false, _saving: undefined }, staff: { id: st.id, name: st.name, role: st.role, license: st.license, photo: st.photo }, pdf: pdfB64, pdfName: exp ? exp.name : '' };
  const dk = crypto.getRandomValues(new Uint8Array(32)); const key = await crypto.subtle.importKey('raw', dk, 'AES-GCM', false, ['encrypt']); const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(payload)));
  const wraps = [await wrapKey(dk, st.pin), await wrapKey(dk, state.config.adminPin)]; dk.fill(0);
  const rec = { id: v.visitId, createdAt: created, expiresAt: expiryFor(created), alg: 'AES-GCM-256', iv: b64(iv), ct: b64(ct), wraps };
  await vtx('visits', 'readwrite', s2 => s2.put(rec)); return rec;
}
async function openVisits(pin) {
  await purgeExpired(); const k = await kek(pin); const out = [];
  for (const r of await vAll()) { for (const w of r.wraps) { try { const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(w.iv) }, k, unb64(w.wk)); const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const pl = JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(r.iv) }, key, unb64(r.ct))));
      out.push({ id: r.id, createdAt: r.createdAt, name: [pl.patient.first, pl.patient.last].filter(Boolean).join(' ') || pl.patient.name, staffName: pl.staff.name, staffRole: pl.staff.role, allergy: pl.patient.hasAllergies, rec: pl }); break; } catch (e) { /* not this PIN's record */ } } }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
async function purgeExpired() {
  if (!window.indexedDB) return 0; let n = 0; const now = Date.now();
  try { await vtx('visits', 'readwrite', st => reqP(st.getAll()).then(all => all.forEach(r => { if (!(r.expiresAt > now) || retention() === 'now' && state.config) { st.delete(r.id); n++; } }))); } catch (e) {}
  if (n && state.today) { const ids = new Set((await vAll()).map(r => r.id)); state.today.list = state.today.list.filter(r => ids.has(r.id)); if (state.viewRec && !ids.has(state.viewRec.id)) { state.viewRec = null; if (state.screen === 'visitView') state.screen = 'today'; } if (['today', 'visitView'].includes(state.screen)) render(); }
  return n;
}
async function wipeAllVisits() { kekCache.clear(); try { await vtx('visits', 'readwrite', st => st.clear()); } catch (e) {} }
function withRecord(r, fn) { const sp = state.patient, sv = state.provider; state.patient = r.patient; state.provider = r.provider; state.viewStaff = r.staff; try { return fn(); } finally { state.patient = sp; state.provider = sv; state.viewStaff = null; } }
purgeExpired(); setInterval(purgeExpired, 30000); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') purgeExpired(); }); window.addEventListener('pageshow', purgeExpired);

// ---------- export / print (iOS-safe: share sheet, download, open; wipe only after the user confirms) ----------
const isReady = () => { const v = state.provider; return checklistItems().every(i => v.check[i.key]) && !!v.sig; };
let exp = null; // { url, name, file, lang }
function explainMissing() {
  state.provider.showMissing = true; render();
  const first = document.querySelector('#checklistCard .check.missing') || document.getElementById('provSigWrap');
  if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.classList.add('pulse'); setTimeout(() => first.classList.remove('pulse'), 1600); }
  const n = checklistItems().filter(i => !state.provider.check[i.key]).length + (state.provider.sig ? 0 : 1);
  toast(T('missingToast').replace('{n}', n), 4200);
}
function pdfName(lang) { return `${(window.BRAND || 'ClinicPad').replace(/\W+/g, '')}_${lang}_${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}.pdf`; }
function makePdf(autoPrint) {
  const lang = state.provider.pdfLang || state.lang; const doc = buildPdf(lang); if (autoPrint) doc.autoPrint();
  const blob = doc.output('blob'); const name = pdfName(lang);
  if (exp && exp.url) URL.revokeObjectURL(exp.url);
  let file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) {}
  exp = { url: URL.createObjectURL(blob), blob, name, file, lang, size: blob.size }; return exp;
}
const canShareFile = () => !!(exp && exp.file && navigator.share && navigator.canShare && (() => { try { return navigator.canShare({ files: [exp.file] }); } catch (e) { return false; } })());
function downloadPdf() { const a = document.createElement('a'); a.href = exp.url; a.download = exp.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); }
function sharePdf() {
  return navigator.share({ files: [exp.file], title: exp.name }).then(() => showExport('shared'))
    .catch(e => showExport(e && e.name === 'AbortError' ? 'cancelled' : 'shareFail', e));
}
function openPdfTab() { const w = window.open(exp.url, '_blank'); if (!w) showExport('popupBlocked'); else showExport('opened'); }
function startExport(mode) {
  if (!isReady()) return explainMissing();
  try { makePdf(false); } catch (e) { console.warn(e); if (mode !== 'print') return showExport('error', e); }
  const mobile = state.device !== 'desktop';
  if (mode === 'print') { try { printNow(); } catch (e) { return showExport('printFail', e); } return showExport('printDialog'); }
  if (mobile && canShareFile()) { showExport('sharing'); return sharePdf(); } // must stay inside the tap (user gesture)
  try { downloadPdf(); showExport('downloaded'); } catch (e) { showExport('error', e); }
}
function showExport(status, err) {
  if (['shared', 'downloaded', 'opened', 'printOpened', 'printDialog'].includes(status) && state.screen === 'provider') storeVisit().then(r => { if (r) toast(T('visitSaved').replace('{t}', fmtTime(r.expiresAt))); }).catch(e => console.warn('store', e));
  const ov = document.getElementById('exportPanel'); if (!ov) return;
  const ok = ['shared', 'downloaded', 'opened', 'printOpened', 'printDialog'].includes(status), bad = ['error', 'shareFail', 'popupBlocked', 'printFail'].includes(status);
  const msg = T('exp_' + status) + (err && status === 'error' ? ` (${esc(err.message || err)})` : '');
  const kb = exp ? Math.round(exp.size / 1024) : 0;
  ov.innerHTML = `<div class="modal export-modal" role="dialog" aria-modal="true" aria-labelledby="expTitle">
    <div class="exp-ico">${ok ? '✅' : bad ? '⚠️' : status === 'sharing' ? '⏳' : 'ℹ️'}</div><h2 id="expTitle">${ok ? T('expOkTitle') : bad ? T('expBadTitle') : T('expTitle')}</h2>
    <p class="msg ${ok ? 'ok' : bad ? 'err' : 'info'}" id="expStatus" data-status="${status}">${msg}</p>
    ${exp ? `<p class="small">📄 ${esc(exp.name)} · ${kb} KB</p>` : ''}
    <div class="exp-actions"><button class="btn ghost" data-action="expPrint">🖨️ ${T('expPrint')}</button>
      ${exp && canShareFile() ? `<button class="btn ghost" data-action="expShare">📤 ${T('expShare')}</button>` : ''}
      ${exp ? `<button class="btn ghost" data-action="expDownload">⬇️ ${T('expDownload')}</button><button class="btn ghost" data-action="expOpen">🔎 ${T('expOpen')}</button>` : ''}
      ${exp && (status === 'popupBlocked' || state.device !== 'desktop') ? `<button class="btn ghost" data-action="expOpenHere">↗️ ${T('expOpenHere')}</button>` : ''}
    </div>
    <p class="small">${T('expKeep')}</p>
    <div class="exp-final"><button class="btn ghost xl" data-action="expBack">← ${T('expBack')}</button><button class="btn primary xl" id="expDone" data-action="expDone">✓ ${T('expDone')}</button></div></div>`;
  const tEl = document.getElementById('toast'); if (tEl) tEl.hidden = true;
  ov.hidden = false; document.getElementById('expDone')?.focus({ preventScroll: true });
}
function hideExport() { document.body.classList.remove('printing'); const pv = document.getElementById('printView'); if (pv) pv.innerHTML = ''; const ov = document.getElementById('exportPanel'); if (ov) { ov.hidden = true; ov.innerHTML = ''; } }

// ---------- wipe ----------
function wipe(next = 'start') {
  state.patient = newPatient(); state.provider = newProvider(); state.pinBuf = ''; state.msg = null; state.selStaff = null;
  state.today = null; state.viewRec = null; state.viewStaff = null; kekCache.clear();
  hideExport(); if (exp && exp.url) setTimeout(((u) => () => URL.revokeObjectURL(u))(exp.url), 60000); exp = null;
  document.querySelectorAll('canvas').forEach(c => { c.width = c.height = 0; });
  document.querySelectorAll('input[type=file]').forEach(i => (i.value = ''));
  try { sessionStorage.clear(); } catch (e) {}
  hideIdle(); go(next);
}

// ---------- actions ----------
const actions = {
  toggleLang() { state.lang = state.lang === 'es' ? 'en' : 'es'; document.documentElement.lang = state.lang; const y = scrollY; render(); scrollTo(0, y); },
  setVal(el) { setPath(el.dataset.path, el.dataset.val); const y = scrollY; render(); scrollTo(0, y); },
  toggleArr(el) { toggle(getPath(el.dataset.path), el.dataset.val); const y = scrollY; render(); scrollTo(0, y); },
  setPain(el) { setPath(el.dataset.path, +el.dataset.val); const y = scrollY; render(); scrollTo(0, y); },
  toggleBody(el) { toggle(state.patient.body, el.dataset.val); const y = scrollY; render(); scrollTo(0, y); },
  togglePick(el) { toggle(state.provider.pick[el.dataset.sec], el.dataset.val); const y = scrollY; render(); scrollTo(0, y); },
  goto(el) { go(el.dataset.val); },
  clearSig(el) { setPath(el.dataset.val, ''); const y = scrollY; render(); scrollTo(0, y); },
  useSavedSig() { const st = curStaff(); if (st) state.provider.sig = st.sig; refreshLock(); },
  removeLogo() { Object.assign(state.draft, { logo: '', logoW: 0, logoH: 0 }); render(); },
  clinicNext() {
    const d = state.draft, editing = !!state.config;
    if (!d.name.trim()) { state.msg = { type: 'err', text: T('required') + ': ' + T('clinicName') }; return render(); }
    if (!((editing || d._adminPin) && !d.adminPin && !d.adminPin2) && (!/^\d{4,8}$/.test(d.adminPin) || d.adminPin !== d.adminPin2)) { state.msg = { type: 'err', text: T('pinMismatch') }; return render(); }
    if (d.adminPin) d._adminPin = d.adminPin;
    go('staff');
  },
  addStaff() { const firstRole = { dental: 'dentist', pt: 'physio', chiro: 'chiro', therapy: 'therapist' }[state.draft.specialty] || 'dentist'; state.staffDraft = Object.assign(newStaff(), { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), role: firstRole }); go('staffEdit'); },
  editStaff(el) { const st = state.draft.staff.find(x => x.id === el.dataset.val); if (!st) return; state.staffDraft = { ...st, _pin: st.pin, pin: '', pin2: '' }; go('staffEdit'); },
  delStaff(el) { if (!confirm(T('confirmDel'))) return; state.draft.staff = state.draft.staff.filter(x => x.id !== el.dataset.val); render(); },
  saveStaff() {
    const s = state.staffDraft, list = state.draft.staff, i = list.findIndex(x => x.id === s.id);
    if (!s.name.trim() || !s.role) { state.msg = { type: 'err', text: T('required') + ': ' + T('staffName') }; return render(); }
    const keep = i >= 0 && !s.pin && !s.pin2;
    if (!keep && (!/^\d{4,6}$/.test(s.pin) || s.pin !== s.pin2)) { state.msg = { type: 'err', text: T('pinMismatch') }; return render(); }
    const rec = { id: s.id, name: s.name.trim(), role: s.role, license: s.license.trim(), photo: s.photo, sig: s.sig, pin: keep ? s._pin : s.pin };
    if (i >= 0) list[i] = rec; else list.push(rec);
    state.staffDraft = newStaff(); go('staff');
  },
  async saveSetup() {
    const d = state.draft;
    if (!d.staff.some(isClinician)) { state.msg = { type: 'err', text: T('noStaff') }; return render(); }
    if (!d._adminPin) { state.msg = { type: 'err', text: T('pinMismatch') }; return go('clinic'); }
    state.config = { adminPin: d._adminPin, clinic: { name: d.name.trim(), logo: d.logo, logoW: d.logoW, logoH: d.logoH, address: d.address.trim(), phone: d.phone.trim(), specialty: d.specialty,
      custom: d.customText.split('\n').map(x => x.trim()).filter(Boolean), timeoutMin: Math.max(1, Math.min(30, +d.timeoutMin || 2)), retention: RETENTIONS.includes(d.retention) ? d.retention : 'eod', closeTime: /^\d\d:\d\d$/.test(d.closeTime) ? d.closeTime : '23:59' }, staff: d.staff.map(x => ({ ...x })) };
    if (d.saveEnc && crypto.subtle) { await saveSettings(state.config); toast(state.lang === 'es' ? 'Configuración guardada (cifrada)' : 'Setup saved (encrypted)'); }
    else localStorage.removeItem(SETTINGS_KEY);
    if (state.config.clinic.retention === 'now') await wipeAllVisits(); else purgeExpired();
    d.adminPin = d.adminPin2 = d.pass = ''; go('start');
  },
  async exportConfig() {
    const d = state.draft; if ((d.pass || '').length < 8) { state.msg = { type: 'err', text: T('passShort') }; return render(); }
    if (!d._adminPin) { state.msg = { type: 'err', text: T('pinMismatch') }; return go('clinic'); }
    const cfg = { adminPin: d._adminPin, clinic: { name: d.name.trim(), logo: d.logo, logoW: d.logoW, logoH: d.logoH, address: d.address.trim(), phone: d.phone.trim(), specialty: d.specialty, custom: d.customText.split('\n').map(x => x.trim()).filter(Boolean), timeoutMin: Math.max(1, Math.min(30, +d.timeoutMin || 2)), retention: RETENTIONS.includes(d.retention) ? d.retention : 'eod', closeTime: /^\d\d:\d\d$/.test(d.closeTime) ? d.closeTime : '23:59' }, staff: d.staff.map(x => ({ ...x })) };
    const file = await encryptJSON(cfg, d.pass, { kind: 'clinicpad-config', app: window.BRAND || 'ClinicPad', created: new Date().toISOString().slice(0, 10) });
    download(`${(window.BRAND || 'ClinicPad').replace(/\W+/g, '')}-config-${(d.name || 'clinic').replace(/[^\w]+/g, '-').slice(0, 40)}.cpcfg`, JSON.stringify(file), 'application/json');
    d.pass = ''; state.msg = { type: 'ok', text: T('exported') }; render();
  },
  async importConfig() {
    const d = state.draft;
    try { const o = JSON.parse(state.importText); if (o.kind !== 'clinicpad-config') throw new Error('kind'); const c = migrateConfig(await decryptJSON(o, d.importPass || '')); if (!validConfig(c)) throw new Error('shape');
      configToDraft(c); state.draft.saveEnc = false; state.importText = ''; go('clinic'); state.msg = { type: 'ok', text: T('imported') }; render(); }
    catch (e) { state.msg = { type: 'err', text: T('importFail') }; render(); }
  },
  forgetSettings() { if (confirm(T('forget') + '?')) { localStorage.removeItem(SETTINGS_KEY); state.pinBuf = ''; state.draft = newDraft(); go('clinic'); } },
  settings() { state.pinTarget = 'settings'; state.pinBuf = ''; go('pin'); },
  pickStaff(el) { state.selStaff = el.dataset.val; state.pinTarget = 'provider'; state.pinBuf = ''; go('pin'); },
  begin() { if (!state.patient.name.trim()) { state.msg = { type: 'err', text: T('startPrompt') }; return render(); } const parts = state.patient.name.trim().split(/\s+/); state.patient.first = parts[0]; state.patient.last = parts.slice(1).join(' '); go('license'); },
  next() { const i = PATIENT_STEPS.indexOf(state.screen); if (state.screen === 'allergies' && !state.patient.hasAllergies) { state.msg = { type: 'err', text: T('hasAllergies') }; return render(); } go(PATIENT_STEPS[i + 1]); },
  addMed() { const m = state.patient.medInput.trim(); if (m) { state.patient.meds.push(m); state.patient.medInput = ''; } render(); document.getElementById('medInput')?.focus(); },
  removeMed(el) { state.patient.meds.splice(+el.dataset.val, 1); render(); },
  finishPatient() { const p = state.patient; if (!p.consent || !p.patientSig) { state.msg = { type: 'err', text: `${T('consCheck')} + ${T('patSig')}` }; return render(); } go('handoff'); },
  staffAccess() { state.pinBuf = ''; state.selStaff = null; const l = state.config.staff.filter(isClinician); if (l.length === 1) return actions.pickStaff({ dataset: { val: l[0].id } }); go('selectStaff'); },
  pinDigit(el) { if (state.pinBuf.length < 8) state.pinBuf += el.dataset.val; render(); },
  pinDel() { state.pinBuf = state.pinBuf.slice(0, -1); render(); },
  async pinOk() {
    if (state.screen === 'unlock') {
      try { state.config = await loadSettings(state.pinBuf); configToDraft(state.config); state.pinBuf = ''; go('start'); }
      catch (e) { state.pinBuf = ''; state.msg = { type: 'err', text: T('badPin') }; render(); }
      return;
    }
    if (state.pinTarget === 'settings') {
      if (state.pinBuf === state.config.adminPin) { state.pinBuf = ''; configToDraft(state.config); go('clinic'); }
      else { state.pinBuf = ''; state.msg = { type: 'err', text: T('badPin') }; render(); }
      return;
    }
    if (state.pinTarget === 'today') {
      const st = state.selStaff === 'admin' ? { pin: state.config.adminPin } : state.config.staff.find(x => x.id === state.selStaff);
      if (st && state.pinBuf === st.pin) { const pin = state.pinBuf; state.pinBuf = ''; state.msg = null; render();
        try { state.today = { who: state.selStaff, list: await openVisits(pin) }; } catch (e) { console.warn(e); state.today = { who: state.selStaff, list: [] }; } go('today'); }
      else { state.pinBuf = ''; state.msg = { type: 'err', text: T('badPin') }; render(); }
      return;
    }
    const st = state.config.staff.find(x => x.id === state.selStaff);
    if (st && state.pinBuf === st.pin) { state.pinBuf = ''; state.provider.staffId = st.id; state.provider.spec = null; go('provider'); }
    else { state.pinBuf = ''; state.msg = { type: 'err', text: T('badPin') }; render(); }
  },
  pinCancel() { state.pinBuf = ''; if (state.pinTarget === 'settings') return go('start'); if (state.pinTarget === 'today') return go('todayWho'); const many = state.config.staff.filter(isClinician).length > 1; go(many ? 'selectStaff' : 'handoff'); },
  exportPdf() { startExport('save'); },
  printPdf() { startExport('print'); },
  expShare() { if (canShareFile()) sharePdf(); },
  expDownload() { try { downloadPdf(); showExport('downloaded'); } catch (e) { showExport('error', e); } },
  expOpen() { openPdfTab(); },
  expOpenHere() { if (confirm(T('expOpenHereConfirm'))) { const u = exp.url; state.patient = newPatient(); state.provider = newProvider(); location.href = u; } },
  expBack() { hideExport(); },
  expPrint() { try { printNow(); showExport('printDialog'); } catch (e) { showExport('printFail', e); } },
  expDone() { if (state.screen === 'visitView') { hideExport(); return; } storeVisit().catch(() => {}).finally(() => wipe('done')); },
  todayAccess() { state.pinBuf = ''; state.selStaff = null; go('todayWho'); },
  todayPick(el) { state.selStaff = el.dataset.val; state.pinTarget = 'today'; state.pinBuf = ''; go('pin'); },
  todayClose() { state.today = null; state.viewRec = null; kekCache.clear(); go('start'); },
  openVisit(el) { const r = state.today && state.today.list.find(x => x.id === el.dataset.val); if (r) { state.viewRec = { id: r.id, ...r.rec }; go('visitView'); } },
  backToday() { hideExport(); state.viewRec = null; go('today'); },
  viewPrint() { const r = state.viewRec; try { const pv = document.getElementById('printView'); pv.innerHTML = withRecord(r, () => buildPrintHtml(r.lang)); document.body.classList.add('printing'); window.print(); showExport('printDialog'); } catch (e) { showExport('printFail', e); } },
  viewExport() { const r = state.viewRec; try { let blob; if (r.pdf) blob = new Blob([unb64(r.pdf)], { type: 'application/pdf' }); else blob = withRecord(r, () => buildPdf(r.lang)).output('blob');
      if (exp && exp.url) URL.revokeObjectURL(exp.url); const name = r.pdfName || pdfName(r.lang); let file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) {}
      exp = { url: URL.createObjectURL(blob), blob, name, file, lang: r.lang, size: blob.size };
      if (state.device !== 'desktop' && canShareFile()) { showExport('sharing'); return sharePdf(); } downloadPdf(); showExport('downloaded'); } catch (e) { showExport('error', e); } },
  async wipeAllVisits() { if (!confirm(T('closeDayConfirm'))) return; await wipeAllVisits(); state.today && (state.today.list = []); state.viewRec = null; toast(T('closeDayDone')); render(); },
  cancelVisit() { if (confirm(T('confirmCancel'))) wipe('start'); },
  nextPatient() { go('start'); },
  idleKeep() { hideIdle(); state.lastActivity = Date.now(); }
};

// ---------- render & events ----------
function render() {
  const app = document.getElementById('app');
  app.innerHTML = screens[state.screen]();
  document.getElementById('langBtn').textContent = T('langBtn');
  document.getElementById('footer').textContent = T('footer');
  document.querySelectorAll('[data-brand]').forEach(e => { e.textContent = window.BRAND || 'ClinicPad'; }); document.title = (window.BRAND || 'ClinicPad') + ' V1 — ' + (state.lang === 'es' ? 'Prototipo' : 'Prototype');
  document.body.dataset.device = state.device; document.body.classList.toggle('reception', state.reception);
  const b = document.getElementById('allergyBanner');
  if (state.screen === 'provider') {
    const p = state.patient; b.hidden = false;
    if (p.hasAllergies === 'yes') { b.className = 'allergy-banner'; b.innerHTML = `<span class="ico">⚠️</span><span>${T('allergyBanner')}: ${esc(allergyLabels().join(', ') || T('yes'))}</span>`; }
    else if (p.hasAllergies === 'no') { b.className = 'allergy-banner ok'; b.innerHTML = `<span class="ico">✓</span><span>${T('noAllergies')}</span>`; }
    else { b.className = 'allergy-banner warn'; b.innerHTML = `<span class="ico">⚠️</span><span>${T('allergyUnknown')}</span>`; }
  } else b.hidden = true;
  initSigPads(); syncBars();
  const lf = document.getElementById('licFile'); if (lf) lf.addEventListener('change', () => onLicenseFile(lf));
  const chipEl = document.getElementById('clinicChip'); const ck = state.config && state.config.clinic;
  if (chipEl) { chipEl.hidden = !ck; chipEl.innerHTML = ck ? `${ck.logo ? `<img src="${ck.logo}" alt="">` : ''}<span>${esc(ck.name)}</span>` : ''; }
  const onImg = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('change', async () => { const f = el.files && el.files[0]; el.value = ''; if (!f) return; try { await fn(f); } catch (e) { toast(state.lang === 'es' ? 'No se pudo leer la imagen' : 'Could not read the image'); } const y = scrollY; render(); scrollTo(0, y); }); };
  onImg('logoFile', async f => { const r = await resizeLogo(f); Object.assign(state.draft, { logo: r.data, logoW: r.w, logoH: r.h }); });
  onImg('photoCam', async f => { state.staffDraft.photo = await makeAvatar(f); });
  onImg('photoFile', async f => { state.staffDraft.photo = await makeAvatar(f); });
  const imf = document.getElementById('importFile'); if (imf) imf.addEventListener('change', async () => { const f = imf.files && imf.files[0]; if (!f) return; state.importText = await f.text(); imf.value = ''; document.getElementById('importName').textContent = '✓ ' + f.name; });
  // keyboard-friendly: focus first field on desktop / reception
  if (state.reception || state.device === 'desktop') { const f = app.querySelector('input[type=text]:not([value]),input[type=text][value=""],textarea,input[type=password]') || app.querySelector('[data-enter]'); if (f && !['provider'].includes(state.screen)) f.focus({ preventScroll: true }); }
}
document.addEventListener('click', e => { const el = e.target.closest('[data-action]'); if (!el || el.disabled) return; e.preventDefault(); actions[el.dataset.action]?.(el); });
document.addEventListener('input', e => { const el = e.target; if (!el.dataset.bind) return; setPath(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value); });
document.addEventListener('change', e => { const el = e.target; if (!el.dataset.bind) return; setPath(el.dataset.bind, el.type === 'checkbox' ? el.checked : el.value); if (el.dataset.rerender || el.type === 'checkbox') { const y = scrollY; render(); scrollTo(0, y); } });
document.addEventListener('keydown', e => {
  const t = e.target;
  // physical keyboard on the PIN screens
  if (['pin', 'unlock'].includes(state.screen) && !['INPUT', 'TEXTAREA'].includes(t.tagName)) {
    if (/^\d$/.test(e.key)) { actions.pinDigit({ dataset: { val: e.key } }); return; }
    if (e.key === 'Backspace') { actions.pinDel(); return; }
    if (e.key === 'Enter') { actions.pinOk(); return; }
  }
  if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[role=button][data-action]')) { e.preventDefault(); actions[t.dataset.action](t); return; }
  if (e.key !== 'Enter') return;
  if (t.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return; // Ctrl/Cmd+Enter advances from textareas
  if (t.tagName === 'BUTTON') return; // native button activation
  if (t.dataset && t.dataset.enterAction) { e.preventDefault(); actions[t.dataset.enterAction](t); return; }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t === document.body) {
    const btn = document.querySelector('#app [data-enter]:not([disabled])'); if (btn) { e.preventDefault(); if (t.dataset && t.dataset.bind) setPath(t.dataset.bind, t.type === 'checkbox' ? t.checked : t.value); actions[btn.dataset.action](btn); }
  }
});

// ---------- inactivity auto-wipe ----------
const idleEl = document.getElementById('idle'); const IDLE_WARN = 15;
['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (idleEl.hidden) state.lastActivity = Date.now(); }, { passive: true, capture: true }));
function hideIdle() { idleEl.hidden = true; state.idleCount = 0; }
setInterval(() => {
  if (!state.config || ['clinic', 'staff', 'staffEdit', 'unlock', 'done'].includes(state.screen)) return;
  const hasData = state.screen !== 'start' || state.patient.name;
  if (!hasData) return;
  const limit = qs.get('idleSec') ? +qs.get('idleSec') * 1000 : state.config.timeoutMin * 60000;
  const idle = Date.now() - state.lastActivity;
  if (idle >= limit) {
    const left = IDLE_WARN - Math.floor((idle - limit) / 1000);
    if (left <= 0) { wipe('start'); toast(T('wiped')); return; }
    idleEl.hidden = false; document.getElementById('idleTitle').textContent = T('idleTitle'); document.getElementById('idleText').textContent = T('idleText').replace('{s}', left); document.getElementById('idleKeep').textContent = T('idleKeep');
  }
}, 500);
window.addEventListener('pagehide', () => { state.patient = newPatient(); state.provider = newProvider(); });

// ---------- sticky offsets (topbar + allergy banner never cover content) ----------
function syncBars() { const tb = document.querySelector('.topbar'), ab = document.getElementById('allergyBanner'); const th = tb ? tb.offsetHeight : 0, bh = ab && !ab.hidden ? ab.offsetHeight : 0;
  document.documentElement.style.setProperty('--topbar-h', th + 'px'); document.documentElement.style.setProperty('--banner-h', bh + 'px'); }
if (window.ResizeObserver) { const ro = new ResizeObserver(syncBars); ro.observe(document.querySelector('.topbar')); ro.observe(document.getElementById('allergyBanner')); }
window.addEventListener('resize', syncBars);
// ---------- boot ----------
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
state.screen = localStorage.getItem(SETTINGS_KEY) && crypto.subtle ? 'unlock' : 'clinic';
render();
})();
