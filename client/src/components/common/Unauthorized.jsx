import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

function Unauthorized() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={3}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
      <Typography variant="h4" component="h1" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center">
        You don't have permission to access this page.
        <br />
        Please contact your administrator if you think this is a mistake.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Go Back
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
        >
          Go Home
        </Button>
      </Box>
    </Box>
  );
}

export default Unauthorized;
