import { Response } from 'express';

type TMeta = {
  limit: number;
  page: number;
  total: number;
  totalPage?: number;
};

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: TMeta;
  data?: T;
};

const sendResponse = <T>(res: Response, data: TResponse<T>): void => {
  const response: TResponse<T> = {
    statusCode: data.statusCode,
    success: data.success,
    message: data.message,
    meta: data.meta && {
      page: data.meta.page,
      limit: data.meta.limit,
      total: data.meta.total,
      totalPage: Math.ceil(data.meta.total / data.meta.limit),
    },
    data: data.data,
  };

  res.status(data.statusCode).json(response);
};

export default sendResponse;
