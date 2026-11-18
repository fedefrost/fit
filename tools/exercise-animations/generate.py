"""Genera las animaciones de los ejercicios: stickman blanco sobre fondo azul.

Por cada ejercicio escribe en frontend/public/exercises/:
  <slug>.png  imagen fija (la pose de máximo esfuerzo), usada como miniatura
  <slug>.gif  animación en bucle, que se muestra al hacer clic

Uso (requiere Pillow: pip install pillow):
  python tools/exercise-animations/generate.py

Modelo: un esqueleto 2D definido por ángulos. Cada ejercicio tiene 2 o más poses clave que
se interpolan con suavizado y vuelven a la primera, formando el bucle.

Convención de ángulos (grados):
  - Extremidades: 0 = hacia abajo, 90 = hacia adelante (derecha de la imagen),
    180 = hacia arriba, -90 = hacia atrás.
  - Torso (de la cadera al hombro): 0 = vertical hacia arriba, 90 = horizontal con la cabeza
    hacia adelante, -90 = horizontal con la cabeza hacia atrás (acostado boca arriba).
Cada extremidad es (segmento superior, segmento inferior), en ángulos absolutos.
"""

import math
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "frontend" / "public" / "exercises"
CATALOG_SQL = ROOT / "backend" / "prisma" / "migrations" / "20261117000200_exercise_catalog" / "migration.sql"

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
        shoulder = add(hip, torso_vec(t, L["torso"]))
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
        hip = sub(shoulder, torso_vec(t, L["torso"]))
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


PROP_DRAWERS = {"bench": draw_bench, "bar": draw_pull_bar, "bike": draw_bike}
HELD_DRAWERS = {"dumbbell": draw_dumbbell, "barbell": draw_barbell}


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

