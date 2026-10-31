import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCookieOptions } from "../utils/cookieOptions.js";
import { sendPasswordResetEmail } from "../utils/sendEmail.js";

const COOKIE_NAME = "watchparty_token";
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_SEND_LIMIT = 3;

const createToken = (user) => {
  if (!process.env.JWT_SECRET) throw new ApiError(500, "JWT_SECRET is not configured");
  return jwt.sign({ sub: user._id.toString(), ver: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const getSafeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt,
});

const setAuthCookie = (res, user) => res.cookie(COOKIE_NAME, createToken(user), getCookieOptions());

// POST /api/v1/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body ?? {};
  if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string") {
    throw new ApiError(400, "Username, email and password are required");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    throw new ApiError(400, "Username must be 3-30 characters and contain only letters, numbers or underscores");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ApiError(400, "Please enter a valid email address");
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new ApiError(400, "Password must be at least 8 characters and no more than 72 UTF-8 bytes");
  }

  const existingUsername = await User.findOne({ username: normalizedUsername }).select("_id email");
  const existingRaw = await User.collection.findOne({ email: normalizedEmail });
  const isRecoveringLegacyPendingSignup = existingRaw?.isEmailVerified === false;
  if (existingUsername && existingUsername.email !== normalizedEmail) {
    throw new ApiError(409, "Username is already taken");
  }
  if (existingRaw && !isRecoveringLegacyPendingSignup) {
    throw new ApiError(409, "Email is already registered. Please log in");
  }

  let user;
  if (isRecoveringLegacyPendingSignup) {
    user = await User.findById(existingRaw._id).select("+sessionVersion");
    user.username = normalizedUsername;
    user.password = password;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    await User.collection.updateOne({ _id: user._id }, { $unset: {
      isEmailVerified: "",
      emailVerificationOtpHash: "",
      emailVerificationOtpExpiresAt: "",
      emailVerificationOtpSentAt: "",
      emailVerificationOtpWindowStartedAt: "",
      emailVerificationOtpSendCount: "",
      emailVerificationOtpFailedAttempts: "",
    } });
  } else {
    user = await User.create({ username: normalizedUsername, email: normalizedEmail, password });
  }

  setAuthCookie(res, user);
  return res.status(201).json(new ApiResponse(201, { user: getSafeUser(user) }, "Account created successfully"));
});

// POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ApiError(400, "A valid email address is required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt +passwordResetSentAt +passwordResetWindowStartedAt +passwordResetSendCount +sessionVersion",
  );
  if (user) {
    const now = new Date();
    const windowIsCurrent = user.passwordResetWindowStartedAt && now.getTime() - user.passwordResetWindowStartedAt.getTime() < PASSWORD_RESET_WINDOW_MS;
    const windowStartedAt = windowIsCurrent ? user.passwordResetWindowStartedAt : now;
    const sendCount = windowIsCurrent ? user.passwordResetSendCount || 0 : 0;
    const cooldownActive = user.passwordResetSentAt && now.getTime() - user.passwordResetSentAt.getTime() < PASSWORD_RESET_COOLDOWN_MS;

    if (!cooldownActive && sendCount < PASSWORD_RESET_SEND_LIMIT) {
      const token = randomBytes(32).toString("hex");
      user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
      user.passwordResetExpiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);
      user.passwordResetSentAt = now;
      user.passwordResetWindowStartedAt = windowStartedAt;
      user.passwordResetSendCount = sendCount + 1;
      await user.save();

      try {
        const clientOrigin = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
        await sendPasswordResetEmail({
          email: user.email,
          username: user.username,
          resetUrl: `${clientOrigin}/reset-password#token=${token}`,
        });
      } catch (error) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();
        console.error("Password reset email delivery failed:", error.message);
      }
    }
  }

  return res.status(200).json(new ApiResponse(200, null, "If an account exists for that email, a password reset link has been sent"));
});

// POST /api/v1/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) throw new ApiError(400, "Password reset link is invalid or expired");
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new ApiError(400, "Password must be at least 8 characters and no more than 72 UTF-8 bytes");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const user = await User.findOneAndUpdate({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }, { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null } }, { new: true }).select("+password +sessionVersion");
  if (!user) throw new ApiError(400, "Password reset link is invalid or expired");

  user.password = password;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.passwordResetSentAt = null;
  user.passwordResetWindowStartedAt = null;
  user.passwordResetSendCount = 0;
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();

  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(COOKIE_NAME, clearOptions);
  return res.status(200).json(new ApiResponse(200, null, "Password reset successfully. Please log in with your new password"));
});

// POST /api/v1/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password +sessionVersion");
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, "Invalid email or password");

  setAuthCookie(res, user);
  return res.status(200).json(new ApiResponse(200, { user: getSafeUser(user) }, "Login successful"));
});

// POST /api/v1/auth/logout
export const logoutUser = (req, res) => {
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(COOKIE_NAME, clearOptions);
  return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
};

// GET /api/v1/auth/getUser
export const getCurrentUser = (req, res) => res.status(200).json(
  new ApiResponse(200, { user: getSafeUser(req.user) }, "Current user fetched successfully"),
);
