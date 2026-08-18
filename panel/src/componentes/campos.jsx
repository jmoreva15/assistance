/**
 * Campos de fecha y hora con los pickers de Material UI. Hacia afuera hablan en
 * texto ("YYYY-MM-DD" y "HH:MM"), asi el dominio sigue sin saber de dayjs.
 */
import React from 'react';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

const aFecha = (iso) => (iso ? dayjs(`${iso}T12:00:00`) : null);
const deFecha = (d) => (d && d.isValid() ? d.format('YYYY-MM-DD') : null);
const aHora = (hhmm) => (hhmm ? dayjs(`2000-01-01T${hhmm}:00`) : null);
const deHora = (d) => (d && d.isValid() ? d.format('HH:mm') : null);

export function CampoFecha({ etiqueta, valor, alCambiar, maxima, minima, error, ayuda, ...resto }) {
  return (
    <DatePicker
      label={etiqueta}
      value={aFecha(valor)}
      onChange={(d) => alCambiar(deFecha(d))}
      maxDate={aFecha(maxima)}
      minDate={aFecha(minima)}
      format="DD/MM/YYYY"
      slotProps={{
        textField: { size: 'small', fullWidth: true, error: !!error, helperText: error || ayuda },
        field: { clearable: false },
      }}
      {...resto}
    />
  );
}

export function CampoHora({ etiqueta, valor, alCambiar, error, ayuda, ...resto }) {
  return (
    <TimePicker
      label={etiqueta}
      value={aHora(valor)}
      onChange={(d) => alCambiar(deHora(d))}
      ampm={false}
      views={['hours', 'minutes']}
      format="HH:mm"
      slotProps={{
        textField: { size: 'small', fullWidth: true, error: !!error, helperText: error || ayuda },
      }}
      {...resto}
    />
  );
}