EXERCISES = {
    # Piernas
    "bodyweight_squat": {"keys": [P(ra=(90, 90), la=(90, 90)), P(ra=(90, 90), la=(90, 90), **SQUAT_DOWN)]},
    "goblet_squat": {
        "keys": [P(ra=(15, 165), la=(15, 165)), P(ra=(25, 160), la=(25, 160), **SQUAT_DOWN)],
        "props": [("dumbbell", ("r_ha",), True)],
    },
    "barbell_back_squat": {
        "keys": [P(ra=(-40, 170), la=(-40, 170)), P(ra=(-40, 170), la=(-40, 170), torso=45, rl=(80, -25), ll=(80, -25))],
        "props": [("barbell", "shoulder", (-4, -2))],
    },
    "lunges": {
        "keys": [P(footx=140), P(footx=140, rl=(80, 0), ll=(-12, -100), ra=(10, 10), la=(-10, -10))],
    },
    "stationary_bike": {
        "keys": [
            dict(hip=(110, 120), torso=30, ra=(70, 85), la=(70, 85), rl=(75, -25), ll=(25, 15)),
            dict(hip=(110, 120), torso=30, ra=(70, 85), la=(70, 85), rl=(25, 15), ll=(75, -25)),
        ],
        "props": [("bike", (110, 124), (195, 84), (128, 168))],
        "frames": 6, "ms": 70,
    },
    # Glúteos
    "glute_bridge": {
        "keys": [
            dict(hip=(130, 197), torso=-90, ra=(90, 90), la=(90, 90), rl=(130, 20), ll=(130, 20)),
            dict(hip=(130, 168), torso=-116, ra=(78, 78), la=(78, 78), rl=(100, 22), ll=(100, 22)),
        ],
    },
    "hip_thrust": {
        "keys": [
            dict(hip=(122, 196), torso=-51, ra=(56, 56), la=(56, 56), rl=(120, 12), ll=(120, 12)),
            dict(hip=(128, 166), torso=-90, ra=(90, 90), la=(90, 90), rl=(95, 10), ll=(95, 10)),
        ],
        "props": [("bench", 35, 90, 168), ("barbell", "hip", (0, -10))],
    },
    "donkey_kick": {
        "keys": [
            dict(hip=(95, 167), torso=70, ra=(0, 0), la=(0, 0), rl=(0, -90), ll=(0, -90)),
            dict(hip=(95, 167), torso=70, ra=(0, 0), la=(0, 0), rl=(-110, 180), ll=(0, -90)),
        ],
    },
    "dumbbell_romanian_deadlift": {
        "keys": [P(ra=(0, 0), la=(0, 0)), P(torso=75, ra=(0, 0), la=(0, 0), rl=(12, -5), ll=(12, -5))],
        "props": [DB],
    },
    "bench_step_up": {
        "keys": [
            P(footx=None, hx=112, torso=10, rl=(70, -10), ll=(0, 0), ra=(-20, -10), la=(20, 30)),
            dict(torso=5, rl=(0, 0), ll=(-15, -55), ra=(20, 30), la=(-20, -10), footx=150, lift=GROUND_Y - 170),
        ],
        "props": [("bench", 130, 205, 170)],
    },
    # Bíceps
    "dumbbell_curl": {"keys": [P(ra=(0, 0), la=(0, 0)), P(ra=(0, 160), la=(0, 160))], "props": [DB]},
    "hammer_curl": {"keys": [P(ra=(0, 0), la=(0, 0)), P(ra=(0, 160), la=(0, 160))], "props": [DB_V]},
    "barbell_curl": {"keys": [P(ra=(0, 0), la=(0, 0)), P(ra=(0, 160), la=(0, 160))], "props": [BB_HANDS]},
    "chin_up": {"keys": [HANG, CHIN_TOP], "props": [("bar", 40, 60, 196)], "frames": 9},
    "concentration_curl": {
        "keys": [
            dict(hip=(105, 165), torso=35, ra=(15, 10), la=(30, 60), rl=(90, 0), ll=(90, 0)),
            dict(hip=(105, 165), torso=35, ra=(15, 165), la=(30, 60), rl=(90, 0), ll=(90, 0)),
        ],
        "props": [("bench", 60, 140, 172), DB_R],
    },
    # Tríceps
    "bench_dip": {
        "keys": [
            dict(hands=(95, 160), torso=5, ra=(-15, -5), la=(-15, -5), rl=(85, 45), ll=(85, 45)),
            dict(hands=(95, 160), torso=5, ra=(-75, 15), la=(-75, 15), rl=(75, 80), ll=(75, 80)),
        ],
        "props": [("bench", 35, 100, 160)],
    },
    "diamond_push_up": {"keys": [dict(PLANK_UP, hands=(150, GROUND_Y)), dict(PLANK_DOWN, hands=(150, GROUND_Y))]},
    "overhead_triceps_extension": {
        "keys": [P(ra=(180, 180), la=(180, 180)), P(ra=(180, -30), la=(180, -30))],
        "props": [("dumbbell", ("r_ha",), False)],
    },
    "dumbbell_skull_crusher": {
        "keys": [dict(LYING_BENCH, ra=(180, 180), la=(180, 180)), dict(LYING_BENCH, ra=(180, -105), la=(180, -105))],
        "props": [("bench", 50, 170, 160), DB],
    },
    "triceps_kickback": {
        "keys": [
            P(torso=70, rl=(15, -5), ll=(15, -5), ra=(-70, 0), la=(0, 0)),
            P(torso=70, rl=(15, -5), ll=(15, -5), ra=(-70, -70), la=(0, 0)),
        ],
        "props": [DB_R],
    },
    # Pecho
    "push_up": {"keys": [PLANK_UP, PLANK_DOWN]},
    "incline_push_up": {
        "keys": [
            dict(hands=(162, 165), torso=43, ra=(-5, -5), la=(-5, -5), rl=(-43, -43), ll=(-43, -43)),
            dict(hands=(162, 165), torso=54, ra=(-60, 30), la=(-60, 30), rl=(-54, -54), ll=(-54, -54)),
        ],
        "props": [("bench", 150, 215, 165)],
    },
    "dumbbell_bench_press": {
        "keys": [dict(LYING_BENCH, ra=(180, 180), la=(180, 180)), dict(LYING_BENCH, ra=(20, 175), la=(20, 175))],
        "props": [("bench", 50, 170, 160), DB],
    },
    "barbell_bench_press": {
        "keys": [dict(LYING_BENCH, ra=(180, 180), la=(180, 180)), dict(LYING_BENCH, ra=(20, 175), la=(20, 175))],
        "props": [("bench", 50, 170, 160), BB_HANDS],
    },
    "dumbbell_fly": {
        "keys": [dict(LYING_BENCH, ra=(180, 175), la=(180, 175)), dict(LYING_BENCH, ra=(70, 85), la=(70, 85))],
        "props": [("bench", 50, 170, 160), DB],
    },
    # Espalda
    "pull_up": {"keys": [HANG, CHIN_TOP], "props": [("bar", 40, 60, 196)], "frames": 9},
    "one_arm_dumbbell_row": {
        "keys": [
            P(footx=105, torso=80, rl=(10, -5), ll=(-5, 0), ra=(0, 0), la=(5, 5)),
            P(footx=105, torso=80, rl=(10, -5), ll=(-5, 0), ra=(-80, 0), la=(5, 5)),
        ],
        "props": [("bench", 145, 215, 180), DB_R],
    },
    "barbell_row": {
        "keys": [
            P(torso=60, rl=(15, -8), ll=(15, -8), ra=(0, 0), la=(0, 0)),
            P(torso=60, rl=(15, -8), ll=(15, -8), ra=(-70, 10), la=(-70, 10)),
        ],
        "props": [BB_HANDS],
    },
    "superman": {
        "keys": [
            dict(hip=(100, 198), torso=90, ra=(90, 90), la=(90, 90), rl=(-90, -90), ll=(-90, -90)),
            dict(hip=(100, 198), torso=80, ra=(102, 104), la=(102, 104), rl=(-100, -102), ll=(-100, -102)),
        ],
    },
    "barbell_deadlift": {
        "keys": [P(torso=65, rl=(55, -20), ll=(55, -20), ra=(0, 0), la=(0, 0)), P(ra=(0, 0), la=(0, 0))],
        "props": [BB_HANDS],
    },
    # Abdomen
    "crunch": {
        "keys": [
            dict(hip=(125, 197), torso=-90, ra=(100, 100), la=(100, 100), rl=(140, 20), ll=(140, 20)),
            dict(hip=(125, 197), torso=-65, ra=(110, 110), la=(110, 110), rl=(140, 20), ll=(140, 20)),
        ],
    },
    "plank": {
        "keys": [
            dict(hands=(188, GROUND_Y), torso=77, ra=(0, 90), la=(0, 90), rl=(-77, -77), ll=(-77, -77)),
            dict(hands=(188, GROUND_Y), torso=79, ra=(2, 90), la=(2, 90), rl=(-79, -79), ll=(-79, -79)),
        ],
        "frames": 10, "ms": 120,
    },
    "bicycle_crunch": {
        "keys": [
            dict(hip=(125, 197), torso=-70, ra=(150, -150), la=(150, -150), rl=(150, 90), ll=(100, 100)),
            dict(hip=(125, 197), torso=-70, ra=(150, -150), la=(150, -150), rl=(100, 100), ll=(150, 90)),
        ],
    },
    "hanging_leg_raise": {
        "keys": [dict(HANG, rl=(0, 0), ll=(0, 0)), dict(HANG, rl=(90, 90), ll=(90, 90))],
        "props": [("bar", 40, 60, 196)],
    },
    "mountain_climber": {
        "keys": [dict(PLANK_UP, rl=(40, -40), ll=(-65, -65)), dict(PLANK_UP, rl=(-65, -65), ll=(40, -40))],
        "frames": 5, "ms": 70,
    },
    # Hombros
    "dumbbell_shoulder_press": {"keys": [P(ra=(30, 180), la=(30, 180)), P(ra=(180, 180), la=(180, 180))], "props": [DB]},
    "lateral_raise": {
        "keys": [P(ra=(10, 10), la=(10, 10)), P(ra=(90, 90), la=(90, 90))],
        "props": [DB_V], "view": "front",
    },
    "barbell_overhead_press": {"keys": [P(ra=(30, 180), la=(30, 180)), P(ra=(180, 180), la=(180, 180))], "props": [BB_HANDS]},
    "pike_push_up": {
        "keys": [
            dict(hands=(165, GROUND_Y), torso=125, ra=(55, 55), la=(55, 55), rl=(-29, -29), ll=(-29, -29)),
            dict(hands=(165, GROUND_Y), torso=140, ra=(30, 100), la=(30, 100), rl=(-29, -29), ll=(-29, -29)),
        ],
    },
    "front_raise": {"keys": [P(ra=(0, 0), la=(0, 0)), P(ra=(90, 90), la=(90, 90))], "props": [DB]},
    # Generales
    "jumping_jacks": {
        "keys": [P(ra=(15, 15), la=(15, 15), rl=(4, 4), ll=(4, 4)), P(ra=(160, 170), la=(160, 170), rl=(20, 20), ll=(20, 20), lift=8)],
        "view": "front", "frames": 6, "ms": 70,
    },
    "marching_in_place": {
        "keys": [
            P(footx=None, rl=(70, 0), ll=(0, 0), ra=(-30, -10), la=(35, 60)),
            P(footx=None, rl=(0, 0), ll=(70, 0), ra=(35, 60), la=(-30, -10)),
        ],
        "frames": 8,
    },
    "jogging_in_place": {
        "keys": [
            P(footx=None, torso=8, rl=(60, -50), ll=(-10, -40), ra=(-40, 80), la=(40, 120), lift=4),
            P(footx=None, torso=8, rl=(-10, -40), ll=(60, -50), ra=(40, 120), la=(-40, 80), lift=4),
        ],
        "frames": 5, "ms": 70,
    },
    "burpees": {
        "keys": [
            P(ra=(0, 0), la=(0, 0)),
            P(torso=50, rl=(85, -30), ll=(85, -30), ra=(20, 20), la=(20, 20)),
            PLANK_UP,
            P(torso=50, rl=(85, -30), ll=(85, -30), ra=(20, 20), la=(20, 20)),
            P(ra=(170, 175), la=(170, 175), lift=14),
        ],
        "frames": 6, "ms": 70,
    },
    "mobility_stretching": {
        "keys": [P(ra=(175, 178), la=(175, 178)), P(torso=100, ra=(8, 8), la=(8, 8))],
        "frames": 12, "ms": 90,
    },
}


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


