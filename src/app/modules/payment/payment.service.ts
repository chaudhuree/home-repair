import { PaymentStatus, Prisma, RefundStatus, ServiceStatus } from '@prisma/client';
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

// create a payment intent for first installment (on-session)
const createPaymentIntent = async (
  amount: number,
  paymentMethodId: string,
  customerId: string,
) => {
  try {
    // First attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set this payment method as the default for the customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // create a payment intent for on-session payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      setup_future_usage: 'off_session', // Setup for future usage
      confirm: true, // Confirm immediately since we have the payment method
      payment_method_types: ['card'], // Only allow card payments
    });

    return paymentIntent;
  } catch (error) {
    // If payment method attachment fails, clean up
    if (error.type === 'StripeInvalidRequestError') {
      throw new AppError(400, error.message);
    }
    throw error;
  }
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

// Process the remaining payment off-session using saved payment method
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

  const amount = reservation.secondInstallmentAmount;
  if(!amount) {
    throw new AppError(400, 'Second installment amount not found');
  }

  try {
    // Create and confirm payment intent for off-session payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: reservation.stripeCustomerId,
      payment_method: reservation.paymentMethodId,
      off_session: true, // This payment is off-session
      confirm: true, // Confirm immediately
      payment_method_types: ['card'], // Only allow card payments
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
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      throw new AppError(400, error.message);
    }
    throw error;
  }
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
