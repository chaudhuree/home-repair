import { PaymentStatus, Prisma, RefundStatus,ServiceStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import stripe from '../../utils/stripe';
import { IPaymentInfo } from '../../interface/payment.interface';
import AppError from '../../errors/AppError';

const createStripeCustomer = async (email: string, name: string) => {
  const customer = await stripe.customers.create({
    email,
    name,
  });
  return customer;
};

// create a payment intent with automatic payment methods
const createPaymentIntent = async (
  amount: number,
  paymentMethodId: string,
  customerId: string,
) => {

  // create a setup intent to save the card for future use
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method: paymentMethodId,
    usage: 'off_session',
  });

  // create a payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    setup_future_usage: 'off_session',
    automatic_payment_methods: {
      enabled: true,
    },
  });
  return paymentIntent;
};

// create a payment intent for the deposit it will call createPaymentIntent function
const processDeposit = async (
  reservationId: string,
  amount: number,
  customerId: string,
  paymentMethodId: string,
) => {
  const paymentIntent = await createPaymentIntent(amount, paymentMethodId, customerId);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      depositPaymentIntentId: paymentIntent.id,
      paymentMethodId,
      paymentStatus: PaymentStatus.partially_paid,
    },
  });

  return paymentIntent;
};

// update the reservation payment status to paid and charge the customer remaining amount
const processRemainingPayment = async (
  reservationId: string
) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  if (!reservation.stripeCustomerId || !reservation.paymentMethodId) {
    throw new AppError(400, 'Payment information not found');
  }

  // reservation.status = ServiceStatus.completed;
  // const paymentIntent = await createPaymentIntent(
  //   amount,
  //   'usd',
  //   reservation.stripeCustomerId,
  // );
  const amount = reservation.secondInstallmentAmount;
  if(!amount){
    throw new AppError(400, 'Second installment amount not found');
  }
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: reservation.stripeCustomerId,
    payment_method: reservation.paymentMethodId,
    off_session: true,
    confirm: true
  });
  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      finalPaymentIntentId: paymentIntent.id,
      paymentStatus: PaymentStatus.total_paid,
      status: ServiceStatus.completed,
    },
  });

  return paymentIntent;
};

const processCashbackRefund = async (
  reservationId: string,
  amount: number,
) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });

  if (!reservation || !reservation.depositPaymentIntentId) {
    throw new AppError(404, 'Reservation or payment information not found');
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: reservation.depositPaymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
    });

    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        refundId: refund.id,
        refundStatus: RefundStatus.succeeded,
      },
    });

    return refund;
  } catch (error) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        refundStatus: RefundStatus.failed,
      },
    });
    throw error;
  }
};

export const PaymentService = {
  createStripeCustomer,
  processDeposit,
  processRemainingPayment,
  processCashbackRefund,
};
