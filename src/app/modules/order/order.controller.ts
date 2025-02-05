import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { OrderService } from './order.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pickValidFields from '../../utils/pickValidFields';
import paginationHelper from '../../utils/paginationHelper';
import { orderFilterableFields } from './order.constant';

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createOrder(req.user.id, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Order created successfully with payment intent',
    data: result,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId, paymentIntentId } = req.body;
  const result = await OrderService.confirmPayment(orderId, paymentIntentId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment confirmed successfully',
    data: result,
  });
});

const processSecondPayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const result = await OrderService.processSecondPayment(orderId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Second payment intent created successfully',
    data: result,
  });
});

const confirmSecondPayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId, paymentIntentId } = req.body;
  const result = await OrderService.confirmSecondPayment(orderId, paymentIntentId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Second payment confirmed successfully',
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const filters = pickValidFields(req.query, orderFilterableFields);
  const paginationOptions = pickValidFields(req.query, ['page', 'limit', 'sortBy', 'sortOrder']);

  const result = await OrderService.getAllOrders(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Orders retrieved successfully',
    meta: paginationHelper(paginationOptions, result.meta.total),
    data: result.data,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getSingleOrder(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Order retrieved successfully',
    data: result,
  });
});

export const OrderController = {
  createOrder,
  confirmPayment,
  processSecondPayment,
  confirmSecondPayment,
  getAllOrders,
  getSingleOrder,
};
