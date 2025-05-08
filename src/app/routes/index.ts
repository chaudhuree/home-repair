import express, { Router, Request, Response } from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { ServiceRoutes } from '../modules/service/service.routes';
import { ReservationRoutes } from '../modules/reservation/reservation.routes';
import { OrderRoutes } from '../modules/order/order.routes';
import { ChatRoutes } from '../modules/chat/chat.routes';
import { CashbackRoutes } from '../modules/cashback/cashback.routes';
import { AddOnRoutes } from '../modules/addOn/addOn.routes';
import { PackageTypeRoutes } from '../modules/packageType/packageType.routes';
import { SpaceTypeRoutes } from '../modules/spaceType/spaceType.routes';
import { SupplyRoutes } from '../modules/supply/supply.routes';
import { SupplyTransactionRoutes } from '../modules/supplyTransaction/supplyTransaction.routes';
import { TodoRoutes } from '../modules/todo/todo.routes';

// need to import below two to upload image -> upload is the middleware
// uploadImage is the function
import { uploadFile } from '../utils/uploadFile';
import { upload } from '../middlewares/upload';
import { TransactionRoutes } from '../modules/transaction/transaction.routes';

const router: Router = express.Router();

interface ModuleRoute {
  path: string;
  route: Router;
}

const moduleRoutes: ModuleRoute[] = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/services',
    route: ServiceRoutes,
  },
  {
    path: '/reservations',
    route: ReservationRoutes,
  },
  {
    path: '/orders',
    route: OrderRoutes,
  },
  {
    path: '/chat',
    route: ChatRoutes,
  },
  {
    path: '/cashbacks',
    route: CashbackRoutes,
  },
  {
    path: '/add-ons',
    route: AddOnRoutes,
  },
  {
    path: '/package-types',
    route: PackageTypeRoutes,
  },
  {
    path: '/space-types',
    route: SpaceTypeRoutes,
  },
  {
    path: '/supplies',
    route: SupplyRoutes,
  },
  {
    path: '/supply-transactions',
    route: SupplyTransactionRoutes,
  },
  {
    path: '/transactions',
    route: TransactionRoutes,
  },
  {
    path: '/todos',
    route: TodoRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

// ROUTER TO UPLOAD IMAGE
/**
 * @method POST
 * @route {baseUrl}/upload
 * @select form-data in postman
 * @set key "image" and select image from your device
 */
router.post("/upload", upload.single("image"), (req: Request, res: Response) => {
  if (req.file) {
    const result = uploadFile(req.file);
    result.then((response) => {
      if (response.success) {
        return res.status(200).json(response);
      } else {
        return res.status(400).json(response);
      }
    });
  } else {
    return res.status(400).json({ success: false, error: "No file provided" });
  }
});

export default router;