def catalog_slugs():
    text = CATALOG_SQL.read_text(encoding="utf-8")
    block = text.split('INSERT INTO "exercises"')[1].split("ON CONFLICT")[0]
    return re.findall(r"^\('([a-z0-9_]+)'", block, flags=re.M)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    slugs = catalog_slugs()
    missing = [s for s in slugs if s not in EXERCISES]
    extra = [s for s in EXERCISES if s not in slugs]
    if missing or extra:
        raise SystemExit(f"Desfase con el catálogo. Sin animación: {missing}. Sin ejercicio: {extra}")

    for slug in slugs:
        ex = EXERCISES[slug]
        frames = build_frames(ex)
        # Miniatura: la segunda pose clave (máximo esfuerzo del movimiento).
        render(ex["keys"][1], ex).save(OUT_DIR / f"{slug}.png", optimize=True)
        palette = [f.convert("P", palette=Image.Palette.ADAPTIVE, colors=16) for f in frames]
        palette[0].save(
            OUT_DIR / f"{slug}.gif",
            save_all=True,
            append_images=palette[1:],
            duration=ex.get("ms", 80),
            loop=0,
            disposal=2,
            optimize=True,
        )
        print(f"{slug}: {len(frames)} cuadros")
    print(f"\n{len(slugs)} ejercicios generados en {OUT_DIR}")


if __name__ == "__main__":
    main()
