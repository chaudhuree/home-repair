import { ServiceStatus, PaymentStatus } from '@prisma/client';

export interface IReservation {
  id?: string;
  userId: string;
  serviceId: string;
  employeeId?: string;
  providePaint: boolean;
  status: ServiceStatus;
  beforeImages: string[];
  afterImages: string[];
  scheduledDate: Date;
  amount: number;
  paymentStatus: PaymentStatus;
}

export interface IUpdateReservation {
  employeeId?: string;
  status?: ServiceStatus;
  afterImages?: string[];
  paymentStatus?: PaymentStatus;
}

export type IReservationFilters = {
  searchTerm?: string;
  status?: string;
  paymentStatus?: string;
  employeeId?: string;
  userId?: string;
}
