'use client';

import { Box, ButtonBase, Stack, Tooltip, IconButton, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { InlineTime } from './fields.jsx';
import { MONO } from '../lib/theme/theme.js';

export default function PunchCard({ label, time, icon, onPunch, onEdit, onRestamp, locked }) {
  const marked = !!time;

  const heading = (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: marked ? 'success.main' : 'text.secondary' }}>
      {marked ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : icon}
      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
        {label}
      </Typography>
    </Stack>
  );

  if (marked) {
    return (
      <Stack alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0, py: { xs: 2.5, sm: 3 }, px: 2 }}>
        {heading}
        {locked ? (
          <Typography sx={{ fontFamily: MONO, fontSize: { xs: 40, sm: 46 }, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {time}
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <InlineTime value={time} onCommit={onEdit} width={168} size={38} align="center" />
            <Tooltip title="volver a marcar con la hora actual">
              <IconButton size="small" color="primary" onClick={onRestamp} sx={{ mt: 0.5 }}>
                <TouchAppIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    );
  }

  if (locked) {
    return (
      <Stack alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0, py: { xs: 2.5, sm: 3 }, px: 2, opacity: 0.5 }}>
        {heading}
        <Typography sx={{ fontFamily: MONO, fontSize: { xs: 40, sm: 46 }, lineHeight: 1, color: 'text.disabled' }}>
          --:--
        </Typography>
      </Stack>
    );
  }

  return (
    <ButtonBase
      onClick={onPunch}
      sx={{
        flex: 1,
        minWidth: 0,
        transition: 'background-color 160ms, transform 120ms',
        '&:hover': { bgcolor: 'action.hover' },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      <Stack alignItems="center" spacing={1} sx={{ width: '100%', py: { xs: 2.5, sm: 3 }, px: 2 }}>
        {heading}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'primary.main' }}>
          <TouchAppIcon sx={{ fontSize: 26 }} />
          <Typography sx={{ fontSize: 22, fontWeight: 600 }}>Marcar</Typography>
        </Stack>
        <Box sx={{ height: 18 }} />
      </Stack>
    </ButtonBase>
  );
}
