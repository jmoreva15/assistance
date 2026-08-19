import { NextResponse } from 'next/server';
import { CODES } from './errors.js';

const STATUS_BY_CODE = { [CODES.SESSION_GONE]: 401 };

export const ok = (payload) => NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });

export const failure = (error) =>
  NextResponse.json(
    { error: error?.message ?? String(error), code: error?.code ?? null },
    { status: STATUS_BY_CODE[error?.code] ?? 400, headers: { 'Cache-Control': 'no-store' } },
  );

export async function handle(work) {
  try {
    return ok(await work());
  } catch (error) {
    return failure(error);
  }
}
