import { hasSupabase } from '../config/env.js';
import { createMemoryDriver } from './memory-driver.js';
import { createSupabaseDriver } from './supabase-driver.js';

let instance = null;

export function repository() {
  if (!instance) instance = hasSupabase() ? createSupabaseDriver() : createMemoryDriver();
  return instance;
}

export const storageName = () => repository().name;
