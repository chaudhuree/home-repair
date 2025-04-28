import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { TransactionService } from './transaction.service';
import pick from '../../utils/pickValidFields';
import { paginationFields } from '../../constants/pagination';
import { transactionFilterableFields } from './transaction.constant';

// Create a transaction
const createTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionService.createTransaction(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Transaction created successfully',
    data: result,
  });
});

// Create an expense transaction
const createExpenseTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionService.createExpenseTransaction(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Expense transaction created successfully',
    data: result,
  });
});

// Get all transactions with filtering and pagination
const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, transactionFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const userId = req.user?.userId;
  const userRole = req.user?.role as string;

  const result = await TransactionService.getAllTransactions(
    filters,
    paginationOptions,
    userId,
    userRole
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Transactions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get employee completed transactions
const getEmployeeCompletedTransactions = catchAsync(async (req: Request, res: Response) => {
  const employeeId = req.user?.userId as string;
  const paginationOptions = pick(req.query, paginationFields);

  const result = await TransactionService.getEmployeeCompletedTransactions(
    paginationOptions,
    employeeId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee completed transactions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get a single transaction by ID
const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TransactionService.getSingleTransaction(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Transaction retrieved successfully',
    data: result,
  });
});

export const TransactionController = {
  createTransaction,
  createExpenseTransaction,
  getAllTransactions,
  getEmployeeCompletedTransactions,
  getSingleTransaction,
};
