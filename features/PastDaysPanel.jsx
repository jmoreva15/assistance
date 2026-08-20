'use client';

import { useState } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import BulkPanel from './BulkPanel.jsx';
import SingleDayPanel from './SingleDayPanel.jsx';

export default function PastDaysPanel({ today, draft, submittedDates, busy, actions, onSubmit }) {
  const [mode, setMode] = useState('single');

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        onChange={(_, next) => next && setMode(next)}
        sx={{ alignSelf: { sm: 'flex-start' } }}
      >
        <ToggleButton value="single" sx={{ px: 2 }}>
          <EventAvailableIcon sx={{ fontSize: 16, mr: 0.75 }} />
          Un dia
        </ToggleButton>
        <ToggleButton value="bulk" sx={{ px: 2 }}>
          <AutoAwesomeMotionIcon sx={{ fontSize: 16, mr: 0.75 }} />
          Varios dias
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'single' ? (
        <SingleDayPanel today={today} submittedDates={submittedDates} busy={busy} onSubmit={onSubmit} />
      ) : (
        <BulkPanel
          today={today}
          draft={draft}
          submittedDates={submittedDates}
          busy={busy}
          actions={actions}
          onSubmit={onSubmit}
        />
      )}
    </Stack>
  );
}
