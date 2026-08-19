'use client';

import { useMemo, useState } from 'react';
import {
  Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { SOURCE_DESCRIPTION, SOURCE_LABEL } from '../lib/domain/records.js';
import { formatDateTime, formatDuration, formatShortDate, workedMinutes } from '../lib/domain/time.js';

const SOURCE_COLOR = { today: 'primary', single: 'warning', bulk: 'default' };

const SourceChip = ({ source }) => (
  <Tooltip title={SOURCE_DESCRIPTION[source] ?? ''}>
    <Chip label={SOURCE_LABEL[source] ?? source} color={SOURCE_COLOR[source] ?? 'default'} variant="outlined" />
  </Tooltip>
);

export default function SubmittedPanel({ submissions }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => [...submissions].reverse(), [submissions]);
  const visible = filter
    ? rows.filter((row) =>
        `${row.date} ${row.weekday} ${row.note} ${SOURCE_LABEL[row.source] ?? ''}`.toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;
  const totalMinutes = rows.reduce((sum, row) => sum + (workedMinutes(row.clockIn, row.clockOut) ?? 0), 0);

  if (!rows.length) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Todavia no enviaste ningun registro.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Typography variant="h6">Enviados</Typography>
          <Chip variant="outlined" label={`${rows.length} registro(s)`} />
          <Chip variant="outlined" label={`${formatDuration(totalMinutes)} en total`} />
          <Box sx={{ flex: 1 }} />
          <TextField
            label="Buscar"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Stack>
      </Paper>

      {mobile ? (
        <Stack>
          {visible.map((row) => (
            <Paper key={row.date} variant="outlined" sx={{ p: 1.5, mt: '-1px' }}>
              <Typography sx={{ fontWeight: 700 }}>
                {formatShortDate(row.date)}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  {row.weekday}
                </Typography>
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {row.clockIn} → {row.clockOut} · {formatDuration(workedMinutes(row.clockIn, row.clockOut))}
              </Typography>
              {row.note && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {row.note}
                </Typography>
              )}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <SourceChip source={row.source} />
                <Typography variant="caption" color="text.secondary">
                  enviado {formatDateTime(row.submittedAt)}
                </Typography>
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
                <TableCell>Origen</TableCell>
                <TableCell>Enviado el</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.date} hover>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {formatShortDate(row.date)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{row.weekday}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.clockIn}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.clockOut}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {formatDuration(workedMinutes(row.clockIn, row.clockOut))}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap title={row.note}>
                      {row.note || <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <SourceChip source={row.source} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {formatDateTime(row.submittedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
