"""Hamid's new photo: sharpen (Real-ESRGAN blend), remove the glass and straw, plain black T-shirt. Coordinates are in the 4x crop."""
import cv2, numpy as np
from PIL import Image
e = cv2.imread('crop-x4.png').astype(np.float32)
o = cv2.imread('crop.png'); o = cv2.fastNlMeansDenoisingColored(o, None, 3, 3, 7, 21)
l = cv2.resize(o, (e.shape[1], e.shape[0]), interpolation=cv2.INTER_CUBIC).astype(np.float32)
img = .68 * e + .32 * l
g = cv2.GaussianBlur(np.random.default_rng(5).normal(0, 1, img.shape[:2]).astype(np.float32), (0, 0), 1.1) * 6
img = np.clip(img + g[..., None], 0, 255).astype(np.uint8)
K = 4
P = lambda pts: np.array([(x * K, y * K) for x, y in pts], np.int32)
h, w = img.shape[:2]
glass = np.zeros((h, w), np.uint8)
cv2.fillPoly(glass, [P([(300, 476), (440, 476), (440, 780), (300, 780)])], 1)            # glass
cv2.fillPoly(glass, [P([(334, 400), (362, 400), (362, 480), (334, 480)])], 1)            # straw
cv2.fillPoly(glass, [P([(318, 482), (395, 482), (395, 600), (318, 600)])], 1)            # orange slice
bear = np.zeros((h, w), np.uint8)
cv2.fillPoly(bear, [P([(190, 505), (335, 505), (340, 780), (185, 780)])], 1)
straw = np.zeros((h, w), np.uint8); cv2.fillPoly(straw, [P([(337, 405), (357, 405), (357, 500), (337, 500)])], 1)
# straw: fill each row by blending the pixels just left and right of it (neck / shirt edge continues naturally)
xa, xb = 336 * K, 358 * K
f = img.astype(np.float32)
xf = np.linspace(0, 1, xb - xa)[:, None]
for y in range(405 * K, 500 * K):
    b = np.clip((468 - y / K) / 55, 0, 1)                  # neck edge slides left across the straw going down
    t = np.clip((xf - b) / .12 + .5, 0, 1)
    lft = f[y, xa - 6:xa - 2].mean(0); rgt = f[y, xb + 2:xb + 6].mean(0)
    f[y, xa:xb] = lft * (1 - t) + rgt * t
f += np.random.default_rng(9).normal(0, 2.5, f.shape) * straw[..., None]
img = np.clip(f, 0, 255).astype(np.uint8)
lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
A, B = lab[..., 1], lab[..., 2]
yy = np.arange(h)[:, None]
skin = ((A > 132) & (B > 130)).astype(np.uint8)
teal = ((A < 126) & (B < 130)).astype(np.uint8)
torso = (yy > 330 * K).astype(np.uint8)
glass_low = (glass & (yy >= 478 * K)).astype(np.uint8)
shirt = ((teal | bear | glass_low) & torso).astype(np.uint8)
shirt = cv2.morphologyEx(shirt, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
shirt = (shirt & ~(skin & (1 - bear) & (1 - glass_low)).astype(bool)).astype(np.uint8)
shirt[(glass > 0) & (yy < 478 * K)] = 0   # keep neck and arm skin
shirt = cv2.morphologyEx(shirt, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
xx = np.arange(w)[None, :]

# straw above the collar sits over skin: inpaint it from the surrounding neck
# black tee: shading from the shirt's own folds; print and glass areas get shading filled in from around them
L = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
hole = cv2.dilate((bear | glass_low).astype(np.uint8), np.ones((15, 15), np.uint8))
Ls = cv2.resize(L, (w // 8, h // 8), interpolation=cv2.INTER_AREA).astype(np.uint8)
Hs = cv2.resize(hole, (w // 8, h // 8), interpolation=cv2.INTER_NEAREST)
Lf = cv2.resize(cv2.inpaint(Ls, Hs, 15, cv2.INPAINT_TELEA), (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
hs = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 25)
Lf = Lf * hs + L * (1 - hs)
shade = cv2.GaussianBlur(Lf, (0, 0), 10)
det = (Lf - shade) * (1 - hs)
sm = shade[shirt > 0].mean()
Lb = np.clip(26 + (shade - sm) * .45 + det * .35, 6, 70)
# where the glass and print were, keep the shirt as dark as the shirt around it (no lighter block)
ring = (cv2.dilate(hole, np.ones((61, 61), np.uint8)) > 0) & (hole == 0) & (shirt > 0)
ref_dark = np.median(Lb[ring]) if ring.any() else 26
Lb = np.where(hole > 0, np.minimum(Lb, ref_dark + (Lb - ref_dark) * .3 + 3), Lb)
blk = np.dstack([Lb, np.full_like(Lb, 128), np.full_like(Lb, 127)]).astype(np.uint8)
blk = cv2.cvtColor(blk, cv2.COLOR_LAB2BGR).astype(np.float32)
m = cv2.GaussianBlur(shirt.astype(np.float32), (0, 0), 2.5)[..., None]
out = img.astype(np.float32) * (1 - m) + blk * m
o8 = np.clip(out, 0, 255).astype(np.uint8)
ol = cv2.cvtColor(o8, cv2.COLOR_BGR2LAB).astype(np.float32)
left = ((ol[..., 1] < 124) & (ol[..., 2] < 128) & (yy > 405 * K)).astype(np.uint8)       # any teal left over
left = cv2.dilate(left, np.ones((5, 5), np.uint8))
o8 = cv2.inpaint(o8, left, 7, cv2.INPAINT_TELEA)
out = o8.astype(np.float32)
cv2.imwrite('prepped.jpg', np.clip(out, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 97])
Image.open('prepped.jpg').resize((760, 780)).save('prepped-small.jpg', quality=88)
