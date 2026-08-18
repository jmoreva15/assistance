import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle , useMediaQuery, useTheme } from '@mui/material';

export default function DialogoConfirmar({ abierto, titulo, confirmar, color = 'primary', alCerrar, alConfirmar, children }) {
  const movil = useMediaQuery(useTheme().breakpoints.down('sm'));
  return (
    <Dialog open={abierto} onClose={alCerrar} maxWidth="xs" fullWidth fullScreen={movil}>
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={alCerrar}>Cancelar</Button>
        <Button variant="contained" color={color} onClick={alConfirmar}>
          {confirmar}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
