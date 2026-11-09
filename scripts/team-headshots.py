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
ADJ = {'hamid': dict(exp=1.17, warm=-.05, sat=.80)}
FEATHER = {'navid': 7}   # soft hair edge where the original background was as dark as the hair
def adjust(name, rgb):
    o = ADJ.get(name)
    if not o: return rgb
    f = rgb.astype(np.float32) / 255
    f = 1 - (1 - f) ** o['exp']                         # lift mids/shadows, keep highlights
    f[..., 0] *= 1 + o['warm']; f[..., 2] *= 1 - o['warm']
    g = f.mean(2, keepdims=True); f = g + (f - g) * o['sat']
    return np.clip(f * 255, 0, 255).astype(np.uint8)

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
    s = (EYE_D * H) / eye
    nw, nh = int(im.width * s), int(im.height * s)
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
    canvas[y0:y1, x0:x1] = canvas[y0:y1, x0:x1] * (1 - sub_a) + sub_rgb * sub_a
    canvas[y0:y1, x0:x1] += np.clip(-edge, 0, 1)[..., None] * np.array([40, 80, 160]) * .5 * sub_a
    # floor fade so every portrait ends the same way
    fade = np.clip((np.arange(H) - H * .82) / (H * .18), 0, 1)[:, None, None] ** 1.5
    canvas = canvas * (1 - fade * .55) + np.array([13, 19, 32]) * fade * .55
    out = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
    out.save(os.path.join(OUT, f'{name}.png'))
    print(name, 'scale %.2f' % s, 'src', im.size)
