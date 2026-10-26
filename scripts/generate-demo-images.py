"""Original procedural ray-cast interiors. No external imagery or third-party assets.
Optional regeneration: python -m pip install numpy Pillow; python scripts/generate-demo-images.py
The camera is fixed at the center of a synthetic room. Equirectangular 2:1 output.
"""
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'public' / 'panoramas'
OUT.mkdir(parents=True, exist_ok=True)

def render(d, kind):
    shape = d.shape[:-1]
    nearest = np.full(shape, 100., dtype=np.float32)
    rgb = np.zeros((*shape, 3), dtype=np.float32)
    def box(lo, hi, color, texture=''):
        nonlocal nearest, rgb
        lo, hi = np.array(lo), np.array(hi)
        safe = np.where(abs(d) < 1e-7, 1e-7, d)
        a, b = lo / safe, hi / safe
        enter, leave = np.minimum(a,b), np.maximum(a,b)
        t0, t1 = enter.max(-1), leave.min(-1)
        inside = t0 < 0
        t = np.where(inside, t1, t0)
        valid = (t1 >= np.maximum(t0,0)) & (t > 0) & (t < nearest)
        side = np.where(inside, leave.argmin(-1), enter.argmax(-1))
        p = d * t[...,None]
        shade = np.choose(side, [.82, 1.0, .91]).astype(np.float32)
        shade *= .94 + .06 * np.clip((p[...,1]+1.6)/4, 0, 1)
        c = np.broadcast_to(np.array(color, dtype=np.float32), (*shape,3)).copy()
        if texture == 'wood':
            grain = np.sin(p[...,0]*8 + np.sin(p[...,2]*3))*.018 + np.sin(p[...,0]*75)*.009
            seams = (np.mod(p[...,0]+10, .40) < .008) | (np.mod(p[...,2]+(np.floor(p[...,0]/.4)%3)*.6+10,2.1) < .009)
            shade += grain
            shade = np.where(seams,shade*.82,shade)
        if texture == 'rug':
            shade += np.sin(p[...,0]*100)*np.sin(p[...,2]*100)*.025
        c *= shade[...,None]
        rgb = np.where(valid[...,None], c, rgb)
        nearest = np.where(valid,t,nearest)
    # Camera height is 1.6m; bounds form a fully enclosed room.
    box((-4,-1.6,-4),(4,1.7,4),(232,225,209))
    box((-4,-1.61,-4),(4,-1.59,4),(178,142,102),'wood')
    box((-4,1.62,-4),(4,1.68,4),(250,244,229))
    for x in [-3.9,3.9]:
        box((x-.03,-1.59,-4),(x+.03,-1.45,4),(201,191,168))
    # Window with stylized fictional outdoor view.
    box((-3.65,-.9,-3.97),(-.5,1.35,-3.90),(111,147,139))
    box((-3.59,.15,-3.89),(-.56,1.3,-3.86),(177,204,198))
    for x in [-3.68,-2.1,-.52]: box((x-.035,-.96,-3.86),(x+.035,1.4,-3.80),(69,84,73))
    for y in [-.94,.05,1.37]: box((-3.72,y-.025,-3.86),(-.46,y+.025,-3.80),(69,84,73))
    # Linen curtains.
    for x in [-3.85,-.42]:
        for i in range(5): box((x+i*.045,-1.48,-3.75),(x+i*.045+.05,1.5,-3.64),(217-i*3,210-i*3,190-i*3))
    # Door and handle on side wall, consistent with room navigation cues.
    box((3.88,-1.58,-2.9),(3.96,1,-1.6),(138,108,76),'wood')
    box((3.80,-.35,-1.83),(3.88,-.29,-1.65),(67,68,54))
    # Framed abstract original art.
    box((.75,-.10,-3.95),(2.9,1.22,-3.85),(115,94,66))
    box((.81,-.04,-3.84),(2.84,1.16,-3.81),(217,209,187))
    box((1.1,.15,-3.80),(1.65,.85,-3.78),(111,129,99))
    box((1.75,.12,-3.80),(2.55,.47,-3.78),(178,139,105))
    if kind == 'sala':
        box((-2.2,-1.57,-2.8),(2.25,-1.53,1.9),(217,210,189),'rug')
        # Green sofa behind center table; couch faces camera.
        box((-.25,-1.42,-3.1),(3.0,-.93,-1.95),(102,120,86),'rug')
        box((-.25,-.96,-3.15),(3.0,-.30,-2.85),(91,110,76),'rug')
        for x in [-.30,2.75]: box((x,-1.1,-3.12),(x+.3,-.55,-1.92),(91,110,76),'rug')
        for x in [.07,.94,1.81]: box((x,-.94,-2.82),(x+.81,-.82,-1.97),(125,139,103),'rug')
        box((.2,-.8,-2.85),(.8,-.35,-2.63),(215,203,173),'rug')
        box((1.9,-.8,-2.85),(2.55,-.32,-2.63),(174,153,119),'rug')
        box((-.7,-1.02,-.75),(1.5,-.90,.35),(119,88,59),'wood')
        for x in [-.55,1.2]:
            for z in [-.6,.1]: box((x,-1.52,z),(x+.12,-1,z+.12),(65,63,46))
        box((.15,-.9,-.45),(.75,-.85,-.05),(225,216,194))
        box((.21,-.85,-.44),(.72,-.81,-.06),(148,159,130))
        box((1,-.9,-.4),(1.2,-.62,-.2),(216,211,189))
        box((-3.2,-1.5,.5),(-2.25,-.85,1.5),(167,130,94),'rug')
        box((-3.4,-1.1,.45),(-3.15,-.1,1.55),(166,129,94),'rug')
    elif kind == 'cocina':
        for x in np.arange(-.2,3.3,.8):
            box((x,-1.58,-3.6),(x+.77,-.65,-2.7),(112,128,95))
            box((x+.3,-.9,-2.69),(x+.55,-.86,-2.65),(181,173,139))
            box((x,.1,-3.8),(x+.77,1.15,-3.32),(174,151,119),'wood')
        box((-.25,-.65,-3.65),(3.5,-.54,-2.6),(223,215,193))
        box((.1,-.535,-3.45),(.95,-.51,-2.85),(98,106,99))
        box((1.4,-1.56,-.6),(2.9,-.55,1.25),(171,149,113),'wood')
        box((1.3,-.55,-.7),(3,-.43,1.35),(232,224,204))
        for z in [-.3,.8]:
            box((.4,-1.1,z),(.95,-1,z+.4),(112,90,65))
            for x in [.45,.85]: box((x,-1.58,z+.05),(x+.05,-1,z+.35),(62,65,48))
    else:
        box((-.7,-1.57,-3.2),(3.4,-1.54,1.2),(210,204,186),'rug')
        box((.1,-1.3,-3.1),(2.6,-.92,.2),(143,116,82),'wood')
        box((.02,-1,-3.05),(2.68,-.7,.25),(232,221,196),'rug')
        box((-.03,-.8,-3.2),(2.73,.05,-3.04),(137,143,109),'rug')
        box((.16,-.7,-1.3),(2.55,-.63,.2),(154,165,130),'rug')
        for x in [.3,1.5]: box((x,-.68,-2.9),(x+.9,-.44,-2.26),(243,234,214),'rug')
        box((-1.1,-1.55,-3.2),(-.3,-.73,-2.4),(163,132,96),'wood')
        box((-.92,-.72,-3.05),(-.55,-.2,-2.7),(226,208,165))
    # Stylized potted tree and sideboard on rear wall.
    box((-3.45,-1.55,-2.9),(-2.95,-.95,-2.4),(155,125,89))
    box((-3.23,-1.1,-2.7),(-3.18,.5,-2.65),(109,100,65))
    for x,y,z,w in [(-3.5,.15,-2.85,.5),(-3.1,.5,-2.7,.45),(-3.6,.7,-2.8,.5),(-3.25,.92,-2.7,.35)]: box((x,y,z),(x+w,y+.3,z+.35),(92,117,72))
    box((-2.5,-1.55,3.3),(2.8,-.7,3.9),(155,125,91),'wood')
    for x in np.arange(-2.5,2.8,.9): box((x,-1.45,3.28),(x+.02,-.75,3.3),(92,81,60))
    box((-.3,-.7,3.5),(.3,-.1,3.8),(217,207,182))
    # Subtle gamma correction for a warm architectural illustration.
    return np.uint8(np.clip(rgb,0,255))

for kind in ['sala','cocina','recamara']:
    w,h=2048,1024
    yaw=(np.arange(w,dtype=np.float32)/w-.5)*2*np.pi
    pitch=(.5-np.arange(h,dtype=np.float32)/h)*np.pi
    cp=np.cos(pitch)[:,None]
    d=np.stack([np.broadcast_to(cp*np.sin(yaw), (h,w)),np.broadcast_to(np.sin(pitch)[:,None],(h,w)),-cp*np.cos(yaw)],axis=-1)
    Image.fromarray(render(d,kind)).save(OUT/f'{kind}.jpg',quality=88,optimize=True)
    w,h=1200,850
    xx,yy=np.meshgrid(np.linspace(-1,1,w,dtype=np.float32),np.linspace(1,-1,h,dtype=np.float32))
    d=np.stack([xx*.95,yy*.67-.08,-np.ones_like(xx)],axis=-1)
    d/=np.linalg.norm(d,axis=-1,keepdims=True)
    Image.fromarray(render(d,kind)).save(OUT/f'{kind}-cover.jpg',quality=90,optimize=True)
    print(f'Generated {kind}: panorama 2048x1024 + cover 1200x850')
