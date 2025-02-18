import { ServiceStatus, PaymentStatus, CashbackStatus } from '@prisma/client';

export type IReservation = {
  id?: string;
  userId: string;
  serviceId: string;
  employeeId?: string;
  providePaint: boolean;
  status: ServiceStatus;
  customersGivenImages: string[];
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

export interface IPaymentRequest {
  paymentMethodId: string;
}

export interface ICashbackRequest {
  reviewImage: string | string[];
}

export interface ICashbackApproval {
  cashbackId: string;
  status: CashbackStatus;
}

export interface IPaymentResponse {
  success: boolean;
  message: string;
  data: {
    paymentIntentId: string;
    clientSecret?: string;
    amount: number;
    status: PaymentStatus;
  };
}

export interface ICashbackResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    amount: number;
    status: CashbackStatus;
    proof: string;
    createdAt: Date;
  };
}
