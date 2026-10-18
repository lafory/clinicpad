# Object masks in photo space (1500x844) for the camera-projection scene.
import numpy as np, cv2, json
from PIL import Image
K = 1500 / 1024  # display(1024-wide) -> source px
def D(*v): return [round(x * K) for x in v]
def green_mask(img, box, rim_y, excl=()):
    x0, y0, x1, y1 = box; a = img[y0:y1, x0:x1].astype(np.float32)
    hsv = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    R, G = a[..., 0], a[..., 1]
    m = (H > 31) & (H < 95) & (((S > 50) & (G > R * 0.97)) | ((V > 150) & (S > 28) & (G > R)))
    m |= (V < 75) & (H > 22) & (H < 100) & (S > 40)
    m = m.astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m[max(0, rim_y - y0 + 6):] = 0
    for ex in excl: m[ex[1] - y0:ex[3] - y0, ex[0] - x0:ex[2] - x0] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); keep = np.zeros_like(m)
    if n > 1:
        big = max(range(1, n), key=lambda i: st[i, cv2.CC_STAT_AREA])
        for i in range(1, n):
            if st[i, cv2.CC_STAT_AREA] > 250 or i == big: keep[lab == i] = 255
    ff = keep.copy(); fm = np.zeros((keep.shape[0] + 2, keep.shape[1] + 2), np.uint8); cv2.floodFill(ff, fm, (0, 0), 255)
    holes = cv2.bitwise_not(ff); n, lab, st, _ = cv2.connectedComponentsWithStats(holes)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < 80: keep[lab == i] = 255
    full = np.zeros(img.shape[:2], np.uint8); full[y0:y1, x0:x1] = keep; return full
def pot_mask(shape, x0, x1, ytop, ybot):
    m = np.zeros(shape, np.uint8); cx = (x0 + x1) / 2; rx = (x1 - x0) / 2; h = ybot - ytop
    pts = []
    for t in np.linspace(0, 1, 40):  # pot profile: rim -> belly -> base
        y = ytop + t * h; r = rx * (0.88 + 0.12 * np.sin(np.pi * min(1, t * 1.35))) * (1 - 0.22 * max(0, t - 0.6) / 0.4)
        pts.append((cx + r, y))
    pts += [(2 * cx - x, y) for x, y in reversed(pts)]
    cv2.fillPoly(m, [np.int32(pts)], 255); return m

OUT = {}
# ---------------- hero ----------------
hero = np.asarray(Image.open("src-plates/hero.png").convert("RGB"))
P = {}
P["L1"] = dict(box=(0, 80, 165, 496), pot=D(-6, 79, 229, 337), excl=[(118, 278, 165, 496)])
P["L2"] = dict(box=(114, 268, 280, 482), pot=D(102, 173, 270, 326), excl=[(114, 268, 128, 482)])
P["R2"] = dict(box=(1088, 258, 1270, 468), pot=D(762, 849, 261, 317), excl=[(1262, 258, 1270, 468)])
P["R1"] = dict(box=(1150, 0, 1500, 496), pot=D(864, 991, 227, 336), excl=[(1150, 250, 1275, 496)])
fol = np.zeros(hero.shape[:2], np.uint8); pots = np.zeros_like(fol); objs = []
for k, p in P.items():
    pm = pot_mask(fol.shape, *p["pot"]); g = green_mask(hero, p["box"], p["pot"][2], p["excl"]); g[pm > 0] = 0
    fol |= g; pots |= pm
    ys, xs = np.where((g | pm) > 0); objs.append(dict(name=k, pot=p["pot"], rect=[int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]))
OUT["hero"] = objs
Image.fromarray(fol).save("/tmp/hero-fol.png"); Image.fromarray(pots).save("/tmp/hero-pots.png")
inp = cv2.dilate(fol | pots, np.ones((15, 15), np.uint8))
Image.fromarray(inp).save("/workspace/plates/mask-heroP.png")
# ---------------- hall ----------------
hall = np.asarray(Image.open("src-plates/hall-doors-inpainted.png").convert("RGB"))
H = {}
H["P1"] = dict(box=D(262, 312, 388, 412), pot=D(287, 366, 408, 477), excl=[])
H["P2"] = dict(box=D(362, 322, 434, 388), pot=D(365, 415, 384, 427), excl=[])
fol2 = np.zeros(hall.shape[:2], np.uint8); pots2 = np.zeros_like(fol2); objs = []
for k, p in H.items():
    pm = pot_mask(fol2.shape, *p["pot"]); g = green_mask(hall, p["box"], p["pot"][2], p["excl"]); g[pm > 0] = 0
    fol2 |= g; pots2 |= pm
    ys, xs = np.where((g | pm) > 0); objs.append(dict(name=k, pot=p["pot"], rect=[int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]))
desk = np.zeros_like(fol2); cv2.fillPoly(desk, [np.int32([D(627, 359), D(816, 361), D(816, 548), D(688, 552), D(627, 515)])], 255)
OUT["hall"] = objs
Image.fromarray(fol2).save("/tmp/hall-fol.png")
inp2 = cv2.dilate(fol2 | pots2, np.ones((13, 13), np.uint8)) | cv2.dilate(desk, np.ones((11, 11), np.uint8))
Image.fromarray(inp2).save("/workspace/plates/mask-hallP.png")
json.dump(OUT, open("/tmp/objs.json", "w"), indent=1)
for n, im, m in (("hero", hero, inp), ("hall", hall, inp2)):
    ov = im.copy(); ov[m > 0] = (ov[m > 0] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8); Image.fromarray(ov).save(f"/tmp/ov-{n}.png")
print(json.dumps(OUT))
# plant-id maps (half res): far plants first so nearer ones win where silhouettes overlap
def idmap(img_shape, plants, fname):
    idm = np.zeros(img_shape[:2], np.uint8)
    for i, (mask, ybot) in sorted(enumerate(plants), key=lambda t: t[1][1]):
        idm[cv2.dilate(mask, np.ones((9, 9), np.uint8)) > 0] = (i + 1) * 50
    Image.fromarray(cv2.resize(idm, (img_shape[1] // 2, img_shape[0] // 2), interpolation=cv2.INTER_NEAREST)).save(fname)
def per_plant(img, P):
    out = []
    for k, p in P.items():
        pm = pot_mask(img.shape[:2], *p["pot"]); g = green_mask(img, p["box"], p["pot"][2], p["excl"]); g[pm > 0] = 0
        out.append((g | pm, p["pot"][3]))
    return out
idmap(hero.shape, per_plant(hero, P), "/tmp/hero-id.png")
idmap(hall.shape, per_plant(hall, H), "/tmp/hall-id.png")
