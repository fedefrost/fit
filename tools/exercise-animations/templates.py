"""Plantillas de movimiento para armar animaciones de ejercicios con pocos parámetros.

Cada función devuelve un dict de animación: {"keys": [poses], "props": [...], "view", "frames", "ms"}.
`prop` indica qué se sostiene: None, "db" (mancuernas), "dbv" (mancuernas verticales), "bb" (barra),
"kb" (pesa rusa), "mb" (pelota medicinal), "band" (banda elástica), "cable_low"/"cable_high"/
"cable_mid" (polea). Las poses usan las mismas convenciones que skeleton.py.
"""

from skeleton import CHIN_TOP, GROUND_Y, HANG, LYING_BENCH, PLANK_DOWN, PLANK_UP, P

BOTH = ("r_ha", "l_ha")


def held(prop, hands=BOTH):
    """Accesorios para lo que se sostiene en las manos."""
    if prop is None:
        return []
    if prop == "db":
        return [("dumbbell", hands, False)]
    if prop == "dbv":
        return [("dumbbell", hands, True)]
    if prop == "bb":
        return [("barbell", "r_ha", (0, 0))]
    if prop == "kb":
        return [("kettlebell", hands)]
    if prop == "mb":
        return [("medball", hands)]
    if prop == "band":
        return [("band", "r_ft", hands)]
    if prop == "band_front":
        return [("band", (210, 115), hands)]
    if prop == "band_behind":
        return [("band", (30, 115), hands)]
    if prop == "band_high":
        return [("band", (175, 30), hands)]
    if prop == "cable_low":
        return [("cable", 210, GROUND_Y - 18, hands)]
    if prop == "cable_mid":
        return [("cable", 210, 110, hands)]
    if prop == "cable_high":
        return [("cable", 175, 32, hands)]
    if prop == "cable_behind":
        return [("cable", 28, 110, hands)]
    raise ValueError(prop)


def anim(keys, props=(), view="side", frames=8, ms=80):
    return {"keys": list(keys), "props": list(props), "view": view, "frames": frames, "ms": ms}


BENCH_UNDER_LYING = ("bench", 50, 170, 160)
FLOOR_LYING = dict(hip=(130, 197), torso=-90, rl=(140, 20), ll=(140, 20))
BALL_LYING = dict(hip=(150, 150), torso=-90, rl=(90, 0), ll=(90, 0))
BALL_UNDER_BACK = ("ball", (100, 176), (0, 0), 27)

# ---------------------------------------------------------------- piernas y cadera


def squat(prop=None, hold="front", depth=1.0, extra=(), wide=False, foot_x=120):
    arms = {
        "front": (90, 90),
        "chest": (15, 165),
        "shoulders": (-40, 170),
        "front_rack": (40, 170),
        "sides": (0, 0),
        "overhead": (175, 178),
        "hips": (-25, 70),
    }[hold]
    if wide:
        up = P(ra=(20, 20), la=(20, 20), rl=(18, 18), ll=(18, 18), footx=None)
        down = P(ra=(20, 20), la=(20, 20), rl=(70, 5), ll=(70, 5), footx=None)
        return anim([up, down], held(prop) + list(extra), view="front")
    up = P(ra=arms, la=arms, footx=foot_x)
    down = P(
        ra=arms,
        la=arms,
        torso=40 * depth,
        rl=(80 * depth, -25 * depth),
        ll=(80 * depth, -25 * depth),
        footx=foot_x,
    )
    return anim([up, down], held(prop) + list(extra))


def wall_sit(ball=False):
    pose = P(torso=0, rl=(90, 0), ll=(90, 0), ra=(10, 10), la=(10, 10), footx=150)
    breathe = dict(pose, ra=(14, 14), la=(14, 14))
    props = [("wall", 106)] + ([("ball", "shoulder", (-14, 24), 16)] if ball else [])
    return anim([pose, breathe], props, frames=10, ms=120)


def lunge(mode="forward", prop=None, hold="sides", treadmill=False):
    arms = {"sides": (0, 0), "chest": (15, 165), "shoulders": (-40, 170), "overhead": (175, 178), "hips": (-25, 70)}[hold]
    if mode == "lateral":
        up = P(ra=arms, la=arms, rl=(15, 15), ll=(15, 15), footx=None)
        down = P(ra=arms, la=arms, rl=(65, -10), ll=(32, 32), footx=None, hx=105)
        return anim([up, down], held(prop), view="front")
    if mode == "split_bench":
        up = P(ra=arms, la=arms, rl=(10, 0), ll=(-30, -100), footx=150)
        down = P(ra=arms, la=arms, torso=10, rl=(80, 0), ll=(-5, -110), footx=150)
        return anim([up, down], held(prop) + [("bench", 40, 105, 172)])
    lift = 8 if treadmill else 0
    up = P(ra=arms, la=arms, footx=140, lift=lift)
    down = P(ra=arms, la=arms, footx=140, rl=(80, 0), ll=(-12, -100), lift=lift)
    return anim([up, down], held(prop) + ([("treadmill",)] if treadmill else []))


