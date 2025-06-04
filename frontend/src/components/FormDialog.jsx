import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';

// children: form fields, onSubmit: form submit handler
const FormDialog = ({ open, onClose, onSubmit, title, children, submitLabel }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Box component="form" onSubmit={onSubmit} sx={{ mt: 1 }}>
        {children}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onSubmit} variant="contained" type="submit">
        {submitLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default FormDialog;
