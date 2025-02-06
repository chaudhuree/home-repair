import { ServiceStatus, PaymentStatus } from '@prisma/client';

export type IReservation = {
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
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
  workStartTime?: Date;
  workEndTime?: Date;
}

export type IUpdateReservation = {
  employeeId?: string;
  status?: ServiceStatus;
  afterImages?: string[];
  paymentStatus?: PaymentStatus;
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
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
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
}

export type IAssignEmployee = {
  employeeId: string;
};
