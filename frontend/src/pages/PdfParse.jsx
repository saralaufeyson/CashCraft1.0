import React, { useState } from 'react';
import { Container, Box, Typography, Paper, Button, Alert } from '@mui/material';
import axios from 'axios';
import CsvTable from '../components/CsvTable';
import ErrorAlert from '../components/ErrorAlert';

const PdfParse = () => {
  const [pdfCsv, setPdfCsv] = useState('');
  const [pdfTransactions, setPdfTransactions] = useState([]);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [confirmed, setConfirmed] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPdfCsv('');
    setPdfTransactions([]);
    setError('');
    setConfirmed([]);
  };

  const handlePdfUpload = async () => {
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/transactions/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setPdfCsv(response.data.csv);
      setPdfTransactions(response.data.transactions);
      setError('');
    } catch (err) {
      setError('Failed to parse PDF.');
    }
  };

  const handleConfirm = (tx) => {
    setConfirmed([...confirmed, tx]);
    setPdfTransactions(pdfTransactions.filter(t => t !== tx));
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>PDF Statement Parser</Typography>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <Button variant="contained" sx={{ ml: 2 }} onClick={handlePdfUpload}>Parse PDF</Button>
        <ErrorAlert error={error} />
        {pdfCsv && (
          <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6">Extracted CSV</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{pdfCsv}</pre>
          </Paper>
        )}
        {pdfTransactions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Parsed Transactions</Typography>
            <CsvTable data={pdfTransactions} />
          </Box>
        )}
        {confirmed.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Confirmed Transactions</Typography>
            <CsvTable data={confirmed} />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default PdfParse;