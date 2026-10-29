import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCookieOptions } from "../utils/cookieOptions.js";

const COOKIE_NAME = "watchparty_token";

const createToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
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
  const { username, email, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    throw new ApiError(400, "Username, email and password are required");
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

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters and no more than 72 UTF-8 bytes",
    );
  }

  const existingUser = await User.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
  }).select("_id username email");

  if (existingUser) {
    if (existingUser.email === normalizedEmail) {
      throw new ApiError(409, "Email is already registered");
    }

    throw new ApiError(409, "Username is already taken");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
  });

  const token = createToken(user._id);

  res.cookie(COOKIE_NAME, token, getCookieOptions());

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: getSafeUser(user) },
        "User registered successfully",
      ),
    );
});

// POST /api/v1/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  // Use the same message for an unknown email and wrong password.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = createToken(user._id);

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
