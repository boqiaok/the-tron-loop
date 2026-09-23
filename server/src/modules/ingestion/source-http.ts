import { BadRequestException } from '@nestjs/common';

const MAX_RESPONSE_LENGTH = 2_000_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const USER_AGENT = 'TheTronLoop/1.0 (Hamilton activity guide)';

export interface SourceRequest {
  label: string;
  accept: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function fetchText(
  url: string | URL,
  request: SourceRequest,
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: request.accept,
      'User-Agent': USER_AGENT,
      ...request.headers,
    },
    signal: AbortSignal.timeout(request.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new BadRequestException(
      `${request.label} returned HTTP ${response.status}`,
    );
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_LENGTH) {
    throw new BadRequestException(`${request.label} response exceeds 2 MB`);
  }
  return text;
}

export async function fetchJson(
  url: string | URL,
  request: Omit<SourceRequest, 'accept'>,
): Promise<unknown> {
  const text = await fetchText(url, { ...request, accept: 'application/json' });
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BadRequestException(`${request.label} did not return valid JSON`);
  }
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  max = 10_000,
): string | null {
  const value = record[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new BadRequestException(
      `${key} must be a string no longer than ${max} characters`,
    );
  }
  return value.trim();
}

export function parseHttpUrl(value: string, base?: string): string | null {
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return null;
  }
  return url.protocol === 'https:' || url.protocol === 'http:'
    ? url.toString()
    : null;
}
