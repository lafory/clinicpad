# Real-ESRGAN x4 (spandrel) then resample to 2x: sharper photo textures for the close camera moves.
import torch, numpy as np, sys
from PIL import Image
from spandrel import ModelLoader
torch.set_num_threads(16)
m = ModelLoader().load_from_file("/workspace/lama-model/RealESRGAN_x4plus.pth").model.eval()
def up(a, tile=320, pad=16):
    H, W = a.shape[:2]; out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad); y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            t = torch.from_numpy(a[y0:y1, x0:x1]).permute(2, 0, 1)[None]
            with torch.inference_mode(): r = m(t)[0].permute(1, 2, 0).numpy()
            oy, ox = (y - y0) * 4, (x - x0) * 4; hh, ww = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + hh, x * 4:x * 4 + ww] = r[oy:oy + hh, ox:ox + ww]
    return out
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert("RGB"); a = np.asarray(im).astype(np.float32) / 255
    o = Image.fromarray((np.clip(up(a), 0, 1) * 255).astype(np.uint8))
    # blend 70% ESRGAN with 30% bicubic to keep the photo's natural grain instead of a plastic look
    bic = im.resize(o.size, Image.BICUBIC)
    o = Image.blend(bic, o, 0.7).resize((im.width * 2, im.height * 2), Image.LANCZOS)
    o.save(dst); print(dst, o.size, flush=True)
