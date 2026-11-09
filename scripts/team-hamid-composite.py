"""Hamid: new head (new photo, new hairstyle) on the jacket-and-shirt portrait. Both are eye-aligned by headshots.py."""
import cv2, numpy as np, os
D = os.path.dirname(os.path.abspath(__file__)); P = lambda *a: os.path.join(D, 'hout', *a)
body = cv2.imread(P('body.webp')).astype(np.float32)
head = cv2.imread(P('hamid.png')).astype(np.float32)
A = cv2.imread(P('hamid-alpha.png'), 0).astype(np.float32) / 255
bg = cv2.imread(P('bg.png')).astype(np.float32)
H, W = A.shape
chin = float(open(P('hamid-chin.txt')).read())
ed = .13 * H; ex, ey = W / 2, .40 * H
import sys
SOLO = len(sys.argv) > 1 and sys.argv[1] == 'solo'
SC = float(sys.argv[2]) if SOLO else .88                                                            # new head slightly smaller, about the eye centre
M = np.float32([[SC, 0, ex * (1 - SC)], [0, SC, ey * (1 - SC)]])
head = cv2.warpAffine(head, M, (W, H), borderMode=cv2.BORDER_REPLICATE)
A = cv2.warpAffine(A, M, (W, H))
chin = ey + (chin - ey) * SC
yy = np.arange(H)[:, None].astype(np.float32); xx = np.arange(W)[None, :].astype(np.float32)
Lh = cv2.cvtColor(head.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
def headmask(img_lab, sub, chin_y):
    """hair (top of head) + face and neck skin; excludes jacket, shirt and T-shirt."""
    Lc, ac = img_lab[..., 0], img_lab[..., 1]
    skinlike = ((ac > 131) & (Lc > 45)).astype(np.uint8)
    skinlike = cv2.morphologyEx(skinlike, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))   # fill eyes, brows, mouth, stubble
    top = (yy < ey + .35 * ed).astype(np.uint8)                                          # hair and forehead
    m = ((top | skinlike) & (sub > .5) & (np.abs(xx - ex) < 2.0 * ed)).astype(np.uint8)
    n, lab_, st, _ = cv2.connectedComponentsWithStats(m, 8)                               # keep the head blob only
    if n > 1:
        k = lab_[int(ey), int(ex)]
        m = (lab_ == k).astype(np.uint8) if k else m
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2)
s0, s1 = chin + .05 * ed, chin + 1.05 * ed                         # neck seam band (long, soft)
ramp = cv2.GaussianBlur(np.clip((s1 - yy) / (s1 - s0), 0, 1) ** 1.3, (0, 0), 10)
tee = np.zeros_like(A, bool)
hm = headmask(Lh, A, chin) * A * ramp
# old head: same mask on the old portrait, but only above the seam start (its lower neck and collar stay)
Lb0 = cv2.cvtColor(body.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
diff = np.abs(body - bg).sum(2)
oldsub = cv2.GaussianBlur((diff > 30).astype(np.float32), (0, 0), 1.5)
oldhead = headmask(Lb0, oldsub, chin) * np.clip((s0 + .2 * ed - yy) / (.4 * ed), 0, 1)
oldhead = cv2.GaussianBlur(cv2.dilate(oldhead, np.ones((7, 7), np.uint8)), (0, 0), 2)
base = body * (1 - oldhead[..., None]) + bg * oldhead[..., None]
# skin tone: match the new neck to the old neck in the seam band
band = (yy > s0) & (yy < s1) & (np.abs(xx - ex) < .45 * ed)
Lb = cv2.cvtColor(body.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
sel = band & (A > .9) & ~tee
if sel.sum() > 50 and not SOLO:
    shift = (Lb[sel].mean(0) - Lh[sel].mean(0)) * np.array([.35, .9, .9])
else:
    shift = np.zeros(3)
skin = cv2.GaussianBlur(((A > .5) & (Lh[..., 1] > 130)).astype(np.float32), (0, 0), 3)[..., None]
head2 = cv2.cvtColor(np.clip(Lh + skin * shift, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
Lh2 = cv2.cvtColor(head2.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
lo_h = cv2.GaussianBlur(Lh2[..., 0], (0, 0), 25); lo_b = cv2.GaussianBlur(Lb[..., 0], (0, 0), 25)
w_band = np.clip((yy - (chin - .15 * ed)) / (.35 * ed), 0, 1) * (A > .5) * (np.abs(xx - ex) < 1.3 * ed)
w_band = cv2.GaussianBlur(w_band.astype(np.float32), (0, 0), 8)
if not SOLO: Lh2[..., 0] += np.clip(lo_b - lo_h, -10, 60) * w_band * .9
head2 = cv2.cvtColor(np.clip(Lh2, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
# neon: cyan/green cast on the cheek -> local skin colour
face = ((A > .5) & (yy < chin + .2 * ed) & (yy > ey - .6 * ed)).astype(np.float32)
sk2 = cv2.GaussianBlur(((Lh2[..., 1] > 136) * face).astype(np.float32), (0, 0), 1) 
den = cv2.GaussianBlur(sk2, (0, 0), 30) + 1e-3
for c in (1, 2):
    loc = cv2.GaussianBlur(Lh2[..., c] * sk2, (0, 0), 30) / den
    cast = np.clip((140 - Lh2[..., 1]) / 10, 0, 1) * face * np.clip((Lh2[..., 0] - 105) / 25, 0, 1)   # bright skin only, never brows or hair
    Lh2[..., c] = Lh2[..., c] * (1 - cast) + loc * cast
# hair: remove the blue neon tint (dark pixels in the upper head are neutral black)
hairm = cv2.GaussianBlur(((Lh2[..., 0] < 90) & (A > .3) & ((yy < ey - .45 * ed) | ((np.abs(xx - ex) > .95 * ed) & (yy < ey + .4 * ed)))).astype(np.float32), (0, 0), 2)
Lh2[..., 1] = Lh2[..., 1] * (1 - hairm) + 128 * hairm
Lh2[..., 2] = Lh2[..., 2] * (1 - hairm) + 127 * hairm
# fill light: lift the deep shadows (eye sockets, under the nose) toward the local average
Lw = Lh2[..., 0]; avg = cv2.GaussianBlur(Lw, (0, 0), 35)
Lh2[..., 0] = Lw + np.clip(avg - Lw, 0, 45) * .55 * cv2.GaussianBlur(face, (0, 0), 6)
head2 = cv2.cvtColor(np.clip(Lh2, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
# head2 already has its own soft edge drawn over the same background, so composite with the alpha-limited mask
out = head2 if SOLO else base * (1 - hm[..., None]) + head2 * hm[..., None]
o8 = np.clip(out, 0, 255).astype(np.uint8)
# leftover patch from the straw under the jaw (right side): smooth it from its surroundings
patch = np.zeros((H, W), np.uint8); cv2.rectangle(patch, (int(ex + .7 * ed * SC), int(chin - .15 * ed)), (int(ex + 1.35 * ed * SC), int(chin + .35 * ed)), 1, -1)
patch = (patch & ((A > .3) if SOLO else (hm > .3))).astype(np.uint8)
o8 = cv2.inpaint(o8, patch, 12, cv2.INPAINT_TELEA)
cv2.imwrite(P('solo.png' if SOLO else 'composite.png'), o8)
print('seam', round(s0), round(s1), 'shift', np.round(shift, 1))
