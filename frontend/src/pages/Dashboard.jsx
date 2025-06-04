import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  IconButton,
  TextField
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import FormDialog from '../components/FormDialog';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const Dashboard = () => {
  const [jars, setJars] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingJar, setEditingJar] = useState(null);
  const [jarForm, setJarForm] = useState({
    name: '',
    budget: '',
    color: '#000000'
  });

  useEffect(() => {
    fetchJars();
  }, []);

  const fetchJars = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/user/jars', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJars(response.data);
    } catch (error) {
      console.error('Error fetching jars:', error);
    }
  };

  const handleOpenDialog = (jar = null) => {
    if (jar) {
      setEditingJar(jar);
      setJarForm({
        name: jar.name,
        budget: jar.budget,
        color: jar.color
      });
    } else {
      setEditingJar(null);
      setJarForm({
        name: '',
        budget: '',
        color: '#000000'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingJar(null);
    setJarForm({
      name: '',
      budget: '',
      color: '#000000'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formattedData = {
        ...jarForm,
        budget: parseFloat(jarForm.budget) || 0
      };
      
      if (editingJar) {
        await axios.put(
          `/api/user/jars/${editingJar._id}`,
          formattedData,
          { headers: { Authorization: `Bearer ${token}` }}
        );
      } else {
        await axios.post(
          '/api/user/jars',
          formattedData,
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
      fetchJars();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving jar:', error.response?.data || error.message);
    }
}; // Make sure there's only one closing brace here

  const chartData = {
    labels: jars.map(jar => jar.name),
    datasets: [
      {
        data: jars.map(jar => jar.budget),
        backgroundColor: jars.map(jar => jar.color),
        borderWidth: 1
      }
    ]
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Budget Jars
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Jar
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {jars.map((jar) => (
              <Grid item xs={12} sm={6} md={4} key={jar._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" component="h2">
                        {jar.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(jar)}
                        aria-label="edit jar"
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{ color: jar.color, fontWeight: 'bold' }}
                    >
                      ${jar.budget.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}> {/* Add fixed height to card */}
            <CardContent sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}> {/* Add fixed height and flex layout */}
              <Typography variant="h6" component="h3" gutterBottom>
                Budget Distribution
              </Typography>
              {jars.length > 0 ? (
                <Box sx={{ flex: 1, position: 'relative' }}> {/* Add container with relative positioning */}
                  <Doughnut
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </Box>
              ) : (
                <Typography color="textSecondary" align="center">
                  No jars available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <FormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        title={editingJar ? 'Edit Jar' : 'Create New Jar'}
        submitLabel={editingJar ? 'Save Changes' : 'Create Jar'}
      >
        <TextField
          margin="normal"
          required
          fullWidth
          label="Jar Name"
          name="name"
          value={jarForm.name}
          onChange={(e) => setJarForm({ ...jarForm, name: e.target.value })}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Budget Amount"
          name="budget"
          type="number"
          value={jarForm.budget}
          onChange={(e) => setJarForm({ ...jarForm, budget: e.target.value })}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          label="Color"
          name="color"
          type="color"
          value={jarForm.color}
          onChange={(e) => setJarForm({ ...jarForm, color: e.target.value })}
        />
      </FormDialog>
    </Box>
  );
};

export default Dashboard;