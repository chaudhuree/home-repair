// Define payment method and type as string literals to match Prisma schema

export type ITransaction = {
  transactionId: string;
  date: Date;
  reservationId?: string;
  serviceId?: string;
  employeeId?: string;
  customerId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  status?: string;
  addOnsList?: string[];
  description?: string;
  notes?: string;
};

export type ITransactionFilters = {
  searchTerm?: string;
  paymentType?: PaymentType;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  employeeId?: string;
  reservationId?: string;
  serviceId?: string;
};

export enum PaymentMethod {
  credit_card = 'credit_card',
  debit_card = 'debit_card',
  cash = 'cash',
  bank_transfer = 'bank_transfer',
  stripe = 'stripe',
  paypal = 'paypal',
  other = 'other'
}

 export enum PaymentType {
  first_installment = 'first_installment',
  second_installment = 'second_installment',
  expense = 'expense',
  refunded = 'refunded',
  cashback = 'cashback'
}