import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchChatRooms } from '../../redux/slices/chatSlice';
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Paper,
  Box,
  CircularProgress,
} from '@mui/material';

function ChatList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { chatRooms, loading, error } = useSelector((state) => state.chat);

  useEffect(() => {
    dispatch(fetchChatRooms());
  }, [dispatch]);

  const handleChatSelect = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={2}>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {chatRooms.map((room) => (
          <ListItem key={room.id} disablePadding>
            <ListItemButton onClick={() => handleChatSelect(room.id)}>
              <ListItemText
                primary={room.name}
                secondary={`Last message: ${new Date(room.lastMessageAt || room.createdAt).toLocaleString()}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
        {chatRooms.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No chat rooms available"
              secondary="Your active chats will appear here"
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
}

export default ChatList;
