import { Order, OrderPaymentStatus, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { IOrder, IOrderFilters } from './order.interface';
import { IPaginationOptions } from '../../interface/pagination';
import  calculatePagination  from '../../utils/calculatePagination';
import { orderSearchableFields } from './order.constant';
import AppError from '../../errors/AppError';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia',
});

const createOrder = async (userId: string, data: IOrder): Promise<Order> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: data.reservationId },
    include: { service: true },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Create payment intent for 50% of the total amount
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round((data.totalAmount * 0.5) * 100), // Convert to cents
    currency: data.currency,
    metadata: {
      reservationId: data.reservationId,
      userId,
    },
  });

  const result = await prisma.order.create({
    data: {
      ...data,
      userId,
      paymentIntent: paymentIntent.id,
      paymentStatus: OrderPaymentStatus.failed,
    },
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
  });

  return result;
};

const confirmPayment = async (orderId: string, paymentIntentId: string): Promise<Order> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { reservation: true },
  });

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(400, 'Payment not successful');
  }

  // Update order and reservation payment status
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: OrderPaymentStatus.success,
      },
      include: {
        reservation: true,
      },
    });

    await tx.reservation.update({
      where: { id: order.reservationId },
      data: {
        paymentStatus: PaymentStatus.partially_paid,
      },
    });

    return order;
  });

  return updatedOrder;
};

const processSecondPayment = async (orderId: string): Promise<Order> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { reservation: true },
  });

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (order.reservation.paymentStatus !== PaymentStatus.partially_paid) {
    throw new AppError(400, 'Invalid payment status for second payment');
  }

  // Create payment intent for remaining 50%
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round((order.totalAmount * 0.5) * 100), // Convert to cents
    currency: order.currency,
    metadata: {
      orderId,
      type: 'second_payment',
    },
  });

  const result = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentIntent: paymentIntent.id,
    },
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
  });

  return result;
};

const confirmSecondPayment = async (orderId: string, paymentIntentId: string): Promise<Order> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { reservation: true },
  });

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(400, 'Payment not successful');
  }

  // Update order and reservation payment status
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: OrderPaymentStatus.success,
      },
      include: {
        reservation: true,
      },
    });

    await tx.reservation.update({
      where: { id: order.reservationId },
      data: {
        paymentStatus: PaymentStatus.total_paid,
      },
    });

    return order;
  });

  return updatedOrder;
};

const getAllOrders = async (
  filters: IOrderFilters,
  options: IPaginationOptions
) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: orderSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.OrderWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.order.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
  });
  const total = await prisma.order.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getSingleOrder = async (id: string): Promise<Order | null> => {
  const result = await prisma.order.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
  });
  return result;
};

const getTotalOrders = async (): Promise<number> => {
  const total = await prisma.order.count();
  return total;
};

export const OrderService = {
  createOrder,
  confirmPayment,
  processSecondPayment,
  confirmSecondPayment,
  getAllOrders,
  getSingleOrder,
  getTotalOrders,
};
