import sys, os, cv2, numpy as np
from PIL import Image, ImageOps
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from profinish import finish
D = r'C:/Users/NeilS/OneDrive - NSC Ltd/DATABASE/Photos/Advertisement/Guildford'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gad', 'out'); os.makedirs(OUT, exist_ok=True)
JOBS = {
 'guildford-tank-modules':          ('IMG_5272.jpg',  dict(rot=0, crop=(0, 0, 1, 1), sky=0.08)),
 'guildford-bulk-excavation':       ('IMG_3676.jpg',  dict(rot=0, crop=(0, 0, 1, 1), sky=0.15)),
 'guildford-nsc-fleet':             ('IMG_5505.jpg',  dict(rot=0, crop=(0, 0.05, 1, 1), sky=0.12)),
 'guildford-tank-excavation':       ('IMG_5204.jpg',  dict(rot=0, crop=(0, 0, 1, 1), sky=0.08)),
 'guildford-hauling':               ('IMG_5175.jpg',  dict(rot=0, crop=(0, 0.08, 1, 1), sky=0.15)),
 'guildford-bulk-excavation-wide':  ('IMG_3675.jpg',  dict(rot=0, crop=(0, 0, 1, 1), sky=0.15)),
 'guildford-liner-install':         ('IMG_5248.jpg',  dict(rot=0, crop=(0, 0, 1, 1), sky=0.10)),
 'guildford-site-overview':         ('78812715557__293342AA-934C-4C86-83CD-B82684BB1A8C.fullsizerender.jpeg', dict(rot=0, crop=(0, 0.06, 1, 1), sky=0.15)),
}
for key, (fn, o) in JOBS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(D, fn))).convert('RGB')
    bgr = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    out = finish(bgr, o)
    cv2.imencode('.png', out)[1].tofile(os.path.join(OUT, key + '.png'))
    print(key, fn, out.shape[1], 'x', out.shape[0])
