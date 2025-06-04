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

      {pdfCsv && (
        <Box mt={3}>
          <Typography variant="h6">Extracted CSV</Typography>
          <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
            {pdfCsv}
          </Paper>
          <Typography variant="h6">Parsed Transactions</Typography>
          <CsvTable data={pdfTransactions} />
        </Box>
      )}
    </Container>
  );
};

export default Transactions;


const [pdfCsv, setPdfCsv] = useState("");
const [pdfTransactions, setPdfTransactions] = useState([]);
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
    setPdfCsv(response.data.csv || "");
    setPdfTransactions(response.data.transactions || []);
  } catch (error) {
    console.error('PDF upload error:', error);
  }
};
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pdfTransactions.map((row, idx) => (
            <TableRow key={idx}>
              {Object.values(row).map((cell, i) => (
                <TableCell key={i}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
{pdfCsv && (
  <Box mt={3}>
    <Typography variant="h6">Extracted CSV</Typography>
    <Paper sx={{ p: 2, mb: 2, whiteSpace: 'pre', overflowX: 'auto' }}>
      {pdfCsv}
    </Paper>
    <Typography variant="h6">Parsed Transactions</Typography>
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {pdfTransactions[0] && Object.keys(pdfTransactions[0]).map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>