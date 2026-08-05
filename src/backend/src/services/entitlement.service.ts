import prisma from "../config/prisma.js";

export async function getUserEntitlements(userId: string): Promise<string[]> {
  const now = new Date();
  const subscriptions = await prisma.userSubscription.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      startedAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: {
      plan: {
        include: {
          entitlements: { include: { entitlement: true } },
        },
      },
    },
  });

  return [...new Set(subscriptions.flatMap((subscription) =>
    subscription.plan.entitlements.map((row) => row.entitlement.key)
  ))].sort();
}

export async function hasEntitlement(userId: string, entitlement: string): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.includes(entitlement);
}
