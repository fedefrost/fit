# fit

Monorepo con 3 servicios en Docker Compose:

| Servicio   | Tecnología          | Puerto |
|------------|---------------------|--------|
| `frontend` | React + Vite        | 5173   |
| `backend`  | Next.js (API) + Prisma | 3000 |
| `db`       | PostgreSQL 16       | 5432   |

## Uso

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/profiles

El backend aplica las migraciones de Prisma automáticamente al arrancar.

## API de profiles

Campos: `weight` (kg), `height` (cm), `age` (años), `sex` (`male` | `female` | `other`) y
`activityLevel` (`sedentary` | `light` | `moderate` | `active` | `very_active`; opcional: al crear
vale `sedentary` y al editar sin enviarlo no cambia) y `lifestyle` (`office` | `standing_work` |
`physical_work` | `remote_work` | `part_time` | `student` | `unemployed`; opcional, igual que
`activityLevel`, por defecto `office`).

| Método | Ruta                | Descripción        |
|--------|---------------------|--------------------|
| GET    | `/api/profiles`     | Listar             |
| POST   | `/api/profiles`     | Crear              |
| GET    | `/api/profiles/:id` | Obtener uno        |
| PUT    | `/api/profiles/:id` | Actualizar         |
| DELETE | `/api/profiles/:id` | Eliminar           |

