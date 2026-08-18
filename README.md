# Control de Asistencia

Panel web para registrar tu asistencia en un Formulario de Google. Tus datos viven en el
navegador; el servidor solo se encarga de enviar el formulario y de dejar el registro.

```bash
npm install
npx playwright install chromium   # solo la primera vez
npm run build                     # compila el panel
npm start                         # abre http://localhost:4321
```

## Como funciona

```
navegador (localStorage)               servidor Node
  tus datos, tus dias,        ──POST──▶  /api/enviar             ──▶ Playwright ──▶ Formulario
  tu registro                 ◀─GET───   /api/trabajo?cliente=x      (solo TU envio)
```

**El servidor no guarda datos tuyos.** Recibe los registros, los envia al formulario y
devuelve el detalle. Nada queda en su disco: el archivo temporal de cada envio se borra en
cuanto termina. Por eso se puede desplegar sin dejar datos personales en el servidor.

### Cada usuario, aislado

Cada navegador genera un identificador propio (`asistencia:cliente` en localStorage) y lo
manda en cada peticion. Con eso el servidor:

- Guarda **un trabajo por cliente**: `GET /api/trabajo?cliente=x` devuelve solo tu envio.
- **No te bloquea** por el envio de otro; cada uno tiene el suyo (hasta 3 a la vez, para no
  ahogar el servidor).
- **No hay registro compartido.** No existe ningun `registro.log` global: las lineas de tus
  envios se guardan en TU localStorage y solo las ves vos.

## Donde viven los datos

Todo en el `localStorage` del navegador, bajo la clave `asistencia:v1`: nombre, DNI, patron
de horarios, los dias, el historial de lo enviado y **tu registro de actividad** (las ultimas
1000 lineas). Se guarda solo con cada cambio.

**La unica copia fuera del navegador es la que bajas con «Descargar mis datos».** Hacelo cada
tanto: si borras los datos del sitio, se pierde todo. Ese mismo archivo se importa desde la
pantalla de bienvenida para volver a donde estabas, o para pasarte a otro navegador.

El boton **Sincronizar** fuerza el guardado en `localStorage` en ese momento y te dice la
hora; no manda nada a ningun servidor.

## Primera vez

Un navegador sin datos muestra la pantalla de bienvenida, que pide:

- Nombre completo y DNI (8 digitos).
- La URL del formulario, la que termina en `/viewform`.
- Tu patron de horarios: rangos de ingreso y de salida. Las horas de cada dia salen al azar
  dentro de esos rangos.

O directamente **Importar archivo JSON** si ya tenes tus datos exportados.

## Uso diario

Solo se envia la asistencia de los dias **remotos**. Los **presenciales** se marcan como
omitidos y no se envian nunca.

1. Abris el panel: los dias de lunes a viernes de hoy y los proximos ya estan creados.
2. Dia presencial → boton ⊘ de esa fila. Queda `OMITIDO`.
3. Dia remoto → lo seleccionas y le das a **Enviar**.

| Estado | Que significa |
|---|---|
| `ENVIADO` | Confirmado por Google. Fila bloqueada: no se edita ni se reenvia. |
| `PENDIENTE` | Dia remoto listo para enviar. |
| `FUTURO` | Fecha posterior a hoy: no se puede enviar. |
| `OMITIDO` | No se envia (tipicamente presencial). |

### Como se generan los dias

Al abrir el panel se crean los dias de **lunes a viernes** que falten, con esta regla:

```
desde = el dia siguiente a tu ULTIMO ENVIADO   (si nunca enviaste nada: hoy)
hasta = hoy + diasPorAdelantado (5)
```

O sea: se cubre todo el hueco desde donde quedaste hasta hoy, mas unos dias por adelantado.
Los dias hasta hoy quedan `PENDIENTE`; los posteriores, `FUTURO`.

**Ejemplo.** Tu ultimo envio fue el 7 de diciembre y entras el 20:

| Se generan | Estado |
|---|---|
| 8, 9, 10, 11, 12, 15, 16, 17, 18, 19 de diciembre | `PENDIENTE` |
| 22, 23, 24, 25 de diciembre | `FUTURO` |

Los fines de semana se saltan y los dias que ya estan en la lista no se duplican.

