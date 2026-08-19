import { FORM_URL } from '../config/form.js';
import { ROLES, describeMappingProblems, mapFields } from '../forms/field-mapping.js';
import { readForm } from '../forms/read-form.js';

const CACHE_MS = 5 * 60 * 1000;
const ROLE_ORDER = [ROLES.FULL_NAME, ROLES.DNI, ROLES.DATE, ROLES.CLOCK_IN, ROLES.CLOCK_OUT, ROLES.NOTE];

let cached = null;

export async function describeForm() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const form = await readForm(FORM_URL);
  const { mapping, unresolved, missingRequired } = mapFields(form.fields);
  const value = {
    title: form.title,
    url: FORM_URL,
    problem: describeMappingProblems({ unresolved, missingRequired }),
    fields: ROLE_ORDER.filter((role) => mapping[role]).map((role) => ({
      role,
      title: mapping[role].title,
      required: mapping[role].required,
    })),
  };

  cached = { at: Date.now(), value };
  return value;
}
