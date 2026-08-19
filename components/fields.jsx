'use client';

import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

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

export function TimeField({ label, value, onChange, error, help, ...rest }) {
  return (
    <TimePicker
      label={label}
      value={toTime(value)}
      onChange={(next) => onChange(fromTime(next))}
      ampm={false}
      views={['hours', 'minutes']}
      format="HH:mm"
      slotProps={{ textField: { size: 'small', fullWidth: true, error: !!error, helperText: error || help } }}
      {...rest}
    />
  );
}
