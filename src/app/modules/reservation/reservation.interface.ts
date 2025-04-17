import { ServiceStatus, PaymentStatus, CashbackStatus, RefundStatus } from '@prisma/client';

export type Address = {
  streetAddress: string;
  apartmentSuitUnit: string;
  city: string;
  state: string;
};

export type IReservationAddOn = {
  addOnId: string;
  quantity: number;
};

export type IReservation = {
  id?: string;
  userId: string;
  serviceId: string;
  spaceTypeId: string;
  packageTypeId: string;
  employeeId?: string;
  stripeCustomerId?: string;
  providePaint: boolean;
  paintPrice?: number;
  status: ServiceStatus;
  customersGivenImages: string[];
  beforeImages: string[];
  afterImages: string[];
  projectDescription?: string;
  accessInstructionDetails?: string;
  address: Address;
  userSelectedDates: Date[] | string[];
  scheduledDate?: Date | string;
  workStartTime?: Date | string;
  workEndTime?: Date | string;
  amount: number;
  firstInstallmentAmount?: number;
  secondInstallmentAmount?: number;
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
  paymentStatus: PaymentStatus;
  refundStatus?: RefundStatus;
  addOns?: IReservationAddOn[];
}

export type IUpdateReservation = {
  employeeId?: string;
  status?: ServiceStatus;
  beforeImages?: string[];
  afterImages?: string[];
  projectDescription?: string;
  accessInstructionDetails?: string;
  scheduledDate?: Date | string;
  paymentStatus?: PaymentStatus;
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
  workStartTime?: Date | string;
  workEndTime?: Date | string;
  refundStatus?: RefundStatus;
}

export type IReservationFilters = {
  searchTerm?: string;
  status?: ServiceStatus;
  paymentStatus?: string;
  employeeId?: string;
  userId?: string;
  serviceId?: string;
  spaceTypeId?: string;
  packageTypeId?: string;
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
  refundStatus?: RefundStatus;
}

export type IAssignEmployee = {
  employeeId: string;
};

export interface IPaymentRequest {
  paymentMethodId: string;
}

export interface IAddOnRequest {
  addOnId: string;
  quantity: number;
}

export interface IRemoveAddOnRequest {
  addOnId: string;
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
