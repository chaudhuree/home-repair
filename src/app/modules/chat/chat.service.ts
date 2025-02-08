import { Prisma, UserRole } from "@prisma/client";
import prisma from "../../../app/utils/prisma";
import { IChatMessage, IChatRoom } from "./chat.interface";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

const createChatRoom = async (payload: IChatRoom): Promise<any> => {
  const result = await prisma.chatRoom.create({
    data: payload,
  });
  return result;
};

const getChatRooms = async (userId: string, role: UserRole): Promise<any[]> => {
  let chatRooms;
  
  if (role === UserRole.super_admin || role === UserRole.manager) {
    chatRooms = await prisma.chatRoom.findMany({
      include: {
        reservation: {
          include: {
            user: true,
            service: true,
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } else {
    chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          has: userId,
        },
      },
      include: {
        reservation: {
          include: {
            user: true,
            service: true,
            employee: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  return chatRooms;
};

const getChatRoomMessages = async (
  chatRoomId: string,
  userId: string,
  role: UserRole
): Promise<any[]> => {
  const chatRoom = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
  });

  if (!chatRoom) {
    throw new AppError(httpStatus.NOT_FOUND, "Chat room not found");
  }

  // Check access rights
  if (
    role !== UserRole.super_admin &&
    role !== UserRole.manager &&
    !chatRoom.participants.includes(userId)
  ) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied to this chat room");
  }

  const messages = await prisma.message.findMany({
    where: { chatRoomId },
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return messages;
};

const sendMessage = async (payload: IChatMessage): Promise<any> => {
  const chatRoom = await prisma.chatRoom.findUnique({
    where: { id: payload.chatRoomId },
  });

  if (!chatRoom) {
    throw new AppError(httpStatus.NOT_FOUND, "Chat room not found");
  }

  const message = await prisma.message.create({
    data: payload,
    include: {
      sender: true,
    },
  });

  return message;
};

export const ChatService = {
  createChatRoom,
  getChatRooms,
  getChatRoomMessages,
  sendMessage,
};
