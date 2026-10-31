import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/database.js";
import http from "http";
import { initializeSocket } from "./sockets/socket.js";

const PORT = process.env.PORT || 5003;

const httpServer = http.createServer(app);
initializeSocket(httpServer);

const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
