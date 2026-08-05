-- Phase 7 keeps account lifecycle separate from subscription lifecycle.
-- Existing ACTIVE, INACTIVE, INVITED, and SUSPENDED values remain for backward compatibility.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
