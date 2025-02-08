import { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by error boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          gap={3}
          p={3}
        >
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            An error occurred while rendering this page.
            <br />
            Please try again or contact support if the problem persists.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={this.handleReset}
            >
              Reload Page
            </Button>
          </Box>
          {process.env.NODE_ENV === 'development' && (
            <Typography
              variant="body2"
              color="error"
              sx={{
                mt: 2,
                p: 2,
                bgcolor: 'error.light',
                borderRadius: 1,
                maxWidth: '100%',
                overflow: 'auto'
              }}
            >
              {this.state.error?.toString()}
            </Typography>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
