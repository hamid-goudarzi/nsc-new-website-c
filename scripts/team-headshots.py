"""NSC team headshots: same studio look for everyone, from each person's real photo.
Cut out the person (rembg), place on one NSC navy studio background, same framing (face size and eye line),
same colour grade. The person is not altered beyond tone/colour. Output 4:5 portraits."""
import sys, glob, os
import numpy as np, cv2
from PIL import Image, ImageFilter
from rembg import remove, new_session

SRC = os.path.join(os.path.dirname(__file__), 'team-src')
OUT = os.path.join(os.path.dirname(__file__), 'team-out')
os.makedirs(OUT, exist_ok=True)
W, H = 1024, 1280                      # 4:5
EYE_D = 0.13                          # distance between the eyes, fraction of frame height (same head size for all)
EYE_Y = 0.40                           # eye line height from top
sess = new_session(sys.argv[1] if len(sys.argv) > 1 else 'birefnet-portrait')
YUNET = os.path.join(os.path.dirname(__file__), 'yunet.onnx')

def background():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.array([16, 22, 36], np.float32)            # #101624 navy (site cards)
    top = np.array([24, 34, 58], np.float32)
    g = (y / H)[..., None]
    bg = top * (1 - g) + base * g
    # soft blue key glow behind the head, upper right
    d = np.sqrt(((x - W * .62) / (W * .55)) ** 2 + ((y - H * .30) / (H * .42)) ** 2)
    glow = np.clip(1 - d, 0, 1)[..., None] ** 1.6
    bg = bg + glow * np.array([30, 70, 170], np.float32) * .55
    # vignette
    v = np.sqrt(((x - W / 2) / (W * .75)) ** 2 + ((y - H * .45) / (H * .8)) ** 2)
    bg = bg * (1 - .35 * np.clip(v, 0, 1)[..., None] ** 2)
    noise = np.random.default_rng(7).normal(0, 1.2, bg.shape)  # fine grain, avoids banding
    return np.clip(bg + noise, 0, 255).astype(np.uint8)

# Per-person tone requests (lighter / less warm skin where asked)
ADJ = {}
FEATHER = {'navid': 7}
ZOOM = {'justin': .84}
SKINMATCH = {'hamid': dict(L=.55, ab=.9, target=(176., 150., 145.), cap=1.14, shadows=.6, range=70, sig=11, hair=1), 'justin': dict(L=.75, ab=.7, lift=1.18), 'djoomart': dict(L=.6, ab=.6, lift=1.08), 'fred': dict(L=.6, ab=.45, floor=.85, contrast=1.1, target=(165., 150., 148.), range=80, sig=14, grain=4.5)}
def adjust(name, rgb):
    o = ADJ.get(name)
    if not o: return rgb
    f = rgb.astype(np.float32) / 255
    f = 1 - (1 - f) ** o['exp']                         # lift mids/shadows, keep highlights
    f[..., 0] *= 1 + o['warm']; f[..., 2] *= 1 - o['warm']
    g = f.mean(2, keepdims=True); f = g + (f - g) * o['sat']
    return np.clip(f * 255, 0, 255).astype(np.uint8)

