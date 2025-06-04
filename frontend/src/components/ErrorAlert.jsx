import React from 'react';
import { Alert } from '@mui/material';

const ErrorAlert = ({ error }) => (
  error ? <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert> : null
);

export default ErrorAlert;
