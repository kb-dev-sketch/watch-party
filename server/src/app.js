import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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

app.use("/api/v1/auth", authRoutes);

// Register alongside your auth routes:
app.use("/api/v1/rooms", roomRoutes);
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

// Error middleware must be last.
app.use(errorMiddleware);
export default app;
