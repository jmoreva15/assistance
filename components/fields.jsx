'use client';

import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimeField } from '@mui/x-date-pickers/TimeField';
import { MONO } from '../lib/theme/theme.js';

const toDate = (iso) => (iso ? dayjs(`${iso}T12:00:00`) : null);
const fromDate = (value) => (value && value.isValid() ? value.format('YYYY-MM-DD') : null);
const toTime = (time) => (time ? dayjs(`2000-01-01T${time}:00`) : null);
const fromTime = (value) => (value && value.isValid() ? value.format('HH:mm') : null);

export function DateField({ label, value, onChange, max, min, error, help, ...rest }) {
  return (
    <DatePicker
      label={label}
      value={toDate(value)}
      onChange={(next) => onChange(fromDate(next))}
      maxDate={toDate(max)}
      minDate={toDate(min)}
      format="DD/MM/YYYY"
      slotProps={{ textField: { size: 'small', fullWidth: true, error: !!error, helperText: error || help } }}
      {...rest}
    />
  );
}

export function TimeInput({ label, value, onChange, error, help, ...rest }) {
  return (
    <TimeField
      label={label}
      value={toTime(value)}
      onChange={(next) => onChange(fromTime(next))}
      format="HH:mm"
      size="small"
      fullWidth
      error={!!error}
      helperText={error || help}
      inputProps={{ inputMode: 'numeric' }}
      {...rest}
    />
  );
}

export function InlineTime({ value, onCommit, disabled, width = 96, size = 15, align = 'right' }) {
  return (
    <TimeField
      value={toTime(value)}
      onChange={(next) => {
        const committed = fromTime(next);
        if (committed && committed !== value) onCommit(committed);
      }}
      disabled={disabled}
      format="HH:mm"
      variant="standard"
      size="small"
      inputProps={{ inputMode: 'numeric' }}
      sx={{
        width,
        '& .MuiInput-input': {
          fontFamily: MONO,
          fontSize: size,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          textAlign: align,
          padding: '2px 0',
        },
      }}
      slotProps={{ textField: { InputProps: { disableUnderline: disabled } } }}
    />
  );
}
