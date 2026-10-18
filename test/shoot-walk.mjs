// Walk-through frames every 10% of scroll (+ door closed / half / open), deterministic ?shot rendering.
import { chromium } from "playwright-core";
const base = process.argv[2] || "http://127.0.0.1:8787/";
const mobile = process.argv.includes("--mobile");
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage(); page.setDefaultTimeout(400000);
const errors = [];
page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/GPU stall|useProgram|ReadPixels/i.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
await page.goto(base + (base.includes("?") ? "&" : "?") + "shot", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__clinicpad || document.documentElement.classList.contains("no3d"), null, { timeout: 90000 });
await page.evaluate(async () => { await window.__clinicpad.allLoaded; });
const marks = await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - innerHeight; const out = [];
  for (let i = 0; i <= 10; i++) out.push([`walk-${String(i * 10).padStart(3, "0")}`, Math.round(max * i / 10)]);
  const sd = document.querySelector("#stage-doors"), t = sd.getBoundingClientRect().top + scrollY, h = sd.offsetHeight;
  out.push(["walk-door-closed", Math.round(t - innerHeight * 0.02)], ["walk-door-half", Math.round(t + h * 0.16)], ["walk-door-open", Math.round(t + h * 0.42)]);
  const d = document.querySelector("#demo"), dt = d.getBoundingClientRect().top + scrollY;
  out.push(["walk-window", Math.round(dt - innerHeight * 0.45)], ["walk-flash", Math.round(dt - innerHeight * 0.2)], ["walk-exit", Math.round(dt - innerHeight * 0.1)]);
  return out;
});
for (const [name, y] of marks) {
  if (only.length && !only.some((o) => name.includes(o))) continue;
  await page.evaluate((y) => { window.scrollTo(0, y); window.ScrollTrigger.update(); }, y);
  for (let k = 0; k < 14; k++) { await page.waitForTimeout(120); await page.evaluate(() => { window.ScrollTrigger.update(); window.gsap.ticker.tick(); }); }
  await page.evaluate(() => { window.__clinicpad.renderOnce(); window.__clinicpad.renderOnce(); });
  const S = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(window.__clinicpad.S).filter(([, b]) => typeof b === "number").map(([a, b]) => [a, +b.toFixed(2)]))) + " cam " + window.__clinicpad.camera.position.toArray().map((v) => v.toFixed(2)).join(","));
  await page.screenshot({ path: `shots/${mobile ? "m-" : ""}${name}.png` });
  console.log(name, y, S);
}
console.log("errors:", errors.length ? "\n" + errors.join("\n") : "none");
await browser.close();
