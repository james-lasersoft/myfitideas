# Phase 5: RBAC, User Administration, and Security Auditability

Status: In progress

## Approved product decisions

- Default organization: MyFitIdeas (`myfitideas`)
- Permission-based RBAC with deny-by-default authorization
- Organization-ready schema
- Existing first user becomes Super Administrator and Organization Administrator
- Built-in roles: Super Administrator, Organization Administrator, Translator, Support, Coach, Premium User, Standard User, Free User
- Secure invitation links with 72-hour expiration
- Session revocation and forced password-change support
- Immutable administrative audit logging
- Automatic email delivery deferred
- Main branch remains untouched while Phase 5 is developed on `feature/phase-5-rbac-user-administration`

## Implementation sequence

1. Database schema and migration
2. Permission and role bootstrap
3. Existing-user organization membership bootstrap
4. Permission resolution service
5. Backend authorization middleware
6. Current-user authorization endpoint
7. Protected administrative APIs
8. Frontend authorization context and route guards
9. User Management page
10. Role Management page
11. Invitation acceptance flow
12. Session management
13. Audit Log page
14. Translation catalog additions
15. Backend and frontend tests
16. Phase closeout documentation

## Security invariants

- Backend permissions are authoritative. Frontend visibility is not authorization.
- Access is denied unless a required permission is explicitly granted.
- The final active Super Administrator cannot be deactivated or stripped of administrative access.
- Users cannot remove their own last administrative role.
- Protected built-in roles cannot be deleted.
- Organization administrators cannot grant system-only privileges.
- Passwords are never displayed, emailed, or set by administrators.
- Invitation and session tokens are stored as hashes.
- Security-sensitive changes are written to the audit log.
- User deactivation is soft and preserves historical records.

## Initial permission families

- Dashboard
- Measurements
- Hydration
- Profile
- Progress
- Administration
- Translations
- Users
- Roles
- Audit
- Organization

## Deferred items

- Email provider integration
- SMS delivery
- MFA
- Social login
- Enterprise SSO
- Subscription billing enforcement
- Trainer-client relationships
- Push notifications
