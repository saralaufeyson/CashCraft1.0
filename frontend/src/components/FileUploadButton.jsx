import React from 'react';
import { Button } from '@mui/material';

const FileUploadButton = ({ label, accept, onChange, startIcon }) => (
  <Button variant="outlined" component="label" startIcon={startIcon}>
    {label}
    <input type="file" accept={accept} hidden onChange={onChange} />
  </Button>
);

export default FileUploadButton;
