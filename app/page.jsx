'use client';

import { useMemo, useState } from 'react';
import { Alert, Box, Chip, Container, Divider, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsIcon from '@mui/icons-material/Settings';
import ActivityLog from '../components/ActivityLog.jsx';
import AppSkeleton from '../components/AppSkeleton.jsx';
import TopProgress from '../components/TopProgress.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PastDaysPanel from '../features/PastDaysPanel.jsx';
import SettingsPanel from '../features/SettingsPanel.jsx';
import SignIn from '../features/SignIn.jsx';
import SubmittedPanel from '../features/SubmittedPanel.jsx';
import TodayPanel from '../features/TodayPanel.jsx';
import { useAttendance } from '../lib/client/use-attendance.js';
import { MONO } from '../lib/theme/theme.js';

export default function Page() {
  const attendance = useAttendance();
  const { workspace, form, drafts, loading, busy, notice, error, setNotice, setError, today, todayDraft, todaySubmission, submittedDates, actions } = attendance;
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState(null);

  const submittedCount = workspace.submissions.length;
  const activity = useMemo(() => workspace.activity ?? [], [workspace.activity]);

  if (loading) return <AppSkeleton />;

  if (!workspace.user) {
    return (
      <>
        <TopProgress active={busy} />
        <SignIn
        busy={busy}
        error={error}
        onOpen={async ({ dni, fullName }) => {
          setError(null);
          return actions.openSession({ dni, fullName });
        }}
        />
      </>
    );
  }

  const askSubmit = (records, origin) => setPending({ records, origin });

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
      <TopProgress active={busy} />
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="baseline" flexWrap="wrap" useFlexGap>
          <Typography variant="h5">Asistencia</Typography>
          <Typography variant="caption" color="text.secondary">
            {workspace.user.fullName}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip variant="outlined" color={submittedCount ? 'success' : 'default'} label={`${submittedCount} enviados`} />
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<ScheduleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Hoy" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dias pasados" />
          <Tab icon={<InventoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Enviados (${submittedCount})`} />
          <Tab icon={<SettingsIcon sx={{ fontSize: 18 }} />} aria-label="Configuracion" sx={{ minWidth: 56, flex: '0 0 auto' }} />
        </Tabs>

        {tab === 0 && (
          <TodayPanel
            draft={todayDraft}
            submitted={todaySubmission}
            profile={workspace.user}
            form={form}
            busy={busy}
            actions={actions}
            onSubmit={askSubmit}
          />
        )}
        {tab === 1 && (
          <PastDaysPanel
            today={today}
            draft={drafts.bulk}
            submittedDates={submittedDates}
            busy={busy}
            actions={{ ...actions, showError: setError }}
            onSubmit={askSubmit}
          />
        )}
        {tab === 2 && <SubmittedPanel submissions={workspace.submissions} />}
        {tab === 3 && (
          <SettingsPanel user={workspace.user} formUrl={workspace.formUrl} busy={busy} actions={actions} />
        )}

        <ActivityLog entries={activity} />

      </Stack>

      <ConfirmDialog
        open={!!pending}
        title="Registrar asistencia"
        confirmLabel={`Registrar ${pending?.records.length ?? 0}`}
        color="error"
        onClose={() => setPending(null)}
        onConfirm={() => {
          const request = pending;
          setPending(null);
          actions.submit(request.records, request.origin);
        }}
      >
        <Typography variant="body2" gutterBottom>
          Se va a registrar tu asistencia de {pending?.records.length} dia(s):
        </Typography>
        <Box sx={{ fontFamily: MONO, fontSize: 12.5, my: 1.5, border: 1, borderColor: 'divider', maxHeight: 220, overflow: 'auto' }}>
          {(pending?.records ?? []).map((record) => (
            <Box
              key={record.date}
              sx={{ px: 1.25, py: 0.5, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
            >
              {record.date} · {record.clockIn} → {record.clockOut}
              {record.note ? ` · ${record.note}` : ''}
            </Box>
          ))}
        </Box>
        <Alert severity="warning">No se puede deshacer: Google no permite borrar una respuesta enviada.</Alert>
      </ConfirmDialog>

      <Snackbar
        open={!!notice && !error}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      </Snackbar>
      <Snackbar open={!!error} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
