"""Utilidades compartidas para generar migraciones SQL de catálogo (recetas, ejercicios)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "backend" / "prisma" / "migrations"

UNITS = {"g": "g", "ml": "ml", "u": "unit", "tbsp": "tbsp", "tsp": "tsp", "sl": "slice", "p": "pinch"}


def q(value):
    """Literal SQL (texto entre comillas simples, NULL, número o booleano)."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def parse_ingredients(spec):
    """'chicken_breast:150g, lemon:0.5u, salt:p' -> [(food, quantity, unit), ...]"""
    out = []
    for item in filter(None, (part.strip() for part in spec.split(","))):
        food, amount = item.split(":")
        for suffix in sorted(UNITS, key=len, reverse=True):
            if amount.endswith(suffix):
                number = amount[: -len(suffix)] or "1"
                out.append((food.strip(), float(number), UNITS[suffix]))
                break
        else:
            raise ValueError(f"Unidad desconocida en {item!r}")
    return out


def parse_ingredients_optional(spec):
    """Como parse_ingredients, pero un "?" al final marca el ingrediente como opcional (no clave):
    'cumin:p?' -> ('cumin', 1.0, 'pinch', True)."""
    out = []
    for item in filter(None, (part.strip() for part in spec.split(","))):
        optional = item.endswith("?")
        ((food, quantity, unit),) = parse_ingredients(item.rstrip("?"))
        out.append((food, quantity, unit, optional))
    return out


def write_migration(name, sql):
    path = MIGRATIONS / name / "migration.sql"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(sql, encoding="utf-8")
    return path
