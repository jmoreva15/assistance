'use client';

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@mui/material';

export default function ConfirmDialog({ open, title, confirmLabel, color = 'primary', onClose, onConfirm, children }) {
  const mobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={mobile}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color={color} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
