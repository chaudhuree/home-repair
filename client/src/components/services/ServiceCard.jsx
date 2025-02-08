import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
} from '@mui/material';

function ServiceCard({ service }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleBookNow = () => {
    navigate(`/services/${service.id}/book`);
  };

  // Check if user can book (user or property_manager)
  const canBook = user?.role === 'user' || user?.role === 'property_manager';

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        }
      }}
    >
      <CardMedia
        component="img"
        height="240"
        image={service.image || 'https://via.placeholder.com/300x200'}
        alt={service.name}
        sx={{
          objectFit: 'cover'
        }}
      />
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Typography 
          gutterBottom 
          variant="h5" 
          component="h2"
          sx={{ 
            fontWeight: 600,
            mb: 2 
          }}
        >
          {service.name}
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          paragraph
          sx={{ mb: 3 }}
        >
          {service.description}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mt: 'auto',
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          {canBook && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleBookNow}
              size="large"
              sx={{
                px: 4,
                py: 1,
                borderRadius: 2
              }}
            >
              Book Now
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default ServiceCard;
