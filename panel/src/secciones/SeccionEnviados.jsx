import React, { useMemo, useState } from 'react';
import {
  Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { duracionTexto, fechaCorta, minutosTrabajados } from '../dominio/horas.js';
import { ESTADOS, estadoDe, listaDeRegistros } from '../dominio/registros.js';

const cuando = (iso) => {
  if (!iso) return '—';
  if (iso === 'migrado') return 'antes de la migracion';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
};

/** Seccion 3: historial de todo lo que ya se envio. */
export default function SeccionEnviados({ datos }) {
  const movil = useMediaQuery(useTheme().breakpoints.down('md'));
  const [filtro, setFiltro] = useState('');

  const enviados = useMemo(
    () =>
      listaDeRegistros(datos.registros)
        .filter((r) => estadoDe(r) === ESTADOS.ENVIADO)
        .reverse(),
    [datos.registros],
  );

  const visibles = filtro
    ? enviados.filter((r) => `${r.fecha} ${r.dia} ${r.observacion || ''}`.toLowerCase().includes(filtro.toLowerCase()))
    : enviados;

  const totalHoras = enviados.reduce((suma, r) => suma + (minutosTrabajados(r.entrada, r.salida) || 0), 0);

  if (!enviados.length) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Todavia no has enviado ningun registro. Cuando envies, apareceran aca con su fecha y hora de envio.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Typography variant="h6">Enviados</Typography>
          <Chip variant="outlined" label={`${enviados.length} registro(s)`} />
          <Chip variant="outlined" label={`${duracionTexto(totalHoras)} en total`} />
          <Box sx={{ flex: 1 }} />
          <TextField
            label="Buscar"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="una fecha, un dia, una observacion…"
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Stack>
      </Paper>

      {movil ? (
        <Stack>
          {visibles.map((r) => (
            <Paper key={r.fecha} variant="outlined" sx={{ p: 1.5, mt: '-1px' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {fechaCorta(r.fecha)}{' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {r.dia}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.entrada} → {r.salida} · {duracionTexto(minutosTrabajados(r.entrada, r.salida))}
                  </Typography>
                  {r.observacion && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {r.observacion}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    enviado {cuando(r.enviadoEn)}
                  </Typography>
                </Box>
                <Chip label="ENVIADO" color="success" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Dia</TableCell>
                <TableCell align="right">Entrada</TableCell>
                <TableCell align="right">Salida</TableCell>
                <TableCell align="right">Jornada</TableCell>
                <TableCell>Observacion</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Enviado el</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibles.map((r) => (
                <TableRow key={r.fecha} hover>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fechaCorta(r.fecha)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{r.dia}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.entrada}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.salida}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {duracionTexto(minutosTrabajados(r.entrada, r.salida))}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={r.observacion}>
                      {r.observacion || <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label="ENVIADO" color="success" />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{cuando(r.enviadoEn)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {visibles.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1.5 }}>
          Nada coincide con «{filtro}».
        </Typography>
      )}
    </Stack>
  );
}
