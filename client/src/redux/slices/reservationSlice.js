import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';
import toast from 'react-hot-toast';

export const createReservation = createAsyncThunk(
  'reservation/create',
  async (reservationData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/reservations', {
        serviceId: reservationData.serviceId,
        providePaint: reservationData.providePaint,
        beforeImages: reservationData.beforeImages,
        scheduledDate: reservationData.scheduledDate,
        amount: reservationData.amount,
      });

      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create reservation';
      return rejectWithValue(message);
    }
  }
);

export const getReservations = createAsyncThunk(
  'reservation/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/reservations');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch reservations';
      return rejectWithValue(message);
    }
  }
);

export const updateReservationStatus = createAsyncThunk(
  'reservation/updateStatus',
  async ({ reservationId, status, afterImages }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/reservations/${reservationId}`, {
        status,
        afterImages
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update reservation status';
      return rejectWithValue(message);
    }
  }
);

export const assignEmployee = createAsyncThunk(
  'reservation/assignEmployee',
  async ({ reservationId, employeeId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/reservations/${reservationId}/assign-employee`, {
        employeeId,
      });
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to assign employee';
      return rejectWithValue(message);
    }
  }
);

export const confirmFirstInstallment = createAsyncThunk(
  'reservation/confirmFirstInstallment',
  async (reservationId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/reservations/${reservationId}/first-installment`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to confirm first installment';
      return rejectWithValue(message);
    }
  }
);

export const confirmSecondInstallment = createAsyncThunk(
  'reservation/confirmSecondInstallment',
  async (reservationId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/reservations/${reservationId}/second-installment`);
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to confirm second installment';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  reservations: [],
  loading: false,
  error: null,
};

const reservationSlice = createSlice({
  name: 'reservation',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Reservation
      .addCase(createReservation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReservation.fulfilled, (state, action) => {
        state.loading = false;
        state.reservations.push(action.payload);
      })
      .addCase(createReservation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get Reservations
      .addCase(getReservations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReservations.fulfilled, (state, action) => {
        state.loading = false;
        state.reservations = action.payload;
      })
      .addCase(getReservations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Reservation Status
      .addCase(updateReservationStatus.fulfilled, (state, action) => {
        const index = state.reservations.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reservations[index] = action.payload;
        }
      })
      // Assign Employee
      .addCase(assignEmployee.fulfilled, (state, action) => {
        const index = state.reservations.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reservations[index] = action.payload;
        }
      })
      // Confirm First Installment
      .addCase(confirmFirstInstallment.fulfilled, (state, action) => {
        const index = state.reservations.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reservations[index] = action.payload;
        }
      })
      // Confirm Second Installment
      .addCase(confirmSecondInstallment.fulfilled, (state, action) => {
        const index = state.reservations.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.reservations[index] = action.payload;
        }
      });
  },
});

export const { clearError } = reservationSlice.actions;
export default reservationSlice.reducer;
