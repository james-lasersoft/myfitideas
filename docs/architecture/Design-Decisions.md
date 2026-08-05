# MyFitIdeas Architecture and Product Design Decisions

## ADR-005: Account-Centric Terminology

**Status:** Accepted  
**Date:** 2026-08-04

### Decision

MyFitIdeas uses account-centric terminology throughout customer-facing experiences.

Approved terms:

- Create Account
- Log In
- Account Settings
- Account Security
- Verify Email
- Complete Onboarding
- Choose a Plan

Avoid in customer-facing copy:

- Sign Up or Signup
- Register or Registration
- Sign In
- Login as a button, heading, or navigation label

Technical identifiers, API routes, database fields, and backend functions may retain conventional names such as `register` and `login` when changing them would add risk without improving the customer experience.

### Canonical route

The canonical public account-creation route is:

```text
/create-account
```

The legacy `/signup` and `/register` routes redirect to the canonical route for compatibility.

### Rationale

MyFitIdeas is an account-based SaaS platform. Consistent terminology reduces cognitive load, supports predictable localization, and aligns public acquisition, verification, onboarding, security, and account-management experiences.

### Analytics preference

The optional de-identified aggregate analytics preference is selected by default during account creation. The control remains separate from required Terms and Privacy acknowledgments, is clearly labeled as optional, and can be changed later in Privacy Settings.

### Consequences

- New customer-facing features must use the approved terminology.
- Translation catalogs must preserve the same terminology in supported languages.
- Existing compatibility routes remain available but are not used in new links.
- Health measurements and goals remain outside account creation and are collected later through guided onboarding.
