import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

import { User } from "../models/User.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCookieOptions } from "../utils/cookieOptions.js";
import { generateOTP } from "../utils/generateOTP.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../utils/sendEmail.js";

const COOKIE_NAME = "watchparty_token";
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_SEND_LIMIT = 5;
const OTP_ATTEMPT_LIMIT = 5;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
const PASSWORD_RESET_SEND_LIMIT = 3;

const hashOTP = (userId, otp) => {
  if (!process.env.JWT_SECRET) throw new ApiError(500, "JWT_SECRET is not configured");
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId.toString()}:${otp}`)
    .digest("hex");
};

const sendOTP = async (user) => {
  const now = new Date();
  const windowIsCurrent = user.emailVerificationOtpWindowStartedAt &&
    now.getTime() - user.emailVerificationOtpWindowStartedAt.getTime() < OTP_SEND_WINDOW_MS;
  const windowStartedAt = windowIsCurrent ? user.emailVerificationOtpWindowStartedAt : now;
  const sendCount = windowIsCurrent ? user.emailVerificationOtpSendCount || 0 : 0;

  if (user.emailVerificationOtpSentAt && now.getTime() - user.emailVerificationOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new ApiError(429, "Please wait before requesting another verification code");
  }
  if (sendCount >= OTP_SEND_LIMIT) {
    throw new ApiError(429, "Too many verification codes requested. Try again in an hour");
  }

  const otp = generateOTP();
  const previousOtpState = {
    hash: user.emailVerificationOtpHash,
    expiresAt: user.emailVerificationOtpExpiresAt,
    sentAt: user.emailVerificationOtpSentAt,
    windowStartedAt: user.emailVerificationOtpWindowStartedAt,
    sendCount: user.emailVerificationOtpSendCount,
    failedAttempts: user.emailVerificationOtpFailedAttempts,
  };
  user.emailVerificationOtpHash = hashOTP(user._id, otp);
  user.emailVerificationOtpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
  user.emailVerificationOtpSentAt = now;
  user.emailVerificationOtpWindowStartedAt = windowStartedAt;
  user.emailVerificationOtpSendCount = sendCount + 1;
  user.emailVerificationOtpFailedAttempts = 0;
  await user.save();

  try {
    await sendVerificationEmail({ email: user.email, username: user.username, otp });
  } catch (error) {
    user.emailVerificationOtpHash = previousOtpState.hash;
    user.emailVerificationOtpExpiresAt = previousOtpState.expiresAt;
    user.emailVerificationOtpSentAt = previousOtpState.sentAt;
    user.emailVerificationOtpWindowStartedAt = previousOtpState.windowStartedAt;
    user.emailVerificationOtpSendCount = previousOtpState.sendCount;
    user.emailVerificationOtpFailedAttempts = previousOtpState.failedAttempts;
    await user.save();
    console.error("Verification email delivery failed:", {
      message: error.message,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    throw new ApiError(503, "Could not send verification email. Please try again later");
  }
};

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: user._id.toString(), ver: user.sessionVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

const getSafeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt,
});

// POST /api/v1/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email } = req.body ?? {};

  if (
    typeof username !== "string" ||
    typeof email !== "string"
  ) {
    throw new ApiError(400, "Username and email are required");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    throw new ApiError(
      400,
      "Username must be 3-30 characters and contain only letters, numbers or underscores",
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ApiError(400, "Please enter a valid email address");
  }

  const existingEmail = await User.findOne({ email: normalizedEmail }).select(
    "+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpSentAt +emailVerificationOtpWindowStartedAt +emailVerificationOtpSendCount +emailVerificationOtpFailedAttempts",
  );
  if (existingEmail?.isEmailVerified) throw new ApiError(409, "Email is already registered");
  if (existingEmail && existingEmail.username !== normalizedUsername) {
    throw new ApiError(409, "Email is already registered; verify it or request a new code");
  }

  const existingUsername = await User.findOne({ username: normalizedUsername }).select("_id email");
  if (existingUsername && existingUsername.email !== normalizedEmail) {
    throw new ApiError(409, "Username is already taken");
  }

  const user = existingEmail || await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    // This placeholder is replaced by the email owner during OTP verification.
    password: randomBytes(32).toString("base64url"),
  });

  await sendOTP(user);

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { email: user.email, requiresEmailVerification: true },
        "Account created. Check your email for a verification code",
      ),
    );
});

// POST /api/v1/auth/verify-email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp, username, password } = req.body ?? {};
  if (typeof email !== "string" || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw new ApiError(400, "A valid email and 6-digit verification code are required");
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new ApiError(400, "Set a password with at least 8 characters and no more than 72 UTF-8 bytes");
  }
  if (typeof username !== "string" || !/^[a-z0-9_]{3,30}$/i.test(username.trim())) {
    throw new ApiError(400, "Username must be 3-30 characters and contain only letters, numbers or underscores");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpFailedAttempts +sessionVersion",
  );
  if (!user || user.isEmailVerified || !user.emailVerificationOtpHash) {
    throw new ApiError(400, "Verification code is invalid or expired");
  }
  if (user.emailVerificationOtpFailedAttempts >= OTP_ATTEMPT_LIMIT) {
    throw new ApiError(400, "Verification code is invalid or expired");
  }
  if (!user.emailVerificationOtpExpiresAt || user.emailVerificationOtpExpiresAt <= new Date()) {
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    await user.save();
    throw new ApiError(400, "Verification code is invalid or expired");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const usernameTaken = await User.exists({ username: normalizedUsername, _id: { $ne: user._id } });
  if (usernameTaken) throw new ApiError(409, "Username is already taken. Choose another username");

  const candidate = Buffer.from(hashOTP(user._id, otp), "hex");
  const expected = Buffer.from(user.emailVerificationOtpHash, "hex");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) {
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        isEmailVerified: false,
        emailVerificationOtpHash: user.emailVerificationOtpHash,
        emailVerificationOtpFailedAttempts: { $lt: OTP_ATTEMPT_LIMIT },
      },
      { $inc: { emailVerificationOtpFailedAttempts: 1 } },
      { new: true },
    ).select("+emailVerificationOtpFailedAttempts");
    if (updatedUser?.emailVerificationOtpFailedAttempts >= OTP_ATTEMPT_LIMIT) {
      await User.updateOne(
        { _id: user._id, emailVerificationOtpHash: user.emailVerificationOtpHash },
        { $set: { emailVerificationOtpHash: null, emailVerificationOtpExpiresAt: null } },
      );
    }
    throw new ApiError(400, "Verification code is invalid or expired");
  }

  const verifiedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      isEmailVerified: false,
      emailVerificationOtpHash: user.emailVerificationOtpHash,
      emailVerificationOtpExpiresAt: { $gt: new Date() },
      emailVerificationOtpFailedAttempts: { $lt: OTP_ATTEMPT_LIMIT },
    },
    { $set: { emailVerificationOtpHash: null, emailVerificationOtpExpiresAt: null } },
    { new: true },
  ).select("+sessionVersion");
  if (!verifiedUser) throw new ApiError(400, "Verification code is invalid or expired");

  verifiedUser.isEmailVerified = true;
  verifiedUser.username = normalizedUsername;
  verifiedUser.password = password;
  verifiedUser.emailVerificationOtpSentAt = null;
  verifiedUser.emailVerificationOtpWindowStartedAt = null;
  verifiedUser.emailVerificationOtpSendCount = 0;
  verifiedUser.emailVerificationOtpFailedAttempts = 0;
  await verifiedUser.save();

  res.cookie(COOKIE_NAME, createToken(verifiedUser), getCookieOptions());
  return res.status(200).json(new ApiResponse(200, { user: getSafeUser(verifiedUser) }, "Email verified and password set successfully"));
});

// POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ApiError(400, "A valid email address is required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase(), isEmailVerified: true }).select(
    "+passwordResetTokenHash +passwordResetExpiresAt +passwordResetSentAt +passwordResetWindowStartedAt +passwordResetSendCount +sessionVersion",
  );
  if (user) {
    const now = new Date();
    const windowIsCurrent = user.passwordResetWindowStartedAt &&
      now.getTime() - user.passwordResetWindowStartedAt.getTime() < PASSWORD_RESET_WINDOW_MS;
    const windowStartedAt = windowIsCurrent ? user.passwordResetWindowStartedAt : now;
    const sendCount = windowIsCurrent ? user.passwordResetSendCount || 0 : 0;
    const cooldownActive = user.passwordResetSentAt &&
      now.getTime() - user.passwordResetSentAt.getTime() < PASSWORD_RESET_COOLDOWN_MS;

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
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new ApiError(400, "Password reset link is invalid or expired");
  }
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new ApiError(400, "Password must be at least 8 characters and no more than 72 UTF-8 bytes");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const user = await User.findOneAndUpdate({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
    isEmailVerified: true,
  }, {
    $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null },
  }, { new: true }).select("+password +sessionVersion");
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

// POST /api/v1/auth/resend-otp
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ApiError(400, "A valid email address is required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpSentAt +emailVerificationOtpWindowStartedAt +emailVerificationOtpSendCount +emailVerificationOtpFailedAttempts",
  );
  if (user && !user.isEmailVerified) {
    try {
      await sendOTP(user);
    } catch (error) {
      // Keep the public response identical for unknown, throttled, and mail-failure cases.
      if (![429, 503].includes(error.statusCode)) throw error;
    }
  }

  return res.status(200).json(new ApiResponse(200, null, "If the account needs verification, a code has been sent"));
});

// POST /api/v1/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password +sessionVersion");

  // Use the same message for an unknown email and wrong password.
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Verify your email before logging in");
  }

  const token = createToken(user);

  res.cookie(COOKIE_NAME, token, getCookieOptions());

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: getSafeUser(user) }, "Login successful"),
    );
});

// POST /api/v1/auth/logout
export const logoutUser = (req, res) => {
  const { maxAge, ...clearOptions } = getCookieOptions();

  res.clearCookie(COOKIE_NAME, clearOptions);

  return res.status(200).json(new ApiResponse(200, null, "Logout successful"));
};

// GET /api/v1/auth/me
export const getCurrentUser = (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: getSafeUser(req.user) },
        "Current user fetched successfully",
      ),
    );
};
