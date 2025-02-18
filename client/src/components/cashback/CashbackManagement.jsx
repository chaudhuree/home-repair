import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { 
  fetchAllCashbacks, 
  approveCashback, 
  rejectCashback 
} from '../../redux/slices/cashbackSlice';
import toast from 'react-hot-toast';

function CashbackManagement() {
  const dispatch = useDispatch();
  const { cashbackRequests, loading } = useSelector((state) => state.cashback);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAllCashbacks());
  }, [dispatch]);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setOpenDetailsModal(true);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await dispatch(approveCashback({
        reservationId: selectedRequest.reservationId,
        cashbackId: selectedRequest.id,
      })).unwrap();
      toast.success('Cashback request approved successfully');
      setOpenDetailsModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to approve cashback');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await dispatch(rejectCashback({
        reservationId: selectedRequest.reservationId,
        cashbackId: selectedRequest.id,
      })).unwrap();
      toast.success('Cashback request rejected');
      setOpenDetailsModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to reject cashback');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Cashback Requests
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cashbackRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>{request.reservation.service.name}</TableCell>
                <TableCell>{request.user.name}</TableCell>
                <TableCell>${request.amount}</TableCell>
                <TableCell>
                  <Chip 
                    label={request.status} 
                    color={getStatusColor(request.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(request.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleViewDetails(request)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Modal */}
      <Dialog
        open={openDetailsModal}
        onClose={() => setOpenDetailsModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cashback Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Service: {selectedRequest.reservation.service.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Customer: {selectedRequest.user.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Amount: ${selectedRequest.amount}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Status: 
                <Chip 
                  label={selectedRequest.status} 
                  color={getStatusColor(selectedRequest.status)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" gutterBottom>
                Date: {new Date(selectedRequest.createdAt).toLocaleDateString()}
              </Typography>
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Review Images:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {selectedRequest.proof.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Review ${index + 1}`}
                      style={{ width: 100, height: 100, objectFit: 'cover' }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailsModal(false)}>
            Close
          </Button>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button 
                onClick={handleReject}
                color="error"
                disabled={actionLoading}
              >
                {actionLoading ? <CircularProgress size={24} /> : 'Reject'}
              </Button>
              <Button
                onClick={handleApprove}
                variant="contained"
                color="primary"
                disabled={actionLoading}
              >
                {actionLoading ? <CircularProgress size={24} /> : 'Approve'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CashbackManagement;
