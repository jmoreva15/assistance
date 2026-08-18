/**
 * Une el repositorio con las reglas de dominio y expone acciones listas para la
 * UI. Los componentes solo usan este hook: no saben si detras hay localStorage
 * o una API.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { repositorio } from '../datos/repositorio.js';
import { anotar, describirCambios, linea } from '../dominio/bitacora.js';
import { horaAhora, hoyISO, normalizarHora } from '../dominio/horas.js';
import {
  ENTRADA_POR_DEFECTO, SALIDA_POR_DEFECTO, crearRegistro, esEnviable, estadoDe, generarDelRango, validarFormato,
} from '../dominio/registros.js';

export function useAsistencia() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);
  const [trabajo, setTrabajo] = useState({ activo: false, lineas: [], exitosos: [] });
  const lineasVistas = useRef({ iniciado: null, cantidad: 0 });
  const envioProcesado = useRef(null);

  useEffect(() => {
    repositorio
      .leer()
      .then(setDatos)
      .catch((e) => setError(`No pude leer tus datos guardados: ${e.message}`))
      .finally(() => setCargando(false));
  }, []);

  /** Unico camino de escritura: valida, anota y persiste. */
  const guardar = useCallback(async (siguiente, mensaje) => {
    const persistido = await repositorio.escribir(siguiente);
    setDatos(persistido);
    if (mensaje) setAviso(mensaje);
    return persistido;
  }, []);

  const fallar = useCallback(
    (contexto, motivo) => {
      const texto = `${contexto}: ${motivo}`;
      setError(texto);
      setDatos((prev) => {
        if (!prev) return prev;
        const conError = anotar(prev, linea('ERROR', texto));
        repositorio.escribir(conError);
        return conError;
      });
    },
    [],
  );

  // ---------- seccion 1: marcar ----------

  const marcarEntrada = useCallback(async () => {
    const fecha = hoyISO();
    const actual = datos.registros[fecha];
    if (actual?.entrada) {
      return fallar('No pude registrar la entrada', `hoy ya tiene entrada a las ${actual.entrada}; editala si necesitas corregirla`);
    }
    const hora = horaAhora();
    const registro = { ...(actual || crearRegistro({ fecha })), entrada: hora };
    await guardar(
      anotar({ ...datos, registros: { ...datos.registros, [fecha]: registro } }, linea('ENTRADA', `${fecha} a las ${hora}`)),
      `Entrada registrada a las ${hora}.`,
    );
  }, [datos, guardar, fallar]);

  /**
   * Marca la salida con la hora actual. Si nunca se marco la entrada, se puede
   * pasar `entradaManual` (lo que el usuario escribe en el modal).
   */
  const marcarSalida = useCallback(async (entradaManual = null) => {
    const fecha = hoyISO();
    const actual = datos.registros[fecha];
    const entradaFinal = actual?.entrada || (entradaManual ? normalizarHora(entradaManual) : null);
    if (entradaManual && !entradaFinal) {
      return fallar('No pude registrar la salida', `la hora de entrada "${entradaManual}" no es valida`);
    }
    if (!entradaFinal) return { faltaEntrada: true };
    if (actual?.salida) {
      return fallar('No pude registrar la salida', `hoy ya tiene salida a las ${actual.salida}; editala si necesitas corregirla`);
    }
    const hora = horaAhora();
    const base = actual || crearRegistro({ fecha });
    const registro = { ...base, entrada: entradaFinal, salida: hora };
    await guardar(
      anotar(
        { ...datos, registros: { ...datos.registros, [fecha]: registro } },
        actual?.entrada
          ? linea('SALIDA', `${fecha} a las ${hora}`)
          : linea('JORNADA', `${fecha}: entrada ${entradaFinal} puesta a mano y salida ${hora} marcada en vivo`),
      ),
      `Salida registrada a las ${hora}.`,
    );
    return { ok: true };
  }, [datos, guardar, fallar]);

  /** Edicion manual de cualquier dia no enviado. */
  const editarRegistro = useCallback(
    async (fecha, cambios) => {
      const actual = datos.registros[fecha];
      if (actual?.enviadoEn) return fallar('No pude editar el dia', `${fecha} ya fue enviado y no se puede modificar`);

      const formato = validarFormato({ entrada: cambios.entrada, salida: cambios.salida });
      if (formato) return fallar(`No pude guardar ${fecha}`, formato);

      const entrada = 'entrada' in cambios ? (cambios.entrada ? normalizarHora(cambios.entrada) : null) : actual?.entrada ?? null;
      const salida = 'salida' in cambios ? (cambios.salida ? normalizarHora(cambios.salida) : null) : actual?.salida ?? null;

      const siguiente = {
        ...(actual || crearRegistro({ fecha, origen: 'manual' })),
        entrada,
        salida,
        observacion: 'observacion' in cambios ? cambios.observacion : actual?.observacion ?? '',
        editadoEn: new Date().toISOString(),
      };
      const cambiosTexto = describirCambios(actual, siguiente);
      await guardar(
        anotar(
          { ...datos, registros: { ...datos.registros, [fecha]: siguiente } },
          cambiosTexto.length ? linea('EDICION', `${fecha}: ${cambiosTexto.join('; ')}`) : null,
        ),
        cambiosTexto.length ? `${fecha}: ${cambiosTexto.join('; ')}` : `${fecha} sin cambios.`,
      );
    },
    [datos, guardar, fallar],
  );

  // ---------- seccion 2: masivo ----------

  const generarRango = useCallback(
    async ({ desde, hasta }) => {
      const { generados, yaEnviados, invalido } = generarDelRango({ desde, hasta, registros: datos.registros });
      if (invalido) return fallar('No pude generar el intervalo', invalido);
      if (!generados.length) {
        return fallar(
          'No pude generar el intervalo',
          `los ${yaEnviados.length} dia(s) habiles de ese rango ya fueron enviados: ${yaEnviados.join(', ')}`,
        );
      }

      const registros = { ...datos.registros };
      for (const r of generados) registros[r.fecha] = r;

      await guardar(
        anotar(
          { ...datos, registros },
          linea('GENERADOS', `${generados.length} dia(s) de ${desde} a ${hasta} con ${ENTRADA_POR_DEFECTO}-${SALIDA_POR_DEFECTO}: ${generados.map((r) => r.fecha).join(', ')}`),
          yaEnviados.length ? linea('INTACTOS', `${yaEnviados.length} dia(s) ya enviados no se tocaron: ${yaEnviados.join(', ')}`) : null,
        ),
        `${generados.length} dia(s) generados${yaEnviados.length ? `; ${yaEnviados.length} ya enviados quedaron intactos` : ''}.`,
      );
      return { fechas: generados.map((r) => r.fecha), yaEnviados };
    },
    [datos, guardar, fallar],
  );

  /** Alta de un dia que se olvido marcar. Si ya existe, se avisa y no se pisa. */
  const guardarDiaOlvidado = useCallback(
    async ({ fecha, entrada, salida, observacion = '' }) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) {
        return fallar('No pude guardar el dia', 'elige una fecha valida');
      }
      if (fecha > hoyISO()) return fallar('No pude guardar el dia', `${fecha} todavia no ocurrio`);
      const existente = datos.registros[fecha];
      if (existente?.enviadoEn) return fallar('No pude guardar el dia', `${fecha} ya fue enviado`);

      const formato = validarFormato({ entrada, salida });
      if (formato) return fallar(`No pude guardar ${fecha}`, formato);
      const e = normalizarHora(entrada);
      const s = normalizarHora(salida);
      if (!e || !s) return fallar('No pude guardar el dia', 'las dos horas son obligatorias');

      const registro = {
        ...(existente || crearRegistro({ fecha, origen: 'olvidado' })),
        entrada: e,
        salida: s,
        observacion,
        editadoEn: existente ? new Date().toISOString() : null,
      };
      await guardar(
        anotar(
          { ...datos, registros: { ...datos.registros, [fecha]: registro } },
          linea(existente ? 'DIA REEMPLAZADO' : 'DIA OLVIDADO', `${fecha}: ${e} a ${s}${observacion ? ` — ${observacion}` : ''}`),
        ),
        existente ? `${fecha} actualizado (ya existia y se reemplazo).` : `${fecha} agregado: ${e} a ${s}.`,
      );
      return { ok: true, reemplazado: !!existente };
    },
    [datos, guardar, fallar],
  );

  const guardarConfiguracion = useCallback(
    async ({ constantes, formUrl }) => {
      const cambios = [
        constantes['NOMBRE COMPLETO'] !== datos.constantes['NOMBRE COMPLETO'] ? 'nombre' : null,
        constantes.DNI !== datos.constantes.DNI ? `DNI (termina en ${String(constantes.DNI).slice(-4)})` : null,
        formUrl !== datos.formUrl ? 'URL del formulario' : null,
      ].filter(Boolean);
      await guardar(
        anotar({ ...datos, constantes, formUrl }, cambios.length ? linea('CONFIGURACION', `actualizada: ${cambios.join(', ')}`) : null),
        'Configuracion guardada.',
      );
    },
    [datos, guardar],
  );

  // ---------- envio ----------

  const consultarTrabajo = useCallback(async () => {
    try {
      const id = await repositorio.idCliente();
      setTrabajo(await api(`/trabajo?cliente=${encodeURIComponent(id)}`));
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

  // Las lineas del servidor entran a mi bitacora.
  useEffect(() => {
    if (!datos || !trabajo?.iniciado) return;
    if (lineasVistas.current.iniciado !== trabajo.iniciado) lineasVistas.current = { iniciado: trabajo.iniciado, cantidad: 0 };
    const nuevas = (trabajo.lineas || []).slice(lineasVistas.current.cantidad);
    if (!nuevas.length) return;
    lineasVistas.current.cantidad += nuevas.length;
    setDatos((prev) => {
      const siguiente = anotar(prev, ...nuevas);
      repositorio.escribir(siguiente);
      return siguiente;
    });
  }, [trabajo, datos]);

  // Al terminar, los dias que Google confirmo quedan enviados.
  useEffect(() => {
    if (!datos || trabajo.activo || !trabajo.terminado) return;
    if (envioProcesado.current === trabajo.terminado) return;
    envioProcesado.current = trabajo.terminado;

    const confirmados = (trabajo.exitosos || []).filter((f) => datos.registros[f] && !datos.registros[f].enviadoEn);
    const pedidos = trabajo.fechas || [];
    if (confirmados.length) {
      const registros = { ...datos.registros };
      const cuando = new Date().toISOString();
      for (const f of confirmados) registros[f] = { ...registros[f], enviadoEn: cuando };
      const faltaron = pedidos.filter((f) => !trabajo.exitosos.includes(f));
      guardar(
        anotar(
          { ...datos, registros },
          linea('CONFIRMADOS', `${confirmados.length}/${pedidos.length} por Google: ${confirmados.join(', ')}`),
          faltaron.length ? linea('SIN CONFIRMAR', `${faltaron.join(', ')} — siguen listos para reintentar`) : null,
        ),
        `${confirmados.length} de ${pedidos.length} registro(s) confirmados por Google.`,
      );
    } else if (pedidos.length) {
      fallar(
        'El envio termino sin confirmaciones',
        `se pidieron ${pedidos.length} dia(s) (${pedidos.join(', ')}) y Google no confirmo ninguno. El motivo esta en las lineas FALLO/ERROR de la bitacora. Codigo de salida ${trabajo.codigo}.`,
      );
    }
  }, [trabajo, datos, guardar, fallar]);

  const enviar = useCallback(
    async (fechas) => {
      const hoy = hoyISO();
      const aEnviar = fechas.map((f) => datos.registros[f]).filter(Boolean);
      const noEnviables = aEnviar.filter((r) => !esEnviable(r, hoy));
      if (!aEnviar.length) return fallar('No pude enviar', 'no hay ningun registro seleccionado');
      if (noEnviables.length) {
        return fallar(
          'No pude enviar',
          noEnviables
            .map((r) => `${r.fecha} esta ${estadoDe(r)}${r.fecha > hoy ? ' y ademas es una fecha futura' : ''}`)
            .join('; '),
        );
      }

      try {
        const clienteId = await repositorio.idCliente();
        await api('/enviar', {
          method: 'POST',
          body: JSON.stringify({
            clienteId,
            formUrl: datos.formUrl,
            constantes: datos.constantes,
            dias: aEnviar.map((r) => ({
              fecha: r.fecha,
              dia: r.dia,
              ingreso: r.entrada,
              salida: r.salida,
              observacion: r.observacion || '',
            })),
          }),
        });
        await guardar(
          anotar(datos, linea('ENVIO SOLICITADO', `${aEnviar.length} dia(s): ${aEnviar.map((r) => `${r.fecha} ${r.entrada}-${r.salida}`).join(' | ')}`)),
        );
        setAviso('Envio en curso: segui el detalle en la bitacora.');
        consultarTrabajo();
        return true;
      } catch (e) {
        fallar(`No pude enviar ${aEnviar.length} registro(s)`, e.message);
        return false;
      }
    },
    [datos, guardar, fallar, consultarTrabajo],
  );

  const empezar = useCallback(
    async (inicial) => {
      await guardar(
        anotar(inicial, linea('INICIO', `configuracion cargada con ${Object.keys(inicial.registros || {}).length} registro(s)`)),
        'Datos guardados en este navegador.',
      );
    },
    [guardar],
  );

  const limpiarBitacora = useCallback(async () => {
    const cuantas = (datos.bitacora || []).length;
    await guardar(anotar({ ...datos, bitacora: [] }, linea('BITACORA VACIADA', `se borraron ${cuantas} lineas`)), 'Bitacora vaciada.');
  }, [datos, guardar]);

  return {
    datos,
    cargando,
    aviso,
    error,
    trabajo,
    setAviso,
    setError,
    acciones: {
      marcarEntrada,
      marcarSalida,
      editarRegistro,
      generarRango,
      guardarDiaOlvidado,
      guardarConfiguracion,
      enviar,
      empezar,
      limpiarBitacora,
    },
  };
}
