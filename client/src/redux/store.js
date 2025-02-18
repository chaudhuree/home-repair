import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import serviceReducer from './slices/serviceSlice';
import reservationReducer from './slices/reservationSlice';
import chatReducer from './slices/chatSlice';
import userReducer from './slices/userSlice';
import cashbackReducer from './slices/cashbackSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    service: serviceReducer,
    reservation: reservationReducer,
    chat: chatReducer,
    user: userReducer,
    cashback: cashbackReducer,
  },
});
