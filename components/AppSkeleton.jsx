'use client';

import { Box, Container, Divider, Paper, Skeleton, Stack } from '@mui/material';

const Pulse = ({ width, height = 14, radius = 2 }) => (
  <Skeleton variant="rectangular" width={width} height={height} sx={{ borderRadius: `${radius}px` }} />
);

export default function AppSkeleton() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Pulse width={130} height={24} />
          <Pulse width={180} height={12} />
          <Box sx={{ flex: 1 }} />
          <Pulse width={92} height={20} />
        </Stack>

        <Stack direction="row" spacing={3} sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
          {[92, 66, 96, 104, 112].map((width) => (
            <Pulse key={width} width={width} height={16} />
          ))}
        </Stack>

        <Paper variant="outlined">
          <Stack alignItems="center" spacing={1.5} sx={{ py: { xs: 3, sm: 4 } }}>
            <Pulse width={200} height={14} />
            <Skeleton variant="rectangular" width={230} height={64} sx={{ borderRadius: '4px' }} />
          </Stack>
          <Divider />
          <Stack direction={{ xs: 'column', sm: 'row' }}>
            {['entrada', 'salida'].map((slot, index) => (
              <Stack key={slot} alignItems="center" spacing={1} sx={{ flex: 1, py: 3.5, borderLeft: index ? { sm: 1 } : 0, borderColor: 'divider' }}>
                <Pulse width={82} height={12} />
                <Skeleton variant="rectangular" width={128} height={40} sx={{ borderRadius: '4px' }} />
              </Stack>
            ))}
          </Stack>
          <Divider />
          <Stack alignItems="center" sx={{ py: 2.5 }}>
            <Pulse width={240} height={14} />
          </Stack>
        </Paper>

        <Paper variant="outlined">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
            <Pulse width={84} height={14} />
            <Pulse width={70} height={20} />
          </Stack>
          <Stack spacing={1} sx={{ p: 1.5 }}>
            {[92, 76, 84, 62].map((width) => (
              <Pulse key={width} width={`${width}%`} height={11} />
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
