# Contrato del backend (BFF)

El frontend implementa el `openapi.yaml` del Integrante de equipo (API BFF - Proyecto SII ITC), más las rutas de asesorías
que el equipo agregó. Todas las rutas empiezan con `/api/local`.

En producción el navegador llama a `/api/...` en el mismo dominio del frontend y Vercel reenvía esas peticiones al
backend en Render (ver la sección *Rewrite de Vercel*), así que `VITE_BACKEND_URL` va vacío.

## Formato de errores

Cuando algo falla, el backend responde con un código HTTP y un cuerpo `{ "error": "mensaje" }` (también se acepta
`message`). **El frontend muestra ese mensaje al usuario** (por ejemplo, en el login o al inscribirse).

## Autenticación por cookie

El backend guarda el JWT en una **cookie httpOnly** llamada `sii_token` (la lee `src/middlewares/verifyToken.js` con
`req.cookies.sii_token`). El frontend **no guarda el token**: envía todas sus peticiones con `credentials: 'include'` y el
navegador manda la cookie solo. Solo conserva una marca local "hay sesión" para decidir si muestra el login; si el
servidor responde 401, cierra la sesión.

Requisitos en el backend:

- `app.use(cookieParser())` antes de las rutas.
- Cookie del login con `httpOnly: true` y **sin `domain`**. Con `secure: true` y `sameSite: 'none'` funciona también
  en cualquier dominio; con el rewrite de Vercel bastaría `lax`.
- **`POST /api/local/logout`** que borre la cookie con
  `res.clearCookie('sii_token', { /* mismas opciones que al crearla */ })`, sin `verifyToken` para que funcione aunque la
  sesión ya haya vencido. Una cookie httpOnly no se puede borrar desde JavaScript; sin este endpoint el cierre de sesión
  no invalida la cookie.

> Aunque el login no necesita devolver `{ token }`, si lo devuelve el frontend lo ignora salvo para enviarlo también como
> `Authorization: Bearer`.

## Endpoints

| Método | Ruta | Respuesta que usa el frontend |
|---|---|---|
| POST | `/api/local/login` | Body `{ email, password }` → 200 + cookie `sii_token` · 400 campos vacíos · **401 credenciales inválidas** · 502/503 si el SII no responde |
| POST | `/api/local/logout` | 200 y borra la cookie |
| GET | `/api/local/estudiante` | `{ numero_control, persona, email, semestre, promedio_ponderado, porcentaje_avance, foto }` (`foto` en base64) |
| GET | `/api/local/calificaciones` | `[ { materia: { id_grupo, nombre_materia, clave_materia }, calificaiones: [ { numero_calificacion, calificacion } ] } ]` |
| GET | `/api/local/kardex` | `{ porcentaje_avance, kardex: [ { nombre_materia, clave_materia, periodo, creditos, calificacion, semestre } ] }` |
| GET | `/api/local/horarios` | `[ { nombre_materia, clave_materia, lunes, lunes_clave_salon, martes, martes_clave_salon, … } ]` |
| GET | `/api/local/asesorias` | Solo asesorías con `fecha_hora` futura: `[ { id, numero_control_tutor, nombre_tutor, materia_asesoria, descripcion_tema, ubicacion, fecha_hora, cupo_maximo, inscritos, cupo_disponible } ]` |
| POST | `/api/local/asesorias` | Body `{ numero_control_tutor, nombre_tutor, materia_asesoria, descripcion_tema, ubicacion, fecha_hora, cupo_maximo }` → 201 · 400 (faltan datos o fecha pasada) |
| POST | `/api/local/asesorias/inscripcion` | Body `{ asesoria_id, numero_control_alumno, nombre_alumno }` → 201 · 400 · 404 · 409 con `codigo` `YA_INSCRITO`, `CUPO_LLENO` o `ASESORIA_PASADA` |
| PUT | `/api/local/asesorias/:id` | Body `{ numero_control_tutor, materia_asesoria?, descripcion_tema?, ubicacion?, fecha_hora?, cupo_maximo? }` → 200 · 400 · 403 (no es el tutor) · 404 · 409 (ya ocurrió, o `CUPO_MENOR_A_INSCRITOS`) |
| DELETE | `/api/local/asesorias/:id?numero_control_tutor=…` | → 200 (borra también las inscripciones) · 400 · 403 (no es el tutor) · 404 |