SKIN_TARGET = np.array([161., 150., 149.])   # Moe's cheek colour (OpenCV LAB), the reference skin tone
def lab(x): return cv2.cvtColor(np.clip(x, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
def unlab(x): return cv2.cvtColor(np.clip(x, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
def custom(name, rgb, a, y0, x0, chin):
    """Requested per-person edits, in output coordinates (eyes at EYE_Y*H, centred)."""
    if name not in SKINMATCH: return rgb
    L = lab(rgb); h, w = a.shape
    ys = np.arange(h)[:, None] + y0; xs = np.arange(w)[None, :] + x0
    ey = EYE_Y * H; ed = EYE_D * H
    # cheek reference patches (below each eye)
    cheeks = ((np.abs(ys - (ey + .55 * ed)) < .22 * ed) & (np.abs(np.abs(xs - W / 2) - .55 * ed) < .25 * ed) & (a > .9))
    ref = L[cheeks].mean(0)
    # skin mask: colour close to the cheeks, above the collar line
    d2 = ((L[..., 1] - ref[1]) ** 2 + (L[..., 2] - ref[2]) ** 2)
    skin = np.exp(-d2 / (2 * SKINMATCH[name].get('sig', 8.) ** 2)) * (L[..., 0] > 45) * a
    skin = cv2.GaussianBlur(skin.astype(np.float32), (0, 0), 2)
    st = SKINMATCH[name]
    tgt = np.array(st.get('target', SKIN_TARGET))
    shift = tgt - ref
    skin = skin * np.clip(1 - np.abs(L[..., 0] - ref[0]) / SKINMATCH[name].get('range', 45), 0, 1)    # only mid-tone skin, never eye whites or lens glare
    gain = float(np.clip(1 + st['L'] * (tgt[0] / ref[0] - 1), st.get('floor', .9), st.get('cap', 1.15)))
    L2 = L.copy()
    L2[..., 0] = L[..., 0] * (1 + skin * (gain - 1))
    L2[..., 1:] = L[..., 1:] + skin[..., None] * (shift[1:] * st['ab'])
    if st.get('contrast'):                                # washed-out photo: restore contrast on the whole subject
        mu = (L2[..., 0] * a).sum() / (a.sum() + 1e-3)
        L2[..., 0] = L2[..., 0] * (1 - a) + (mu + (L2[..., 0] - mu) * st['contrast']) * a
    if st.get('grain'):                                   # fine photographic texture on skin (very small source photos look waxy)
        gn = cv2.GaussianBlur(np.random.default_rng(31).normal(0, 1, a.shape).astype(np.float32), (0, 0), .9)
        L2[..., 0] += gn * st['grain'] * cv2.GaussianBlur(skin, (0, 0), 3)
    if st.get('shadows'):                                 # open up shadowed skin (jaw, under the eyes) more than lit skin
        base = cv2.GaussianBlur(L2[..., 0], (0, 0), 12)
        lift = np.clip((ref[0] * gain - base) / 60, 0, 1) * st['shadows'] * 40
        L2[..., 0] += skin * lift
    if st.get('hair'):                                    # crisp, rich, slightly glossy hair (dark pixels above the brows)
        hair = ((ys < ey - .25 * ed) & (L[..., 0] < 95)).astype(np.float32) * a
        hair = cv2.GaussianBlur(hair, (0, 0), 2)
        Lh = L2[..., 0]
        detail = Lh - cv2.GaussianBlur(Lh, (0, 0), 2.2)
        top = ys.min() if hasattr(ys, 'min') else 0
        hy = np.clip(1 - np.abs(ys - (ey - 1.55 * ed)) / (.9 * ed), 0, 1)          # band across the crown
        hx = np.clip(1 - np.abs(xs - (W / 2 - .25 * ed)) / (1.6 * ed), 0, 1)
        sheen = (hy * hx) ** 1.5 * np.clip(detail / 6, 0, 1)                         # only on strand highlights
        Lh2 = Lh * .9 + detail * 1.1 + sheen * 26
        L2[..., 0] = Lh * (1 - hair) + Lh2 * hair
        L2[..., 1] = L2[..., 1] * (1 - hair) + (128 + (L2[..., 1] - 128) * .6) * hair   # neutral black, no brown cast
        L2[..., 2] = L2[..., 2] * (1 - hair) + (126 + (L2[..., 2] - 128) * .5) * hair   # a touch cool
    if st.get('lift'):                                    # whole-subject exposure lift (clothes too), highlights protected
        x = np.clip(L2[..., 0] / 255, 0, 1); L2[..., 0] = (1 - (1 - x) ** st["lift"]) * 255
    return unlab(L2)

# Hand-traced shirt + collar outline on Hamid's original photo (source pixels); skin inside it is left alone by colour
HAMID_SHIRT = [(828, 470), (558, 485), (585, 550), (605, 600), (630, 670), (640, 750), (650, 853), (860, 853),
               (865, 770), (860, 700), (880, 650), (872, 590), (852, 530)]
def clothes_src(name, rgb, a):
    if name != 'hamid-old-photo': return rgb   # the hand-traced jacket/shirt edit was for Hamid's previous photo
    L = lab(rgb); h, w = a.shape
    poly = np.zeros((h, w), np.uint8); cv2.fillPoly(poly, [np.array(HAMID_SHIRT, np.int32)], 1)
    bb = L[..., 2]                                                         # blue-yellow: jacket ~102, shirt ~122, skin ~140
    shirtc = np.clip((134 - bb) / 6, 0, 1)                                 # shirt-or-jacket colours, not skin
    jackc = np.clip((121 - bb) / 5, 0, 1)                                  # clearly navy
    shirt = cv2.GaussianBlur(poly.astype(np.float32), (0, 0), 2.5) * cv2.GaussianBlur(shirtc.astype(np.float32), (0, 0), 1.5) * a
    yy = np.arange(h)[:, None]
    jacket = cv2.GaussianBlur(((yy > 440) & (poly == 0)).astype(np.float32), (0, 0), 3) * cv2.GaussianBlur(jackc.astype(np.float32), (0, 0), 1.5) * a
    shade = cv2.GaussianBlur(L[..., 0], (0, 0), 7)
    sm = shade[poly > 0].mean()
    wht = L.copy(); wht[..., 0] = np.clip(226 + (shade - sm) * .45 + (L[..., 0] - shade) * .10, 150, 248); wht[..., 1] = 128; wht[..., 2] = 127
    blk = L.copy(); blk[..., 0] = 10 + L[..., 0] * .32; blk[..., 1] = 128; blk[..., 2] = 128
    out = L * (1 - shirt[..., None]) + wht * shirt[..., None]
    out = out * (1 - jacket[..., None]) + blk * jacket[..., None]
    return unlab(out).astype(np.uint8)

def grade(rgb):
    """Gentle, identical grade: gray-world white balance (half strength), slight contrast curve, mild warmth."""
    f = rgb.astype(np.float32)
    m = f.reshape(-1, 3).mean(0); g = m.mean()
    f = f * (1 + .5 * (g / m - 1))
    f = f / 255
    f = f + .10 * (f - .5) * (1 - np.abs(2 * f - 1))      # soft S-curve
    f[..., 0] *= 1.02; f[..., 2] *= .98
    return np.clip(f * 255, 0, 255).astype(np.uint8)

def face_box(rgb):
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    det = cv2.FaceDetectorYN_create(YUNET, '', (bgr.shape[1], bgr.shape[0]), .6)
    _, fs = det.detect(bgr)
    if fs is None or len(fs) == 0: return None
    b = max(fs, key=lambda r: r[2] * r[3])
    return [float(v) for v in b[:8]]   # x,y,w,h, right eye x,y, left eye x,y

for f in sorted(glob.glob(os.path.join(SRC, '*.*'))):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f)
    if im.mode == 'RGBA':                                  # flatten old PNG cut-outs on grey first
        bg = Image.new('RGB', im.size, (128, 128, 128)); bg.paste(im, mask=im.split()[3]); im = bg
    im = im.convert('RGB')
    if name == 'cody':                                     # phone watermark sits in the background; cut-out drops it
        pass
    cut = remove(im, session=sess, post_process_mask=True)  # RGBA
    rgb = np.array(cut)[..., :3]; a = np.array(cut)[..., 3].astype(np.float32) / 255
    a = np.clip((a - .03) / .97, 0, 1)                   # trim the faintest halo only
    fb = face_box(np.array(im))
    if fb is None: print(name, 'NO FACE'); continue
    rgb = clothes_src(name, rgb, a)
    if name in FEATHER:                                  # smooth a choppy hair contour, only on dark hair above the eyes
        fz = FEATHER[name]
        soft = cv2.GaussianBlur(a, (0, 0), fz)
        core = cv2.erode((a > .5).astype(np.uint8), np.ones((fz * 2 + 1,) * 2, np.uint8)).astype(np.float32)
        fa = np.maximum(core, np.clip((soft - .15) / .7, 0, 1))
        lum = cv2.GaussianBlur(np.asarray(im.convert('L'), np.float32), (0, 0), 3)
        hair = (lum < 95).astype(np.float32) * (np.arange(a.shape[0])[:, None] < fb[5]).astype(np.float32)
        hair = cv2.GaussianBlur(hair, (0, 0), fz)
        a = a * (1 - hair) + fa * hair
    # body below the chin is solid: fill between the outer shoulder edges (fixes shirts that matched the wall)
    chin = int(fb[1] + fb[3] * 1.1)
    if chin < a.shape[0] - 2:
        m = (a[chin:] > .5)
        L = np.where(m.any(1), m.argmax(1), a.shape[1]).astype(np.float32)
        R = np.where(m.any(1), a.shape[1] - 1 - m[:, ::-1].argmax(1), -1).astype(np.float32)
        L = np.minimum.accumulate(L); R = np.maximum.accumulate(R)      # shoulders only widen going down
        xs = np.arange(a.shape[1])[None, :]
        body = ((xs >= L[:, None]) & (xs <= R[:, None])).astype(np.float32)
        full = np.zeros_like(a); full[chin:] = body
        full = cv2.GaussianBlur(full, (0, 0), 1.5)
        ramp = np.clip((np.arange(a.shape[0]) - chin) / (fb[3] * .5), 0, 1)[:, None]   # blend in below the chin
        a = np.maximum(a, full * ramp)
    # edge colour clean-up: semi-transparent pixels carry the old background colour.
    # Replace their colour with the nearby solid-subject colour (alpha-weighted blur), so hair edges keep hair colour.
    w = a ** 2
    sig = max(2., min(im.size) * .006)
    fg = cv2.GaussianBlur(rgb.astype(np.float32) * w[..., None], (0, 0), sig) / (cv2.GaussianBlur(w, (0, 0), sig)[..., None] + 1e-4)
    mix = np.clip((.95 - a) / .6, 0, 1)[..., None]       # 0 inside, 1 at the faint edge
    rgb = (rgb * (1 - mix) + fg * mix).clip(0, 255).astype(np.uint8)
    # green spill from park backgrounds: in a band along the subject edge, green may not exceed red/blue
    k = max(3, int(min(im.size) * .03)) | 1
    band = (cv2.dilate((a < .5).astype(np.uint8), np.ones((k, k), np.uint8)) > 0) & (a > 0)
    r, g, b = [rgb[..., i].astype(np.int16) for i in range(3)]
    # foliage-coloured fringe (green clearly above red-blue average) is old background: make it transparent
    k2 = max(5, int(min(im.size) * .07)) | 1
    wide = (cv2.dilate((a < .5).astype(np.uint8), np.ones((k2, k2), np.uint8)) > 0) & (a > 0)
    greenness = g - (r + b) / 2
    a = np.where(wide, a * np.clip(1 - (greenness - 14) / 16, 0, 1), a).astype(np.float32)
    a = cv2.GaussianBlur(a, (0, 0), .8)
    g2 = np.minimum(g, np.maximum(r, b))
    rgb[..., 1] = np.where(band, g2, g).astype(np.uint8)
    fx, fy, fw, fh, rex, rey, lex, ley = fb
    eye = np.hypot(lex - rex, ley - rey); ecx, ecy = (rex + lex) / 2, (rey + ley) / 2
    s = (EYE_D * H) / eye * ZOOM.get(name, 1.)
    # extend the bottom edge (clothes continue down) so no photo ends in a hard line; the floor fade hides it
    pad = int(rgb.shape[0] * .6)
    rgb = cv2.copyMakeBorder(rgb, 0, pad, 0, 0, cv2.BORDER_REPLICATE)
    a = cv2.copyMakeBorder(a, 0, pad, 0, 0, cv2.BORDER_REPLICATE)
    nw, nh = int(rgb.shape[1] * s), int(rgb.shape[0] * s)
    rgb_s = cv2.resize(adjust(name, grade(rgb)), (nw, nh), interpolation=cv2.INTER_LANCZOS4 if s > 1 else cv2.INTER_AREA)
    a_s = cv2.resize(a, (nw, nh), interpolation=cv2.INTER_LINEAR)
    if s > 1.3:                                            # upscaled sources: light unsharp to recover edges
        bl = cv2.GaussianBlur(rgb_s, (0, 0), 1.2 * s / 2)
        rgb_s = cv2.addWeighted(rgb_s, 1.35, bl, -.35, 0)
    ox = int(W / 2 - ecx * s); oy = int(EYE_Y * H - ecy * s)
    canvas = background().astype(np.float32)
    # paste with clipping
    x0, y0 = max(ox, 0), max(oy, 0); x1, y1 = min(ox + nw, W), min(oy + nh, H)
    sub_rgb = rgb_s[y0 - oy:y1 - oy, x0 - ox:x1 - ox].astype(np.float32)
    sub_a = a_s[y0 - oy:y1 - oy, x0 - ox:x1 - ox][..., None]
    # bottom of the subject: if the photo ends above the frame bottom, fade it into the background
    if oy + nh < H:
        ramp = np.clip((np.arange(y0, y1) - (oy + nh - 320)) / 320, 0, 1)[:, None, None]
        sub_a = sub_a * (1 - ramp)
    # soft blue rim on the subject edge (same for everyone)
    edge = cv2.GaussianBlur(sub_a[..., 0], (0, 0), 6) - cv2.GaussianBlur(sub_a[..., 0], (0, 0), 1.5)
    sub_rgb = custom(name, sub_rgb, sub_a[..., 0], y0, x0, chin=oy + (fy + fh) * s)
    canvas[y0:y1, x0:x1] = canvas[y0:y1, x0:x1] * (1 - sub_a) + sub_rgb * sub_a
    canvas[y0:y1, x0:x1] += np.clip(-edge, 0, 1)[..., None] * np.array([40, 80, 160]) * .5 * sub_a
    # floor fade so every portrait ends the same way
    fade = np.clip((np.arange(H) - H * .82) / (H * .18), 0, 1)[:, None, None] ** 1.5
    canvas = canvas * (1 - fade * .55) + np.array([13, 19, 32]) * fade * .55
    A = np.zeros((H, W), np.float32); A[y0:y1, x0:x1] = sub_a[..., 0]
    cv2.imwrite(os.path.join(OUT, f'{name}-alpha.png'), (A * 255).astype(np.uint8))
    open(os.path.join(OUT, f'{name}-chin.txt'), 'w').write(str(oy + (fy + fh) * s))
    out = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
    out.save(os.path.join(OUT, f'{name}.png'))
    print(name, 'scale %.2f' % s, 'src', im.size)
