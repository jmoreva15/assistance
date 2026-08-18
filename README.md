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

Todo en el `localStorage` del navegador, clave `asistencia:v3`. **Cada seccion guarda en su
propio sitio y no se mezclan:**

| Almacen | Que guarda | Cuando se borra |
|---|---|---|
| `configuracion` | nombre, DNI y URL del formulario | solo si lo cambias |
| `jornada` | **solo el dia de hoy**, marcado con el reloj | al dia siguiente, si no se envio |
| `unDia` | **un** dia suelto que se olvido marcar | al guardar otro, con «Borrar», o al enviarlo |
| `lote` | lo que produjo la ultima generacion por intervalo | al generar otro, con «Borrar lote», o al enviarlo |
| `enviados` | **el historial**: lo unico que se conserva para siempre | nunca |

Cuando Google confirma un envio, ese dia **se mueve** al historial de `enviados` y desaparece
de donde estaba. Es el unico traspaso entre almacenes.

Por eso en la cabecera solo hay un contador, **enviados**: es el unico numero que significa
algo a largo plazo. Lo que esta sin enviar es trabajo en curso de cada seccion y se ve dentro
de ella.

**No hay migraciones.** Hay una sola clave, `asistencia`, y ningun codigo que convierta
formatos anteriores: si el formato de los datos cambia, se exporta antes y se importa despues.
Las claves de versiones viejas del proyecto se borran solas para no dejar datos personales
olvidados en el navegador.

La unica copia fuera del navegador es la que exportes desde **Configuracion**. Si borras los
datos del sitio, se pierde.

### Arquitectura

La logica de almacenamiento esta separada de los componentes, para poder cambiar
localStorage por una API sin rehacer la aplicacion:

```
panel/src/
  datos/
    repositorio.js     la puerta de acceso: leer / escribir / idCliente / borrar
    almacenLocal.js    implementacion sobre localStorage (una sola clave, sin migraciones)
    portable.js        exportar e importar el archivo JSON
  dominio/
    horas.js           parseo, validacion y formato de horas y fechas (puro)
    registros.js       completitud, notas y generacion de lotes (puro)
    bitacora.js        lineas de bitacora y descripcion de cambios (puro)
  hooks/
    useAsistencia.js   une repositorio + dominio y expone las acciones
  secciones/           las cinco pantallas
  componentes/         reloj, tarjetas de marcado, dialogos y campos de fecha/hora
```

Ningun componente toca `localStorage`: todos pasan por `useAsistencia`. Para migrar a un
backend basta escribir otro objeto con los cuatro metodos de `repositorio.js` (ya son
asincronos) y cambiar una linea.

## Las cinco secciones

### 1. Mi jornada

La pantalla principal: el dia de hoy, un **reloj en tiempo real** y dos tarjetas grandes que
se marcan **con un clic**.

- Toca **ENTRADA** al empezar: guarda la hora exacta. La tarjeta pasa a mostrar la hora y
  deja de ser pulsable, asi que no se puede duplicar.
- Toca **SALIDA** al terminar: guarda la hora exacta.
- **Si te olvidaste de marcar la entrada** y tocas directamente SALIDA, se abre un modal
  preguntando «¿A que hora entraste?» con 09:00 por defecto. Al confirmar se guardan las dos
  horas: la entrada que pusiste y la salida de ese momento.
- Una barra muestra cuanto llevas y cuanto falta para las 8 h.
- **Lo que marcas y no envias no sobrevive al dia.** Si marcaste entrada y salida y nunca le
  diste a enviar, al volver otro dia esas horas se descartan y «Mi jornada» arranca en cero.
  Queda la constancia en la bitacora (`DESCARTADOS`). Lo que creaste a proposito en «Un dia» o
  «Varios dias» **no** se descarta: existe para enviarse mas tarde.
- Con las dos horas puestas se muestra el **intervalo registrado** (entrada, salida y cuanto
  da), aparece el textarea de observaciones y el boton **Enviar mi jornada**. El panel no
  decide por ti: solo informa lo que quedo marcado.
- El lapiz corrige las horas a mano. Corregir **no** impide seguir marcando en vivo.
- Los dias anteriores que quedaron a medias salen arriba con acceso directo para completarlos.

### 2. Un dia

Para cargar un dia suelto que se olvido marcar y **enviarlo ahi mismo**. Trae la fecha de
ayer y las horas por defecto; se puede cambiar todo. Avisa si la fecha cae en fin de semana,
bloquea las fechas futuras y los dias ya enviados, y si el dia ya existe sin enviar advierte
que se va a reemplazar. Dos botones: **Solo guardar** (queda listo para enviarlo despues) y
**Guardar y enviar**.

### 3. Varios dias

Independiente de la jornada de hoy: aca **solo se generan dias anteriores a hoy**. El
selector de fechas no deja elegir hoy ni el futuro.

