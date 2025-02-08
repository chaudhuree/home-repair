import { Box, CircularProgress, Typography } from '@mui/material';

function LoadingState({ message = 'Loading...' }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

export default LoadingState;
