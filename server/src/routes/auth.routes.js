import { Router } from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/user.controller.js";

import { verifyJWT } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/register", rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Too many registration attempts. Try again later" }), registerUser);
router.post("/verify-email", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many verification attempts. Try again later" }), verifyEmail);
router.post("/resend-otp", rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Too many code requests. Try again later" }), resendOtp);
router.post("/forgot-password", rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Too many password reset requests. Try again later" }), forgotPassword);
router.post("/reset-password", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many reset attempts. Try again later" }), resetPassword);
router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Try again later" }), loginUser);
router.post("/logout", logoutUser);
router.get("/getUser", verifyJWT, getCurrentUser);
export default router;
