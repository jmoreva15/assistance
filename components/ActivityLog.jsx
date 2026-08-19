'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Paper, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { MONO } from '../lib/theme/theme.js';

const COLORS = [
  [/^ERROR|^FALLO/, 'error.main'],
  [/^ENVIADO/, 'success.main'],
  [/^EDICION|^DESCARTADO|^LOTE BORRADO|^UN DIA BORRADO/, 'warning.main'],
  [/^ENTRADA|^SALIDA/, 'primary.main'],
  [/^SESION|^PERFIL/, 'info.main'],
];

const colorFor = (action) => COLORS.find(([pattern]) => pattern.test(action))?.[1] ?? 'text.secondary';

const stamp = (value) => new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' });

export default function ActivityLog({ entries }) {
  const [filter, setFilter] = useState('');
  const box = useRef(null);
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [entries]);

  const visible = useMemo(() => {
    if (!filter) return entries;
    const needle = filter.toLowerCase();
    return entries.filter((entry) => `${entry.action} ${entry.detail}`.toLowerCase().includes(needle));
  }, [entries, filter]);

  return (
    <Paper variant="outlined">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h6">Bitacora</Typography>
          <Chip variant="outlined" label={`${entries.length} lineas`} />
        </Stack>
        <Box sx={{ flex: 1 }} />
        <TextField
          label="Filtrar"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          sx={{ width: mobile ? '100%' : 220 }}
        />
      </Stack>

      <Box
        ref={box}
        sx={{
          bgcolor: 'background.default',
          height: { xs: 170, sm: 220 },
          overflow: 'auto',
          p: 1.5,
          fontFamily: MONO,
          fontSize: { xs: 10.5, sm: 11.5 },
          lineHeight: 1.7,
        }}
      >
        {visible.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {entries.length ? 'Nada coincide con el filtro.' : 'Todavia no hay actividad.'}
          </Typography>
        )}
        {visible.map((entry) => (
          <Box key={entry.id} sx={{ color: colorFor(entry.action), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            [{stamp(entry.createdAt)}] {entry.action} {entry.detail}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
