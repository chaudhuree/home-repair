import { CashbackStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentMethod } from '../transaction/transaction.interface';

// Get all cashbacks
const getAllCashbacks = async () => {
  const result = await prisma.cashback.findMany({
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return result;
};

// Get a single cashback by ID
const getSingleCashback = async (id: string) => {
  const result = await prisma.cashback.findUnique({
    where: { id },
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
  });

  if (!result) {
    throw new AppError(404, 'Cashback not found');
  }

  return result;
};

// Create a new cashback request
const createCashback = async (data: {
  userId: string;
  reservationId: string;
  amount: number;
  proof: string[];
}) => {
  // Check if reservation exists
  const reservation = await prisma.reservation.findUnique({
    where: { id: data.reservationId },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Create the cashback record
  const result = await prisma.cashback.create({
    data: {
      userId: data.userId,
      reservationId: data.reservationId,
      amount: data.amount,
      proof: data.proof,
      status: CashbackStatus.pending,
    },
    include: {
      user: true,
      reservation: true,
    },
  });

  return result;
};

// Approve a cashback request
const approveCashback = async (id: string, amount?: number) => {
  // Get the cashback details
  const cashback = await prisma.cashback.findUnique({
    where: { id },
    include: {
      user: true,
      reservation: {
        include: {
          service: true,
        },
      },
    },
  });

  if (!cashback) {
    throw new AppError(404, 'Cashback not found');
  }

  if (cashback.status !== CashbackStatus.pending) {
    throw new AppError(400, `Cashback is already ${cashback.status}`);
  }

  // Use the provided amount or fallback to the original amount
  const cashbackAmount = amount !== undefined ? amount : cashback.amount;

  // Update the cashback status and amount if provided
  const updatedCashback = await prisma.cashback.update({
    where: { id },
    data: {
      status: CashbackStatus.approved,
      // Update the amount if a new one is provided
      ...(amount !== undefined && { amount: cashbackAmount }),
    },
    include: {
      user: true,
      reservation: true,
    },
  });

  // Create a transaction record for the cashback
  await TransactionService.createCashbackTransaction(
    id,
    cashback.userId,
    cashback.reservationId,
    cashbackAmount,
    PaymentMethod.stripe
  );

  return updatedCashback;
};

// Reject a cashback request
const rejectCashback = async (id: string) => {
  // Get the cashback details
  const cashback = await prisma.cashback.findUnique({
    where: { id },
  });

  if (!cashback) {
    throw new AppError(404, 'Cashback not found');
  }

  if (cashback.status !== CashbackStatus.pending) {
    throw new AppError(400, `Cashback is already ${cashback.status}`);
  }

  // Update the cashback status
  const result = await prisma.cashback.update({
    where: { id },
    data: {
      status: CashbackStatus.rejected,
    },
    include: {
      user: true,
      reservation: true,
    },
  });

  return result;
};

export const CashbackService = {
  getAllCashbacks,
  getSingleCashback,
  createCashback,
  approveCashback,
  rejectCashback,
};
