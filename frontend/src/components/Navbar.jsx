import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as TransactionsIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const Navbar = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AppBar position="static" sx={{ mb: 2 }}>
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          CashCraft
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            startIcon={<DashboardIcon />}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/transactions"
            startIcon={<TransactionsIcon />}
          >
            Transactions
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/profile"
            startIcon={<ProfileIcon />}
          >
            Profile
          </Button>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            sx={{ ml: 1 }}
            aria-label="logout"
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;