import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchServices } from '../../redux/slices/serviceSlice';
import { Grid, Container, Typography, CircularProgress, Box } from '@mui/material';
import ServiceCard from './ServiceCard';

function ServiceList() {
  const dispatch = useDispatch();
  const { services, loading, error } = useSelector((state) => state.service);

  useEffect(() => {
    dispatch(fetchServices());
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom 
        sx={{ 
          mb: 4,
          px: { xs: 2, sm: 4, md: 6 }
        }}
      >
        Our Services
      </Typography>
      <Grid 
        container 
        spacing={{ xs: 2, sm: 3, md: 4 }}
        sx={{ 
          width: '100%',
          margin: 0,
          px: { xs: 2, sm: 4, md: 6 }
        }}
      >
        {services.map((service) => (
          <Grid item key={service.id} xs={12} sm={6} lg={4} xl={3}>
            <ServiceCard service={service} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default ServiceList;
