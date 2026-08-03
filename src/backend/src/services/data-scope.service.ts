import prisma from "../config/prisma.js";

export async function canAccessUserData(actorUserId: string, subjectUserId: string, organizationId?: string): Promise<boolean> {
  if (actorUserId === subjectUserId) return true;
  if (!organizationId) return false;

  const assignment = await prisma.dataAssignment.findFirst({
    where: {
      organizationId,
      staffUserId: actorUserId,
      subjectUserId,
      isActive: true,
      startsAt: { lte: new Date() },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(assignment);
}