Se permiten como máximo **5 profiles**. Si ya hay 5, `POST /api/profiles` responde `409` con
`{ "error": "..." }`. El control se hace dentro de una transacción con un candado de Postgres,
así que tampoco se supera con peticiones simultáneas.

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"weight": 72.5, "height": 178, "age": 30, "sex": "male"}'
```

`GET /api/profiles` incluye en cada perfil `foodCounts: { preferred, rejected }`.

## Alimentos

El catálogo de ingredientes (tabla `foods`, ~280 alimentos con nombre en español e inglés) se
carga con la migración `20261113000100_food_catalog` y la app solo lo lee: no hay endpoints para
editarlo. Para corregir o sumar alimentos, crear otra migración con el mismo formato
(`INSERT ... ON CONFLICT ("slug") DO UPDATE`); los ids no cambian y las preferencias se conservan.

| Método | Ruta                      | Descripción                                          |
|--------|---------------------------|------------------------------------------------------|
| GET    | `/api/foods`              | Catálogo completo                                    |
| GET    | `/api/profiles/:id/foods` | `{ preferred: Food[], rejected: Food[] }`            |
| PUT    | `/api/profiles/:id/foods` | Reemplaza ambas listas: `{ preferred: id[], rejected: id[] }` |

Cada perfil admite como máximo **200 alimentos preferidos y 200 rechazados**, y un alimento no
puede estar en las dos listas a la vez. Si no se cumple, el `PUT` responde `400` con `{ "errors": { ... } }`.
Al borrar un perfil se borran sus preferencias.

## Dieta semanal

Cada perfil tiene **una dieta por semana** (lunes a domingo). La app edita solo la de la semana en
curso; las anteriores se conservan para el historial, junto con los objetivos recomendados
(kcal, agua y gasto base) copiados al generarla y al consultarla.

**Recetas.** Catálogo de solo lectura (332 recetas en español e inglés) cargado con las migraciones
`20261116000100_recipe_catalog`, `20261117000000_more_recipes` y `20261118000100_recipes_by_protein`,
igual que los alimentos. Cada receta tiene ingredientes con cantidad por porción, kcal por porción,
el agua que aporta (`waterMl`) y en qué comidas sirve (`breakfast`, `lunch`, `dinner`, `snack`, `junk`).
La última migración se genera con `python tools/catalog/recipes_v3.py` (datos en
`tools/catalog/recipes_v3_*.py`): 20 recetas por proteína principal (pollo, carne vacuna, cerdo,
pescados y mariscos, huevos, legumbres/proteína vegetal), 40 colaciones y 50 snacks.

**Snacks y comida rápida** (`junk`): 50 productos típicos sudamericanos (empanadas, choripán,
alfajores, papas fritas, gaseosas, cerveza…) sin receta ni ingredientes, solo kcal y agua. Nunca
los propone el generador; se añaden a mano para registrar lo consumido.

**Rutina diaria** (`Profile.lifestyle`): `unemployed` y `remote_work` ×1,25, `office` ×1,3,
`student` y `part_time` ×1,35, `standing_work` ×1,45, `physical_work` ×1,65 sobre el gasto basal.
Ese es el gasto base del día (`baselineBurn`), al que se suma el ejercicio registrado; la barra
superior y la dieta muestran consumidas − gastadas.

**Objetivos diarios** (`backend/lib/nutrition.ts`): gasto basal con Mifflin-St Jeor × (factor de
rutina diaria + incremento por actividad física: 0 / 0,1 / 0,2 / 0,35 / 0,5); en adultos, −25 % con
obesidad, −15 % con sobrepeso y +10 % con bajo peso; mínimo 1200 kcal (1500 en hombres). Agua:
35 ml/kg + extra según actividad y trabajo de pie/físico (entre 1,5 y 4,5 L). Es una estimación
orientativa.

**Generador** (`backend/lib/diet.ts`): para desayuno (25 %), almuerzo (40 %) y cena (35 %) descarta
recetas con alimentos rechazados, prioriza las que tienen preferidos y las de calorías cercanas al
objetivo, evita repetir en la semana y ajusta las porciones (de a ¼, entre ½ y 2½).

| Método | Ruta                                     | Descripción                                                        |
|--------|------------------------------------------|--------------------------------------------------------------------|
| GET    | `/api/recipes`                           | Catálogo de recetas con ingredientes                               |
| GET    | `/api/profiles/:id/diet?week=YYYY-MM-DD` | `{ weekStart, targets, plan }`; `plan` es `null` si no hay dieta para esa semana |
| POST   | `/api/profiles/:id/diet/generate`        | `{ week, date? }`: genera la semana, o solo `date`; conserva las comidas añadidas |
| POST   | `/api/profiles/:id/diet/meals`           | `{ week, date, recipeId, servings }`: añade una comida consumida (colación, etc.) |
| PATCH  | `/api/profiles/:id/diet/meals/:mealId`   | `{ consumed?, recipeId?, servings? }`: tick de consumida o cambio de receta |
| DELETE | `/api/profiles/:id/diet/meals/:mealId`   | Quita una comida añadida (las del plan se cambian o se regeneran)  |

`servings` admite decimales entre 0,1 y 10 (se guarda con 2 decimales).
`week` es el lunes de la semana según la fecha local del cliente. Todas las rutas de dieta
devuelven la dieta completa actualizada.

## Rutina

**Equipamiento.** Catálogo de solo lectura (`equipment`, 15): mancuernas, barra con discos, banco,
bicicleta fija, barra de dominadas, pesa rusa, banda elástica, polea, cinta de correr, elíptica,
remo, prensa de piernas, soga, pelota de estabilidad y balón medicinal. Cada perfil indica qué
tiene en casa y en el gimnasio; un mismo equipo puede estar en los dos.

**Ejercicios.** Catálogo de solo lectura (320 ejercicios es/en, migraciones
`20261117000200_exercise_catalog` y `20261118000200_exercise_catalog_v2`): 20 por equipo
(contando el equipo principal) más 20 de peso corporal, repartidos entre piernas, bíceps, tríceps,
glúteos, pecho, espalda, abdomen, hombros y generales de cardio/movilidad. Algunos usan más de un
equipo (p. ej. press con mancuernas + banco), por eso el banco aparece en más de 20.
La migración v2 se genera con `python tools/exercise-animations/catalog_v2.py` (datos en
`catalog_v2_a..d.py`, animaciones con las plantillas de `templates.py`).
Cada uno tiene su tipo de medida (`time` minutos, `reps` series × reps, `reps_weight` + kg), su
MET, el equipamiento que requiere y si es de alto impacto.

Las animaciones (stickman blanco sobre fondo azul) están en `frontend/public/exercises/<slug>.png`
(miniatura) y `.gif` (animación). Se generan con `tools/exercise-animations/generate.py`
(requiere `pip install pillow`; `python generate.py <slug> ...` regenera solo esos); el script
falla si falta la animación de algún ejercicio del catálogo. El motor del esqueleto está en `skeleton.py`.

**Personalización** (`backend/lib/exercise.ts`):
- Nivel físico (principiante / intermedio / avanzado) según actividad, IMC y edad.
- Series, repeticiones, minutos y peso sugerido escalan con el nivel, el sexo y la edad.
- Con obesidad o 65+ años no se proponen ejercicios de alto impacto y los de tiempo se limitan
  a 20 min (30 min con 65+).
- Calorías: MET × gasto basal del perfil por minuto (Mifflin-St Jeor, usa edad, peso, altura y
  sexo), con un plus por la carga y 1 min de descanso por serie a 1,5 MET. Son estimaciones.

**Generador** (`backend/lib/workout.ts`): para 1 o 2 músculos elige 1 ejercicio general + 4 del
músculo (o 3 de cada uno), solo con el equipamiento del lugar del día, evitando repetir en la semana.
Los días de semanas anteriores se conservan para el historial.

| Método | Ruta                                              | Descripción                                                    |
|--------|---------------------------------------------------|----------------------------------------------------------------|
| GET    | `/api/equipment`                                  | Catálogo de equipamiento                                       |
| GET    | `/api/exercises`                                  | Catálogo de ejercicios (con `equipmentIds`)                    |
| GET    | `/api/profiles/:id/equipment`                     | `{ home: Equipment[], gym: Equipment[] }`                      |
| PUT    | `/api/profiles/:id/equipment`                     | `{ home: id[], gym: id[] }`                                    |
| GET    | `/api/profiles/:id/workout?week=YYYY-MM-DD`       | Semana: nivel, equipamiento, recomendaciones y días            |
| PUT    | `/api/profiles/:id/workout/days/:date`            | `{ week, location: "home" \| "gym" }`: dónde se entrena ese día |
| POST   | `/api/profiles/:id/workout/days/:date/generate`   | `{ week, muscles }` (1 a 2): genera la rutina del día          |
| POST   | `/api/profiles/:id/workout/days/:date/exercises`  | `{ week, exerciseId, minutes \| sets + reps (+ weightKg) }`: añade uno hecho |
| PATCH  | `/api/profiles/:id/workout/exercises/:entryId`    | `{ done?, exerciseId?, minutes?, sets?, reps?, weightKg? }`     |
| DELETE | `/api/profiles/:id/workout/exercises/:entryId`    | Quita un ejercicio del día                                     |

`GET /api/profiles` incluye en cada perfil `equipmentCounts: { home, gym }`.

## Historial

Calendario mensual (`/history`) con lo que recomendó la dieta, lo consumido y la hidratación de
cada día; al tocar un día se abre el detalle con las comidas consumidas y los ejercicios hechos.
Se puede cambiar de mes y año (hasta el mes actual).

`GET /api/profiles/:id/history?month=YYYY-MM` devuelve solo los días con dieta o entrenamiento:
`{ month, days: [{ date, targets, consumed: { calories, waterMl }, plannedCalories, meals, workout, baselineBurn }] }`.
`targets` es lo recomendado esa semana (para dietas anteriores a este cambio, sin copia, se usa el
perfil actual). Las calorías de los ejercicios se estiman con los datos actuales del perfil.

## Lista de compras

Reemplaza a la antigua sección "Sugerencia" del menú (`/shopping`). Como la dieta, solo existe la
de la semana en curso: al usar otra semana se vacía (se conserva la cantidad de personas).

**Ingredientes de la dieta** (`backend/lib/shopping.ts`): no se guardan, se calculan en cada
respuesta sumando los ingredientes de desayuno, almuerzo y cena del plan en los días elegidos
(todos por defecto) × porciones × personas. Las comidas agregadas a mano no cuentan (ya se
comieron). Se guarda solo qué ingredientes se marcaron como comprados (`shopping_checks`, por
clave `"<foodId>:<unidad>"`), así la lista sigue a la dieta si se cambia o regenera una comida.
El frontend redondea hacia arriba para comprar (g/ml de a 10, kg/L desde 1000, unidades enteras).

**Agregados a mano** (`shopping_items`): un alimento del catálogo o texto libre, con cantidad
opcional; hasta 100 por lista.

| Método | Ruta                                          | Descripción                                                    |
|--------|-----------------------------------------------|----------------------------------------------------------------|
| GET    | `/api/profiles/:id/shopping?week=YYYY-MM-DD`  | `{ weekStart, people, days, hasDiet, ingredients, items }`     |
| PUT    | `/api/profiles/:id/shopping`                  | `{ week, people? (1–20), days? (0 = lunes … 6; [] = toda la semana), uncheckAll? }` |
| PUT    | `/api/profiles/:id/shopping/checks`           | `{ week, key, checked }`: marca un ingrediente de la dieta     |
| POST   | `/api/profiles/:id/shopping/items`            | `{ week, foodId \| name, amount? }`: agrega un artículo         |
| PATCH  | `/api/profiles/:id/shopping/items/:itemId`    | `{ checked?, amount? }`                                        |
| DELETE | `/api/profiles/:id/shopping/items/:itemId`    | Quita un artículo agregado                                     |

Todas las rutas devuelven la lista completa actualizada.

## Crear nuevas migraciones

```bash
docker compose exec backend npx prisma migrate dev --name <nombre>
```
