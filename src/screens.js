import * as THREE from "three";
import { BRAND } from "./config.js";
import { t } from "./i18n.js";

export function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export const TEAL = "#0fa3a3", NAVY = "#0b2540", RED = "#e5484d";
const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ---------- Tablet screen textures (drawn on canvas, re-drawn on language change) ----------
export function drawLogo(ctx, x, y, s) {
  ctx.fillStyle = TEAL; rr(ctx, x, y, s, s, s * 0.26); ctx.fill();
  ctx.fillStyle = "#fff"; const a = s * 0.18, b = s * 0.58;
  ctx.fillRect(x + (s - a) / 2, y + (s - b) / 2, a, b); ctx.fillRect(x + (s - b) / 2, y + (s - a) / 2, b, a);
}
export function screenPatient(ctx, W, H, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e7f6f6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#6b7f8e"; ctx.font = `600 26px ${FONT}`; ctx.fillText("9:41", 48, 54);
  ctx.textAlign = "right"; ctx.fillText("● ● ●   100%", W - 48, 54); ctx.textAlign = "left";
  drawLogo(ctx, 64, 120, 84);
  ctx.fillStyle = NAVY; ctx.font = `700 48px ${FONT}`; ctx.fillText(BRAND, 170, 178);
  ctx.font = `800 104px ${FONT}`; ctx.fillText(t("t_welcome"), 64, 400);
  ctx.fillStyle = "#3d5466"; ctx.font = `500 46px ${FONT}`; ctx.fillText(t("t_start"), 64, 480);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = TEAL; ctx.lineWidth = 5; rr(ctx, 64, 540, W - 128, 130, 28); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#9aabb8"; ctx.font = `400 46px ${FONT}`; ctx.fillText(t("t_name"), 108, 622);
  if (Math.floor(time * 1.6) % 2 === 0) { ctx.fillStyle = TEAL; ctx.fillRect(104, 572, 5, 66); }
  ctx.fillStyle = TEAL; rr(ctx, 64, 720, W - 128, 130, 28); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 44px ${FONT}`; ctx.textAlign = "center";
  ctx.fillText("📷  " + t("t_scan"), W / 2, 800); ctx.textAlign = "left";
  // license card illustration
  ctx.fillStyle = "#dff1f1"; rr(ctx, 64, 900, W - 128, 300, 30); ctx.fill();
  ctx.fillStyle = "#b9dede"; rr(ctx, 104, 950, 170, 200, 18); ctx.fill();
  ctx.fillStyle = "#9fcfcf"; for (let i = 0; i < 4; i++) { rr(ctx, 310, 965 + i * 50, (W - 450) * (1 - i * 0.15), 22, 11); ctx.fill(); }
  const scanY = 950 + ((Math.sin(time * 2) + 1) / 2) * 200; ctx.fillStyle = "rgba(15,163,163,.55)"; ctx.fillRect(84, scanY, W - 168, 5);
  // steps
  const st = t("t_steps"); const sw = (W - 128) / 3;
  st.forEach((s, i) => {
    const x = 64 + i * sw; ctx.fillStyle = i === 0 ? TEAL : "#c9d6dd"; rr(ctx, x, 1260, sw - 16, 12, 6); ctx.fill();
    ctx.fillStyle = i === 0 ? NAVY : "#8aa0ad"; ctx.font = `600 30px ${FONT}`; ctx.fillText(`${i + 1}. ${s}`, x, 1318);
  });
  ctx.fillStyle = "#6b7f8e"; ctx.font = `500 30px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("🔒  " + t("t_foot"), W / 2, H - 70); ctx.textAlign = "left";
}
export function screenProvider(ctx, W, H) {
  ctx.fillStyle = "#f6fafb"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 190);
  drawLogo(ctx, 56, 70, 72); ctx.fillStyle = "#fff"; ctx.font = `700 42px ${FONT}`; ctx.fillText(BRAND, 148, 120);
  ctx.textAlign = "right"; ctx.font = `600 32px ${FONT}`; ctx.fillStyle = "#7fe0e0"; ctx.fillText(t("t_prov"), W - 56, 120); ctx.textAlign = "left";
  ctx.fillStyle = RED; rr(ctx, 48, 230, W - 96, 150, 26); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `800 44px ${FONT}`; ctx.fillText("⚠ " + t("t_alert"), 84, 300);
  ctx.font = `500 28px ${FONT}`; ctx.fillText(t("t_example"), 84, 348);
  const items = t("t_checks");
  items.forEach((s, i) => {
    const y = 430 + i * 112, on = i < 6;
    ctx.fillStyle = "#fff"; rr(ctx, 48, y, W - 96, 94, 22); ctx.fill();
    ctx.strokeStyle = on ? "#d4e9e9" : "#f3b4b6"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = on ? TEAL : "#fff"; ctx.strokeStyle = on ? TEAL : RED; rr(ctx, 76, y + 22, 50, 50, 12); ctx.fill(); ctx.stroke();
    if (on) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(88, y + 48); ctx.lineTo(99, y + 60); ctx.lineTo(116, y + 36); ctx.stroke(); }
    ctx.fillStyle = on ? NAVY : RED; ctx.font = `600 36px ${FONT}`; ctx.fillText(s, 152, y + 60);
  });
  ctx.fillStyle = "#c9d3da"; rr(ctx, 48, H - 190, W - 96, 120, 30); ctx.fill();
  ctx.fillStyle = "#5c6f7d"; ctx.font = `700 42px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("🔒  " + t("t_locked"), W / 2, H - 116); ctx.textAlign = "left";
}

