export const MAX_PROFILES = 5;

export const SEX_VALUES = ["male", "female", "other"] as const;
export type SexValue = (typeof SEX_VALUES)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type ActivityLevelValue = (typeof ACTIVITY_LEVELS)[number];

export type ProfileInput = {
  weight: number;
  height: number;
  age: number;
  sex: SexValue;
  // Opcional por compatibilidad: si falta, al crear se usa "sedentary" y al editar no se cambia.
  activityLevel?: ActivityLevelValue;
};

type ParseResult =
  | { ok: true; data: ProfileInput }
  | { ok: false; errors: Record<string, string> };

export function parseProfileInput(body: unknown): ParseResult {
  const errors: Record<string, string> = {};

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: "El cuerpo debe ser un objeto JSON" } };
  }

  const { weight, height, age, sex, activityLevel } = body as Record<string, unknown>;

  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0 || weight > 500) {
    errors.weight = "weight debe ser un número entre 0 y 500 (kg)";
  }
  if (typeof height !== "number" || !Number.isFinite(height) || height <= 0 || height > 300) {
    errors.height = "height debe ser un número entre 0 y 300 (cm)";
  }
  if (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 120) {
    errors.age = "age debe ser un entero entre 0 y 120";
  }
  if (typeof sex !== "string" || !SEX_VALUES.includes(sex as SexValue)) {
    errors.sex = `sex debe ser uno de: ${SEX_VALUES.join(", ")}`;
  }
  if (
    activityLevel !== undefined &&
    (typeof activityLevel !== "string" || !ACTIVITY_LEVELS.includes(activityLevel as ActivityLevelValue))
  ) {
    errors.activityLevel = `activityLevel debe ser uno de: ${ACTIVITY_LEVELS.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      weight: weight as number,
      height: height as number,
      age: age as number,
      sex: sex as SexValue,
      activityLevel: activityLevel as ActivityLevelValue | undefined,
    },
  };
}
