import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Container, Divider, Link, Paper, Snackbar, Stack, Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SyncIcon from '@mui/icons-material/Sync';
import DownloadIcon from '@mui/icons-material/Download';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { api } from './api.js';
import * as almacen from './almacen.js';
import Bienvenida from './Bienvenida.jsx';
import Identidad from './Identidad.jsx';
import TablaDias from './TablaDias.jsx';
import PanelRegistro from './PanelRegistro.jsx';
import Tooltip from '@mui/material/Tooltip';
import DialogoConfirmar from './DialogoConfirmar.jsx';
import DialogoDia from './DialogoDia.jsx';

const Dato = ({ etiqueta, valor, color }) => (
  <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, borderRight: 1, borderColor: 'divider', flex: { xs: '1 0 33%', sm: '0 0 auto' }, minWidth: { xs: 0, sm: 104 }, '&:last-of-type': { borderRight: 0 } }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
      {etiqueta}
    </Typography>
    <Typography sx={{ fontSize: { xs: 17, sm: 20 }, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color, lineHeight: 1.2 }}>
      {valor}
    </Typography>
  </Box>
);

export default function App() {
  const [datos, setDatos] = useState(() => almacen.leer());
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [trabajo, setTrabajo] = useState({ activo: false, lineas: [], exitosos: [] });
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [dialogoDia, setDialogoDia] = useState({ abierto: false, dia: null });
  const [destacado, setDestacado] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState(null);
  const refRegistro = useRef(null);
  const refLineas = useRef({ iniciado: null, agregadas: 0 });

  /** Toda escritura pasa por aca: localStorage es la fuente de verdad. */
  const escribir = useCallback((nuevos, mensaje) => {
    almacen.guardar(nuevos);
    setDatos(nuevos);
    if (mensaje) setAviso(mensaje);
  }, []);

  /** Un error se muestra con su motivo y queda registrado con su contexto. */
  const fallar = useCallback((contexto, motivo) => {
    const texto = `${contexto}: ${motivo}`;
    setError(texto);
    setDatos((prev) => (prev ? almacen.guardar(almacen.registrar(prev, almacen.linea('ERROR', texto))) : prev));
  }, []);

  // Al abrir, aseguramos la ventana de dias por adelantado.
  useEffect(() => {
    if (!datos || !almacen.configurado(datos)) return;
    const { datos: conVentana, agregados, pendientes = [], futuros = [], motivo } = almacen.asegurarVentana(datos);
    if (!agregados.length) return;
    const detalle = [
      pendientes.length ? `${pendientes.length} pendiente(s) [${pendientes.join(', ')}]` : null,
      futuros.length ? `${futuros.length} futuro(s) [${futuros.join(', ')}]` : null,
    ].filter(Boolean).join(' + ');
    escribir(
      almacen.registrar(conVentana, almacen.linea('DIAS GENERADOS', `${agregados.length} dia(s) habiles ${motivo}: ${detalle}`)),
      `${agregados.length} dia(s) creados: ${pendientes.length} pendientes y ${futuros.length} futuros.`,
    );
  }, [datos, escribir]);

  const consultarTrabajo = useCallback(async () => {
    try {
      setTrabajo(await api(`/trabajo?cliente=${encodeURIComponent(almacen.clienteId())}`));
    } catch (e) {
      fallar('No pude consultar el estado del envio', e.message);
    }
  }, [fallar]);

  useEffect(() => {
    consultarTrabajo();
  }, [consultarTrabajo]);

  useEffect(() => {
    if (!trabajo.activo) return;
    const id = setInterval(consultarTrabajo, 1500);
    return () => clearInterval(id);
  }, [trabajo.activo, consultarTrabajo]);

  // Las lineas de mis envios se van guardando en mi registro (localStorage).
  useEffect(() => {
    if (!trabajo?.iniciado) return;
    if (refLineas.current.iniciado !== trabajo.iniciado) refLineas.current = { iniciado: trabajo.iniciado, agregadas: 0 };
    const nuevas = (trabajo.lineas || []).slice(refLineas.current.agregadas);
    if (!nuevas.length) return;
    refLineas.current.agregadas += nuevas.length;
    setDatos((prev) => almacen.guardar(almacen.agregarAlRegistro(prev, nuevas)));
  }, [trabajo]);

  // Cuando el envio termina, marcamos como enviados los dias que Google confirmo.
  const yaProcesado = useRef(null);
  useEffect(() => {
    if (trabajo.activo || !trabajo.terminado || yaProcesado.current === trabajo.terminado) return;
    yaProcesado.current = trabajo.terminado;
    const nuevos = (trabajo.exitosos || []).filter((f) => !datos.enviados.includes(f));
    const pedidos = (trabajo.fechas || []).length;
    if (nuevos.length) {
      const faltaron = (trabajo.fechas || []).filter((f) => !trabajo.exitosos.includes(f));
      escribir(
        almacen.registrar(
          { ...datos, enviados: [...datos.enviados, ...nuevos].sort() },
          almacen.linea('CONFIRMADOS', `${nuevos.length}/${pedidos} por Google: ${nuevos.join(', ')}`),
          faltaron.length ? almacen.linea('SIN CONFIRMAR', `${faltaron.join(', ')} — quedan pendientes, revisa las lineas FALLO/ERROR de arriba`) : null,
        ),
        `${nuevos.length} de ${pedidos} dia(s) confirmados por Google.`,
      );
      setSeleccion(new Set());
    } else if (pedidos) {
      fallar(
        'El envio termino sin ninguna confirmacion',
        `se pidieron ${pedidos} dia(s) (${(trabajo.fechas || []).join(', ')}) y Google no confirmo ninguno. El detalle del motivo esta en las lineas de arriba del registro; si dice ERROR o FALLO, ahi figura el campo o la pagina que fallo. Codigo de salida ${trabajo.codigo}.`,
      );
    }
  }, [trabajo, datos, escribir]);

  const dias = useMemo(
    () => (datos?.dias || []).map((d) => ({ ...d, enviado: datos.enviados.includes(d.fecha) })),
    [datos],
  );
  const hoy = almacen.hoyLocal();
  const resumen = useMemo(() => {
    const enviados = dias.filter((d) => d.enviado).length;
    const omitidos = dias.filter((d) => !d.enviado && d.omitir).length;
    const futuros = dias.filter((d) => !d.enviado && !d.omitir && d.fecha > hoy).length;
    return { total: dias.length, enviados, omitidos, futuros, pendientes: dias.length - enviados - omitidos - futuros };
  }, [dias, hoy]);
  const seleccionables = dias.filter((d) => !d.enviado && !d.omitir && d.fecha <= hoy);

  if (!datos) {
    return (
      <>
        <Bienvenida
          alEmpezar={(nuevos) =>
            escribir(
              almacen.registrar(nuevos, almacen.linea('INICIO', `datos cargados: ${nuevos.dias.length} dias, ${nuevos.enviados.length} enviados`)),
              'Datos guardados en este navegador.',
            )
          }
          alFallar={(m) => setError(m)}
        />
        <Snackbar open={!!error} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Snackbar>
      </>
    );
  }

  const guardarDia = (dia) => {
    const otros = datos.dias.filter((d) => d.fecha !== dia.fecha);
    const limpio = {
      fecha: dia.fecha,
      dia: new Date(`${dia.fecha}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long' }),
      ingreso: String(dia.ingreso || '').trim(),
      salida: String(dia.salida || '').trim(),
      observacion: String(dia.observacion || '').trim(),
      motivo: String(dia.motivo || '').trim(),
      ...(dia.omitir ? { omitir: true } : {}),
    };
    const anterior = datos.dias.find((d) => d.fecha === dia.fecha);
    const cambios = almacen.describirCambios(anterior, limpio);
    const actualizado = { ...datos, dias: [...otros, limpio].sort((a, b) => a.fecha.localeCompare(b.fecha)) };
    escribir(
      cambios.length
        ? almacen.registrar(actualizado, almacen.linea('CAMBIO', `${dia.fecha} (${limpio.dia}): ${cambios.join('; ')}`))
        : actualizado,
      cambios.length ? `${dia.fecha}: ${cambios.join('; ')}` : `${dia.fecha} sin cambios.`,
    );
    setDialogoDia({ abierto: false, dia: null });
  };

  const alternarOmitir = (dia) => guardarDia({ ...dia, omitir: !dia.omitir });

  /** Guarda ya mismo en este navegador y deja constancia de la hora. */
  const sincronizar = () => {
    const ahora = new Date();
    setGuardadoEn(ahora);
    escribir(
      almacen.registrar(datos, almacen.linea('GUARDADO', `manual: ${datos.dias.length} dias, ${datos.enviados.length} enviados`)),
      `Guardado en este navegador a las ${ahora.toLocaleTimeString('es-PE')}. Descarga tus datos si queres una copia aparte.`,
    );
  };

  const enviar = async () => {
    setConfirmandoEnvio(false);
    const aEnviar = dias.filter((d) => seleccion.has(d.fecha)).map(({ enviado, ...resto }) => resto);
    try {
      await api('/enviar', {
        method: 'POST',
        body: JSON.stringify({ clienteId: almacen.clienteId(), formUrl: datos.formUrl, constantes: datos.constantes, dias: aEnviar }),
      });
      escribir(
        almacen.registrar(datos, almacen.linea('ENVIO SOLICITADO', `${aEnviar.length} dia(s): ${aEnviar.map((d) => `${d.fecha} ${d.ingreso}-${d.salida}`).join(' | ')}`)),
      );
      setAviso('Envio en curso: segui el detalle en el registro.');
      consultarTrabajo();
      refRegistro.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setDestacado(true);
      setTimeout(() => setDestacado(false), 6000);
    } catch (e) {
      fallar(`No pude iniciar el envio de ${aEnviar.length} dia(s)`, e.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5">Control de Asistencia</Typography>
          <Typography variant="body2" color="text.secondary">
            <Link href={datos.formUrl} target="_blank" rel="noreferrer" underline="hover">
              formulario
            </Link>
            {datos.patron?.ingreso && ` · patron ${datos.patron.ingreso} / ${datos.patron.salida} · ${datos.patron.jornada}`}
          </Typography>
        </Box>

        <Paper variant="outlined">
          <Stack direction="row" flexWrap="wrap">
            <Dato etiqueta="Total" valor={resumen.total} />
            <Dato etiqueta="Enviados" valor={resumen.enviados} color="success.main" />
            <Dato etiqueta="Pendientes" valor={resumen.pendientes} color={resumen.pendientes ? 'warning.main' : undefined} />
            <Dato etiqueta="Futuros" valor={resumen.futuros} />
            <Dato etiqueta="Omitidos" valor={resumen.omitidos} />
          </Stack>
        </Paper>

        <Identidad
          constantes={datos.constantes}
          alGuardarLocal={(constantes) => {
            const cambios = [
              constantes['NOMBRE COMPLETO'] !== datos.constantes['NOMBRE COMPLETO']
                ? `nombre de "${datos.constantes['NOMBRE COMPLETO']}" a "${constantes['NOMBRE COMPLETO']}"`
                : null,
              constantes.DNI !== datos.constantes.DNI ? `DNI cambiado (termina en ${constantes.DNI.slice(-4)})` : null,
            ].filter(Boolean);
            escribir(
              almacen.registrar({ ...datos, constantes }, almacen.linea('DATOS', cambios.join('; '))),
              'Datos actualizados en este navegador.',
            );
          }}
          alFallar={setError}
        />

        <Box>
          <Paper variant="outlined" sx={{ borderBottom: { xs: 1, md: 0 }, borderColor: 'divider', px: 1.5, py: 1, mb: { xs: 1.5, md: 0 } }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Button startIcon={<DoneAllIcon />} disabled={!seleccionables.length} onClick={() => setSeleccion(new Set(seleccionables.map((d) => d.fecha)))}>
                Seleccionar pendientes ({seleccionables.length})
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<DownloadIcon />} onClick={() => almacen.descargar(datos)}>
                Descargar mis datos
              </Button>
              <Tooltip title="Guarda ya mismo en el localStorage de este navegador">
                <Button variant="outlined" startIcon={<SyncIcon />} onClick={sincronizar}>
                  Sincronizar
                </Button>
              </Tooltip>
              <Button
                variant="contained"
                color="error"
                startIcon={<SendIcon />}
                disabled={!seleccion.size || trabajo.activo}
                onClick={() => setConfirmandoEnvio(true)}
              >
                Enviar ({seleccion.size})
              </Button>
            </Stack>
          </Paper>

          <TablaDias
            dias={dias}
            seleccion={seleccion}
            alSeleccionar={(fecha) =>
              setSeleccion((prev) => {
                const s = new Set(prev);
                s.has(fecha) ? s.delete(fecha) : s.add(fecha);
                return s;
              })
            }
            alEditar={(dia) => setDialogoDia({ abierto: true, dia })}
            alAlternarOmitir={alternarOmitir}
          />
        </Box>

        <PanelRegistro
          contenedorRef={refRegistro}
          registro={datos.registro || []}
          activo={!!trabajo.activo}
          destacado={destacado}
          alLimpiar={() =>
            escribir(
              almacen.registrar({ ...datos, registro: [] }, almacen.linea('REGISTRO VACIADO', `se borraron ${(datos.registro || []).length} lineas`)),
              'Registro vaciado en este navegador.',
            )
          }
        />


        <Divider />
        <Typography variant="caption" color="text.secondary">
          Tus datos viven solo en este navegador (localStorage) y se guardan con cada cambio.
          {guardadoEn && ` Ultimo guardado manual: ${guardadoEn.toLocaleTimeString('es-PE')}.`} La unica copia
          fuera del navegador es la que bajas con «Descargar mis datos»: hacelo cada tanto, porque si borras
          los datos del sitio se pierde todo. Los dias de lunes a viernes de hoy y los proximos{' '}
          {datos.diasPorAdelantado} se crean solos al abrir el panel.
        </Typography>
      </Stack>

      <DialogoDia
        abierto={dialogoDia.abierto}
        diaEditado={dialogoDia.dia}
        rangos={datos.rangos}
        alCerrar={() => setDialogoDia({ abierto: false, dia: null })}
        alGuardarLocal={guardarDia}
      />

      <DialogoConfirmar
        abierto={confirmandoEnvio}
        titulo="Enviar al formulario"
        confirmar={`Enviar ${seleccion.size}`}
        color="error"
        alCerrar={() => setConfirmandoEnvio(false)}
        alConfirmar={enviar}
      >
        <Typography variant="body2" gutterBottom>
          Se van a enviar <strong>{seleccion.size} registro(s) reales</strong> al formulario:
        </Typography>
        <Box sx={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, my: 1.5 }}>
          {[...seleccion].sort().join(', ')}
        </Box>
        <Alert severity="warning">No se puede deshacer: Google no permite borrar una respuesta ya enviada.</Alert>
      </DialogoConfirmar>

      <Snackbar open={!!aviso && !error} autoHideDuration={6000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setAviso(null)}>{aviso}</Alert>
      </Snackbar>
      <Snackbar open={!!error} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Container>
  );
}
