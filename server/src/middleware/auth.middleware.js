import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.watchparty_token;

  if (!token) {
    throw new ApiError(401, "Please log in to access this resource");
  }

  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired authentication token");
  }

  if (typeof decoded !== "object" || !decoded.sub) {
    throw new ApiError(401, "Invalid authentication token");
  }

  const user = await User.findById(decoded.sub).select("+sessionVersion");

  if (!user) {
    throw new ApiError(401, "User account not found");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Verify your email before accessing your account");
  }
  if ((decoded.ver ?? 0) !== (user.sessionVersion || 0)) {
    throw new ApiError(401, "Session expired. Please log in again");
  }

  req.user = user;

  return next();
});
