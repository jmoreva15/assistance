# Asistencia

Aplicación Next.js para registrar tu asistencia en un Formulario de Google. Entras **solo con
tu DNI** y todos tus registros te siguen a cualquier dispositivo, porque viven en Supabase.

Un solo proyecto: no hay servidor aparte ni navegador automatizado. El código está en inglés
y **sin comentarios**; toda la explicación está en este documento.

```bash
npm install
cp .env.example .env.local     # y completa las claves de Supabase
npm run dev                    # http://localhost:3000
```

Para producción: `npm run build && npm start`.

## Puesta en marcha de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. En **Project Settings → API** copia la URL del proyecto y la clave `service_role`.
4. Ponlas en `.env.local`:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

El formulario **no se configura**: está fijo en [`lib/config/form.js`](lib/config/form.js) y es
el mismo para todos. Si algún día cambia, se edita ahí o se define `FORM_URL` en el entorno.

## Consulta del DNI

Cuando un DNI entra por primera vez, el nombre completo se trae de una API de RENIEC y se
guarda en la base. Después ya no se vuelve a consultar nunca.

**Todas las APIs públicas de RENIEC piden una clave gratuita** (las lo probé: `apis.net.pe`,
`decolecta`, `apisperu`, `migo`, `apiperu`; ninguna funciona sin token, y las que se anuncian
como libres devuelven una página web en vez de JSON). Así que hay que registrarse en una,
sacar la clave y ponerla en `.env.local`:

```
DNI_API_PROVIDER=decolecta
DNI_API_TOKEN=tu-clave
```

Proveedores soportados en [`lib/identity/dni-lookup.js`](lib/identity/dni-lookup.js):

| `DNI_API_PROVIDER` | Servicio | Dónde se saca la clave |
|---|---|---|
| `decolecta` | api.decolecta.com | decolecta.com |
| `apisnetpe` | api.apis.net.pe (v2) | apis.net.pe |
| `apisperu` | dniruc.apisperu.com | apisperu.com |
| `migo` | api.migo.pe | migo.pe |

Los cuatro se normalizan al mismo resultado: el nombre se arma como **nombres + apellido
paterno + apellido materno**, en ese orden, porque es como aparece en el formulario. Agregar
otro proveedor es añadir una entrada a ese mapa.

**Si la consulta falla**, la pantalla de inicio pide el nombre a mano y dice por qué: sin
clave configurada, clave rechazada, DNI no encontrado, límite de consultas o tiempo agotado.
Nunca se queda trabada.

Ten presente que consultar el DNI significa **enviarlo a ese servicio de terceros**.

Si esas variables faltan, la aplicación arranca igual guardando en un **archivo local**
(`.data/store.json`) para desarrollo: funciona todo y **sobrevive a reiniciar el servidor**. Ese
archivo está en `.gitignore`; si el disco es de solo lectura (por ejemplo en un despliegue), el
driver sigue en memoria sin romperse, pero ahí lo que corresponde es tener Supabase
configurado.

## Cómo funciona el envío

No hay navegador automatizado. El servidor hace dos cosas con el Formulario de Google:

1. **Lo lee.** Descarga la página pública y saca la lista de preguntas con su `entry.…`, su
   título y su tipo. Los identificadores no están escritos en el código: se leen en cada
   envío, así que si mañana agregas una pregunta al formulario, sigue funcionando. La
   dirección de envío también se lee del `action` del propio formulario, no se deduce.
2. **Lo envía.** Hace un `POST` a `…/formResponse` con los parámetros que Google espera, y
   **lee la respuesta real** para saber si quedó registrado.

La diferencia importante: las reglas de CORS solo aplican al navegador. Desde el servidor sí
se lee el status y el cuerpo, así que la confirmación es de Google, no una suposición:

| Respuesta | Significado |
|---|---|
| `200` con «se registró tu respuesta» | quedó guardado |
| `400` | Google lo rechazó (falta o no acepta algún campo obligatorio) |
| `404` | el formulario no existe o cambió de dirección |
| cualquier otra | no se confirma nada y el día queda sin enviar |

Las horas viajan en formato 24 h (`_hour=18`) y la fecha en `_year/_month/_day`.

## Arquitectura

Las responsabilidades están separadas para que cambiar una pieza no obligue a tocar el resto.
Si en el futuro hay que migrar de nuevo, lo que se reemplaza es una capa, no la aplicación.

