import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  fetchMessages,
  sendMessage as sendMessageAction,
  setCurrentRoom,
  addMessage,
  clearMessages,
} from '../../redux/slices/chatSlice';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import ChatMessage from './ChatMessage';
import {
  initSocket,
  joinRoom,
  sendMessage,
  subscribeToMessages,
  unsubscribeFromMessages,
  disconnectSocket,
} from '../../services/socket';

function ChatRoom() {
  const { roomId } = useParams();
  const dispatch = useDispatch();
  const messagesEndRef = useRef(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { messages, currentRoom, loading, error } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);

  // Get full name
  const getFullName = (user) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = initSocket(token);
    
    dispatch(setCurrentRoom(roomId));
    dispatch(fetchMessages(roomId));
    
    joinRoom(roomId);

    const handleNewMessage = (message) => {
      console.log('Received message:', message);
      
      // Ensure message has required fields
      if (!message || !message.content) {
        console.warn('Received invalid message:', message);
        return;
      }
      
      // Add message to state
      dispatch(addMessage(message));
    };

    subscribeToMessages(handleNewMessage);

    return () => {
      unsubscribeFromMessages(handleNewMessage);
      disconnectSocket();
      dispatch(clearMessages());
    };
  }, [dispatch, roomId, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const messageData = {
        content: newMessage,
        roomId,
        sender: {
          id: user.id,
          name: getFullName(user),
          email: user.email
        }
      };

      // Send to server and get the saved message
      const savedMessage = await dispatch(sendMessageAction(messageData)).unwrap();
      
      // Add to local state immediately with sender info
      const messageWithSender = {
        ...savedMessage,
        sender: {
          id: user.id,
          name: getFullName(user),
          email: user.email
        }
      };
      
      dispatch(addMessage(messageWithSender));
      
      // Send via socket
      sendMessage(roomId, messageWithSender);
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Create a map to deduplicate messages
  const uniqueMessages = messages.reduce((acc, message) => {
    if (!acc.has(message.id)) {
      acc.set(message.id, message);
    }
    return acc;
  }, new Map());

  return (
    <Paper
      sx={{
        height: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {Array.from(uniqueMessages.values()).map((message) => (
          <ChatMessage
            key={`msg-${message.id}`}
            message={message}
            isOwnMessage={message.senderId === user.id}
          />
        ))}
        <div ref={messagesEndRef} />
      </Box>
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          p: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            variant="outlined"
            disabled={isSending}
          />
          <IconButton 
            type="submit" 
            color="primary" 
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}

export default ChatRoom;
