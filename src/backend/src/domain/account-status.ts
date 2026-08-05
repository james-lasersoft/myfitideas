export const ACCOUNT_STATUSES = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "CLOSED",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_TRANSITIONS: Readonly<Record<AccountStatus, readonly AccountStatus[]>> = {
  PENDING_VERIFICATION: ["ACTIVE", "SUSPENDED", "CLOSED"],
  ACTIVE: ["SUSPENDED", "CLOSED"],
  SUSPENDED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

export function canTransitionAccountStatus(from: AccountStatus, to: AccountStatus): boolean {
  return ACCOUNT_STATUS_TRANSITIONS[from].includes(to);
}