```
app/
  layout.jsx              html, tema y proveedores
  providers.jsx           frontera cliente: MUI, emotion y los pickers
  page.jsx                pantalla principal con las cinco pestañas
  api/session/route.js    abrir o retomar sesión, y leer el espacio de trabajo
  api/profile/route.js    el nombre completo
  api/submissions/route.js enviar al formulario y registrar lo confirmado
  api/activity/route.js   leer y escribir la bitácora
  api/form/route.js       las preguntas del formulario, para la vista previa

lib/
  domain/                 reglas puras, sin dependencias
    time.js                 interpretar y formatear horas y fechas
    records.js              completitud, avisos y generación de lotes
    activity.js             nombres de acciones y descripción de cambios
  identity/               consulta del DNI contra las APIs de RENIEC
    dni-lookup.js           un proveedor por entrada, todos normalizados igual
  forms/                  todo lo que sabe de Formularios de Google
    read-form.js            leer la estructura del formulario
    field-mapping.js        emparejar nuestros campos con las preguntas por título
    submit-response.js      armar los parámetros, enviar e interpretar la respuesta
  data/                   persistencia detrás de un solo puerto
    repository.js           elige la implementación
    supabase-driver.js      implementación real
    local-file-driver.js    implementación de desarrollo, sobre .data/store.json
  api/                    servicios que usan las rutas (nunca la UI)
    session-service.js      sesión, perfil y carga del espacio de trabajo
    activity-service.js     bitácora
    form-service.js         describe el formulario y lo cachea
    submission-service.js  el envío completo, de principio a fin
  client/                 lo que corre en el navegador
    api-client.js           llamadas a /api
    session-storage.js      recuerda el id de sesión en este dispositivo
    draft-storage.js        los borradores de «Mi jornada» y «Varios días»
    use-attendance.js       estado y acciones para la UI
  theme/                  tema de Material UI
    tokens.js               colores y medidas
    theme.js                el tema, con esquemas claro y oscuro
components/               piezas reutilizables (reloj, tarjetas, diálogos, campos)
features/                 una carpeta por pantalla
supabase/schema.sql       el esquema de la base de datos
```

Reglas que se respetan en todo el proyecto:

- `lib/domain` no importa nada. Se puede usar en el servidor y en el navegador.
- `lib/data` es la única capa que habla con la base. Tiene cuatro métodos y dos
  implementaciones; para cambiar de base de datos se escribe una tercera.
- La UI nunca llama a la base ni al formulario: pasa por `lib/client` y las rutas de `/api`.
- Las credenciales de Supabase **no llegan al navegador**: todo el acceso es del lado del
  servidor.

## La base de datos

Tres tablas. Los borradores no están acá: viven en el navegador.

### `users`

Una fila por persona. El DNI es el identificador de sesión.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | clave primaria |
| `dni` | text | único, exactamente 8 dígitos |
| `full_name` | text | se envía en cada registro |
| `created_at` / `updated_at` | timestamptz | |

### `submissions`

El historial. Solo se escribe cuando Google confirma.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | clave primaria |
| `user_id` | uuid | referencia a `users`, borra en cascada |
| `work_date` | date | **único por usuario**: imposible enviar dos veces el mismo día |
| `clock_in` / `clock_out` | time | |
| `note` | text | la observación que fue al formulario |
| `source` | text | de dónde salió: `today`, `single` o `bulk` |
| `submitted_at` | timestamptz | cuándo lo confirmó Google |

### `activity_log`

La bitácora: qué acción, con qué detalle y cuándo.

Las cuatro tablas tienen **RLS activado y sin política que permita nada** a las claves
públicas. El acceso es solo desde el servidor con la clave `service_role`, así que ni el
navegador ni un tercero pueden leer las tablas directamente.

## Las cinco pestañas

### 1. Mi jornada

El día de hoy, un reloj en tiempo real y dos tarjetas grandes que se marcan con un clic.

- **ENTRADA** guarda la hora exacta. Una vez marcada, la tarjeta deja de ser pulsable.
- **SALIDA** guarda la hora exacta. Si nunca marcaste la entrada y tocas salida, un modal
  pregunta a qué hora entraste (09:00 por defecto) y guarda las dos.
- Una barra muestra cuánto llevas y cuánto falta para las 8 h.
- Con las dos horas se muestra el intervalo registrado, el campo de observación y el botón de
  registrar. La pantalla informa, no decide.
- Abajo aparece **«Lo que se va a enviar»**: los seis campos con el nombre real de cada
  pregunta de tu formulario y el valor exacto que va a llegar, incluidos tu nombre y tu DNI. Los
  títulos no están escritos en el código: se leen del formulario (`GET /api/form`, con caché de
  5 minutos), así que si cambias una pregunta, la vista previa lo refleja. Si algún campo no se
  puede emparejar, avisa ahí mismo en vez de fallar al enviar.
- **Las horas se corrigen ahí mismo**: se toca la hora marcada y se edita en el sitio, sin
  abrir nada. Corregir no impide seguir marcando en vivo.
- **Si marcaste y nunca enviaste, al día siguiente se descarta** y la pantalla arranca en cero.
  Queda anotado en la bitácora. Lo de «Un día» y «Varios días» no se descarta.

### 2. Un día

Para un día suelto que se te olvidó marcar. Trae ayer y 09:00 a 18:00; se puede cambiar todo.
Avisa si cae en fin de semana, bloquea fechas futuras y días ya enviados.

**No se guarda nada: se envía y listo.** Un día suelto no necesita quedar a medias, así que
esta pestaña no tiene borrador ni almacén propio.

### 3. Varios días

Se elige solo un intervalo, del largo que sea, y **solo fechas anteriores a hoy**: el
calendario no permite hoy ni el futuro. Al generar se crean todos los días de lunes a viernes
con 09:00 a 18:00 y se reemplaza el lote anterior. Los días que ya están en el historial se
excluyen para no enviar dos veces lo mismo.

