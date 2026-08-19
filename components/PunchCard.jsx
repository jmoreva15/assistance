'use client';

import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { InlineTime } from './fields.jsx';
import { MONO } from '../lib/theme/theme.js';

export default function PunchCard({ label, time, icon, onPunch, onEdit, locked, hint }) {
  const marked = !!time;
  const punchable = !marked && !locked;

  const heading = (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: marked ? 'success.main' : 'text.secondary' }}>
      {marked ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : icon}
      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        {label}
      </Typography>
    </Stack>
  );

  if (marked) {
    return (
      <Stack alignItems="center" spacing={0.5} sx={{ flex: 1, minWidth: 0, py: { xs: 2.5, sm: 3 }, px: 2 }}>
        {heading}
        {locked ? (
          <Typography sx={{ fontFamily: MONO, fontSize: { xs: 38, sm: 46 }, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {time}
          </Typography>
        ) : (
          <InlineTime value={time} onCommit={onEdit} width={200} size={40} align="center" />
        )}
        <Typography variant="caption" color="text.secondary">
          {locked ? hint : 'toca la hora para corregirla'}
        </Typography>
      </Stack>
    );
  }

  const content = (
    <Stack alignItems="center" spacing={0.5} sx={{ width: '100%', py: { xs: 2.5, sm: 3 }, px: 2 }}>
      {heading}
      <Typography sx={{ fontFamily: MONO, fontSize: { xs: 38, sm: 46 }, lineHeight: 1.1, color: 'text.disabled' }}>
        --:--
      </Typography>
      {punchable ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'primary.main' }}>
          <TouchAppIcon sx={{ fontSize: 15 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            TOCA PARA MARCAR
          </Typography>
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
  );

  if (!punchable) return <Box sx={{ flex: 1, minWidth: 0, opacity: 0.55 }}>{content}</Box>;

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
      {content}
    </ButtonBase>
  );
}
