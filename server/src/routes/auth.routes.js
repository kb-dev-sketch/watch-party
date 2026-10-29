import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
} from "../controllers/user.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/getUser", verifyJWT, getCurrentUser);

export default router;
