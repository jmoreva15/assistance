import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, Container, Snackbar, Stack, Tab, Tabs, Typography,
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import InventoryIcon from '@mui/icons-material/Inventory';
import SettingsIcon from '@mui/icons-material/Settings';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useAsistencia } from './hooks/useAsistencia.js';

import Bienvenida from './Bienvenida.jsx';
import PanelRegistro from './PanelRegistro.jsx';
import DialogoConfirmar from './DialogoConfirmar.jsx';
import DialogoHoras from './componentes/DialogoHoras.jsx';
import SeccionMarcar from './secciones/SeccionMarcar.jsx';
import SeccionMasivo from './secciones/SeccionMasivo.jsx';
import SeccionOlvidado from './secciones/SeccionOlvidado.jsx';
import SeccionEnviados from './secciones/SeccionEnviados.jsx';
import SeccionConfiguracion from './secciones/SeccionConfiguracion.jsx';

export default function App() {
  const { datos, cargando, aviso, error, trabajo, setAviso, setError, acciones } = useAsistencia();
  const [pestana, setPestana] = useState(0);
  const [editando, setEditando] = useState(null); // { registro, alGuardar }
  const [porConfirmar, setPorConfirmar] = useState(null);

  const cuantosEnviados = useMemo(() => Object.keys(datos?.enviados || {}).length, [datos]);

  if (cargando) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Container>
    );
  }

  if (!datos) {
    return (
      <>
        <Bienvenida alEmpezar={acciones.empezar} alFallar={setError} />
        <Snackbar open={!!error} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Snackbar>
      </>
    );
  }

  // Todo envio pasa por una confirmacion: no se puede deshacer.
  const accionesConConfirmacion = { ...acciones, enviar: (registros) => setPorConfirmar(registros) };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} alignItems="baseline" flexWrap="wrap" useFlexGap>
          <Typography variant="h5">Asistencia</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip variant="outlined" label={`${cuantosEnviados} enviados`} color={cuantosEnviados ? 'success' : 'default'} />
        </Stack>

        <Tabs
          value={pestana}
          onChange={(_, v) => setPestana(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600 } }}
        >
          <Tab icon={<ScheduleIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Mi jornada" />
          <Tab icon={<EventAvailableIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Un dia" />
          <Tab icon={<AutoAwesomeMotionIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Varios dias" />
          <Tab icon={<InventoryIcon sx={{ fontSize: 17 }} />} iconPosition="start" label={`Enviados (${cuantosEnviados})`} />
          <Tab icon={<SettingsIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Configuracion" />
        </Tabs>

        {pestana === 0 && (
          <SeccionMarcar
            datos={datos}
            acciones={accionesConConfirmacion}
            enviando={!!trabajo.activo}
            alEditar={(registro) => setEditando({ registro, alGuardar: acciones.editarJornada })}
          />
        )}
        {pestana === 1 && <SeccionOlvidado datos={datos} acciones={accionesConConfirmacion} enviando={!!trabajo.activo} />}
        {pestana === 2 && (
          <SeccionMasivo
            datos={datos}
            acciones={accionesConConfirmacion}
            enviando={!!trabajo.activo}
            alEditar={(registro) => setEditando({ registro, alGuardar: (cambios) => acciones.editarDelLote(registro.fecha, cambios) })}
          />
        )}
        {pestana === 3 && <SeccionEnviados datos={datos} />}
        {pestana === 4 && <SeccionConfiguracion datos={datos} acciones={acciones} />}

        <PanelRegistro
          bitacora={datos.bitacora || []}
          activo={!!trabajo.activo}
          alLimpiar={acciones.limpiarBitacora}
        />

      </Stack>

      <DialogoHoras
        abierto={!!editando}
        registro={editando?.registro}
        alCerrar={() => setEditando(null)}
        alGuardar={async (cambios) => {
          await editando.alGuardar(cambios);
          setEditando(null);
        }}
      />

      <DialogoConfirmar
        abierto={!!porConfirmar}
        titulo="Enviar al formulario"
        confirmar={`Enviar ${porConfirmar?.length || 0}`}
        color="error"
        alCerrar={() => setPorConfirmar(null)}
        alConfirmar={() => {
          const registros = porConfirmar;
          setPorConfirmar(null);
          acciones.enviar(registros);
        }}
      >
        <Typography variant="body2" gutterBottom>
          Esto es lo que se va a enviar ({porConfirmar?.length} registro(s)):
        </Typography>
        <Box
          sx={{
            fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12.5, my: 1.5,
            border: 1, borderColor: 'divider', maxHeight: 220, overflow: 'auto',
          }}
        >
          {(porConfirmar || []).map((r) => (
            <Box key={r.fecha} sx={{ px: 1.25, py: 0.5, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
              {r.fecha} · {r.entrada} → {r.salida}
              {r.observacion ? ` · ${r.observacion}` : ''}
            </Box>
          ))}
        </Box>
        <Alert severity="warning">No se puede deshacer: Google no permite borrar una respuesta enviada.</Alert>
      </DialogoConfirmar>

      <Snackbar open={!!aviso && !error} autoHideDuration={6000} onClose={() => setAviso(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setAviso(null)}>{aviso}</Alert>
      </Snackbar>
      <Snackbar open={!!error} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </Container>
  );
}
