import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5003/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function getApiError(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}
