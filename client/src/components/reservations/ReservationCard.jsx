import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  confirmFirstInstallment,
  confirmSecondInstallment,
  assignEmployee,
  updateReservationStatus,
} from '../../redux/slices/reservationSlice';
import { fetchEmployees } from '../../redux/slices/userSlice';
import PaymentDialog from '../payment/PaymentDialog';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Pagination,
} from '@mui/material';
import toast from 'react-hot-toast';

function ReservationCard({ reservation }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { employees, loading: employeesLoading, meta } = useSelector((state) => state.user);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [afterImages, setAfterImages] = useState('');
  const [page, setPage] = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentType, setPaymentType] = useState(null);

  useEffect(() => {
    if (openAssignDialog) {
      dispatch(fetchEmployees({ page, limit: 10 }));
    }
  }, [openAssignDialog, page, dispatch]);

  const handleAssignEmployee = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    try {
      await dispatch(assignEmployee({
        reservationId: reservation.id,
        employeeId: selectedEmployee,
      })).unwrap();
      toast.success('Employee assigned successfully!');
      setOpenAssignDialog(false);
      setSelectedEmployee('');
    } catch (error) {
      toast.error(error.message || 'Failed to assign employee');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      toast.error('Please select a status');
      return;
    }

    try {
      // If trying to complete and work hasn't started, first set to in_progress
      if (selectedStatus === 'completed' && !reservation.workStartTime) {
        await dispatch(updateReservationStatus({
          reservationId: reservation.id,
          status: 'in_progress',
          afterImages: [],
        })).unwrap();
        
        // Small delay to ensure the first update is processed
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Now update to the selected status with after images
      await dispatch(updateReservationStatus({
        reservationId: reservation.id,
        status: selectedStatus,
        afterImages: afterImages ? [afterImages] : [],
      })).unwrap();
      
      toast.success('Status updated successfully!');
      setOpenStatusDialog(false);
      setSelectedStatus('');
      setAfterImages('');
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleAfterImagesChange = (event) => {
    setAfterImages(event.target.value);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleOpenChat = () => {
    navigate(`/chat/${reservation.chatRoomId}`);
  };

  const handlePayFirstInstallment = async (paymentMethodId) => {
    setPaymentLoading(true);
    try {
      await dispatch(confirmFirstInstallment({
        reservationId: reservation.id,
        paymentMethodId,
      })).unwrap();
      toast.success('First installment paid successfully!');
      setOpenPaymentDialog(false);
    } catch (error) {
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaySecondInstallment = async () => {
    setPaymentLoading(true);
    try {
      await dispatch(confirmSecondInstallment({
        reservationId: reservation.id
      })).unwrap();
      toast.success('Second installment paid successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Check if user can make payments (user or property_manager)
  const canMakePayments = user?.role === 'user' || user?.role === 'property_manager';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {reservation.service?.name}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Date: {new Date(reservation.scheduledDate).toLocaleDateString()}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Status: <Chip
            label={reservation.status}
            color={reservation.status === 'pending' ? 'warning' : 'success'}
            size="small"
          />
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Amount: ${reservation.amount}
        </Typography>
        
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Debug: canMakePayments: {canMakePayments.toString()}, 
              Status: {reservation.status}, 
              First Paid: {reservation.firstInstallmentPaid?.toString()},
              First Amount: ${reservation.firstInstallmentAmount}
            </Typography>
          </Box>
        )}
        
        {canMakePayments && (
          <Box sx={{ mt: 2 }}>
            {!reservation.firstInstallmentPaid && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setPaymentType('first');
                  setOpenPaymentDialog(true);
                }}
                sx={{ mr: 1 }}
              >
                Pay First Installment (${reservation.firstInstallmentAmount})
              </Button>
            )}
            {reservation.firstInstallmentPaid && !reservation.secondInstallmentPaid && reservation.status === 'work_done' && (
              <Button
                variant="contained"
                color="primary"
                onClick={handlePaySecondInstallment}
                disabled={paymentLoading}
                sx={{ mr: 1 }}
              >
                {paymentLoading ? <CircularProgress size={24} /> : `Pay Second Installment ($${reservation.secondInstallmentAmount})`}
              </Button>
            )}
          </Box>
        )}

        {(user?.role === 'manager' || user?.role === 'super_admin') && !reservation.employeeId && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setOpenAssignDialog(true);
                setPage(1);
              }}
            >
              Assign Employee
            </Button>
          </Box>
        )}

        {user?.role === 'employee' && reservation.employeeId === user.id && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenStatusDialog(true)}
              sx={{ mr: 1 }}
            >
              Update Status
            </Button>
          </Box>
        )}

        {reservation.chatRoomId && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleOpenChat}
            >
              Open Chat
            </Button>
          </Box>
        )}
      </CardContent>

      {/* Assign Employee Dialog */}
      <Dialog 
        open={openAssignDialog} 
        onClose={() => {
          setOpenAssignDialog(false);
          setSelectedEmployee('');
          setPage(1);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Employee</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Select Employee"
              disabled={employeesLoading}
            >
              {employeesLoading ? (
                <MenuItem disabled>
                  <Box display="flex" alignItems="center">
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading employees...
                  </Box>
                </MenuItem>
              ) : employees.length === 0 ? (
                <MenuItem disabled>No employees found</MenuItem>
              ) : (
                employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          {meta.totalPage > 1 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={meta.totalPage}
                page={page}
                onChange={handlePageChange}
                color="primary"
                disabled={employeesLoading}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenAssignDialog(false);
              setSelectedEmployee('');
              setPage(1);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssignEmployee} 
            variant="contained" 
            color="primary"
            disabled={!selectedEmployee || employeesLoading}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog
        open={openStatusDialog}
        onClose={() => {
          setOpenStatusDialog(false);
          setSelectedStatus('');
          setAfterImages('');
        }}
        maxWidth="sm"
        fullWidth
      >
       
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select Status</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              label="Select Status"
            >
              {reservation.status === 'assigned_employee' && (
                <MenuItem value="in_progress">In Progress</MenuItem>
              )}
              {reservation.status === 'in_progress' && (
                <MenuItem value="work_done">Work Done</MenuItem>
              )}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>After Images URL</InputLabel>
            <input
              type="text"
              value={afterImages}
              onChange={handleAfterImagesChange}
              placeholder="Enter image URL"
              style={{
                padding: '16.5px 14px',
                borderRadius: '4px',
                border: '1px solid rgba(0, 0, 0, 0.23)',
                fontSize: '1rem',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Enter the URL of the after work image
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenStatusDialog(false);
              setSelectedStatus('');
              setAfterImages('');
            }}
          >
            Cancel
          </Button>
           <Button 
            onClick={handleUpdateStatus}
            variant="contained"
            color="primary"
            disabled={!selectedStatus}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog
        open={openPaymentDialog}
        onClose={() => {
          setOpenPaymentDialog(false);
          setPaymentType(null);
        }}
        onSubmit={handlePayFirstInstallment}
        loading={paymentLoading}
        title={paymentType === 'first' ? 'Pay First Installment' : 'Pay Second Installment'}
        amount={paymentType === 'first' ? reservation.firstInstallmentAmount : reservation.secondInstallmentAmount}
      />

    </Card>
  );
}

export default ReservationCard;
