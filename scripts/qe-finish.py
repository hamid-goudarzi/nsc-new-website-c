"""Queen Elizabeth Elementary site photos (Nov 2024) for the home page collage and the project gallery.
Source: OneDrive PROJECTS/2024/Queen Elizabeth School/Pictures/202412 (NSC's own site photos, iPhone HEIC).
Same calm finish as the other photos (profinish.finish), then the site's usual sizes: webp 640/1280/2560, avif 640/1280/1920.
Run once per new photo; never re-run on files that are already finished.  Needs: pillow, pillow-heif, opencv-python, profinish.py beside it."""
import sys, os, cv2, numpy as np
from PIL import Image, ImageOps
import pillow_heif
pillow_heif.register_heif_opener()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, sys.argv[1] if len(sys.argv) > 1 else '.')          # folder that holds profinish.py
from profinish import finish
D = r'C:/Users/NeilS/OneDrive - NSC Ltd/PROJECTS/2024/Queen Elizabeth School/Pictures/202412'
MEDIA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'media')
JOBS = {
 # crop = (x0, y0, x1, y1) as fractions of the photo
 'qe-excavator-site':  ('20241105_211702631_iOS.heic', dict(rot=0, crop=(0, 0.04, 1, 1), sky=0.10)),
 'qe-watermain-crew':  ('IMG_2766.jpg', dict(rot=0, crop=(0, 0.30, 1, 1), sky=0.0)),
}
for key, (fn, o) in JOBS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(D, fn))).convert('RGB')
    out = finish(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR), o)
    pil = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
    for w, q in ((640, 80), (1280, 80), (2560, 66)):
        r = pil if pil.width <= w else pil.resize((w, round(pil.height * w / pil.width)), Image.LANCZOS)
        r.save(os.path.join(MEDIA, f'{key}-{w}.webp'), quality=q, method=6)
    for w, q in ((640, 58), (1280, 58), (1920, 56)):
        r = pil if pil.width <= w else pil.resize((w, round(pil.height * w / pil.width)), Image.LANCZOS)
        r.save(os.path.join(MEDIA, f'{key}-{w}.avif'), quality=q)
    print(key, fn, pil.size)
