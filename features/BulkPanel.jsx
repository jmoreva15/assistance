'use client';

import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotesIcon from '@mui/icons-material/Notes';
import SendIcon from '@mui/icons-material/Send';
import { DateField, InlineTime } from '../components/fields.jsx';
import ObservationDialog from '../components/ObservationDialog.jsx';
import { buildBatch, isSubmittable } from '../lib/domain/records.js';
import { addDays, formatDuration, formatShortDate, weekdaysBetween, workedMinutes } from '../lib/domain/time.js';

export default function BulkPanel({ today, draft, submittedDates, busy, actions, onSubmit }) {
  const yesterday = addDays(today, -1);
  const mobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const [from, setFrom] = useState(() => addDays(yesterday, -6));
  const [to, setTo] = useState(yesterday);
  const [selected, setSelected] = useState(() => new Set());
  const [noteFor, setNoteFor] = useState(null);

  const rangeOk = from && to && from <= to && to <= yesterday;

  const generate = async () => {
    const { records, alreadySubmitted, error } = buildBatch({ from, to, submittedDates, today });
    if (error) return actions.showError(error);
    const result = await actions.createBatch({ from, to, records, alreadySubmitted });
    if (result?.user) setSelected(new Set(records.map((record) => record.date)));
  };

  const remove = async () => {
    await actions.removeBatch();
    setSelected(new Set());
  };

  const toggle = (date) =>
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  const rows = (draft?.records ?? []).map((record) => ({ record, allowed: isSubmittable(record, today) }));
  const allowedDates = rows.filter((row) => row.allowed).map((row) => row.record.date);
  const chosen = rows.filter((row) => selected.has(row.record.date)).map((row) => row.record);

  const NoteButton = ({ record }) => (
    <Button
      size="small"
      startIcon={record.note ? null : <NotesIcon sx={{ fontSize: 14 }} />}
      onClick={() => setNoteFor(record)}
      sx={{ justifyContent: 'flex-start', maxWidth: 190, textAlign: 'left' }}
    >
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {record.note || 'observacion'}
      </Box>
    </Button>
  );

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
            <DateField label="Desde" value={from} onChange={setFrom} max={yesterday} />
            <DateField label="Hasta" value={to} onChange={setTo} max={yesterday} min={from} />
            <Button
              variant="contained"
              startIcon={<AutoAwesomeMotionIcon />}
              onClick={generate}
              disabled={!rangeOk || !weekdaysBetween(from, to).length || busy}
              sx={{ height: 40, flexShrink: 0, minWidth: 130 }}
            >
              Generar
            </Button>
          </Stack>

          {from && to && from > to && <Alert severity="error" sx={{ mt: 2 }}>La fecha inicial es posterior a la final.</Alert>}
          {to && to > yesterday && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Solo se generan dias anteriores a hoy. El maximo es {formatShortDate(yesterday)}.
            </Alert>
          )}
        </CardContent>
      </Card>

      {!rows.length ? (
        <Paper variant="outlined" sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Elige el intervalo y dale a <strong>Generar</strong>.
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ px: 1.5, py: 1, borderBottom: { md: 0 }, mb: { xs: 1.5, md: 0 } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Generados ({rows.length})
              </Typography>
              <Button startIcon={<DoneAllIcon />} onClick={() => setSelected(new Set(allowedDates))} disabled={!allowedDates.length}>
                Seleccionar todos
              </Button>
              <Button startIcon={<DeleteOutlineIcon />} onClick={remove} disabled={busy}>
                Borrar
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                color="error"
                startIcon={<SendIcon />}
                disabled={!chosen.length || busy}
                onClick={() => onSubmit(chosen, 'bulk')}
              >
                Registrar {chosen.length ? `(${chosen.length})` : 'asistencia'}
              </Button>
            </Stack>
          </Paper>

          {mobile ? (
            <Stack>
              {rows.map(({ record, allowed }) => (
                <Paper key={record.date} variant="outlined" sx={{ p: 1.5, mt: '-1px' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Checkbox
                      size="small"
                      checked={selected.has(record.date)}
                      disabled={!allowed}
                      onChange={() => toggle(record.date)}
                      sx={{ p: 0.5 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {formatShortDate(record.date)}{' '}
                        <Typography component="span" variant="caption" color="text.secondary">
                          {record.weekday}
                        </Typography>
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <InlineTime
                          value={record.clockIn}
                          onCommit={(value) => actions.editBatchDay(record.date, { clockIn: value })}
                          disabled={busy}
                          align="left"
                          width={62}
                        />
                        <Typography variant="caption" color="text.secondary">
                          →
                        </Typography>
                        <InlineTime
                          value={record.clockOut}
                          onCommit={(value) => actions.editBatchDay(record.date, { clockOut: value })}
                          disabled={busy}
                          align="left"
                          width={62}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(workedMinutes(record.clockIn, record.clockOut))}
                        </Typography>
                      </Stack>
                      <NoteButton record={record} />
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Fecha</TableCell>
                    <TableCell>Dia</TableCell>
                    <TableCell align="right">Entrada</TableCell>
                    <TableCell align="right">Salida</TableCell>
                    <TableCell align="right">Jornada</TableCell>
                    <TableCell>Observacion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(({ record, allowed }) => (
                    <TableRow key={record.date} hover sx={{ opacity: allowed ? 1 : 0.7 }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selected.has(record.date)}
                          disabled={!allowed}
                          onChange={() => toggle(record.date)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatShortDate(record.date)}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{record.weekday}</TableCell>
                      <TableCell align="right">
                        <InlineTime
                          value={record.clockIn}
                          onCommit={(value) => actions.editBatchDay(record.date, { clockIn: value })}
                          disabled={busy}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <InlineTime
                          value={record.clockOut}
                          onCommit={(value) => actions.editBatchDay(record.date, { clockOut: value })}
                          disabled={busy}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {formatDuration(workedMinutes(record.clockIn, record.clockOut))}
                      </TableCell>
                      <TableCell>
                        <NoteButton record={record} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      <ObservationDialog
        open={!!noteFor}
        record={noteFor}
        onClose={() => setNoteFor(null)}
        onSave={async (note) => {
          const target = noteFor;
          setNoteFor(null);
          await actions.editBatchDay(target.date, { note });
        }}
      />
    </Stack>
  );
}
