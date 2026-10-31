import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes.js";
import { ApiError } from "./utils/apiError.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import roomRoutes from "./routes/room.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "unavailable",
    database: databaseConnected ? "connected" : "disconnected",
  });
});

app.use("/api/v1/auth", authRoutes);

// Register alongside your auth routes:
app.use("/api/v1/rooms", roomRoutes);
// Participant sends a join request

app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Error middleware must be last.
app.use(errorMiddleware);
export default app;
