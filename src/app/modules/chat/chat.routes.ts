import express from 'express';
import { ChatController } from './chat.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

router.get('/rooms', auth(), ChatController.getChatRooms);
router.get('/rooms/:chatRoomId/messages', auth(), ChatController.getChatRoomMessages);
router.post('/rooms/:chatRoomId/messages', auth(), ChatController.sendMessage);

export const ChatRoutes = router;