Ojo con la consecuencia: si pasaste mucho tiempo sin enviar, al abrir el panel se van a
generar todos esos dias de una vez. Los que no correspondan se marcan con ⊘.

**No sabe de feriados.** Genera lunes a viernes y nada mas; los feriados los marcas vos con ⊘.

Los dias **no se pueden eliminar**: la lista es el historial de tu jornada y borrar un dia solo
lo haria reaparecer en la siguiente generacion. Lo que no corresponde se omite, no se borra.

### El modal de edicion

Dos campos que se confunden facil:

- **Observacion** → se envia en el campo OBSERVACION del formulario.
- **Motivo** → nota interna tuya, **nunca se envia**.

### Mi registro

Panel fijo al pie con **tu** registro, siempre visible, guardado en tu localStorage (ultimas
2000 lineas). Tiene filtro por texto y un boton para vaciarlo.

**Queda registrada cada accion**, no solo los envios:

| Linea | Cuando aparece |
|---|---|
| `DIAS GENERADOS` | Se crearon dias, con el motivo y el detalle de pendientes y futuros |
| `CAMBIO` | Editaste un dia: dice que cambio, campo por campo (`ingreso de 9:21 AM a 9:45 AM`) |
| `DATOS` | Cambiaste nombre o DNI (el DNI se registra solo por sus 4 ultimos digitos) |
| `ENVIO SOLICITADO` | Pediste un envio, con los dias y horarios exactos |
| `OK` | Google confirmo un dia (viene del servidor) |
| `CONFIRMADOS` / `SIN CONFIRMAR` | Resumen al terminar: cuantos entraron y cuales quedaron pendientes |
| `FALLO` / `ERROR` | Algo salio mal, con el motivo concreto y la captura si la hay |
| `GUARDADO` | Le diste a Sincronizar |
| `REGISTRO VACIADO` | Vaciaste el registro, y cuantas lineas se borraron |

Los colores ayudan a barrerlo: verde lo confirmado, rojo los fallos, ambar los cambios,
azul lo administrativo.

### Errores

Todo error dice **que** paso, **por que** y **donde arreglarlo**. Ejemplos reales:

```
el DNI debe ser 8 digitos y llego "3 caracter(es)"; corregilo en «Tus datos»
faltan horas obligatorias en 2 dia(s): 2026-08-17 (sin ingreso y sin salida); 2026-08-18 (sin salida)
no se puede registrar asistencia de dias que todavia no ocurrieron (hoy es 2026-08-18): 2026-08-20
la URL del formulario tiene que empezar con https://docs.google.com/forms/ y terminar en /viewform, pero llego "..."
el formulario pide permiso para verse. La URL no es publica o es de otra cuenta; abrila en
  una ventana privada para comprobarlo
los campos se llenaron bien, pero tras apretar Enviar no aparecio la pantalla de confirmacion.
  La pagina decia: "..."
```

Cada error se muestra en pantalla **y** queda en el registro con su contexto, asi que
despues se puede reconstruir que paso.

## Movil

El panel funciona en telefono:

- La tabla de 9 columnas se convierte en **tarjetas** por debajo de 900 px de ancho: fecha,
  dia, horario, estado y las mismas tres acciones.
- La franja de totales se reparte en dos filas; los campos de «Tus datos» y los botones se
  apilan.
- Los modales (editar dia, confirmar envio) se abren a **pantalla completa**.
- El registro reduce su alto y apila el filtro.

Probado a 375x812: sin desborde horizontal.

## Validaciones y candados

En el panel y otra vez en el servidor, para que no pase nada raro:

- Nombre no vacio y DNI de 8 digitos.
- La URL tiene que ser de Formularios de Google.
- No se envian dias futuros ni dias sin horas.
- Un dia ya enviado no se puede editar ni reenviar.
- Ningun dia se puede eliminar: solo omitir.
- Solo un envio a la vez.

## Estructura

```
panel/src/        panel React (Material UI)
  almacen.js        localStorage: leer, guardar, ventana de dias, exportar, importar
  App.jsx           pantalla principal
  Bienvenida.jsx    configuracion inicial e importacion
  TablaDias.jsx     tabla y acciones por fila
  DialogoDia.jsx    edicion de un dia
  PanelRegistro.jsx registro siempre visible
servidor/api.js   3 rutas: /api/enviar, /api/trabajo, /api/registro
src/
  lote.js           recorre los dias y los envia
  formulario.js     lee y llena los campos del Formulario de Google
  navegador.js      Chromium efimero via Playwright
```

