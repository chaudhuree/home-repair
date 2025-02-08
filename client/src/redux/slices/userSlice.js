import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchEmployees = createAsyncThunk(
  'user/fetchEmployees',
  async ( { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/users/employees');
      return {
        employees: response.data.data,
        meta: response.data.meta
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: {
    employees: [],
    meta: {
      page: 1,
      limit: 10,
      total: 0,
      totalPage: 0
    },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees;
        state.meta = action.payload.meta;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default userSlice.reducer;
