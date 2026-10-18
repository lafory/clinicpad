import { t, setLang, onLang, initialLang } from "./i18n.js";

const BASE = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];
const custom = []; // clinic-added questions (kept only in memory, like the product)
const checked = new Set();

function renderChecks() {
  const ul = document.getElementById("checks");
  ul.innerHTML = "";
  const items = [...BASE.map((k) => ({ id: k, label: t(k) })), ...custom.map((c, i) => ({ id: "x" + i, label: c, custom: true }))];
  for (const it of items) {
    const li = document.createElement("li");
    li.innerHTML = `<label><input type="checkbox" ${checked.has(it.id) ? "checked" : ""} data-id="${it.id}"/><span class="box"></span><span class="lbl"></span>${it.custom ? '<em class="cust">+</em>' : ""}</label>`;
    li.querySelector(".lbl").textContent = it.label;
    ul.appendChild(li);
  }
  ul.querySelectorAll("input").forEach((inp) =>
    inp.addEventListener("change", () => { inp.checked ? checked.add(inp.dataset.id) : checked.delete(inp.dataset.id); update(); })
  );
  update(items);
}

function allItems() { return [...BASE.map((k) => ({ id: k, label: t(k) })), ...custom.map((c, i) => ({ id: "x" + i, label: c }))]; }

function update() {
  const items = allItems();
  const n = items.filter((i) => checked.has(i.id)).length;
  const total = items.length;
  document.getElementById("bar").style.width = (100 * n) / total + "%";
  document.getElementById("progress-text").textContent = t("progress", { n, t: total });
  const miss = items.filter((i) => !checked.has(i.id));
  const m = document.getElementById("missing");
  m.textContent = miss.length ? `${t("missing")} ${miss.map((i) => i.label).join(" · ")}` : "";
  const btn = document.getElementById("print-btn");
  btn.disabled = miss.length > 0;
  btn.innerHTML = miss.length ? t("print_locked") : t("print_ready");
  document.querySelectorAll("#checks li").forEach((li) => {
    const id = li.querySelector("input").dataset.id;
    li.classList.toggle("todo", !checked.has(id));
  });
}

function initChecklist() {
  document.getElementById("add-q").addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = document.getElementById("add-q-input");
    const v = inp.value.trim();
    if (!v || custom.length >= 4) return;
    custom.push(v); inp.value = ""; renderChecks();
  });
  document.getElementById("print-btn").addEventListener("click", () => {
    const done = document.getElementById("print-done");
    const card = document.getElementById("checklist-demo");
    done.innerHTML = t("print_done");
    card.classList.add("printed");
    setTimeout(() => {
      checked.clear(); custom.length = 0; card.classList.remove("printed");
      renderChecks();
      setTimeout(() => (done.innerHTML = ""), 2600);
    }, 1400);
  });
  onLang(renderChecks);
}

function initForm() {
  const form = document.getElementById("demo-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault(); // no backend: nothing leaves the page
    const d = new FormData(form);
    const ok = d.get("name").trim() && d.get("clinic").trim() && /^\S+@\S+\.\S+$/.test(d.get("email").trim());
    form.querySelectorAll("[required]").forEach((i) => i.classList.toggle("bad", !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value.trim()))));
    if (!ok) { form.querySelector(".fine").textContent = t("f_err"); form.querySelector(".fine").classList.add("err"); return; }
    const name = d.get("name").trim().split(" ")[0];
    const th = document.getElementById("thanks");
    const draw = () => (document.getElementById("thanks-title").textContent = t("thanks_title", { name }));
    draw(); onLang(draw);
    form.hidden = true; th.hidden = false;
    form.reset();
  });
}

function initReveals() {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".reveal").forEach((el) => {
    gsap.from(el, { y: 60, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
  gsap.to(".hero-copy", { y: -120, opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "70% top", scrub: true } });
  gsap.to("#stage-rise .sticky-cap", { opacity: 0, ease: "none", scrollTrigger: { trigger: "#stage-rise", start: "62% top", end: "80% top", scrub: true } });
  gsap.to(".scroll-hint", { opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "20% top", scrub: true } });
}

export function initUI() {
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  initChecklist();
  setLang(initialLang());
  initForm();
  initReveals();
}
