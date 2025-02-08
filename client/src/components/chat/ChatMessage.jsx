import { Box, Paper, Typography } from '@mui/material';

function ChatMessage({ message, isOwnMessage }) {
  // Debug log to see message structure
  console.log('Message in ChatMessage:', message);

  // Check if message is valid
  if (!message || typeof message !== 'object') {
    console.error('Invalid message:', message);
    return null;
  }

  // Get sender name from the correct location in the message object
  const senderName = message.sender?.name || message.sender?.userName || message.sender?.email || 'Unknown User';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 1,
          maxWidth: '70%',
          bgcolor: isOwnMessage ? 'primary.light' : 'grey.100',
          color: isOwnMessage ? 'white' : 'text.primary',
        }}
      >
        {!isOwnMessage && (
          <Typography variant="caption" component="div" sx={{ mb: 0.5, fontWeight: 'bold' }}>
            {senderName}
          </Typography>
        )}
        <Typography variant="body1">
          {typeof message.content === 'string' ? message.content : ''}
        </Typography>
        <Typography variant="caption" color={isOwnMessage ? 'white' : 'text.secondary'} sx={{ display: 'block', mt: 0.5 }}>
          {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ''}
        </Typography>
      </Paper>
    </Box>
  );
}

export default ChatMessage;