## Desplegar

**No funciona en Netlify, Vercel estatico, GitHub Pages ni similares.** El envio lo hace
Playwright con un Chromium de verdad, y eso necesita un servidor que ejecute Node con un
navegador instalado. Un hosting de archivos estaticos no puede correrlo.

Donde si funciona:

| Opcion | Notas |
|---|---|
| Tu propia maquina | Lo mas simple: `npm start` y lo usas en `localhost`. Cero configuracion. |
| Railway / Render / Fly.io | Contenedores con Node. Hay que instalar el navegador con sus dependencias del sistema. |
| Un VPS (Hetzner, DigitalOcean…) | Igual que arriba, con control total. |

En cualquier servidor Linux:

```bash
npm ci
npx playwright install --with-deps chromium   # el navegador y sus librerias del sistema
npm run build
HOST=0.0.0.0 PUERTO=8080 npm start
```

Por defecto el servidor escucha solo en `127.0.0.1`, o sea que **de fabrica no es accesible
desde fuera de la maquina**. Para exponerlo hay que pasar `HOST=0.0.0.0` a proposito.

### Antes de exponerlo, leer esto

El panel **no tiene autenticacion**, y la URL del formulario la manda el navegador. Si lo
dejas accesible en internet, cualquiera que lo encuentre puede usar tu servidor para enviar
respuestas a **cualquier** Formulario de Google. Los datos de cada usuario estan aislados
(cada uno en su localStorage), pero la capacidad de enviar no lo esta.

Si lo vas a exponer, al menos una de estas:

- Ponerlo detras de una VPN o de tu red privada.
- Un proxy con contrasena delante (nginx con auth basica, Cloudflare Access).
- Limitar en `iniciarEnvio` los `formUrl` aceptados a una lista fija.

## Si algun dia lo quieres sin servidor

Se puede, con un costo. El navegador puede hacer un `POST` directo a
`https://docs.google.com/forms/d/e/<ID>/formResponse` y Google registra la respuesta: eso
convierte el proyecto en React puro, desplegable en Netlify, sin Playwright ni backend.

Los parametros de este formulario, verificados interceptando su propio envio:

```
entry.2136858762          NOMBRE COMPLETO
entry.1850875709          DNI
entry.816466622_year      FECHA (año)
entry.816466622_month     FECHA (mes)
entry.816466622_day       FECHA (dia)
entry.346565588_hour      INGRESO (hora, en formato 24 h)
entry.346565588_minute    INGRESO (minuto)
entry.592653081_hour      SALIDA (hora, en formato 24 h)
entry.592653081_minute    SALIDA (minuto)
entry.1484709239          OBSERVACION
```

El costo: por las reglas del navegador, una peticion a otro dominio se manda pero **no se
puede leer la respuesta**. La app perderia la confirmacion de que Google acepto cada
registro; el estado pasaria a «enviado sin confirmar» y habria que mirar la hoja de
respuestas para estar seguro.

Un detalle a verificar con un envio real antes de confiar: que la hora de salida viaje en
formato 24 h (`18` para las 6 PM). Si se manda `06`, la respuesta quedaria registrada a las
6 de la mañana.

## Si algo falla

- **«la URL del formulario no parece de Formularios de Google»** — revisa que sea el enlace
  `/viewform`.
- **«el formulario pide permiso»** — el formulario no es publico con ese enlace.
- **FALLO sin confirmacion** — Playwright apreto Enviar pero no vio la pantalla de respuesta
  registrada. Queda una captura en `capturas/` para mirar que se ve en la pagina.
- **«el servidor esta ocupado con otros envios»** — hay 3 envios corriendo a la vez; espera
  un minuto.
- **Un dia no se marco como enviado** — el panel solo marca los que Google confirmo. Revisa
  el registro y las respuestas del formulario antes de reintentar, para no duplicar.

## Nota

`mis-datos*.json` contiene tu nombre y tu DNI en texto plano. Esta en `.gitignore`: no lo
subas a ningun repositorio. En el servidor no queda ningun dato personal — los archivos
temporales de `.trabajos/` se borran al terminar cada envio.
