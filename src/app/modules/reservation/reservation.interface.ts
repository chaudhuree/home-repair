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
  scheduledDate: Date | string;
  amount: number;
  paymentStatus: PaymentStatus;
  workStartTime?: Date;
  workEndTime?: Date;
}

export interface IUpdateReservation {
  employeeId?: string;
  status?: ServiceStatus;
  afterImages?: string[];
  paymentStatus?: PaymentStatus;
  workStartTime?: Date;
  workEndTime?: Date;
}

export type IReservationFilters = {
  searchTerm?: string;
  status?: ServiceStatus;
  paymentStatus?: string;
  employeeId?: string;
  userId?: string;
  serviceId?: string;
}
