import fs from 'node:fs';
import path from 'node:path';
import { weekdayName } from '../domain/time.js';

const FILE = path.join(process.cwd(), '.data', 'store.json');

const emptyState = () => ({ users: {}, submissions: {}, activity: {}, nextActivityId: 1 });

let state = null;
let writable = true;

function load() {
  if (state) return state;
  try {
    state = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    state = emptyState();
  }
  return state;
}

function persist() {
  if (!writable) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch {
    writable = false;
  }
}

const bucket = (map, userId, fallback) => {
  if (!map[userId]) map[userId] = fallback;
  return map[userId];
};

export function createLocalFileDriver() {
  return {
    name: 'local-file',

    async getUserById(id) {
      return load().users[id] ?? null;
    },

    async getUserByDni(dni) {
      return Object.values(load().users).find((user) => user.dni === dni) ?? null;
    },

    async createUser({ dni, fullName }) {
      const store = load();
      const id = `local-${Object.keys(store.users).length + 1}`;
      const user = { id, dni, fullName, createdAt: new Date().toISOString() };
      store.users[id] = user;
      store.submissions[id] = {};
      store.activity[id] = [];
      persist();
      return user;
    },

    async updateProfile(userId, { fullName }) {
      const store = load();
      store.users[userId] = { ...store.users[userId], fullName };
      persist();
      return store.users[userId];
    },

    async listSubmissions(userId) {
      const store = load();
      return Object.values(bucket(store.submissions, userId, {})).sort((a, b) => a.date.localeCompare(b.date));
    },

    async insertSubmissions(userId, records) {
      const store = load();
      const rows = bucket(store.submissions, userId, {});
      const saved = records.map((record) => {
        const row = {
          date: record.date,
          weekday: weekdayName(record.date),
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          note: record.note ?? '',
          source: record.source ?? 'today',
          submittedAt: new Date().toISOString(),
        };
        rows[record.date] = row;
        return row;
      });
      persist();
      return saved;
    },




    async logActivity(userId, action, detail) {
      const store = load();
      bucket(store.activity, userId, []).push({
        id: store.nextActivityId++,
        action,
        detail,
        createdAt: new Date().toISOString(),
      });
      persist();
    },

    async listActivity(userId, limit = 300) {
      return bucket(load().activity, userId, []).slice(-limit);
    },
  };
}
