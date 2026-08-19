'use client';

import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import { MONO } from '../lib/theme/theme.js';

export default function PunchCard({ label, time, icon, onPunch, disabled, hint }) {
  const marked = !!time;
  const clickable = !marked && !disabled;

  const content = (
    <Stack alignItems="center" spacing={0.5} sx={{ width: '100%', py: { xs: 2.5, sm: 3 }, px: 2 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: marked ? 'success.main' : 'text.secondary' }}>
        {marked ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : icon}
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          {label}
        </Typography>
      </Stack>

      <Typography
        sx={{
          fontFamily: MONO,
          fontSize: { xs: 38, sm: 46 },
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
          color: marked ? 'text.primary' : 'text.disabled',
        }}
      >
        {time || '--:--'}
      </Typography>

      {clickable && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'primary.main' }}>
          <TouchAppIcon sx={{ fontSize: 15 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            TOCA PARA MARCAR
          </Typography>
        </Stack>
      )}
      {!clickable && hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
  );

  if (!clickable) {
    return <Box sx={{ flex: 1, minWidth: 0, opacity: disabled && !marked ? 0.55 : 1 }}>{content}</Box>;
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
      {content}
    </ButtonBase>
  );
}
