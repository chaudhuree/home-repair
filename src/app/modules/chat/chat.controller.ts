import { Request, Response } from "express";
import catchAsync from "../../../app/utils/catchAsync";
import sendResponse from "../../../app/utils/sendResponse";
import { ChatService } from "./chat.service";
import httpStatus from "http-status";
import { UserRole } from "@prisma/client";

const getChatRooms = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role as UserRole;
  const result = await ChatService.getChatRooms(userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat rooms retrieved successfully",
    data: result,
  });
});

const getChatRoomMessages = catchAsync(async (req: Request, res: Response) => {
  const { chatRoomId } = req.params;
  const userId = req.user?.id;
  const role = req.user?.role as UserRole;
  const result = await ChatService.getChatRoomMessages(chatRoomId, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat messages retrieved successfully",
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { chatRoomId } = req.params;
  const senderId = req.user?.id;
  const payload = {
    chatRoomId,
    senderId,
    content: req.body.content,
  };

  const result = await ChatService.sendMessage(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

export const ChatController = {
  getChatRooms,
  getChatRoomMessages,
  sendMessage,
};
