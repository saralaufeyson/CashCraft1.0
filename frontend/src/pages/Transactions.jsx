import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as DownloadIcon // ✅ Fixed import
} from '@mui/icons-material';
import axios from 'axios';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  SwapHoriz as TransferIcon
} from '@mui/icons-material';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import {
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment
} from '@mui/material';
import FormDialog from '../components/FormDialog';
import CsvTable from '../components/CsvTable';
import FileUploadButton from '../components/FileUploadButton';
import ErrorAlert from '../components/ErrorAlert';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CATEGORY_OPTIONS = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Salary', 'Transfer', 'Other'
];

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [jars, setJars] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [error, setError] = useState('');
  // Add this new state for date range
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    type: 'expense',
    jar: '',
    category: 'default'
  });
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    jar: 'all',
    startAmount: '',
    endAmount: ''
  });
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromJar: '',
    toJar: '',
    amount: '',
    description: ''
  });
  const [pdfCsv, setPdfCsv] = useState("");
  const [pdfTransactions, setPdfTransactions] = useState([]);
  const [pdfPending, setPdfPending] = useState([]); // for unconfirmed
  const [pdfConfirmed, setPdfConfirmed] = useState([]); // for confirmed
  const [pdfCategoryMap, setPdfCategoryMap] = useState({});

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchTransactions();
    fetchJars();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      setError('Error fetching transactions');
    }
  };

  const fetchJars = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/jars', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJars(response.data);
    } catch (error) {
      setError('Error fetching jars');
    }
  };

  const handleOpenDialog = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setTransactionForm({
        description: transaction.description,
        amount: transaction.amount.toString(),
        type: transaction.type,
        jar: transaction.jar,
        category: transaction.category || 'default'
      });
    } else {
      setEditingTransaction(null);
      setTransactionForm({
        description: '',
        amount: '',
        type: 'expense',
        jar: '',
        category: 'default'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTransaction(null);
    setTransactionForm({
      description: '',
      amount: '',
      type: 'expense',
      jar: '',
      category: 'default'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const token = localStorage.getItem('token');
    const formData = {
      description: transactionForm.description,
      amount: parseFloat(transactionForm.amount),
      type: transactionForm.type,
      jar: transactionForm.jar,
      category: transactionForm.category
    };

    try {
      if (editingTransaction) {
        await axios.put(`/api/transactions/${editingTransaction._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/transactions', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchTransactions();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Error saving transaction');
    }
  };

  const handleDelete = async (transactionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTransactions();
    } catch (error) {
      setError('Error deleting transaction');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/transactions/report', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'text/csv'
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Error downloading report');
    }
  };

  const handleTransfer = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/transactions/transfer', transferForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTransactions();
      setTransferDialog(false);
      setTransferForm({
        fromJar: '',
        toJar: '',
        amount: '',
        description: ''
      });
    } catch (error) {
      setError('Error transferring between jars');
    }
  };

  const renderCharts = () => {
    const monthlyData = transactions.reduce((acc, transaction) => {
      const month = new Date(transaction.createdAt).toLocaleString('default', { month: 'short' });
      if (!acc[month]) acc[month] = { income: 0, expense: 0 };
      if (transaction.type === 'income') acc[month].income += transaction.amount;
      else acc[month].expense += transaction.amount;
      return acc;
    }, {});
  
    const jarData = transactions.reduce((acc, transaction) => {
      const jarName = jars.find(j => j._id === transaction.jar)?.name || 'Unknown';
      if (!acc[jarName]) acc[jarName] = 0;
      acc[jarName] += transaction.amount;
      return acc;
    }, {});
  
    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Monthly Overview</Typography>
              <Line
                data={{
                  labels: Object.keys(monthlyData),
                  datasets: [
                    {
                      label: 'Income',
                      data: Object.values(monthlyData).map(d => d.income),
                      borderColor: theme.palette.success.main,
                      tension: 0.1
                    },
                    {
                      label: 'Expenses',
                      data: Object.values(monthlyData).map(d => d.expense),
                      borderColor: theme.palette.error.main,
                      tension: 0.1
                    }
                  ]
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">Distribution by Jar</Typography>
              <Pie
                data={{
                  labels: Object.keys(jarData),
                  datasets: [{
                    data: Object.values(jarData),
                    backgroundColor: jars.map((_, i) => 
                      theme.palette.augmentColor({ color: { main: `hsl(${i * 360 / jars.length}, 70%, 50%)` } }).main
                    )
                  }]
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = filters.type === 'all' || transaction.type === filters.type;
    const matchesJar = filters.jar === 'all' || transaction.jar === filters.jar;
    const matchesAmount = (
      (!filters.startAmount || transaction.amount >= parseFloat(filters.startAmount)) &&
      (!filters.endAmount || transaction.amount <= parseFloat(filters.endAmount))
    );
  
    return matchesSearch && matchesType && matchesJar && matchesAmount;
  });

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/transactions/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      // Use only JSON data
      setPdfTransactions(response.data.transactions || []);
      // Reset pending/confirmed/category
      setPdfPending(response.data.transactions || []);
      setPdfConfirmed([]);
      setPdfCategoryMap({});
    } catch (error) {
      console.error('PDF upload error:', error);
    }
  };

  // Helpers for PDF table
  function looksLikeDate(val) {
    if (!val || typeof val !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(val) || /^\d{2}\/\d{2}\/\d{4}$/.test(val) || /^\d{2}-\d{2}-\d{4}$/.test(val);
  }
  function getFieldKey(obj, possibleNames) {
    const keys = Object.keys(obj);
    for (const name of possibleNames) {
      const key = keys.find(k => k.toLowerCase().replace(/\s/g, '').includes(name));
      if (key) return key;
    }
    return null;
  }
  // Prepare rows for display (robust for various bank formats)
  const pdfRows = pdfPending
    .map((tx, idx) => {
      // Date keys
      const dateKey = getFieldKey(tx, [
        'trandate', 'date', 'transactiondate', 'valuedate'
      ]);
      // Particulars keys
      const particularsKey = getFieldKey(tx, [
        'particular', 'desc', 'narration', 'details', 'remark', 'remarks', 'info', 'description', 'transactiondetails', 'transaction detail'
      ]);
      // Credit keys
      const creditKey = getFieldKey(tx, [
        'credit', 'cr', 'deposit', 'deposited', 'depositamt', 'deposit amount', 'depositamt', 'depositamount'
      ]);
      // Debit keys
      const debitKey = getFieldKey(tx, [
        'debit', 'dr', 'withdrawal', 'withdrawn', 'withdrawalamt', 'withdrawal amount', 'withdrawalamt', 'withdrawalamount'
      ]);

      const date = dateKey ? tx[dateKey] : '';
      // Fallback: if particularsKey not found, use the first non-date, non-credit, non-debit field
      let particulars = '';
      if (particularsKey) {
        particulars = tx[particularsKey];
      } else {
        const skipKeys = [dateKey, creditKey, debitKey].filter(Boolean);
        const firstOtherKey = Object.keys(tx).find(
          k => !skipKeys.includes(k)
        );
        particulars = firstOtherKey ? tx[firstOtherKey] : '';
      }

      // Parse credit and debit as floats, treat empty/NaN as 0
      const creditRaw = creditKey ? tx[creditKey] : '';
      const debitRaw = debitKey ? tx[debitKey] : '';
      // Remove commas and parse
      const credit = parseFloat((creditRaw || '').toString().replace(/,/g, '')) || 0;
      const debit = parseFloat((debitRaw || '').toString().replace(/,/g, '')) || 0;

      let type = '';
      let amount = '';
      // Only one of credit or debit should be non-zero per row
      if (credit > 0 && debit === 0) {
        type = 'Credit';
        amount = credit;
      } else if (debit > 0 && credit === 0) {
        type = 'Debit';
        amount = debit;
      } else if (credit > 0 && debit > 0) {
        // If both are present, prefer the larger one or mark as ambiguous
        if (credit >= debit) {
          type = 'Credit';
          amount = credit;
        } else {
          type = 'Debit';
          amount = debit;
        }
      } else if (credit > 0) {
        type = 'Credit';
        amount = credit;
      } else if (debit > 0) {
        type = 'Debit';
        amount = debit;
      } else {
        // If both are zero, skip this row
        return null;
      }

      if (looksLikeDate(date) && particulars && amount) {
        return {
          _rowId: idx,
          date,
          particulars,
          amount,
          type,
          raw: tx
        };
      }
      return null;
    })
    .filter(Boolean);

  const handlePdfCategoryChange = (rowId, value) => {
    setPdfCategoryMap({ ...pdfCategoryMap, [rowId]: value });
  };

  const handlePdfConfirm = (row) => {
    setPdfConfirmed([
      ...pdfConfirmed,
      {
        ...row,
        category: pdfCategoryMap[row._rowId] || 'Other'
      }
    ]);
    setPdfPending(pdfPending.filter((_, idx) => idx !== row._rowId));
    const newCatMap = { ...pdfCategoryMap };
    delete newCatMap[row._rowId];
    setPdfCategoryMap(newCatMap);
  };

  const handlePdfReject = (row) => {
    setPdfPending(pdfPending.filter((_, idx) => idx !== row._rowId));
    const newCatMap = { ...pdfCategoryMap };
    delete newCatMap[row._rowId];
    setPdfCategoryMap(newCatMap);
  };

  return (
    <Container>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transactions</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Transaction
          </Button>
          <FileUploadButton
            label="Upload Bank PDF"
            accept="application/pdf"
            onChange={handlePdfUpload}
            startIcon={<DownloadIcon />}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              type="date"
              label="End Date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Button
              variant="outlined"
              onClick={handleDownloadReport}
              startIcon={<DownloadIcon />}
            >
              Download Report
            </Button>
          </Box>
        </Box>
      </Box>

      <ErrorAlert error={error} />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Jar</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  <Typography
                    sx={{
                      color: transaction.type === 'income' ? 'success.main' : 'error.main',
                      fontWeight: 'bold'
                    }}
                  >
                    ${transaction.amount.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>
                  {transaction.type}
                </TableCell>
                <TableCell>
                  {jars.find((jar) => jar._id === transaction.jar)?.name || 'N/A'}
                </TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(transaction)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(transaction._id)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <FormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        submitLabel={editingTransaction ? 'Save Changes' : 'Add Transaction'}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          label="Description"
          value={transactionForm.description}
          onChange={(e) =>
            setTransactionForm({ ...transactionForm, description: e.target.value })
          }
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Amount"
          type="number"
          value={transactionForm.amount}
          onChange={(e) =>
            setTransactionForm({ ...transactionForm, amount: e.target.value })
          }
        />
        <TextField
          margin="normal"
          required
          fullWidth
          select
          label="Type"
          value={transactionForm.type}
          onChange={(e) =>
            setTransactionForm({ ...transactionForm, type: e.target.value })
          }
        >
          <MenuItem value="expense">Expense</MenuItem>
          <MenuItem value="income">Income</MenuItem>
        </TextField>
        <TextField
          margin="normal"
          required
          fullWidth
          select
          label="Jar"
          value={transactionForm.jar}
          onChange={(e) =>
            setTransactionForm({ ...transactionForm, jar: e.target.value })
          }
        >
          {jars.map((jar) => (
            <MenuItem key={jar._id} value={jar._id}>
              {jar.name}
            </MenuItem>
          ))}
        </TextField>
      </FormDialog>

      {/* PDF Transactions Table */}
      {pdfRows.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6">Parsed PDF Transactions</Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Transaction Date</TableCell>
                  <TableCell>Credit/Debit</TableCell>
                  <TableCell>Particulars</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pdfRows.map(row => (
                  <TableRow key={row._rowId}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.particulars}</TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={pdfCategoryMap[row._rowId] || ''}
                        onChange={e => handlePdfCategoryChange(row._rowId, e.target.value)}
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
                        color="success"
                        disabled={!pdfCategoryMap[row._rowId]}
                        onClick={() => handlePdfConfirm(row)}
                        sx={{ mr: 1 }}
                      >
                        Yes
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handlePdfReject(row)}
                      >
                        No
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Optionally, show confirmed PDF transactions */}
      {pdfConfirmed.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6">Confirmed PDF Transactions</Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Transaction Date</TableCell>
                  <TableCell>Credit/Debit</TableCell>
                  <TableCell>Particulars</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pdfConfirmed.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.particulars}</TableCell>
                    <TableCell>{row.amount}</TableCell>
                    <TableCell>{row.category}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}
    </Container>
  );
};

export default Transactions;