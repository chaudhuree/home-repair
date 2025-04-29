import { Request, Response } from 'express';
import * as supplyTransactionService from './supplyTransaction.service';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { supplyTransactionFilterSchema } from './supplyTransaction.validation';

// Get all supply transactions with filtering
export const getAllSupplyTransactions = catchAsync(async (req: Request, res: Response) => {
  // Parse and validate filter parameters
  const filterData = supplyTransactionFilterSchema.parse(req.query);
  
  const result = await supplyTransactionService.getAllSupplyTransactions(filterData, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply transactions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get supply transactions by employee ID
export const getSupplyTransactionsByEmployee = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  
  const result = await supplyTransactionService.getSupplyTransactionsByEmployee(employeeId, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Employee supply transactions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get supply transactions by supply ID
export const getSupplyTransactionsBySupply = catchAsync(async (req: Request, res: Response) => {
  const { supplyId } = req.params;
  
  const result = await supplyTransactionService.getSupplyTransactionsBySupply(supplyId, req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Supply transactions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get employee supply transaction statistics
export const getEmployeeSupplyTransactionStats = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  
  const result = await supplyTransactionService.getEmployeeSupplyTransactionStats(employeeId);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Employee supply transaction statistics retrieved successfully',
    data: result,
  });
});
