"""Motor de las animaciones de ejercicios: esqueleto 2D, accesorios y render.

Convención de ángulos (grados):
  - Extremidades: 0 = hacia abajo, 90 = hacia adelante (derecha de la imagen),
    180 = hacia arriba, -90 = hacia atrás.
  - Torso (de la cadera al hombro): 0 = vertical hacia arriba, 90 = horizontal con la cabeza
    hacia adelante, -90 = horizontal con la cabeza hacia atrás (acostado boca arriba).
Cada extremidad es (segmento superior, segmento inferior), en ángulos absolutos.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "frontend" / "public" / "exercises"
MIGRATIONS = ROOT / "backend" / "prisma" / "migrations"

SIZE = 240
SS = 3  # supersampling para bordes suaves
GROUND_Y = 205
BG = (25, 118, 210)
GROUND = (90, 160, 230)
FG = (255, 255, 255)
FAR = (196, 222, 248)  # extremidades del fondo, un poco más tenues
PROP = (255, 255, 255)
PROP_SOFT = (150, 196, 240)
STROKE = 5

L = {"torso": 58, "neck": 6, "head": 11, "upper": 30, "fore": 28, "thigh": 38, "shin": 38}


# ---------------------------------------------------------------- geometría

def limb_vec(angle, length):
    a = math.radians(angle)
    return (math.sin(a) * length, math.cos(a) * length)


def torso_vec(angle, length):
    a = math.radians(angle)
    return (math.sin(a) * length, -math.cos(a) * length)


def add(p, v):
    return (p[0] + v[0], p[1] + v[1])


def sub(p, v):
    return (p[0] - v[0], p[1] - v[1])


STAND = {"torso": 0, "ra": (4, 4), "la": (-4, -4), "rl": (3, 0), "ll": (-3, 0)}


def P(**overrides):
    pose = dict(STAND)
    pose.update(overrides)
    return pose


def solve(pose, view):
    """Calcula la posición de cada articulación para una pose."""
    t = pose["torso"]
    ra, la, rl, ll = pose["ra"], pose["la"], pose["rl"], pose["ll"]
    mirror = view == "front"

    def arm(shoulder, angles, flip):
        a1, a2 = (-angles[0], -angles[1]) if flip else angles
        elbow = add(shoulder, limb_vec(a1, L["upper"]))
        return elbow, add(elbow, limb_vec(a2, L["fore"]))

    def leg(hip, angles, flip):
        a1, a2 = (-angles[0], -angles[1]) if flip else angles
        knee = add(hip, limb_vec(a1, L["thigh"]))
        return knee, add(knee, limb_vec(a2, L["shin"]))

    def build(hip):
        shoulder = add(hip, torso_vec(t, L["torso"] + pose.get("shrug", 0)))
        head = add(shoulder, torso_vec(t, L["neck"] + L["head"]))
        if mirror:
            r_sh, l_sh = add(shoulder, (13, 4)), add(shoulder, (-13, 4))
            r_hip, l_hip = add(hip, (7, 0)), add(hip, (-7, 0))
        else:
            r_sh = l_sh = shoulder
            r_hip = l_hip = hip
        r_el, r_ha = arm(r_sh, ra, False)
        l_el, l_ha = arm(l_sh, la, mirror)
        r_kn, r_ft = leg(r_hip, rl, False)
        l_kn, l_ft = leg(l_hip, ll, mirror)
        return {
            "hip": hip, "shoulder": shoulder, "head": head,
            "r_sh": r_sh, "l_sh": l_sh, "r_hip": r_hip, "l_hip": l_hip,
            "r_el": r_el, "r_ha": r_ha, "l_el": l_el, "l_ha": l_ha,
            "r_kn": r_kn, "r_ft": r_ft, "l_kn": l_kn, "l_ft": l_ft,
        }

    if "hands" in pose:
        # Manos fijas (barra, suelo, banco): se reconstruye el cuerpo desde la mano.
        elbow_to_shoulder = add(limb_vec(ra[0], L["upper"]), limb_vec(ra[1], L["fore"]))
        shoulder = sub(pose["hands"], elbow_to_shoulder)
        if mirror:
            shoulder = sub(shoulder, (13, 4))
        hip = sub(shoulder, torso_vec(t, L["torso"] + pose.get("shrug", 0)))
        return build(hip)

    if "hip" in pose:
        return build(pose["hip"])

    # De pie: los pies se apoyan en el suelo (menos `lift` si salta).
    j = build((0, 0))
    lowest = max(j["r_ft"][1], j["l_ft"][1])
    dy = GROUND_Y - lift_of(pose) - lowest
    foot_x = pose.get("footx", 120)
    dx = (foot_x - j["r_ft"][0]) if foot_x is not None else (pose.get("hx", 120) - j["hip"][0])
    return build((dx, dy))


def lift_of(pose):
    return pose.get("lift", 0)


def lerp_pose(a, b, k):
    out = {}
    for key, va in a.items():
        vb = b.get(key, va)
        if isinstance(va, (int, float)) and isinstance(vb, (int, float)):
            out[key] = va + (vb - va) * k
        elif isinstance(va, tuple) and isinstance(vb, tuple):
            out[key] = tuple(x + (y - x) * k for x, y in zip(va, vb))
        else:
            out[key] = va
    for key, vb in b.items():
        out.setdefault(key, vb)
    return out


# ---------------------------------------------------------------- dibujo

def S(p):
    return (p[0] * SS, p[1] * SS)


def line(draw, points, color, width=STROKE):
    pts = [S(p) for p in points]
    draw.line(pts, fill=color, width=width * SS, joint="curve")
    r = width * SS / 2
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)


def circle(draw, center, radius, fill=None, outline=None, width=STROKE):
    x, y = S(center)
    r = radius * SS
    draw.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=outline, width=width * SS if outline else 0)


def rect(draw, x0, y0, x1, y1, color):
    draw.rectangle((x0 * SS, y0 * SS, x1 * SS, y1 * SS), fill=color)


def draw_bench(draw, spec, j):
    _, x0, x1, top = spec
    rect(draw, x0, top, x1, top + 7, PROP_SOFT)
    for x in (x0 + 6, x1 - 6):
        line(draw, [(x, top + 7), (x, GROUND_Y)], PROP_SOFT, 4)


def draw_pull_bar(draw, spec, j):
    _, y, x0, x1 = spec
    line(draw, [(x0, y), (x1, y)], PROP, 5)
    for x in (x0, x1):
        line(draw, [(x, y), (x, GROUND_Y)], PROP_SOFT, 4)


def draw_bike(draw, spec, j):
    _, seat, bars, crank = spec
    line(draw, [(70, GROUND_Y), (205, GROUND_Y)], PROP_SOFT, 6)
    circle(draw, (182, 172), 24, outline=PROP_SOFT, width=5)  # volante de inercia
    line(draw, [crank, (182, 172)], PROP_SOFT, 4)
    line(draw, [(seat[0], seat[1] + 6), crank, (90, GROUND_Y)], PROP_SOFT, 5)
    line(draw, [crank, (bars[0] - 6, bars[1] + 8), (182, 150)], PROP_SOFT, 5)
    line(draw, [(seat[0] - 12, seat[1] + 5), (seat[0] + 12, seat[1] + 5)], PROP, 6)
    line(draw, [(bars[0] - 10, bars[1] + 4), (bars[0] + 6, bars[1])], PROP, 6)
    circle(draw, crank, 5, fill=PROP_SOFT)


def draw_dumbbell(draw, spec, j):
    _, hands, vertical = spec
    for key in hands:
        x, y = j[key]
        if vertical:
            line(draw, [(x, y - 9), (x, y + 9)], PROP, 4)
            rect(draw, x - 6, y - 13, x + 6, y - 7, PROP)
            rect(draw, x - 6, y + 7, x + 6, y + 13, PROP)
        else:
            line(draw, [(x - 9, y), (x + 9, y)], PROP, 4)
            rect(draw, x - 13, y - 6, x - 7, y + 6, PROP)
            rect(draw, x + 7, y - 6, x + 13, y + 6, PROP)


def draw_barbell(draw, spec, j):
    _, anchor, offset = spec
    x, y = add(j[anchor], offset)
    circle(draw, (x, y), 13, outline=PROP, width=4)
    circle(draw, (x, y), 4, fill=PROP)


BAND = (120, 230, 170)
CABLE = (225, 236, 248)


def point(j, ref):
    """Un punto: nombre de articulación ('r_ha', 'hip'...) o coordenada fija (x, y)."""
    return j[ref] if isinstance(ref, str) else ref


def draw_treadmill(draw, spec, j):
    rect(draw, 50, GROUND_Y - 10, 210, GROUND_Y - 2, PROP_SOFT)
    line(draw, [(56, GROUND_Y - 6), (204, GROUND_Y - 6)], PROP, 3)
    line(draw, [(204, GROUND_Y - 8), (214, 100)], PROP_SOFT, 5)
    line(draw, [(214, 100), (178, 112)], PROP_SOFT, 5)
    rect(draw, 204, 92, 224, 104, PROP_SOFT)


def draw_elliptical(draw, spec, j):
    line(draw, [(60, GROUND_Y), (200, GROUND_Y)], PROP_SOFT, 6)
    circle(draw, (68, GROUND_Y - 14), 12, outline=PROP_SOFT, width=4)
    line(draw, [(198, GROUND_Y), (192, 78)], PROP_SOFT, 6)
    for hand in ("r_ha", "l_ha"):
        line(draw, [(192, 120), j[hand]], PROP_SOFT, 4)
    for foot in ("r_ft", "l_ft"):
        x, y = j[foot]
        line(draw, [(x - 10, y + 3), (x + 10, y + 3)], PROP, 5)


def draw_rower(draw, spec, j):
    rail_y = GROUND_Y - 12
    line(draw, [(30, rail_y), (200, rail_y)], PROP_SOFT, 5)
    for x in (34, 196):
        line(draw, [(x, rail_y), (x, GROUND_Y)], PROP_SOFT, 4)
    circle(draw, (210, rail_y - 18), 20, outline=PROP_SOFT, width=5)
    hx, hy = j["hip"]
    rect(draw, hx - 14, hy + 4, hx + 14, hy + 10, PROP)
    line(draw, [(176, rail_y - 30), (178, rail_y)], PROP_SOFT, 4)  # apoya pies
    line(draw, [(206, rail_y - 26), j["r_ha"]], CABLE, 2)
    x, y = j["r_ha"]
    line(draw, [(x, y - 6), (x, y + 6)], PROP, 5)


def draw_leg_press(draw, spec, j):
    line(draw, [(30, GROUND_Y), (215, GROUND_Y)], PROP_SOFT, 6)
    line(draw, [(140, GROUND_Y), (222, 70)], PROP_SOFT, 6)  # riel del trineo
    hx, hy = j["hip"]
    sx, sy = j["shoulder"]
    line(draw, [(hx - 2, hy + 8), (sx - 8, sy + 6)], PROP_SOFT, 9)  # respaldo
    line(draw, [(hx - 10, hy + 9), (hx + 14, hy + 9)], PROP_SOFT, 9)  # asiento
    line(draw, [(hx - 4, hy + 12), (hx - 4, GROUND_Y)], PROP_SOFT, 5)
    fx, fy = j["r_ft"]
    line(draw, [(fx - 12, fy - 14), (fx + 10, fy + 12)], PROP, 6)  # plataforma


def draw_cable(draw, spec, j):
    _, x, pulley_y, *rest = spec
    hands = rest[0] if rest else ("r_ha",)
    rect(draw, x - 5, 20, x + 5, GROUND_Y, PROP_SOFT)
    circle(draw, (x, pulley_y), 6, fill=PROP)
    for hand in hands:
        hx, hy = j[hand]
        line(draw, [(x, pulley_y), (hx, hy)], CABLE, 2)
        line(draw, [(hx - 5, hy), (hx + 5, hy)], PROP, 5)


def draw_band(draw, spec, j):
    _, anchor, *rest = spec
    hands = rest[0] if rest else ("r_ha", "l_ha")
    a = point(j, anchor)
    for hand in hands:
        line(draw, [a, j[hand]], BAND, 3)


def draw_rope(draw, spec, j):
    # Soga: curva que pasa por debajo de los pies, de mano a mano.
    a, b = j["l_ha"], j["r_ha"]
    low = max(j["r_ft"][1], j["l_ft"][1]) + 6
    mid_x = (a[0] + b[0]) / 2
    spread = max(26, abs(a[0] - b[0]) / 2 + 14)
    pts = []
    for i in range(21):
        t = i / 20
        x = mid_x - spread + 2 * spread * t
        bulge = math.sin(math.pi * t)
        y = (a[1] * (1 - t) + b[1] * t) * (1 - bulge) + low * bulge
        pts.append((x, y))
    line(draw, [a] + pts + [b], PROP, 2)


def draw_ball(draw, spec, j):
    _, anchor, offset, radius = spec
    x, y = add(point(j, anchor), offset)
    circle(draw, (x, y), radius, fill=PROP_SOFT)
    circle(draw, (x, y), radius, outline=PROP, width=3)


def draw_medball(draw, spec, j):
    hands = spec[1] if len(spec) > 1 else ("r_ha", "l_ha")
    xs = [j[h][0] for h in hands]
    ys = [j[h][1] for h in hands]
    center = (sum(xs) / len(xs), sum(ys) / len(ys))
    circle(draw, center, 11, fill=PROP_SOFT)
    circle(draw, center, 11, outline=PROP, width=3)


def draw_kettlebell(draw, spec, j):
    hands = spec[1] if len(spec) > 1 else ("r_ha",)
    for hand in hands:
        x, y = j[hand]
        circle(draw, (x, y - 1), 4, outline=PROP, width=2)
        circle(draw, (x, y + 9), 8, fill=PROP)


def draw_wall(draw, spec, j):
    x = spec[1]
    rect(draw, x - 6, 30, x, GROUND_Y, PROP_SOFT)


PROP_DRAWERS = {
    "wall": draw_wall,
    "bench": draw_bench,
    "bar": draw_pull_bar,
    "bike": draw_bike,
    "treadmill": draw_treadmill,
    "elliptical": draw_elliptical,
    "rower": draw_rower,
    "leg_press": draw_leg_press,
    "cable": draw_cable,
    "band": draw_band,
    "ball": draw_ball,
}
HELD_DRAWERS = {
    "dumbbell": draw_dumbbell,
    "barbell": draw_barbell,
    "rope": draw_rope,
    "medball": draw_medball,
    "kettlebell": draw_kettlebell,
}


def anchor_mode(pose):
    return "hands" if "hands" in pose else "hip" if "hip" in pose else "ground"


def lerp_joints(ja, jb, k):
    return {key: (ja[key][0] + (jb[key][0] - ja[key][0]) * k, ja[key][1] + (jb[key][1] - ja[key][1]) * k) for key in ja}


def frame_joints(a, b, k, view):
    """Articulaciones entre dos poses. Si se apoyan distinto (p. ej. de pie → plancha),
    se interpolan posiciones en vez de ángulos para que el cuerpo no atraviese el suelo."""
    if anchor_mode(a) == anchor_mode(b):
        return solve(lerp_pose(a, b, k), view)
    return lerp_joints(solve(a, view), solve(b, view), k)


def render(pose, ex, joints=None):
    view = ex.get("view", "side")
    j = joints or solve(pose, view)
    img = Image.new("RGB", (SIZE * SS, SIZE * SS), BG)
    d = ImageDraw.Draw(img)
    line(d, [(0, GROUND_Y + 4), (SIZE, GROUND_Y + 4)], GROUND, 3)

    for spec in ex.get("props", []):
        if spec[0] in PROP_DRAWERS:
            PROP_DRAWERS[spec[0]](d, spec, j)

    far = FG if view == "front" else FAR
    line(d, [j["l_hip"], j["l_kn"], j["l_ft"]], far)
    line(d, [j["l_sh"], j["l_el"], j["l_ha"]], far)
    line(d, [j["hip"], j["shoulder"]], FG, STROKE + 1)
    if view == "front":
        line(d, [j["l_sh"], j["r_sh"]], FG)
        line(d, [j["l_hip"], j["r_hip"]], FG)
    sx, sy = j["shoulder"][0] - j["hip"][0], j["shoulder"][1] - j["hip"][1]
    norm = math.hypot(sx, sy) or 1
    neck_end = add(j["shoulder"], (sx / norm * L["neck"], sy / norm * L["neck"]))
    line(d, [j["shoulder"], neck_end], FG)
    circle(d, j["head"], L["head"], fill=FG)
    line(d, [j["r_hip"], j["r_kn"], j["r_ft"]], FG)
    line(d, [j["r_sh"], j["r_el"], j["r_ha"]], FG)

    for spec in ex.get("props", []):
        if spec[0] in HELD_DRAWERS:
            HELD_DRAWERS[spec[0]](d, spec, j)

    return img.resize((SIZE, SIZE), Image.LANCZOS)



def ease(k):
    return (1 - math.cos(math.pi * k)) / 2


def build_frames(ex):
    keys = ex["keys"]
    per = ex.get("frames", 8)
    frames = []
    for i, a in enumerate(keys):
        b = keys[(i + 1) % len(keys)]
        for f in range(per):
            k = ease(f / per)
            frames.append(render(a, ex, frame_joints(a, b, k, ex.get("view", "side"))))
    return frames



# ---------------------------------------------------------------- ejercicios

DB = ("dumbbell", ("r_ha", "l_ha"), False)
DB_V = ("dumbbell", ("r_ha", "l_ha"), True)
DB_R = ("dumbbell", ("r_ha",), False)
BB_HANDS = ("barbell", "r_ha", (0, 0))

# Poses reutilizadas
SQUAT_DOWN = dict(torso=40, rl=(80, -25), ll=(80, -25))
PLANK_UP = dict(hands=(160, GROUND_Y), torso=65, ra=(-5, -5), la=(-5, -5), rl=(-65, -65), ll=(-65, -65))
PLANK_DOWN = dict(hands=(160, GROUND_Y), torso=72, ra=(-60, 30), la=(-60, 30), rl=(-72, -72), ll=(-72, -72))
HANG = dict(hands=(128, 40), torso=0, ra=(180, 180), la=(180, 180), rl=(8, -12), ll=(-4, -18))
CHIN_TOP = dict(hands=(128, 40), torso=0, ra=(100, 205), la=(100, 205), rl=(20, -25), ll=(10, -30))
LYING_BENCH = dict(hip=(130, 152), torso=-90, rl=(90, 8), ll=(90, 8))

