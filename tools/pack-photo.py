# Packs the projection textures (all pixels from the owner's three photos) into base64 JSON packs.
# hd = Real-ESRGAN 2x, sd = native resolution. Alpha of *-orig = foliage cut masks + door-leaf mask.
import numpy as np, cv2, base64, io, json, os
from PIL import Image
K = 1500 / 1024
def webp(im, q=82):
    b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6, alpha_quality=90, exact=True); return base64.b64encode(b.getvalue()).decode()
hero = np.asarray(Image.open("src-plates/hero.png").convert("RGB"))
fol = np.asarray(Image.open("/tmp/hero-fol.png")).astype(np.float32) / 255
# door leaves: bars + handle opaque, glass 0.2
door = np.zeros(fol.shape, np.float32)
x0, x1 = round(343 * K), round(592 * K); door[:, x0:x1] = 0.2
door[:, round(459 * K):round(471.5 * K)] = 1; door[round(287.5 * K):round(301 * K), x0:x1] = 1
hx0, hy0, hx1, hy1 = 658, 216, 705, 328
sub = hero[hy0:hy1, hx0:hx1]; hsv = cv2.cvtColor(sub, cv2.COLOR_RGB2HSV)
bronze = ((hsv[..., 0] < 28) & (hsv[..., 1] > 60) & (hsv[..., 2] > 60)).astype(np.uint8) * 255
bronze = cv2.dilate(cv2.morphologyEx(bronze, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)), np.ones((3, 3), np.uint8))
door[hy0:hy1, hx0:hx1] = np.maximum(door[hy0:hy1, hx0:hx1], cv2.GaussianBlur(bronze.astype(np.float32) / 255, (3, 3), 0.7))
heroA = np.maximum(cv2.GaussianBlur(fol, (3, 3), 0.8), door)
hallA = cv2.GaussianBlur(np.asarray(Image.open("/tmp/hall-fol.png")).astype(np.float32) / 255, (3, 3), 0.8)
# tileable water normal map (FFT-filtered noise -> periodic) + foam noise in alpha
rng = np.random.default_rng(7); N = 512
def pnoise(power, seed):
    r = np.random.default_rng(seed); f = np.fft.fft2(r.standard_normal((N, N)))
    ky, kx = np.meshgrid(np.fft.fftfreq(N), np.fft.fftfreq(N), indexing="ij"); k = np.sqrt(kx ** 2 + ky ** 2) + 1e-6
    amp = k ** (-power); amp[k < 1.5 / N] = 0; amp[k > 0.18] *= np.exp(-(k[k > 0.18] - 0.18) * 40)
    h = np.real(np.fft.ifft2(f * amp)); return (h - h.mean()) / h.std()
h = pnoise(1.9, 3) + 0.35 * np.abs(pnoise(1.4, 4))
gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5; gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
s = 2.2; n = np.dstack([-gx * s, -gy * s, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
foam = pnoise(1.2, 9); foam = (foam - foam.min()) / (foam.max() - foam.min())
nor = np.dstack([(n * 0.5 + 0.5) * 255, foam * 255]).clip(0, 255).astype(np.uint8)
Image.fromarray(nor).save("src-tex/water-nor.png")
def rgba(path, A, size):
    im = Image.open(path).convert("RGB").resize(size, Image.LANCZOS)
    a = Image.fromarray((cv2.resize(A, size, interpolation=cv2.INTER_LINEAR) * 255).clip(0, 255).astype(np.uint8))
    im.putalpha(a); return im
def png(path):
    b = io.BytesIO(); Image.open(path).convert("L").save(b, "PNG", optimize=True); return base64.b64encode(b.getvalue()).decode()
def have(p): return os.path.exists(p)
for q in ("sd", "hd"):
    two = q == "hd"
    W, H = (3000, 1688) if two else (1500, 844)
    pick = lambda a, b: a if (two and have(a)) else b
    packs = {
        "hero": {"hero_orig.webp": webp(rgba(pick("src-tex/hero-orig2x.png", "src-plates/hero.png"), heroA, (W, H))),
                 "hero_id.png": png("/tmp/hero-id.png"),
                 "hero_clean.webp": webp(Image.open(pick("src-tex/hero-clean2x.png", "src-tex/hero-clean.png")).convert("RGB").resize((W, H), Image.LANCZOS))},
        "hall": {"hall_orig.webp": webp(rgba(pick("src-tex/hall-orig2x.png", "src-plates/hall-doors-inpainted.png"), hallA, (W, H))),
                 "hall_id.png": png("/tmp/hall-id.png"),
                 "hall_clean.webp": webp(Image.open(pick("src-tex/hall-clean2x.png", "src-tex/hall-clean.png")).convert("RGB").resize((W, H), Image.LANCZOS))},
        "river": {"river_clean.webp": webp(Image.open(pick("src-tex/river-clean2x.png", "src-tex/river-clean-pad.png")).convert("RGB").resize((3840, 2238) if two else (2100, 1224), Image.LANCZOS), 80),
                  "rock.webp": webp(Image.open("src-tex/rockN.png").convert("RGBA"), 88),
                  "water_nor.webp": webp(Image.fromarray(nor), 90)},
    }
    for k, d in packs.items():
        p = f"assets/photo-{k}-{q}.pack.json"; json.dump(d, open(p, "w")); print(p, os.path.getsize(p) // 1024, "KB")
