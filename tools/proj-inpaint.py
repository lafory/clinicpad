# LaMa inpainting of the object regions (and river outpainting margin) for the projection backgrounds.
import torch, numpy as np, cv2, sys
from PIL import Image
torch.set_num_threads(8)
model = torch.jit.load("/workspace/lama-model/big-lama.pt", map_location="cpu").eval()
def lama(im, m):
    H, W = m.shape; ph, pw = (8 - H % 8) % 8, (8 - W % 8) % 8
    it = torch.from_numpy(np.pad(im.astype(np.float32) / 255, ((0, ph), (0, pw), (0, 0)), mode="reflect")).permute(2, 0, 1)[None]
    mt = torch.from_numpy(np.pad((m > 127).astype(np.float32), ((0, ph), (0, pw)), mode="reflect"))[None, None]
    with torch.inference_mode(): out = model(it, mt)[0].permute(1, 2, 0).numpy()[:H, :W]
    out = np.clip(out * 255, 0, 255).astype(np.uint8)
    keep = (m <= 127)[..., None]; return np.where(keep, im, out)
def two_scale(im, m):  # coarse pass for structure, then full-res pass for detail
    h, w = m.shape; s = 0.5
    small = lama(cv2.resize(im, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA), cv2.resize(m, (int(w * s), int(h * s)), interpolation=cv2.INTER_NEAREST))
    up = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC); base = np.where((m > 127)[..., None], up, im)
    stripes = m.copy(); stripes[(np.indices(m.shape)[0] // 24) % 2 == 0] = 0
    return lama(base, stripes)
job = sys.argv[1]
if job == "hero":
    im = np.asarray(Image.open("src-plates/hero.png").convert("RGB")); m = np.asarray(Image.open("/workspace/plates/mask-heroP.png"))
    Image.fromarray(two_scale(im, m)).save("src-tex/hero-clean.png")
if job == "hall":
    im = np.asarray(Image.open("src-plates/hall-doors-inpainted.png").convert("RGB")); m = np.asarray(Image.open("/workspace/plates/mask-hallP.png"))
    Image.fromarray(two_scale(im, m)).save("src-tex/hall-clean.png")
if job == "river":
    im = np.asarray(Image.open("src-plates/river.png").convert("RGB")); H, W = im.shape[:2]
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
    plant = ((hsv[..., 1] > 80) & (hsv[..., 0] > 25) & (hsv[..., 0] < 85)).astype(np.uint8) * 255; plant[:int(330 * 1.8315)] = 0
    plant = cv2.morphologyEx(plant, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(plant); pm = np.zeros_like(plant)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 400: pm[lab == i] = 255
    k = 1.8315
    for x0, y0, x1, y1 in [(500, 372, 566, 427), (570, 390, 614, 421), (400, 338, 530, 461), (620, 345, 819, 461)]:
        sub = np.zeros_like(pm); cv2.rectangle(sub, (int(x0 * k), int(y0 * k)), (int(x1 * k), int(y1 * k)), 255, -1)
        if (x0, y0) in [(500, 372), (570, 390)]: pm |= sub
        else: pm |= (sub & cv2.dilate(pm, np.ones((31, 31), np.uint8)))
    pm = cv2.dilate(pm, np.ones((11, 11), np.uint8)); Image.fromarray(pm).save("/workspace/plates/mask-riverP.png")
    clean = two_scale(im, pm)
    # outpaint margins so the camera can arrive from behind the photo's viewpoint
    L, R, T, B = 300, 300, 260, 120
    big = np.pad(clean, ((T, B), (L, R), (0, 0)), mode="edge"); mm = np.full(big.shape[:2], 255, np.uint8); mm[T:T + H, L:L + W] = 0
    mm = cv2.dilate(mm, np.ones((5, 5), np.uint8))
    out = lama(cv2.resize(big, (big.shape[1] // 2, big.shape[0] // 2)), cv2.resize(mm, (big.shape[1] // 2, big.shape[0] // 2), interpolation=cv2.INTER_NEAREST))
    up = cv2.resize(out, (big.shape[1], big.shape[0]), interpolation=cv2.INTER_CUBIC)
    big = np.where((mm > 127)[..., None], up, big)
    stripes = mm.copy(); stripes[(np.indices(mm.shape)[0] // 32) % 2 == 0] = 0
    big = lama(big, stripes)
    Image.fromarray(big).save("src-tex/river-clean-pad.png"); print("pad", L, R, T, B, big.shape)
print(job, "ok")
