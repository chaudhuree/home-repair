import { JwtPayload } from "jsonwebtoken";

export interface ITokenUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface IDecodedUser extends JwtPayload, ITokenUser {}
