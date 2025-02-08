import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createService } from '../../redux/slices/serviceSlice';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
} from '@mui/material';
import toast from 'react-hot-toast';

function CreateService() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.description.trim() || !formData.image.trim()) {
      toast.error('All fields are required');
      return;
    }

    try {
      await dispatch(createService(formData)).unwrap();
      toast.success('Service created successfully!');
      navigate('/services');
    } catch (error) {
      toast.error(error.message || 'Failed to create service');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4,
          mx: 'auto',
          maxWidth: 'md',
          width: '100%'
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ mb: 4 }}
        >
          Create New Service
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Service Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            multiline
            rows={4}
            id="description"
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="image"
            label="Image URL"
            name="image"
            value={formData.image}
            onChange={handleChange}
            helperText="Enter a URL for the service image"
            sx={{ mb: 4 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            sx={{ 
              mt: 2,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            Create Service
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

export default CreateService;
