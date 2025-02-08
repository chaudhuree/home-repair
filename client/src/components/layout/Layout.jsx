import { Box, Container, Typography, Paper } from '@mui/material';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';

function Layout({ children }) {
  const { user } = useSelector((state) => state.auth);

  const getRoleDisplay = (role) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin Dashboard';
      case 'manager':
        return 'Manager Dashboard';
      case 'employee':
        return 'Employee Dashboard';
      case 'user':
        return 'User Dashboard';
      case 'property_manager':
        return 'Property Manager Dashboard';
      default:
        return 'Welcome';
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        width: '100vw',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      <Navbar />
      {user && (
        <Paper 
          elevation={0} 
          sx={{ 
            py: 2,
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
            width: '100%'
          }}
        >
          <Box 
            sx={{ 
              width: '100%',
              maxWidth: '100%',
              px: { xs: 2, sm: 4, md: 6 },
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Typography 
              variant="h6" 
              component="h1"
              sx={{
                color: 'text.primary',
                fontWeight: 500
              }}
            >
              {getRoleDisplay(user.role)}
            </Typography>
          </Box>
        </Paper>
      )}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          width: '100%',
          maxWidth: '100%',
          py: { xs: 2, sm: 3, md: 4 },
          overflowX: 'hidden'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
