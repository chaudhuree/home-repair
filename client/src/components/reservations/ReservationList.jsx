import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getReservations } from '../../redux/slices/reservationSlice';
import { Container, Typography, CircularProgress, Box, Grid } from '@mui/material';
import ReservationCard from './ReservationCard';
import toast from 'react-hot-toast';

function ReservationList() {
  const dispatch = useDispatch();
  const { reservations, loading, error } = useSelector((state) => state.reservation);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(getReservations()).unwrap();
      } catch (error) {
        toast.error(error || 'Failed to fetch reservations');
      }
    };
    fetchData();
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
        {user?.role === 'user' ? 'My Reservations' : 'All Reservations'}
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
        {reservations.map((reservation) => (
          <Grid item key={reservation.id} xs={12} sm={6} lg={4} xl={3}>
            <ReservationCard reservation={reservation} />
          </Grid>
        ))}
        {reservations.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body1" color="text.secondary" align="center">
              No reservations found.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default ReservationList;
