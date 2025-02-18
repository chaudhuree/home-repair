import { PaymentStatus, Prisma, RefundStatus } from '@prisma/client';
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

const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  customerId: string,
) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    payment_method_types: ['card'],
  });
  return paymentIntent;
};

const processDeposit = async (
  reservationId: string,
  amount: number,
  customerId: string,
  paymentMethodId: string,
) => {
  const paymentIntent = await createPaymentIntent(amount, 'usd', customerId);

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

const processRemainingPayment = async (
  reservationId: string,
  amount: number,
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

  const paymentIntent = await createPaymentIntent(
    amount,
    'usd',
    reservation.stripeCustomerId,
  );

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      paymentStatus: PaymentStatus.total_paid,
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
