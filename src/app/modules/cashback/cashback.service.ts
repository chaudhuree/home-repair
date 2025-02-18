import prisma from '../../utils/prisma';

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

export const CashbackService = {
  getAllCashbacks,
};
