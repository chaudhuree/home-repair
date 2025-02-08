import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../api/axios';

export const fetchChatRooms = createAsyncThunk('chat/fetchChatRooms', async () => {
  const response = await axiosInstance.get('/chat/rooms');
  return response.data.data;
});

export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (roomId) => {
  const response = await axiosInstance.get(`/chat/rooms/${roomId}/messages`);
  return response.data.data;
});

export const sendMessage = createAsyncThunk('chat/sendMessage', async ({ roomId, content }) => {
  const response = await axiosInstance.post(`/chat/rooms/${roomId}/messages`, { content });
  return response.data.data;
});

const initialState = {
  chatRooms: [],
  currentRoom: null,
  messages: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    addMessage: (state, action) => {
      // Check if message with same ID already exists
      const exists = state.messages.some(msg => msg.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.chatRooms = action.payload;
      })
      .addCase(fetchChatRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        // Check if message with same ID already exists
        const exists = state.messages.some(msg => msg.id === action.payload.id);
        if (!exists) {
          state.messages.push(action.payload);
        }
      });
  },
});

export const { setCurrentRoom, addMessage, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
