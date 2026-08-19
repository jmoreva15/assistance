'use client';

import { Box, LinearProgress } from '@mui/material';

export default function TopProgress({ active }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar + 1,
        height: 3,
        opacity: active ? 1 : 0,
        transition: 'opacity 200ms',
        pointerEvents: 'none',
      }}
    >
      {active && <LinearProgress sx={{ height: 3 }} />}
    </Box>
  );
}
