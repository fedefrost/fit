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

Campos: `weight` (kg), `height` (cm), `age` (años), `sex` (`male` | `female` | `other`).

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

## Crear nuevas migraciones

```bash
docker compose exec backend npx prisma migrate dev --name <nombre>
```
