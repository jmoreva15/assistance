import { weekdayName } from '../domain/time.js';

const store = {
  users: new Map(),
  submissions: new Map(),
  drafts: new Map(),
  activity: new Map(),
  nextActivityId: 1,
};

const emptyDrafts = () => ({ today: null, single: null, bulk: null });

export function createMemoryDriver() {
  return {
    name: 'memory',

    async getUserById(id) {
      return store.users.get(id) ?? null;
    },

    async getUserByDni(dni) {
      return [...store.users.values()].find((user) => user.dni === dni) ?? null;
    },

    async createUser({ dni, fullName, formUrl }) {
      const user = { id: `mem-${store.users.size + 1}`, dni, fullName, formUrl, createdAt: new Date().toISOString() };
      store.users.set(user.id, user);
      store.submissions.set(user.id, new Map());
      store.drafts.set(user.id, emptyDrafts());
      store.activity.set(user.id, []);
      return user;
    },

    async updateProfile(userId, { fullName, formUrl }) {
      const user = { ...store.users.get(userId), fullName, formUrl };
      store.users.set(userId, user);
      return user;
    },

    async listSubmissions(userId) {
      return [...(store.submissions.get(userId)?.values() ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    },

    async insertSubmissions(userId, records) {
      const bucket = store.submissions.get(userId) ?? new Map();
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
        bucket.set(record.date, row);
        return row;
      });
      store.submissions.set(userId, bucket);
      return saved;
    },

    async getDrafts(userId) {
      return store.drafts.get(userId) ?? emptyDrafts();
    },

    async saveDraft(userId, kind, payload) {
      const drafts = store.drafts.get(userId) ?? emptyDrafts();
      store.drafts.set(userId, { ...drafts, [kind]: payload });
    },

    async deleteDraft(userId, kind) {
      const drafts = store.drafts.get(userId) ?? emptyDrafts();
      store.drafts.set(userId, { ...drafts, [kind]: null });
    },

    async logActivity(userId, action, detail) {
      const entries = store.activity.get(userId) ?? [];
      entries.push({ id: store.nextActivityId++, action, detail, createdAt: new Date().toISOString() });
      store.activity.set(userId, entries);
    },

    async listActivity(userId, limit = 300) {
      return (store.activity.get(userId) ?? []).slice(-limit);
    },
  };
}
