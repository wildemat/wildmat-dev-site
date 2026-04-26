export type ValidationResult = {
  ok: boolean;
  violations: string[];
};

const PROFANITY = /\b(fuck\w*|shit\w*|bitch\w*|asshole|cunt|dick|bastard)\b/i;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE = /\b(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
const ADDRESS = /\b\d+\s+[A-Z][a-z]+\s+(street|st|avenue|ave|road|rd|blvd|boulevard|lane|ln|drive|dr)\b/i;

export function validateResponse(response: string): ValidationResult {
  const violations: string[] = [];

  if (PROFANITY.test(response)) violations.push('contains profanity or strong language');
  if (EMAIL.test(response)) violations.push('contains email address');
  if (PHONE.test(response)) violations.push('contains phone number');
  if (SSN.test(response)) violations.push('contains SSN-like pattern');
  if (ADDRESS.test(response)) violations.push('contains street address pattern');

  return { ok: violations.length === 0, violations };
}
