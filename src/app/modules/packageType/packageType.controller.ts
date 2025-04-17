import { Request, Response } from 'express';
import * as packageTypeService from './packageType.service';
import sendResponse from '../../utils/sendResponse';

export async function createPackageType(req: Request, res: Response) {
  const result = await packageTypeService.createPackageType(req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'PackageType created successfully',
    data: result,
  });
}

export async function getAllPackageTypes(req: Request, res: Response) {
  const result = await packageTypeService.getAllPackageTypes(req.query);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'PackageTypes retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
}

export async function updatePackageType(req: Request, res: Response) {
  const result = await packageTypeService.updatePackageType(req.params.id, req.body);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'PackageType updated successfully',
    data: result,
  });
}

export async function deletePackageType(req: Request, res: Response) {
  const result = await packageTypeService.deletePackageType(req.params.id);
  return sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'PackageType deleted successfully',
    data: result,
  });
}
