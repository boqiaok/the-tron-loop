const LOCAL_API_BASE_URL = "http://localhost:3001/api/v1";

export const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      LOCAL_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? LOCAL_API_BASE_URL;
