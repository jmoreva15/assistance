'use client';

import { useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { MONO } from '../lib/theme/theme.js';

const toDate = (iso) => (iso ? dayjs(`${iso}T12:00:00`) : null);
const fromDate = (value) => (value && value.isValid() ? value.format('YYYY-MM-DD') : null);
const toTime = (time) => (time ? dayjs(`2000-01-01T${time}:00`) : null);
const fromTime = (value) => (value && value.isValid() ? value.format('HH:mm') : null);

const EVERY_MINUTE = { hours: 1, minutes: 1 };

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
    <TimePicker
      label={label}
      value={toTime(value)}
      onChange={(next) => onChange(fromTime(next))}
      ampm={false}
      views={['hours', 'minutes']}
      format="HH:mm"
      timeSteps={EVERY_MINUTE}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          error: !!error,
          helperText: error || help,
          inputProps: { inputMode: 'numeric' },
        },
      }}
      {...rest}
    />
  );
}

export function InlineTime({ value, onCommit, disabled, width = 128, size = 15, align = 'right' }) {
  const pending = useRef(null);

  useEffect(() => () => clearTimeout(pending.current), []);

  const schedule = (next) => {
    const committed = fromTime(next);
    if (!committed || committed === value) return;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => onCommit(committed), 500);
  };

  const commitNow = (next) => {
    const committed = fromTime(next);
    if (!committed || committed === value) return;
    clearTimeout(pending.current);
    onCommit(committed);
  };

  return (
    <TimePicker
      value={toTime(value)}
      onChange={schedule}
      onAccept={commitNow}
      disabled={disabled}
      ampm={false}
      views={['hours', 'minutes']}
      format="HH:mm"
      timeSteps={EVERY_MINUTE}
      slotProps={{
        textField: {
          size: 'small',
          variant: 'standard',
          inputProps: { inputMode: 'numeric' },
          sx: {
            width,
            '& .MuiInput-input': {
              fontFamily: MONO,
              fontSize: size,
              fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              textAlign: align,
              padding: '2px 0',
            },
          },
          InputProps: { disableUnderline: disabled },
        },
        openPickerButton: { size: 'small', sx: { p: 0.25 } },
        openPickerIcon: { sx: { fontSize: size > 24 ? 20 : 16 } },
      }}
    />
  );
}