## Cómo interpreta el frontend lo que el contrato no dice

- **Calificación final**: `/calificaciones` no la trae. Se calcula como el promedio redondeado de las unidades, y solo
  cuando todas están capturadas; mientras falte alguna, la materia aparece "En curso".
- **Semáforo**: verde ≥ 80, amarillo 70–79, rojo < 70 (`src/config.js`).
- **Horario**: `lunes: "07:00-09:00"` + `lunes_clave_salon: "LC-2"`. Si el formato de hora es otro, se ajusta
  `normalizeHorario` en `src/utils/normalize.js`.
- **Identidad**: `numero_control` y `persona` salen de `/estudiante` y se mandan en el cuerpo de las asesorías.
- **Asesorías pasadas**: el backend no las envía y, además, el frontend descarta cualquier asesoría cuya `fecha_hora` ya
  pasó (`loadAsesorias`), así que no aparecen en Explorar, Mis inscripciones, Mis publicaciones ni en el inicio.
- **Editar y eliminar**: solo en "Mis publicaciones". El frontend manda `numero_control_tutor` (de `/estudiante`) y el
  backend lo compara con el de la asesoría. Al editar no deja bajar el cupo por debajo de los inscritos.
- **Mis publicaciones**: se reconocen por `numero_control_tutor` (o, si no viniera, por coincidencia del `nombre_tutor`
  con `persona`).
- **Mis inscripciones**: no hay endpoint, así que se guardan en el navegador los ids a los que el usuario se inscribió con
  éxito. Solo reflejan inscripciones hechas desde este navegador.
- **Cupo**: el listado trae `inscritos` y `cupo_disponible`; si faltaran, se muestra solo el cupo máximo.
- **409 en inscripción**: solo `YA_INSCRITO` (o un mensaje "ya estás inscrito") marca la asesoría como inscrita en el
  navegador; `CUPO_LLENO` y `ASESORIA_PASADA` no.


## Seguridad (recomendación para el backend)

El contrato recibe `numero_control_*` y `nombre_*` en el body. Conviene que el backend **ignore esos valores y los derive
del token**, para que nadie pueda inscribir o publicar a nombre de otro estudiante. Además, las políticas RLS
`USING (true)` de lectura pública exponen las tablas directamente desde Supabase; conviene quitarlas si solo se accede
vía backend.

## CORS

Con cookies, CORS debe devolver `Access-Control-Allow-Credentials: true` y un origen explícito (no `*`):
`cors({ origin: process.env.FRONTEND_URL, credentials: true })`, con `FRONTEND_URL=https://sii-frontend.vercel.app` en las
variables de entorno de Render. Debe permitir los métodos `GET, POST, PUT, DELETE, OPTIONS` y los encabezados
`Content-Type` y `Authorization`.

Con el rewrite de Vercel el navegador nunca habla directo con Render, por lo que CORS no se activa en producción; sigue
siendo necesario para desarrollar en local (`http://localhost:5173` → `http://localhost:3000`).

## Rewrite de Vercel (frontend y backend en dominios distintos)

Si el navegador hablara directo con el backend (otro dominio), la cookie sería de terceros y algunos navegadores (Safari,
Chrome con bloqueo de cookies de terceros) la rechazarían aunque tenga `SameSite=None; Secure`. La solución es que el
navegador solo hable con el dominio del frontend y Vercel reenvíe `/api` al backend. En `vercel.json` del frontend,
**antes** de la regla del SPA:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://sii-backend-web-2026.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Y en Vercel se deja `VITE_BACKEND_URL` **vacío**, para que el frontend llame a `/api/...` en su mismo dominio. Así la
cookie es de primera parte.

> El backend está en el plan gratuito de Render: tras un rato sin uso, la primera petición puede tardar de 30 a 60
> segundos.
