"""Genera las animaciones de los ejercicios: stickman blanco sobre fondo azul.

Por cada ejercicio escribe en frontend/public/exercises/:
  <slug>.png  imagen fija (la pose de máximo esfuerzo), usada como miniatura
  <slug>.gif  animación en bucle, que se muestra al hacer clic

Uso (requiere Pillow: pip install pillow):
  python tools/exercise-animations/generate.py            # todos
  python tools/exercise-animations/generate.py slug ...   # solo algunos

Las animaciones del primer catálogo están definidas acá (EXERCISES); las del catálogo v2 se
arman con plantillas de movimiento (templates.py) desde catalog_v2.py. El motor (esqueleto,
accesorios, render) está en skeleton.py.
"""

import re
import sys

from PIL import Image

from skeleton import *  # noqa: F401,F403
from skeleton import GROUND_Y, MIGRATIONS, OUT_DIR, P, build_frames, render

CATALOG_SQLS = [
    MIGRATIONS / "20261117000200_exercise_catalog" / "migration.sql",
    MIGRATIONS / "20261118000200_exercise_catalog_v2" / "migration.sql",
]

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




def catalog_slugs():
    slugs = []
    for path in CATALOG_SQLS:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        block = text.split('INSERT INTO "exercises"')[1].split("ON CONFLICT")[0]
        slugs += re.findall(r"^\('([a-z0-9_]+)'", block, flags=re.M)
    return slugs


def all_animations():
    from catalog_v2 import animations

    merged = dict(EXERCISES)
    for slug, ex in animations().items():
        if slug in merged:
            raise SystemExit(f"Animación repetida: {slug}")
        merged[slug] = ex
    return merged


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    animations = all_animations()
    slugs = catalog_slugs()
    missing = [s for s in slugs if s not in animations]
    extra = [s for s in animations if s not in slugs]
    if missing or extra:
        raise SystemExit(f"Desfase con el catálogo. Sin animación: {missing}. Sin ejercicio: {extra}")

    only = set(sys.argv[1:])
    for slug in slugs:
        if only and slug not in only:
            continue
        ex = animations[slug]
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
    print(f"{len(only) or len(slugs)} ejercicios generados en {OUT_DIR}")


if __name__ == "__main__":
    main()
