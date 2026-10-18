import torch, numpy as np, sys
from PIL import Image
from masks import SRC
torch.set_num_threads(8)
model=torch.jit.load("/workspace/lama-model/big-lama.pt",map_location="cpu").eval()
def pad8(x): return (8-x%8)%8
for name in sys.argv[1:]:
    im=np.asarray(Image.open(SRC[name]).convert("RGB")).astype(np.float32)/255
    m=(np.asarray(Image.open(f"mask-{name}.png"))>127).astype(np.float32)
    H,W=m.shape; ph,pw=pad8(H),pad8(W)
    it=torch.from_numpy(np.pad(im,((0,ph),(0,pw),(0,0)),mode="reflect")).permute(2,0,1)[None]
    mt=torch.from_numpy(np.pad(m,((0,ph),(0,pw)),mode="reflect"))[None,None]
    with torch.inference_mode(): out=model(it,mt)[0].permute(1,2,0).numpy()[:H,:W]
    out=np.clip(out*255,0,255).astype(np.uint8)
    Image.fromarray(out).save(f"clean-{name}-x.png"); print(name,"done")
