import { ApiError } from "../utils/apiError.js";

export const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err instanceof ApiError ? err.statusCode : 500;

  let message = err.message || "Internal server error";
  let errors = Array.isArray(err.errors) ? err.errors : [];

  // Duplicate MongoDB unique-index value.
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern ?? {})[0];
    message = field
      ? `${field} already exists`
      : "A duplicate value already exists";
    errors = [];
  }

  // Mongoose schema validation error.
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((item) => item.message);
  }

  if (statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    message = "Internal server error";
    errors = [];
  }

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
  });
};
