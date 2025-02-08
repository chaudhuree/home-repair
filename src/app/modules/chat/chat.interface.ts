export type IChatMessage = {
  content: string;
  chatRoomId: string;
  senderId: string;
};

export type IChatRoom = {
  reservationId: string;
  participants: string[];
  name: string;
};
