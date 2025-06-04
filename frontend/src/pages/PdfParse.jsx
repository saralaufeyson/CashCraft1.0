import React, { useState } from 'react';
import { Container, Box, Typography, Paper, Button, MenuItem, Select, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import axios from 'axios';
import ErrorAlert from '../components/ErrorAlert';

const CATEGORY_OPTIONS = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Salary', 'Transfer', 'Other'
];

const PdfParse = () => {
  const [pdfTransactions, setPdfTransactions] = useState([]);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [confirmed, setConfirmed] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
      // Only use JSON data, ignore CSV
      setPdfTransactions(response.data.transactions);
      setError('');
    } catch (err) {
      setError('Failed to parse PDF.');
    }
  };

  // Helper to check if a value looks like a date (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
  function looksLikeDate(val) {
    if (!val || typeof val !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{2}\/\d{2}\/\d{4}$/.test(val) || /^\d{2}-\d{2}-\d{4}$/.test(val);
  }

  // Try to find the keys for date, particulars, credit, debit in a case-insensitive way
  function getFieldKey(obj, possibleNames) {
    const keys = Object.keys(obj);
    for (const name of possibleNames) {
      const key = keys.find(k => k.toLowerCase().includes(name));
      if (key) return key;
    }
    return null;
  }

  // Only show rows that have a date-like value, and non-empty particulars, credit, or debit
  const filteredTransactions = pdfTransactions
    .map((tx, idx) => {
      // Find relevant keys
      const dateKey = getFieldKey(tx, ['date', 'tran date']);
      const particularsKey = getFieldKey(tx, ['particular', 'desc', 'narration', 'details']);
      const creditKey = getFieldKey(tx, ['credit', 'cr']);
      const debitKey = getFieldKey(tx, ['debit', 'dr']);

      // Get values
      const date = dateKey ? tx[dateKey] : '';
      const particulars = particularsKey ? tx[particularsKey] : '';
      const credit = creditKey ? parseFloat(tx[creditKey]) : null;
      const debit = debitKey ? parseFloat(tx[debitKey]) : null;

      // Only include if looks like a date and has particulars and at least one amount
      if (looksLikeDate(date) && particulars && (credit || debit)) {
        return {
          _rowId: idx, // unique row id for React
          date,
          particulars,
          amount: credit ? credit : debit,
          type: credit ? 'Credit' : 'Debit',
          raw: tx
        };
      }
      return null;
    })
    .filter(Boolean);

  // State for category selection per row
  const [categoryMap, setCategoryMap] = useState({});

  const handleCategoryChange = (rowId, value) => {
    setCategoryMap({ ...categoryMap, [rowId]: value });
  };

  const handleConfirm = (row) => {
    setConfirmed([
      ...confirmed,
      {
        ...row,
        category: categoryMap[row._rowId] || 'Other'
      }
    ]);
    // Remove from filteredTransactions
    setPdfTransactions(pdfTransactions.filter((_, idx) => idx !== row._rowId));
    // Remove category selection for this row
    const newCatMap = { ...categoryMap };
    delete newCatMap[row._rowId];
    setCategoryMap(newCatMap);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>PDF Statement Parser</Typography>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
        <Button variant="contained" sx={{ ml: 2 }} onClick={handlePdfUpload}>Parse PDF</Button>
        <ErrorAlert error={error} />
        {filteredTransactions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Parsed Transactions</Typography>
            <Paper>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction Date</TableCell>
                    <TableCell>Particulars</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map(row => (
                    <TableRow key={row._rowId}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.particulars}</TableCell>
                      <TableCell>{row.amount}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={categoryMap[row._rowId] || ''}
                          onChange={e => handleCategoryChange(row._rowId, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">Select</MenuItem>
                          {CATEGORY_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!categoryMap[row._rowId]}
                          onClick={() => handleConfirm(row)}
                        >
                          Confirm
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
        {confirmed.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Confirmed Transactions</Typography>
            <Paper>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction Date</TableCell>
                    <TableCell>Particulars</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {confirmed.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.particulars}</TableCell>
                      <TableCell>{row.amount}</TableCell>
                      <TableCell>{row.type}</TableCell>
                      <TableCell>{row.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default PdfParse;