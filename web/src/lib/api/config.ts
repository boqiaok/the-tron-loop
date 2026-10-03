const LOCAL_API_BASE_URL = "http://localhost:3001/api/v1";

export const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      LOCAL_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? LOCAL_API_BASE_URL;

/**
 * Imported listings rarely change once stored, so server renders reuse API
 * responses for a day instead of querying the database on every page view.
 * Editors' changes reach public pages within this time.
 */
export const PUBLIC_DATA_REVALIDATE_SECONDS = 86400;
