import React from 'react';
import {
  Box, Checkbox, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import UndoIcon from '@mui/icons-material/Undo';
import { fechaCorta } from './api.js';
import { hoyLocal } from './almacen.js';

const Vacio = () => (
  <Box component="span" sx={{ color: 'text.disabled' }}>
    —
  </Box>
);

function EtiquetaEstado({ dia, esFuturo }) {
  if (dia.enviado) return <Chip label="ENVIADO" color="success" />;
  if (dia.omitir)
    return (
      <Tooltip title={dia.motivo || 'no se envia (presencial)'}>
        <Chip label="OMITIDO" variant="outlined" />
      </Tooltip>
    );
  if (esFuturo)
    return (
      <Tooltip title="todavia no ocurrio: no se puede enviar">
        <Chip label="FUTURO" color="primary" variant="outlined" />
      </Tooltip>
    );
  return <Chip label="PENDIENTE" color="warning" variant="outlined" />;
}

function Acciones({ dia, alEditar, alAlternarOmitir }) {
  if (dia.enviado) {
    return (
      <Tooltip title="Un registro enviado no se puede modificar ni reenviar">
        <Typography variant="caption" color="text.disabled">
          bloqueado
        </Typography>
      </Tooltip>
    );
  }
  return (
    <>
      <Tooltip title="editar">
        <IconButton size="small" onClick={() => alEditar(dia)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={dia.omitir ? 'reactivar: pasar a pendiente' : 'no enviar: dia presencial'}>
        <IconButton size="small" onClick={() => alAlternarOmitir(dia)}>
          {dia.omitir ? <UndoIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </>
  );
}

/** En pantalla chica cada dia es una tarjeta: 9 columnas no entran en un telefono. */
function Tarjetas({ dias, seleccion, alSeleccionar, hoy, ...acciones }) {
  if (!dias.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No hay dias registrados.
        </Typography>
      </Paper>
    );
  }
  return (
    <Stack>
      {dias.map((d) => {
        const esFuturo = d.fecha > hoy;
        const noEnviable = d.enviado || d.omitir || esFuturo;
        return (
          <Paper
            key={d.fecha}
            variant="outlined"
            sx={{ p: 1.5, mt: '-1px', opacity: d.omitir || esFuturo ? 0.65 : 1 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox
                size="small"
                checked={seleccion.has(d.fecha)}
                disabled={noEnviable}
                onChange={() => alSeleccionar(d.fecha)}
                inputProps={{ 'aria-label': `seleccionar ${d.fecha}` }}
                sx={{ p: 0.5 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                  <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {fechaCorta(d.fecha)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.dia}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {d.ingreso} → {d.salida}
                </Typography>
                {(d.observacion || d.motivo) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {d.observacion && `obs: ${d.observacion}`}
                    {d.observacion && d.motivo && ' · '}
                    {d.motivo && `motivo: ${d.motivo}`}
                  </Typography>
                )}
              </Box>
              <Stack alignItems="flex-end" spacing={0.5}>
                <EtiquetaEstado dia={d} esFuturo={esFuturo} />
                <Box sx={{ whiteSpace: 'nowrap' }}>
                  <Acciones dia={d} {...acciones} />
                </Box>
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

export default function TablaDias({ dias, seleccion, alSeleccionar, alEditar, alAlternarOmitir }) {
  const hoy = hoyLocal();
  const tema = useTheme();
  const movil = useMediaQuery(tema.breakpoints.down('md'));
  const acciones = { alEditar, alAlternarOmitir };

  if (movil) {
    return <Tarjetas dias={dias} seleccion={seleccion} alSeleccionar={alSeleccionar} hoy={hoy} {...acciones} />;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>Fecha</TableCell>
            <TableCell>Dia</TableCell>
            <TableCell align="right">Ingreso</TableCell>
            <TableCell align="right">Salida</TableCell>
            <TableCell>
              <Tooltip title="Se envia en el campo OBSERVACION del formulario">
                <span>Observacion</span>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Tooltip title="Nota interna tuya: nunca se envia">
                <span>Motivo</span>
              </Tooltip>
            </TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dias.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center">
                <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                  No hay dias registrados.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {dias.map((d) => {
            const esFuturo = d.fecha > hoy;
            const noEnviable = d.enviado || d.omitir || esFuturo;
            return (
              <TableRow key={d.fecha} hover sx={{ opacity: d.omitir || esFuturo ? 0.65 : 1 }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={seleccion.has(d.fecha)}
                    disabled={noEnviable}
                    onChange={() => alSeleccionar(d.fecha)}
                    inputProps={{ 'aria-label': `seleccionar ${d.fecha}` }}
                  />
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {fechaCorta(d.fecha)}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{d.dia}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {d.ingreso}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {d.salida}
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  {d.observacion ? (
                    <Typography variant="body2" noWrap title={d.observacion}>
                      {d.observacion}
                    </Typography>
                  ) : (
                    <Vacio />
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  {d.motivo ? (
                    <Typography variant="body2" noWrap title={d.motivo}>
                      {d.motivo}
                    </Typography>
                  ) : (
                    <Vacio />
                  )}
                </TableCell>
                <TableCell>
                  <EtiquetaEstado dia={d} esFuturo={esFuturo} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Acciones dia={d} {...acciones} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