def hinge(prop=None, hold="hands", depth=75, knees=12, floor_start=False):
    arms = {"hands": (0, 0), "shoulders": (-40, 170), "chest": (15, 165), "hips": (-25, 70)}[hold]
    up = P(ra=arms, la=arms)
    down = P(ra=arms, la=arms, torso=depth, rl=(knees, -knees // 2), ll=(knees, -knees // 2))
    if floor_start:
        down = P(ra=(0, 0), la=(0, 0), torso=65, rl=(55, -20), ll=(55, -20))
        return anim([down, up], held(prop))
    return anim([up, down], held(prop))


def swing(prop="kb", single=False):
    hands = ("r_ha",) if single else BOTH
    back = P(torso=60, rl=(25, -12), ll=(25, -12), ra=(-25, -25), la=(-25, -25))
    front = P(torso=0, ra=(95, 95), la=(95, 95) if not single else (5, 5))
    return anim([back, front], held(prop, hands), frames=7, ms=70)


def calf_raise(prop=None, hold="sides"):
    arms = {"sides": (0, 0), "shoulders": (-40, 170), "hips": (-25, 70)}[hold]
    return anim([P(ra=arms, la=arms), P(ra=arms, la=arms, lift=9)], held(prop))


def step_up(mode="up", bench=("bench", 130, 205, 170)):
    if mode == "lateral":
        a = P(footx=None, hx=105, rl=(30, 30), ll=(0, 0), ra=(0, 0), la=(0, 0))
        b = P(footx=None, hx=140, rl=(0, 0), ll=(-20, -20), lift=GROUND_Y - 170, ra=(0, 0), la=(0, 0))
        return anim([a, b], [("bench", 115, 190, 170)], view="front")
    a = P(footx=None, hx=112, torso=10, rl=(70, -10), ll=(0, 0), ra=(-20, -10), la=(20, 30))
    knee = (90, 0) if mode == "knee_drive" else (-15, -55)
    b = dict(torso=5, rl=(0, 0), ll=knee, ra=(20, 30), la=(-20, -10), footx=150, lift=GROUND_Y - 170)
    return anim([a, P(**b)], [bench])


def box_jump():
    crouch = P(torso=40, rl=(80, -25), ll=(80, -25), ra=(-30, -20), la=(-30, -20), footx=110)
    air = P(torso=10, rl=(60, -20), ll=(60, -20), ra=(120, 130), la=(120, 130), footx=140, lift=55)
    land = P(torso=30, rl=(70, -25), ll=(70, -25), ra=(90, 90), la=(90, 90), footx=165, lift=GROUND_Y - 170)
    return anim([crouch, air, land], [("bench", 140, 215, 170)], frames=6, ms=70)


def bridge(mode="floor", prop=None):
    if mode in ("floor", "single_leg"):
        far = (130, 20) if mode == "floor" else (175, 175)
        far_up = (100, 22) if mode == "floor" else (150, 150)
        a = dict(hip=(130, 197), torso=-90, ra=(90, 90), la=(90, 90), rl=(130, 20), ll=far)
        b = dict(hip=(130, 168), torso=-116, ra=(78, 78), la=(78, 78), rl=(100, 22), ll=far_up)
        if prop == "bb":
            return anim([a, b], [("barbell", "hip", (0, -10))])
        return anim([a, b], held(prop) if prop else [])
    if mode in ("bench_shoulders", "bench_single"):
        far = (120, 12) if mode == "bench_shoulders" else (175, 175)
        a = dict(hip=(122, 196), torso=-51, ra=(56, 56), la=(56, 56), rl=(120, 12), ll=far)
        b = dict(hip=(128, 166), torso=-90, ra=(90, 90), la=(90, 90), rl=(95, 10), ll=(150, 150) if mode == "bench_single" else (95, 10))
        props = [("bench", 35, 90, 168)] + ([("barbell", "hip", (0, -10))] if prop == "bb" else held(prop) if prop else [])
        return anim([a, b], props)
    if mode == "ball_shoulders":
        a = dict(hip=(140, 195), torso=-60, ra=(60, 60), la=(60, 60), rl=(115, 10), ll=(115, 10))
        b = dict(hip=(145, 168), torso=-90, ra=(90, 90), la=(90, 90), rl=(95, 5), ll=(95, 5))
        return anim([a, b], [("ball", "shoulder", (-6, 24), 24)])
    if mode == "ball_feet":
        a = dict(hip=(95, 195), torso=-90, ra=(90, 90), la=(90, 90), rl=(98, 98), ll=(98, 98))
        b = dict(hip=(95, 175), torso=-104, ra=(85, 85), la=(85, 85), rl=(115, 40), ll=(115, 40))
        return anim([a, b], [("ball", "r_ft", (8, 4), 18)])
    if mode == "hamstring_curl":
        a = dict(hip=(95, 182), torso=-104, ra=(85, 85), la=(85, 85), rl=(100, 98), ll=(100, 98))
        b = dict(hip=(95, 170), torso=-110, ra=(85, 85), la=(85, 85), rl=(130, 30), ll=(130, 30))
        return anim([a, b], [("ball", "r_ft", (8, 4), 18)])
    raise ValueError(mode)


def kickback_glute(prop=None, standing=False):
    if standing:
        a = P(torso=25, rl=(0, 0), ll=(5, 0), ra=(10, 10), la=(10, 10))
        b = P(torso=25, rl=(-45, -40), ll=(5, 0), ra=(10, 10), la=(10, 10))
        props = [("cable", 28, GROUND_Y - 18, ("r_ft",))] if prop == "cable" else [("band", "l_ft", ("r_ft",))] if prop == "band" else []
        return anim([a, b], props)
    a = dict(hip=(95, 167), torso=70, ra=(0, 0), la=(0, 0), rl=(0, -90), ll=(0, -90))
    b = dict(hip=(95, 167), torso=70, ra=(0, 0), la=(0, 0), rl=(-110, 180), ll=(0, -90))
    props = [("band", "l_ha", ("r_ft",))] if prop == "band" else []
    return anim([a, b], props)


def clamshell(prop="band"):
    a = dict(hip=(120, 196), torso=-90, ra=(180, 120), la=(180, 120), rl=(130, 80), ll=(130, 80))
    b = dict(hip=(120, 196), torso=-90, ra=(180, 120), la=(180, 120), rl=(155, 110), ll=(130, 80))
    return anim([a, b], [("band", "l_kn", ("r_kn",))] if prop == "band" else [])


def lateral_walk(prop="band"):
    a = P(torso=15, rl=(30, -10), ll=(30, -10), ra=(-25, 70), la=(-25, 70), footx=None, hx=110)
    b = P(torso=15, rl=(40, -15), ll=(20, -5), ra=(-25, 70), la=(-25, 70), footx=None, hx=130)
    return anim([a, b], [("band", "l_kn", ("r_kn",))] if prop == "band" else [], view="front")


def leg_press(mode="normal"):
    seat = dict(hip=(85, 165), torso=-50)
    bent = dict(seat, ra=(40, 40), la=(40, 40), rl=(140, 60), ll=(140, 60))
    straight = dict(seat, ra=(40, 40), la=(40, 40), rl=(118, 118), ll=(118, 118))
    if mode == "single":
        bent["ll"] = (150, 40)
        straight["ll"] = (150, 40)
    if mode == "calf":
        bent = dict(seat, ra=(40, 40), la=(40, 40), rl=(118, 118), ll=(118, 118))
        straight = dict(seat, ra=(40, 40), la=(40, 40), rl=(118, 128), ll=(118, 128))
    if mode == "hold":
        straight = dict(bent, rl=(135, 70), ll=(135, 70))
        return anim([bent, straight], [("leg_press",)], frames=10, ms=120)
    return anim([bent, straight], [("leg_press",)])


# ---------------------------------------------------------------- brazos y hombros


def curl(prop="db", upper=0, seated=False):
    if seated:
        base = dict(hip=(105, 165), torso=35, rl=(90, 0), ll=(90, 0), la=(30, 60))
        a = dict(base, ra=(15, 10))
        b = dict(base, ra=(15, 165))
        return anim([a, b], [("bench", 60, 140, 172)] + held(prop, ("r_ha",)))
    a = P(ra=(upper, upper), la=(upper, upper))
    b = P(ra=(upper, 160), la=(upper, 160))
    return anim([a, b], held(prop))


def press_overhead(prop="db", seated=False, push=False):
    a = P(ra=(30, 180), la=(30, 180))
    b = P(ra=(180, 180), la=(180, 180))
    if push:
        a = P(ra=(30, 180), la=(30, 180), torso=5, rl=(30, -15), ll=(30, -15))
    if seated:
        a = dict(hip=(110, 165), torso=0, rl=(90, 0), ll=(90, 0), ra=(30, 180), la=(30, 180))
        b = dict(a, ra=(180, 180), la=(180, 180))
        return anim([a, b], [("bench", 70, 145, 172)] + held(prop))
    return anim([a, b], held(prop))


def raise_front(prop="db"):
    return anim([P(ra=(0, 0), la=(0, 0)), P(ra=(90, 90), la=(90, 90))], held(prop))


def raise_lateral(prop="dbv"):
    return anim([P(ra=(10, 10), la=(10, 10)), P(ra=(90, 90), la=(90, 90))], held(prop), view="front")


def upright_row(prop="bb"):
    return anim([P(ra=(0, 0), la=(0, 0)), P(ra=(115, -60), la=(115, -60))], held(prop))


def shrug(prop="db"):
    return anim([P(ra=(0, 0), la=(0, 0)), P(ra=(0, 0), la=(0, 0), shrug=7)], held(prop), view="front")


def halo(prop="kb"):
    keys = [P(ra=(175, -150), la=(175, -150)), P(ra=(160, 150), la=(160, 150)), P(ra=(190, 210), la=(190, 210))]
    return anim(keys, held(prop, ("r_ha",)), frames=7)


def overhead_extension(prop="db", seated=False):
    a = P(ra=(180, 180), la=(180, 180))
    b = P(ra=(180, -30), la=(180, -30))
    return anim([a, b], held(prop, ("r_ha",)) if prop in ("db", "kb") else held(prop))


def kickback_triceps(prop="db"):
    a = P(torso=70, rl=(15, -5), ll=(15, -5), ra=(-70, 0), la=(0, 0))
    b = P(torso=70, rl=(15, -5), ll=(15, -5), ra=(-70, -70), la=(0, 0))
    return anim([a, b], held(prop, ("r_ha",)))


def pushdown(prop="cable_high"):
    a = P(torso=10, ra=(-5, 110), la=(-5, 110))
    b = P(torso=10, ra=(-5, 5), la=(-5, 5))
    return anim([a, b], held(prop))


def skull_crusher(prop="db", surface="bench"):
    base = LYING_BENCH if surface == "bench" else FLOOR_LYING
    props = [BENCH_UNDER_LYING] if surface == "bench" else []
    a = dict(base, ra=(180, 180), la=(180, 180))
    b = dict(base, ra=(180, -105), la=(180, -105))
    return anim([a, b], props + held(prop))


# ---------------------------------------------------------------- pecho y espalda


def lying_press(prop="db", surface="bench", close=False):
    if surface == "ball":
        base, props = BALL_LYING, [BALL_UNDER_BACK]
    elif surface == "floor":
        base, props = FLOOR_LYING, []
    else:
        base, props = LYING_BENCH, [BENCH_UNDER_LYING]
    low = (20, 175) if surface != "floor" else (45, 175)
    a = dict(base, ra=(180, 180), la=(180, 180))
    b = dict(base, ra=low, la=low)
    return anim([a, b], props + held(prop))


def fly(prop="db", surface="bench"):
    base = BALL_LYING if surface == "ball" else LYING_BENCH
    props = [BALL_UNDER_BACK] if surface == "ball" else [BENCH_UNDER_LYING]
    return anim([dict(base, ra=(180, 175), la=(180, 175)), dict(base, ra=(70, 85), la=(70, 85))], props + held(prop))


def pullover(prop="db", surface="bench"):
    base = BALL_LYING if surface == "ball" else LYING_BENCH
    props = [BALL_UNDER_BACK] if surface == "ball" else [BENCH_UNDER_LYING]
    return anim([dict(base, ra=(180, 180), la=(180, 180)), dict(base, ra=(-100, -100), la=(-100, -100))], props + held(prop))


def chest_press_standing(prop="cable_behind"):
    a = P(ra=(-70, 90), la=(-70, 90), rl=(10, 0), ll=(-10, 0))
    b = P(ra=(90, 90), la=(90, 90), rl=(10, 0), ll=(-10, 0))
    return anim([a, b], held(prop))


def crossover(prop="cable"):
    a = P(ra=(130, 130), la=(130, 130))
    b = P(ra=(-15, -25), la=(-15, -25))
    props = [("cable", 14, 40, ("l_ha",)), ("cable", 226, 40, ("r_ha",))] if prop == "cable" else held(prop)
    return anim([a, b], props, view="front")


def pull_apart(prop="band"):
    a = P(ra=(25, 25), la=(25, 25))
    b = P(ra=(90, 90), la=(90, 90))
    return anim([a, b], [("band", "l_ha", ("r_ha",))] if prop == "band" else held(prop), view="front")


def row(prop="bb", torso=60, single=False, bench=False):
    hands = ("r_ha",) if single else BOTH
    a = P(torso=torso, rl=(15, -8), ll=(15, -8), ra=(0, 0), la=(5, 5) if single else (0, 0))
    b = P(torso=torso, rl=(15, -8), ll=(15, -8), ra=(-70, 10), la=(5, 5) if single else (-70, 10))
    props = [("bench", 145, 215, 180)] if bench else []
    if prop == "band":
        props.append(("band", "r_ft", hands))
    elif prop == "cable":
        props.append(("cable", 210, GROUND_Y - 18, hands))
    else:
        props += held(prop, hands)
    return anim([a, b], props)


def seated_row(prop="cable"):
    base = dict(hip=(95, 188), torso=0, rl=(82, 88), ll=(82, 88))
    a = dict(base, torso=15, ra=(90, 90), la=(90, 90))
    b = dict(base, torso=-10, ra=(-60, 70), la=(-60, 70))
    if prop == "band":
        props = [("band", "r_ft", BOTH)]
    else:
        props = [("cable", 215, 175, BOTH)]
    return anim([a, b], props)


def pulldown(prop="cable"):
    base = dict(hip=(105, 165), torso=-5, rl=(90, 0), ll=(90, 0))
    a = dict(base, ra=(175, 180), la=(175, 180))
    b = dict(base, ra=(-30, 160), la=(-30, 160))
    props = [("bench", 70, 145, 172)]
    props += [("cable", 125, 30, BOTH)] if prop == "cable" else [("band", (125, 25), BOTH)]
    return anim([a, b], props)


def straight_arm_pulldown(prop="cable"):
    a = P(torso=25, ra=(150, 150), la=(150, 150))
    b = P(torso=25, ra=(15, 15), la=(15, 15))
    return anim([a, b], held("cable_high" if prop == "cable" else "band_high"))


def face_pull(prop="cable"):
    a = P(ra=(90, 90), la=(90, 90))
    b = P(ra=(100, -150), la=(100, -150))
    return anim([a, b], held("cable_mid" if prop == "cable" else "band_front"))


def pallof(prop="cable"):
    a = P(ra=(-60, 90), la=(-60, 90), rl=(12, 0), ll=(-12, 0))
    b = P(ra=(90, 90), la=(90, 90), rl=(12, 0), ll=(-12, 0))
    return anim([a, b], held("cable_mid" if prop == "cable" else "band_front"), frames=10, ms=100)


def woodchop(prop="cable"):
    a = P(torso=0, ra=(150, 150), la=(150, 150), rl=(10, 0), ll=(-10, 0))
    b = P(torso=35, ra=(25, 25), la=(25, 25), rl=(25, -15), ll=(5, -5))
    props = held("cable_high") if prop == "cable" else held(prop)
    return anim([a, b], props)


# ---------------------------------------------------------------- peso corporal en suelo / barra


def push_up(variant="floor"):
    if variant == "incline":
        a = dict(hands=(162, 165), torso=43, ra=(-5, -5), la=(-5, -5), rl=(-43, -43), ll=(-43, -43))
        b = dict(hands=(162, 165), torso=54, ra=(-60, 30), la=(-60, 30), rl=(-54, -54), ll=(-54, -54))
        return anim([a, b], [("bench", 150, 215, 165)])
    if variant == "decline":
        a = dict(hands=(170, GROUND_Y), torso=88, ra=(-5, -5), la=(-5, -5), rl=(-95, -95), ll=(-95, -95))
        b = dict(hands=(170, GROUND_Y), torso=95, ra=(-60, 30), la=(-60, 30), rl=(-100, -100), ll=(-100, -100))
        return anim([a, b], [("bench", 25, 75, 160)])
    if variant == "knee":
        a = dict(hands=(160, GROUND_Y), torso=62, ra=(-5, -5), la=(-5, -5), rl=(-62, -150), ll=(-62, -150))
        b = dict(hands=(160, GROUND_Y), torso=72, ra=(-60, 30), la=(-60, 30), rl=(-72, -150), ll=(-72, -150))
        return anim([a, b])
    if variant == "ball_hands":
        a = dict(hands=(165, 160), torso=50, ra=(-5, -5), la=(-5, -5), rl=(-50, -50), ll=(-50, -50))
        b = dict(hands=(165, 160), torso=58, ra=(-60, 30), la=(-60, 30), rl=(-58, -58), ll=(-58, -58))
        return anim([a, b], [("ball", (165, 160), (0, 22), 22)])
    if variant == "ball_feet":
        a = dict(hands=(175, GROUND_Y), torso=85, ra=(-5, -5), la=(-5, -5), rl=(-95, -95), ll=(-95, -95))
        b = dict(hands=(175, GROUND_Y), torso=93, ra=(-60, 30), la=(-60, 30), rl=(-100, -100), ll=(-100, -100))
        return anim([a, b], [("ball", "r_ft", (-4, 20), 20)])
    if variant == "medball":
        return anim([PLANK_UP, PLANK_DOWN], [("medball", ("r_ha",))])
    return anim([PLANK_UP, PLANK_DOWN])


def dip(feet_elevated=False):
    legs_a, legs_b = ((85, 45), (75, 80)) if not feet_elevated else ((90, 90), (80, 95))
    a = dict(hands=(95, 160), torso=5, ra=(-15, -5), la=(-15, -5), rl=legs_a, ll=legs_a)
    b = dict(hands=(95, 160), torso=5, ra=(-75, 15), la=(-75, 15), rl=legs_b, ll=legs_b)
    props = [("bench", 35, 100, 160)]
    if feet_elevated:
        props.append(("bench", 175, 225, 165))
    return anim([a, b], props)


BAR = ("bar", 40, 60, 196)


def pull_up(style="pull"):
    if style == "hang":
        return anim([HANG, dict(HANG, rl=(10, -14), ll=(-2, -20))], [BAR], frames=10, ms=120)
    if style == "hold":
        return anim([CHIN_TOP, dict(CHIN_TOP, rl=(24, -28))], [BAR], frames=10, ms=120)
    if style == "scap":
        return anim([HANG, dict(HANG, shrug=-6)], [BAR])
    if style == "negative":
        return anim([CHIN_TOP, HANG], [BAR], frames=12, ms=110)
    if style == "l_sit":
        return anim([dict(HANG, rl=(90, 90), ll=(90, 90)), dict(HANG, rl=(92, 92), ll=(92, 92))], [BAR], frames=10, ms=120)
    if style == "knee_pull":
        return anim([HANG, dict(CHIN_TOP, rl=(95, 0), ll=(95, 0))], [BAR], frames=9)
    return anim([HANG, CHIN_TOP], [BAR], frames=9)


def hanging_raise(style="knees"):
    up = {"knees": ((95, 0), (95, 0)), "legs": ((90, 90), (90, 90)), "toes": ((150, 150), (150, 150)), "oblique": ((100, 20), (80, -10))}[style]
    return anim([dict(HANG, rl=(0, 0), ll=(0, 0)), dict(HANG, rl=up[0], ll=up[1])], [BAR])


def crunch(variant="crunch", prop=None):
    base = dict(hip=(125, 197), rl=(140, 20), ll=(140, 20))
    if variant == "situp":
        a = dict(base, torso=-90, ra=(100, 100), la=(100, 100))
        b = dict(base, torso=-15, ra=(80, 80), la=(80, 80))
    elif variant == "vup":
        a = dict(hip=(125, 197), torso=-90, ra=(-90, -90), la=(-90, -90), rl=(90, 90), ll=(90, 90))
        b = dict(hip=(125, 197), torso=-40, ra=(130, 130), la=(130, 130), rl=(140, 140), ll=(140, 140))
    elif variant == "leg_raise":
        a = dict(hip=(125, 197), torso=-90, ra=(90, 90), la=(90, 90), rl=(90, 90), ll=(90, 90))
        b = dict(a, rl=(175, 175), ll=(175, 175))
    elif variant == "reverse":
        a = dict(hip=(125, 197), torso=-90, ra=(90, 90), la=(90, 90), rl=(160, 90), ll=(160, 90))
        b = dict(hip=(125, 190), torso=-100, ra=(90, 90), la=(90, 90), rl=(-150, 150), ll=(-150, 150))
    elif variant == "toe_touch":
        a = dict(hip=(125, 197), torso=-90, ra=(180, 180), la=(180, 180), rl=(178, 178), ll=(178, 178))
        b = dict(a, torso=-60, ra=(150, 150), la=(150, 150))
    elif variant == "russian":
        a = dict(hip=(120, 196), torso=-35, ra=(60, 120), la=(60, 120), rl=(110, 70), ll=(110, 70))
        b = dict(a, ra=(120, 60), la=(120, 60))
    elif variant == "dead_bug":
        a = dict(hip=(125, 197), torso=-90, ra=(180, 180), la=(180, 180), rl=(180, 90), ll=(180, 90))
        b = dict(a, ra=(-110, -110), rl=(100, 100))
    elif variant == "bicycle":
        a = dict(hip=(125, 197), torso=-70, ra=(150, -150), la=(150, -150), rl=(150, 90), ll=(100, 100))
        b = dict(a, rl=(100, 100), ll=(150, 90))
    elif variant == "sit_up_throw":
        a = dict(base, torso=-90, ra=(-80, -80), la=(-80, -80))
        b = dict(base, torso=-20, ra=(110, 110), la=(110, 110))
    else:
        a = dict(base, torso=-90, ra=(100, 100), la=(100, 100))
        b = dict(base, torso=-65, ra=(110, 110), la=(110, 110))
    return anim([a, b], held(prop) if prop else [])


def kneeling_crunch(prop="cable_high"):
    base = dict(hip=(105, 166), rl=(0, -90), ll=(0, -90), ra=(160, -120), la=(160, -120))
    return anim([dict(base, torso=0), dict(base, torso=70)], held(prop))


def ball_crunch():
    base = dict(hip=(130, 165), rl=(80, 0), ll=(80, 0))
    a = dict(base, torso=-105, ra=(-60, -60), la=(-60, -60))
    b = dict(base, torso=-60, ra=(-30, -30), la=(-30, -30))
    return anim([a, b], [("ball", (110, 178), (0, 0), 26)])


def plank(variant="forearm"):
    if variant == "high":
        return anim([PLANK_UP, dict(PLANK_UP, torso=66)], frames=10, ms=120)
    if variant == "ball":
        a = dict(hands=(170, 168), torso=68, ra=(0, 90), la=(0, 90), rl=(-68, -68), ll=(-68, -68))
        return anim([a, dict(a, torso=70)], [("ball", (178, 175), (0, 4), 26)], frames=10, ms=120)
    if variant == "decline":
        a = dict(hands=(180, GROUND_Y), torso=88, ra=(0, 90), la=(0, 90), rl=(-96, -96), ll=(-96, -96))
        return anim([a, dict(a, torso=89)], [("bench", 25, 75, 168)], frames=10, ms=120)
    if variant == "shoulder_taps":
        return anim([PLANK_UP, dict(PLANK_UP, ra=(-5, -5), la=(120, -60))], frames=7)
    a = dict(hands=(188, GROUND_Y), torso=77, ra=(0, 90), la=(0, 90), rl=(-77, -77), ll=(-77, -77))
    return anim([a, dict(a, torso=79)], frames=10, ms=120)


def mountain_climber(surface="floor"):
    if surface == "bench":
        base = dict(hands=(162, 165), torso=45, ra=(-5, -5), la=(-5, -5))
        a = dict(base, rl=(60, -30), ll=(-45, -45))
        b = dict(base, rl=(-45, -45), ll=(60, -30))
        return anim([a, b], [("bench", 150, 215, 165)], frames=5, ms=70)
    if surface == "ball":
        base = dict(hands=(165, 160), torso=50, ra=(-5, -5), la=(-5, -5))
        a = dict(base, rl=(60, -30), ll=(-50, -50))
        b = dict(base, rl=(-50, -50), ll=(60, -30))
        return anim([a, b], [("ball", (165, 160), (0, 22), 22)], frames=5, ms=70)
    return anim([dict(PLANK_UP, rl=(40, -40), ll=(-65, -65)), dict(PLANK_UP, rl=(-65, -65), ll=(40, -40))], frames=5, ms=70)


def ball_core(variant, bench=False):
    """Ejercicios de core con fitball."""
    if variant == "rollout":
        a = dict(hip=(95, 160), torso=40, ra=(80, 80), la=(80, 80), rl=(0, -90), ll=(0, -90))
        b = dict(hip=(110, 168), torso=70, ra=(100, 100), la=(100, 100), rl=(-20, -90), ll=(-20, -90))
        return anim([a, b], [("ball", "r_ha", (6, 20), 20)])
    if variant == "pike":
        a = dict(hands=(180, GROUND_Y), torso=85, ra=(-5, -5), la=(-5, -5), rl=(-95, -95), ll=(-95, -95))
        b = dict(hands=(180, GROUND_Y), torso=150, ra=(30, 30), la=(30, 30), rl=(-60, -60), ll=(-60, -60))
        return anim([a, b], [("bench", 18, 78, 172)] if bench else [("ball", "r_ft", (-4, 20), 20)])
    if variant == "knee_tuck":
        a = dict(hands=(180, GROUND_Y), torso=85, ra=(-5, -5), la=(-5, -5), rl=(-95, -95), ll=(-95, -95))
        b = dict(hands=(180, GROUND_Y), torso=75, ra=(-5, -5), la=(-5, -5), rl=(30, -100), ll=(30, -100))
        return anim([a, b], [("ball", "r_ft", (-4, 20), 20)])
    if variant == "back_extension":
        a = dict(hip=(110, 150), torso=110, ra=(10, 10), la=(10, 10), rl=(-75, -75), ll=(-75, -75))
        b = dict(a, torso=80, ra=(130, 130), la=(130, 130))
        return anim([a, b], [("ball", "hip", (6, 26), 26)])
    if variant == "reverse_hyper":
        a = dict(hip=(110, 150), torso=110, ra=(15, 15), la=(15, 15), rl=(-30, -30), ll=(-30, -30))
        b = dict(a, rl=(-95, -95), ll=(-95, -95))
        return anim([a, b], [("bench", 80, 160, 162)] if bench else [("ball", "hip", (6, 26), 26)])
    if variant == "seated":
        a = dict(hip=(120, 150), torso=0, ra=(90, 90), la=(90, 90), rl=(90, 0), ll=(90, 0))
        b = dict(a, ra=(100, 100), la=(100, 100), rl=(95, 0), ll=(150, 70))
        return anim([a, b], [("ball", "hip", (0, 26), 26)], frames=10, ms=110)
    if variant == "side_crunch":
        a = dict(hip=(120, 150), torso=-80, ra=(180, -150), la=(180, -150), rl=(100, 30), ll=(90, 20))
        b = dict(a, torso=-50)
        return anim([a, b], [("ball", "hip", (-4, 26), 24)])
    if variant == "pass":
        a = dict(hip=(125, 197), torso=-90, ra=(-90, -90), la=(-90, -90), rl=(90, 90), ll=(90, 90))
        b = dict(hip=(125, 197), torso=-40, ra=(130, 130), la=(130, 130), rl=(140, 140), ll=(140, 140))
        return anim([a, b], [("medball", ("r_ha", "l_ha"))])
    raise ValueError(variant)


# ---------------------------------------------------------------- cardio


GAITS = {
    "walk": dict(thigh=30, shin=-15, arm=25, fore=10, lift=0, frames=8, ms=80, torso=3),
    "brisk": dict(thigh=40, shin=-20, arm=35, fore=40, lift=0, frames=7, ms=75, torso=5),
    "jog": dict(thigh=55, shin=-55, arm=40, fore=90, lift=4, frames=5, ms=70, torso=8),
    "run": dict(thigh=70, shin=-75, arm=50, fore=100, lift=7, frames=5, ms=60, torso=12),
    "sprint": dict(thigh=85, shin=-90, arm=60, fore=100, lift=9, frames=4, ms=55, torso=16),
    "march": dict(thigh=70, shin=0, arm=30, fore=50, lift=0, frames=8, ms=80, torso=0),
}


def walk(gait="walk", treadmill=False, backward=False, held_prop=None):
    g = GAITS[gait]
    a = P(
        footx=None,
        torso=g["torso"],
        rl=(g["thigh"], g["shin"]),
        ll=(-g["thigh"] * 0.5, -g["thigh"] * 0.6),
        ra=(-g["arm"], g["fore"] - g["arm"]),
        la=(g["arm"], g["fore"] + g["arm"] * 0.3),
        lift=g["lift"],
        hx=125 if treadmill else 120,
    )
    b = dict(a, rl=a["ll"], ll=a["rl"], ra=a["la"], la=a["ra"])
    keys = [a, P(**b)]
    if backward:
        keys = [dict(k, torso=-4) for k in reversed(keys)]
    props = [("treadmill",)] if treadmill else []
    if held_prop:
        props += held(held_prop)
    if treadmill:
        keys = [dict(k, lift=k.get("lift", 0) + 8) for k in keys]
    return anim(keys, props, frames=g["frames"], ms=g["ms"])


def side_shuffle(treadmill=False):
    a = P(torso=15, rl=(30, -10), ll=(30, -10), ra=(-25, 70), la=(-25, 70), footx=None, hx=110, lift=8 if treadmill else 0)
    b = P(torso=15, rl=(15, 0), ll=(45, -15), ra=(-25, 70), la=(-25, 70), footx=None, hx=130, lift=12 if treadmill else 4)
    return anim([a, b], [("treadmill",)] if treadmill else [], view="front", frames=6, ms=70)


def bike(style="seated", speed=1.0):
    if style == "standing":
        keys = [
            dict(hip=(125, 100), torso=45, ra=(80, 90), la=(80, 90), rl=(40, -5), ll=(5, 10)),
            dict(hip=(125, 100), torso=45, ra=(80, 90), la=(80, 90), rl=(5, 10), ll=(40, -5)),
        ]
    else:
        keys = [
            dict(hip=(110, 120), torso=30, ra=(70, 85), la=(70, 85), rl=(75, -25), ll=(25, 15)),
            dict(hip=(110, 120), torso=30, ra=(70, 85), la=(70, 85), rl=(25, 15), ll=(75, -25)),
        ]
    frames = max(3, round(6 / speed))
    return anim(keys, [("bike", (110, 124), (195, 84), (128, 168))], frames=frames, ms=70)


def elliptical(reverse=False, speed=1.0, no_hands=False):
    arm_a, arm_b = ((60, 80), (20, 60)) if not no_hands else ((-30, 80), (-30, 80))
    a = P(footx=None, hx=122, torso=5, rl=(30, -10), ll=(-15, -10), ra=arm_a, la=arm_b, lift=14)
    b = dict(a, rl=(-15, -10), ll=(30, -10), ra=arm_b, la=arm_a)
    keys = [a, P(**b)]
    if reverse:
        keys = list(reversed(keys))
    props = [("elliptical",)] if not no_hands else [("elliptical",)]
    return anim(keys, props, frames=max(4, round(8 / speed)), ms=75)


def rower(style="full", speed=1.0):
    catch = dict(hip=(95, 178), torso=25, ra=(85, 85), la=(85, 85), rl=(140, 25), ll=(140, 25))
    finish = dict(hip=(60, 178), torso=-20, ra=(-60, 80), la=(-60, 80), rl=(92, 92), ll=(92, 92))
    if style == "arms":
        catch = dict(finish, torso=-20, ra=(85, 85), la=(85, 85))
    elif style == "legs":
        finish = dict(finish, torso=25, ra=(85, 85), la=(85, 85))
    elif style == "legs_back":
        finish = dict(finish, ra=(85, 85), la=(85, 85))
    return anim([catch, finish], [("rower",)], frames=max(4, round(9 / speed)), ms=80)


def jump_rope(style="basic", rope=True):
    a = P(ra=(30, 60), la=(30, 60), footx=None, rl=(4, 4), ll=(4, 4))
    b = dict(a, lift=8)
    if style in ("alternate", "boxer", "single"):
        b = dict(a, lift=7, rl=(40, -20) if style != "boxer" else (15, 0))
    elif style == "high_knees":
        a = dict(a, rl=(85, 0), lift=5)
        b = dict(a, rl=(4, 4), ll=(85, 0), lift=5)
    elif style == "double":
        b = dict(a, lift=16, rl=(30, -30), ll=(30, -30))
    elif style == "criss_cross":
        b = dict(a, lift=8, ra=(-20, -40), la=(-20, -40))
    elif style in ("side", "skier"):
        a = dict(a, hx=108)
        b = dict(a, hx=132, lift=8)
    elif style == "jacks":
        b = dict(a, lift=8, rl=(22, 22), ll=(22, 22))
    elif style == "heel_toe":
        b = dict(a, lift=6, rl=(25, 25))
    elif style == "bell":
        b = dict(a, lift=8, rl=(15, 10), ll=(15, 10))
    elif style == "slow":
        b = dict(a, lift=5)
    return anim([a, P(**b)], [("rope",)] if rope else [], view="front", frames=5, ms=70)


def jumping_jacks():
    return anim(
        [P(ra=(15, 15), la=(15, 15), rl=(4, 4), ll=(4, 4)), P(ra=(160, 170), la=(160, 170), rl=(20, 20), ll=(20, 20), lift=8)],
        view="front",
        frames=6,
        ms=70,
    )


def burpee(prop=None):
    keys = [
        P(ra=(0, 0), la=(0, 0)),
        P(torso=50, rl=(85, -30), ll=(85, -30), ra=(20, 20), la=(20, 20)),
        PLANK_UP,
        P(torso=50, rl=(85, -30), ll=(85, -30), ra=(20, 20), la=(20, 20)),
        P(ra=(170, 175), la=(170, 175), lift=14),
    ]
    return anim(keys, held(prop) if prop else [], frames=6, ms=70)


# ---------------------------------------------------------------- pesa rusa y pelota medicinal


def kb_complex(variant):
    if variant == "clean":
        return anim([P(torso=60, rl=(25, -12), ll=(25, -12), ra=(-15, -15), la=(5, 5)), P(ra=(10, 165), la=(5, 5))], held("kb", ("r_ha",)), frames=7)
    if variant == "snatch":
        return anim([P(torso=60, rl=(25, -12), ll=(25, -12), ra=(-15, -15), la=(5, 5)), P(ra=(180, 180), la=(5, 5))], held("kb", ("r_ha",)), frames=7)
    if variant == "high_pull":
        return anim([P(torso=55, rl=(25, -12), ll=(25, -12), ra=(-10, -10), la=(-10, -10)), P(ra=(115, -60), la=(115, -60))], held("kb", BOTH), frames=7)
    if variant == "windmill":
        return anim([P(ra=(180, 180), la=(0, 0)), P(torso=70, ra=(-110, -110), la=(10, 10), rl=(5, 0), ll=(15, -5))], held("kb", ("r_ha",)))
    if variant == "figure_eight":
        a = P(torso=55, rl=(25, -12), ll=(25, -12), ra=(-20, -20), la=(10, 10))
        b = dict(a, ra=(20, 20), la=(-20, -20))
        return anim([a, P(**b)], held("kb", ("r_ha",)))
    if variant == "farmer":
        return walk("walk", held_prop="kb")
    if variant == "get_up":
        keys = [
            dict(hip=(120, 197), torso=-90, ra=(180, 180), la=(110, 110), rl=(140, 20), ll=(90, 90)),
            dict(hip=(120, 197), torso=-45, ra=(180, 180), la=(-60, -10), rl=(140, 20), ll=(90, 90)),
            P(torso=10, ra=(180, 180), la=(10, 10), rl=(80, 0), ll=(-10, -100), footx=150),
            P(ra=(180, 180), la=(5, 5)),
        ]
        return anim(keys, held("kb", ("r_ha",)), frames=8, ms=90)
    raise ValueError(variant)


def mb_move(variant):
    if variant == "slam":
        return anim([P(ra=(175, 180), la=(175, 180)), P(torso=50, rl=(40, -20), ll=(40, -20), ra=(30, 30), la=(30, 30))], held("mb"), frames=6, ms=70)
    if variant == "chest_pass":
        return anim([P(ra=(-60, 90), la=(-60, 90)), P(ra=(90, 90), la=(90, 90), rl=(15, 0), ll=(-10, 0))], held("mb"), frames=6, ms=70)
    if variant == "overhead_throw":
        return anim([P(torso=-10, ra=(200, 220), la=(200, 220)), P(torso=10, ra=(130, 130), la=(130, 130))], held("mb"), frames=6, ms=70)
    if variant == "wall_ball":
        down = P(torso=40, rl=(80, -25), ll=(80, -25), ra=(15, 165), la=(15, 165))
        up = P(ra=(175, 178), la=(175, 178), lift=6)
        return anim([down, up], held("mb"), frames=7, ms=70)
    if variant == "side_throw":
        return anim([P(torso=10, ra=(-60, -60), la=(-40, -40)), P(torso=0, ra=(100, 100), la=(100, 100))], held("mb"), frames=6, ms=70)
    if variant == "toe_taps":
        a = P(footx=None, rl=(60, -20), ll=(0, 0), ra=(-20, -10), la=(20, 30), lift=2)
        b = dict(a, rl=(0, 0), ll=(60, -20), ra=(20, 30), la=(-20, -10))
        return anim([a, P(**b)], [("ball", (150, GROUND_Y), (0, -11), 11)], frames=5, ms=70)
    raise ValueError(variant)


def mobility():
    return anim([P(ra=(175, 178), la=(175, 178)), P(torso=100, ra=(8, 8), la=(8, 8))], frames=12, ms=90)
