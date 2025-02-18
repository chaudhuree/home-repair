import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchAllCashbacks = createAsyncThunk(
  'cashback/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/cashbacks');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch cashback requests';
      return rejectWithValue(message);
    }
  }
);

export const approveCashback = createAsyncThunk(
  'cashback/approve',
  async ({ reservationId, cashbackId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/reservations/${reservationId}/cashback/${cashbackId}/approve`
      );
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to approve cashback';
      return rejectWithValue(message);
    }
  }
);

export const rejectCashback = createAsyncThunk(
  'cashback/reject',
  async ({ reservationId, cashbackId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(
        `/reservations/${reservationId}/cashback/${cashbackId}/reject`
      );
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reject cashback';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  cashbackRequests: [],
  loading: false,
  error: null,
};

const cashbackSlice = createSlice({
  name: 'cashback',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Cashback Requests
      .addCase(fetchAllCashbacks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCashbacks.fulfilled, (state, action) => {
        state.loading = false;
        state.cashbackRequests = action.payload;
      })
      .addCase(fetchAllCashbacks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Approve Cashback
      .addCase(approveCashback.fulfilled, (state, action) => {
        const index = state.cashbackRequests.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.cashbackRequests[index] = action.payload;
        }
      })
      // Reject Cashback
      .addCase(rejectCashback.fulfilled, (state, action) => {
        const index = state.cashbackRequests.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.cashbackRequests[index] = action.payload;
        }
      });
  },
});

export const { clearError } = cashbackSlice.actions;
export default cashbackSlice.reducer;
