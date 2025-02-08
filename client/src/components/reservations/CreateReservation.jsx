import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { createReservation } from '../../redux/slices/reservationSlice';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Switch,
  Grid,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import toast from 'react-hot-toast';

function CreateReservation() {
  const { serviceId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    scheduledDate: '',
    providePaint: false,
    amount: '',
    beforeImages: [],
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      beforeImages: [...prev.beforeImages, ...imageUrls]
    }));
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      beforeImages: prev.beforeImages.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.beforeImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await dispatch(createReservation({
        serviceId,
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        providePaint: formData.providePaint,
        amount: parseFloat(formData.amount),
        beforeImages: formData.beforeImages,
      })).unwrap();
      
      toast.success('Reservation created successfully!');
      navigate('/reservations');
    } catch (error) {
      toast.error(error.message || 'Failed to create reservation');
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Book Service
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="scheduledDate"
                label="Select Date"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  scheduledDate: e.target.value
                }))}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: today,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="amount"
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  amount: e.target.value
                }))}
                inputProps={{
                  min: "0",
                  step: "0.01"
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.providePaint}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      providePaint: e.target.checked
                    }))}
                  />
                }
                label="Provide Paint"
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Upload Before Images
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </Button>
            </Grid>

            {formData.beforeImages.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Images:
                </Typography>
                <Grid container spacing={1}>
                  {formData.beforeImages.map((image, index) => (
                    <Grid item key={index}>
                      <Box
                        sx={{
                          position: 'relative',
                          width: 100,
                          height: 100,
                        }}
                      >
                        <img
                          src={image}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRemoveImage(index)}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            minWidth: 'auto',
                            p: 0.5,
                          }}
                        >
                          ×
                        </Button>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                Book Now
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}

export default CreateReservation;
