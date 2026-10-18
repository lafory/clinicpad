# multi-scale: inpaint at low res for structure, paste upscaled into hole, re-inpaint at full res with an eroded hole for detail
import torch, numpy as np, sys
from PIL import Image, ImageFilter
from masks import SRC
torch.set_num_threads(8)
model=torch.jit.load("/workspace/lama-model/big-lama.pt",map_location="cpu").eval()
def run(im,m):
    H,W=m.shape; ph,pw=(8-H%8)%8,(8-W%8)%8
    it=torch.from_numpy(np.pad(im,((0,ph),(0,pw),(0,0)),mode="reflect")).permute(2,0,1)[None]
    mt=torch.from_numpy(np.pad(m,((0,ph),(0,pw)),mode="reflect"))[None,None]
    with torch.inference_mode(): return model(it,mt)[0].permute(1,2,0).numpy()[:H,:W]
name=sys.argv[1]; sc=float(sys.argv[2])
img=Image.open(SRC[name]).convert("RGB"); mk=Image.open(f"mask-{name}.png")
W,H=img.size; w,h=int(W*sc)//8*8,int(H*sc)//8*8
lo=run(np.asarray(img.resize((w,h),Image.LANCZOS)).astype(np.float32)/255,(np.asarray(mk.resize((w,h)))>127).astype(np.float32))
up=np.asarray(Image.fromarray((np.clip(lo,0,1)*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)).astype(np.float32)/255
base=np.asarray(img).astype(np.float32)/255; m=(np.asarray(mk)>127)
comp=base.copy(); comp[m]=up[m]
# second pass: re-inpaint a striped/dotted sub-mask so LaMa adds full-res texture guided by the low-res fill
er=np.asarray(mk.filter(ImageFilter.MinFilter(15)))>127
yy,xx=np.mgrid[0:H,0:W]; grid=((xx//48+yy//48)%2==0)
m2=(er&grid).astype(np.float32)
out=run(comp,m2)
Image.fromarray((np.clip(out,0,1)*255).astype(np.uint8)).save(f"clean-{name}-v{sys.argv[3]}.png"); print("ok")
