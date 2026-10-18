import numpy as np
from PIL import Image, ImageDraw, ImageFilter
A="/home/box/agent-data/agents/D9254128-0460-49A5-BF29-B2713D5B9E36/attachments/"
SRC={"hero":A+"334117fbe7c95a337359c2520b3c1df8c5c53e81e1270672b1c5e6481a6172c2.jpg",
     "hall":A+"e2b7dcce41a0446804f85f2971b2554cf5017371213de8e76800f5da93af75b6.jpg",
     "river":A+"f22ef41feed6a22ee209869e971d48c42d12f8dd736253af40d3083b377b32de.jpg"}
s=1500/1024
def R(d,x0,y0,x1,y1,r=0): d.rounded_rectangle([x0*s,y0*s,x1*s,y1*s],radius=r*s,fill=255)
def mk(name):
    im=Image.open(SRC[name]).convert("RGB"); W,H=im.size
    m=Image.new("L",(W,H),0); d=ImageDraw.Draw(m)
    R(d,92,1,933,50,22)  # nav pill (all)
    if name=="hero":
        R(d,94,108,392,135,12)          # eyebrow
        R(d,92,420,358,510,22)          # buttons
        R(d,92,519,448,550,10)          # badges
        R(d,455,556,570,576)            # scroll hint
        # tablet (rotated quad) + shadow
        d.polygon([(514*s,220*s),(749*s,206*s),(774*s,448*s),(468*s,455*s)],fill=255)
        d.polygon([(470*s,440*s),(770*s,436*s),(780*s,470*s),(600*s,486*s),(470*s,478*s)],fill=255)
        # pen
        d.line([(280*s,414*s),(505*s,483*s)],fill=255,width=int(16*s))
    if name=="hall":
        R(d,310,92,714,137,10); R(d,336,144,686,173,10)
    if name=="river":
        R(d,92,54,480,506,18); R(d,92,506,932,576,14)
    if name=="hero":
        a=np.asarray(im).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
        t=np.zeros((H,W),bool)
        y0,y1,x0,x1=[int(v*s) for v in (140,308,92,440)]
        sub=(((b>r+12)&(r<90)&(b>40))|((b>r+40)&(g>r+15)))
        t[y0:y1,x0:x1]=sub[y0:y1,x0:x1]
        y0,y1,x0,x1=[int(v*s) for v in (322,408,92,462)]
        lum=(r+g+b)/3; t[y0:y1,x0:x1]|=(lum<165)[y0:y1,x0:x1]
        tm=Image.fromarray((t*255).astype('uint8')).filter(ImageFilter.MaxFilter(11))
        m=Image.fromarray(np.maximum(np.asarray(m),np.asarray(tm)))
    m=m.filter(ImageFilter.MaxFilter(9))
    m.save(f"mask-{name}.png")
    ov=im.copy(); ov.paste((255,0,0),mask=m.point(lambda v:v*0.6)); ov.resize((1024,576)).save(f"ov2-{name}.png")
if __name__=="__main__":
    for n in SRC: mk(n)
