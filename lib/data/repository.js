import { hasSupabase } from '../config/env.js';
import { createLocalFileDriver } from './local-file-driver.js';
import { createSupabaseDriver } from './supabase-driver.js';

let instance = null;

export function repository() {
  if (!instance) instance = hasSupabase() ? createSupabaseDriver() : createLocalFileDriver();
  return instance;
}