La lista **empieza siempre vacia**. Se elige el intervalo que quieras, del largo que sea, y al
darle a **Generar** se crean todos los dias de lunes a viernes con **09:00 a 18:00**, se
guardan en `localStorage` y aparecen en la lista, ya seleccionados. Desde ahi se revisa, se
corrige lo que haga falta y se envia todo de una vez.

No hay mas validaciones: se puede generar el mismo rango otra vez y los dias se rehacen.
Lo unico que no se toca son los **dias ya enviados**, para no duplicar respuestas en el
formulario. Cuando un dia se rehace se conserva lo que hubieras escrito en su observacion.
Los dias que no correspondan se corrigen o simplemente no se seleccionan al enviar.

«Vaciar lista» solo limpia la vista; los dias siguen guardados.

El unico tope es de 500 dias habiles por intervalo, para atajar un error de tipeo en el anio.

### 4. Enviados

Historial de lo confirmado por Google: fecha, dia, entrada, salida, jornada, observacion,
estado y **fecha y hora de envio**. Con buscador y el total de horas acumuladas.

### 5. Configuracion

Nombre completo, DNI y URL del formulario: lo que se envia en todos los registros. El DNI se
muestra enmascarado con un ojo para revelarlo, y la URL tiene un boton para abrir el
formulario. Guardar queda deshabilitado si no hay cambios o si algo no es valido.

Abajo, el manejo de tus datos:

- **Exportar JSON** — baja todo (configuracion, historial de enviados y bitacora) como
  `asistencia-AAAA-MM-DD.json`. Es tu unica copia fuera del navegador.
- **Importar JSON** — reemplaza todo lo de este navegador con el archivo. Si el archivo no
  sirve, dice por que y no toca nada.
- **Borrar todo** — con confirmacion en el sitio. Borra tambien el historial de enviados.

El mismo archivo se puede importar desde la pantalla de bienvenida cuando el navegador esta
vacio.

### Campos de fecha y hora

Se usan los pickers de Material UI (`@mui/x-date-pickers`): calendario para las fechas y
reloj de 24 h para las horas, con los limites ya aplicados (por ejemplo, en «Varios dias» los
dias de hoy en adelante salen deshabilitados en el calendario). Los componentes
`CampoFecha` y `CampoHora` envuelven los pickers y hacia afuera hablan en texto
(`YYYY-MM-DD` y `HH:MM`), asi el dominio sigue sin depender de ninguna libreria de fechas.

### Horas por defecto

Son fijas para todo: **09:00 a 18:00**. No hay horario configurable; si un dia concreto fue
distinto, se corrige a mano en ese dia.

### Estados

Que un dia este enviado **no es un estado**: es el almacen donde vive. De un registro solo
importa si esta completo:

| | Que significa |
|---|---|
| sin horas | Todavia no tiene ninguna hora. |
| incompleto | Tiene una sola: falta la otra y no se puede enviar. |
| completo | Tiene las dos y se puede enviar. |

Las tablas no muestran columna de estado: en «Varios dias» todas las filas estan igual y en
«Enviados» todas estan enviadas, asi que era ruido.

### Que se rechaza y que solo se avisa

**El panel no decide cuando marcas ni que horas pones.** Lo unico que rechaza es una hora
que no se pueda entender:

- `abc` o `25:00` → error, no se guarda.
- Formatos aceptados: `09:20`, `9:20`, `9:20 AM`, `6:25 PM`, `18:25`.

Todo lo demas se acepta y, si parece un descuido, **solo se avisa sin bloquear**:

- Entrada y salida a la misma hora.
- Salida anterior a la entrada (se cuenta como jornada que cruza la medianoche).
- Jornadas de mas de 14 h o de menos de 1 h.

Antes de enviar, el modal de confirmacion muestra **exactamente** lo que va a salir (fecha,
entrada, salida y observacion de cada registro) para que decidas. Si algo no cuadra, se
cancela y se corrige con el lapiz.

Lo que si se impide, para no ensuciar el formulario: enviar un dia futuro, uno incompleto o
uno ya enviado.

## Movil

Probado a 375x812, sin desborde horizontal:

- Las tablas se convierten en **tarjetas** por debajo de 900 px.
- El reloj y las horas marcadas reducen su tamano pero siguen siendo el elemento dominante.
- Los dialogos (corregir horas, confirmar envio) se abren a **pantalla completa**.
- La bitacora reduce su alto y apila el filtro.

## Validaciones del servidor

Ademas de las del panel, el servidor vuelve a validar todo lo que llega:

- Nombre no vacio y DNI de 8 digitos.
- La URL tiene que ser de Formularios de Google.
- No se envian dias futuros ni dias sin horas.
- Un envio a la vez por cliente, y como maximo 3 simultaneos en todo el servidor.

## Estructura del proyecto

```
panel/src/          panel React (Material UI) — ver «Arquitectura» arriba
servidor/api.js     2 rutas: POST /api/enviar y GET /api/trabajo?cliente=x
src/
  lote.js             recorre los registros del envio y los manda
  formulario.js       lee y llena los campos del Formulario de Google
  navegador.js        Chromium efimero via Playwright
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
