import { NextResponse } from 'next/server';

export const ok = (payload) => NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });

export const failure = (error, status = 400) =>
  NextResponse.json({ error: error?.message ?? String(error) }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handle(work) {
  try {
    return ok(await work());
  } catch (error) {
    return failure(error);
  }
}
