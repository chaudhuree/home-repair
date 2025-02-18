import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';

import { store } from './redux/store';
import theme from './theme';
import { jwtDecode } from 'jwt-decode';
import { setUser } from './redux/slices/authSlice';

import Layout from './components/layout/Layout';
import PrivateRoute from './components/layout/PrivateRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingState from './components/common/LoadingState';
import Unauthorized from './components/common/Unauthorized';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ServiceList from './components/services/ServiceList';
import CreateService from './components/services/CreateService';
import ReservationList from './components/reservations/ReservationList';
import CreateReservation from './components/reservations/CreateReservation';
import ChatList from './components/chat/ChatList';
import ChatRoom from './components/chat/ChatRoom';
import CashbackManagement from './components/cashback/CashbackManagement';

function AppContent() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }
        dispatch(setUser(decoded));
        setLoading(false);
      } catch (error) {
        localStorage.removeItem('token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [dispatch]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/services" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<ServiceList />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes */}
          <Route
            path="/services/create"
            element={
              <PrivateRoute allowedRoles={['manager', 'super_admin']}>
                <CreateService />
              </PrivateRoute>
            }
          />
          <Route
            path="/services/:serviceId/book"
            element={
              <PrivateRoute allowedRoles={['user', 'property_manager']}>
                <CreateReservation />
              </PrivateRoute>
            }
          />
          <Route
            path="/reservations"
            element={
              <PrivateRoute allowedRoles={['user', 'property_manager', 'employee', 'manager', 'super_admin']}>
                <ReservationList />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <ChatList />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <PrivateRoute>
                <ChatRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/cashback-management"
            element={
              <PrivateRoute allowedRoles={['manager', 'super_admin']}>
                <CashbackManagement />
              </PrivateRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppContent />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#43a047',
                },
              },
              error: {
                style: {
                  background: '#d32f2f',
                },
                duration: 5000,
              },
            }}
          />
        </ThemeProvider>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
