import { OrderPaymentStatus } from '@prisma/client';

export interface IOrder {
  id?: string;
  reservationId: string;
  userId: string;
  totalAmount: number;
  paymentIntent?: string;
  paymentStatus: OrderPaymentStatus;
  currency: string;
}

export type IOrderFilters = {
  searchTerm?: string;
  paymentStatus?: string;
  userId?: string;
}
