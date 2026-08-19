'use client';

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { formatLongDate, todayIso } from '../lib/domain/time.js';
import { MONO } from '../lib/theme/theme.js';

const pad = (value) => String(value).padStart(2, '0');

export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
      <Typography sx={{ textTransform: 'capitalize', color: 'text.secondary', fontSize: { xs: 13, sm: 15 } }}>
        {formatLongDate(todayIso())}
      </Typography>
      <Typography
        component="p"
        sx={{
          fontFamily: MONO,
          fontSize: { xs: 52, sm: 76 },
          fontWeight: 300,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          mt: 0.5,
        }}
      >
        {pad(now.getHours())}:{pad(now.getMinutes())}
        <Box component="span" sx={{ fontSize: '0.45em', color: 'text.secondary', ml: 0.75 }}>
          {pad(now.getSeconds())}
        </Box>
      </Typography>
    </Box>
  );
}