**Cada día se edita en la propia fila**: las horas son campos editables en el sitio y se
guardan al cambiarlas, sin abrir ventanas. La observación es lo único que abre un cuadro
pequeño, porque es texto largo. Funciona igual en tabla (escritorio) y en tarjetas (móvil).

Botones: **Seleccionar todos**, **Borrar** (descarta el lote) y **Enviar**.

### 4. Enviados

El historial: fecha, día, entrada, salida, jornada, observación y cuándo se envió. Con
buscador y el total de horas.

### 5. Configuración

Solo el nombre se puede cambiar. El DNI se muestra enmascarado y es fijo, porque es tu
identificador de sesión; el formulario también, porque es el mismo para todos. Debajo, un
botón para **cerrar sesión** en este dispositivo: no borra ningún registro.

## Qué se rechaza y qué solo se avisa

Lo único que se rechaza es una hora que no se pueda interpretar (`abc`, `25:00`). Formatos
válidos: `09:20`, `9:20`, `9:20 AM`, `6:25 PM`, `18:25`.

Todo lo demás se acepta y, si parece un descuido, solo se avisa: entrada y salida iguales,
salida anterior a la entrada, jornadas de más de 14 h o de menos de 1 h. Antes de enviar, el
modal muestra exactamente lo que va a salir.

Lo que sí se impide, para no ensuciar el formulario: enviar un día futuro, uno incompleto o
uno que ya está en el historial.

Los únicos cuadros que se abren en toda la aplicación son tres: la confirmación antes de
registrar, la pregunta por la hora de entrada cuando marcaste solo la salida, y la observación
de un día del lote. Todo lo demás se edita en el sitio.

Los tres se manejan con el teclado: el botón principal viene enfocado, **Enter** confirma
(`Ctrl+Enter` en la observación, que es un campo de varias líneas) y **Escape** cierra. El de
observación además detecta si no cambiaste nada —el botón queda deshabilitado— y ofrece
«Quitar observación» cuando borras el texto de una que ya existía.

## Móvil

Las tablas se convierten en tarjetas por debajo de 900 px, los diálogos se abren a pantalla
completa por debajo de 600 px, y el reloj sigue siendo el elemento dominante.

El tema define los dos esquemas de color en un solo objeto y usa variables CSS, así que el
modo claro u oscuro sale del sistema operativo sin JavaScript y sin parpadeo al cargar.

## Desplegar

Es una aplicación Next normal: sirve Vercel, Netlify, Railway, Render o un contenedor.
No necesita navegador ni binarios: el envío son dos peticiones HTTP.

Variables de entorno en producción: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`DNI_API_PROVIDER` y `DNI_API_TOKEN`.

## Iniciar sesión

La pantalla de inicio pide **solo el DNI**.

- Si el DNI **ya está en la base**, se abre esa cuenta y llegan todos sus registros,
  borradores y bitácora. No se consulta nada externo.
- Si **no está**, se consulta la API de RENIEC, se guarda el nombre que devuelve y se entra.
- Si esa consulta no se puede hacer, ahí sí aparece el campo del nombre, con el motivo.

El nombre se puede corregir después en Configuración. El navegador solo recuerda el id de la
sesión (`asistencia:user` en `localStorage`); todos los datos están en la base.

### Cuánto dura la sesión

**No caduca.** Se guarda en `localStorage` como `{ userId, savedAt }` y sigue ahí después de
cerrar el navegador, apagar la computadora o pasar días. Solo termina de tres formas:

1. Le das a **Cerrar sesión** en Configuración.
2. Borras los datos del sitio en el navegador.
3. La cuenta ya no existe en la base.

Ese tercer caso es el único en que la aplicación te saca sola: la petición responde `401` con
el código `SESSION_GONE`, se limpia la sesión local y vuelve la pantalla del DNI con
*«tu sesión se cerró: entra otra vez con tu DNI»*. Pasa si se vacía la base o si cambiaste de
proyecto de Supabase.

**Cualquier otro fallo no toca la sesión y se resuelve solo.** Si el servidor no responde,
devuelve un `500` o se corta la conexión, la aplicación **reintenta sola** a los 0,4 s, 1,2 s,
3 s y después cada 6 s, mostrando el esqueleto de carga mientras tanto. No hay pantalla de
error ni botón que apretar: cuando el servidor vuelve, entra sin pedirte nada. Antes cualquier
error al retomar la sesión la borraba y te mandaba al login.

## Sobre la seguridad

**El DNI es la única credencial.** Cualquiera que conozca un DNI registrado entra a esa cuenta
y ve sus registros. Es una decisión tomada a propósito para un uso entre dos personas, no un
descuido, pero conviene tenerla presente:

- No dejes la aplicación en una URL pública y adivinable.
- La clave `service_role` da acceso total a la base: va solo en el servidor, nunca en el
  navegador, y no se sube al repositorio.
- Cuando haga falta abrirlo a más gente, el cambio natural es usar Supabase Auth y reemplazar
  `lib/api/session-service.js`, sin tocar el resto.
