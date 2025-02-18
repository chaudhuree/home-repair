export interface IPaymentInfo {
  stripeCustomerId: string;
  depositPaymentIntentId: string;
  paymentMethodId: string;
  finalPaymentIntentId: string;
}

export interface IStripeCustomer {
  id: string;
  email: string;
  name: string;
}
