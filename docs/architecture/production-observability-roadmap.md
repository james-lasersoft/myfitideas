# MyFitIdeas Production and Observability Implementation Roadmap

## Purpose

This document turns the initial production infrastructure and monitoring design into an executable implementation plan for MyFitIdeas.

The Generation 1 production target is:

- Ubuntu application host
- Nginx reverse proxy and static content server
- systemd-managed Node.js API and worker processes
- AWS RDS for PostgreSQL
- CloudWatch as the infrastructure telemetry backend
- OpenTelemetry for application telemetry
- A private MyFitIdeas monitoring service and dashboard at `monitor.myfitideas.com`
- A Raspberry Pi kiosk browser connected to a large wall display
- No direct CloudWatch exposure to the kiosk or end users

The design target is approximately 10,000 registered users, 1,000 to 1,500 daily active users, and 250 to 300 simultaneously active users before a formal Generation 2 scaling review.

## Architecture principles

1. Production services must start automatically and recover automatically.
2. Frontend deployments, backend services, and operational tooling must be separated cleanly.
3. Subdomains are user-facing boundaries, not automatically separate backend services.
4. Production secrets must never be committed to source control.
5. The monitoring browser must never receive AWS credentials.
6. Observability must be implemented as a platform capability, not retrofitted later.
7. Operational telemetry must not contain customer health data or unnecessary personally identifiable information.
8. The application must be designed so a second API instance can be added later without major restructuring.

## Target production topology

```text
Internet
   |
 HTTPS
   |
 Nginx
   |
   +-----------------------------+
   |                             |
Static frontend applications   Node.js API
                                 |
                               Prisma
                                 |
                              AWS RDS

Telemetry path:

Application + EC2 + RDS
          |
OpenTelemetry / CloudWatch Agent
          |
      CloudWatch
          |
Private Monitoring API
          |
monitor.myfitideas.com
          |
Raspberry Pi kiosk browser
          |
Large wall display
```

## Recommended production directory layout

```text
/var/www/myfitideas/
├── www/
├── app/
├── trainer/
├── admin/
└── api/
```

Potential future backend services:

```text
/opt/myfitideas/
├── api/
├── worker/
├── notifications/
├── analytics/
└── fooddata-import/
```

## Recommended production subdomains

- `www.myfitideas.com` - marketing/public site
- `app.myfitideas.com` - customer application
- `trainer.myfitideas.com` - trainer/professional portal
- `admin.myfitideas.com` - administrative application
- `api.myfitideas.com` - shared backend API
- `monitor.myfitideas.com` - private operations dashboard

## systemd service model

The Node.js API should run as a systemd-managed service with automatic restart and boot-time startup.

Minimum requirements:

- dedicated Linux service account
- production working directory
- environment variables loaded from a protected environment file
- `Restart=on-failure`
- boot-time enablement
- journal logging
- graceful shutdown support in the Node.js process

Expected operational commands:

```bash
sudo systemctl status myfitideas-api
sudo systemctl restart myfitideas-api
sudo journalctl -u myfitideas-api -f
```

## Deployment model

Production deployment should move toward release-based directories and automated CI/CD.

Recommended pattern:

```text
/var/www/myfitideas/api/
├── releases/
│   ├── 2026-08-01/
│   ├── 2026-08-05/
│   └── 2026-08-08/
└── current -> releases/2026-08-08/
```

Deployment flow:

```text
merge to production branch
        |
GitHub Actions
        |
run tests
        |
build application
        |
deploy release
        |
install production dependencies
        |
run Prisma migrations
        |
move current symlink
        |
restart systemd service
        |
health check
```

Rollback should be possible by moving the `current` symlink back to the previous release and restarting the service.

## Observability architecture

MyFitIdeas should collect three telemetry classes:

### Infrastructure metrics

Source: AWS CloudWatch and CloudWatch Agent.

Required initial metrics:

- EC2 CPU utilization
- EC2 network in/out
- Ubuntu memory utilization
- Ubuntu disk utilization
- disk I/O
- RDS CPU utilization
- RDS database connections
- RDS freeable memory
- RDS free storage
- RDS read/write latency
- RDS read/write IOPS
- RDS queue depth/load indicators

### Application metrics

Source: OpenTelemetry instrumentation in Node.js.

Required initial metrics:

- API request count
- requests per second/minute
- p50/p95/p99 API latency
- HTTP 4xx count
- HTTP 5xx count
- exception count
- database query duration
- database failures/timeouts
- connection pool utilization
- job started/completed/failed counts
- Node.js heap utilization
- process memory
- event loop delay
- process uptime

### Business-operational metrics

Source: MyFitIdeas application telemetry.

Required initial metrics:

- user registrations
- login successes
- login failures
- currently active users
- daily active users
- meal entries
- snack entries
- hydration entries
- body measurements recorded
- weight entries
- workouts logged

Business telemetry must use aggregated counters and must not include customer health values or personally identifying payloads.

## OpenTelemetry implementation requirement

Create a central telemetry layer rather than allowing individual modules to depend directly on CloudWatch APIs.

Example interface:

```typescript
telemetry.increment("nutrition.meal.logged");
telemetry.increment("hydration.entry.logged");
telemetry.recordDuration("analytics.report.duration", durationMs);
telemetry.increment("authentication.failure");
```

Recommended internal flow:

```text
Business code
    |
TelemetryService
    |
OpenTelemetry
    |
CloudWatch Agent / OTLP
    |
CloudWatch
```

## Structured logging standard

Production logs should be JSON and should include, where applicable:

- timestamp
- severity level
- service name
- environment
- request ID
- trace ID
- event name
- duration
- status code
- deployment version

Never log:

- passwords
- access tokens
- refresh tokens
- authorization headers
- full request bodies
- health information
- body measurements
- meal contents
- progress photo URLs
- unnecessary email addresses or other PII

## Request and trace correlation

Every inbound API request must receive a unique request ID.

OpenTelemetry trace IDs should be propagated through supported downstream operations.

Logs should contain request and trace identifiers so a single operation can be followed across API, database, workers, and future services.

## Health and version endpoints

Implement the following endpoints:

### `GET /health/live`

Confirms that the Node.js process is alive.

### `GET /health/ready`

Confirms that the API is ready to serve traffic.

Initial checks:

- application process
- configuration loaded
- database reachable

### `GET /health/dependencies`

Restricted operational endpoint for dependency status.

Potential dependencies:

- PostgreSQL/RDS
- S3
- FoodData subsystem
- email provider
- AI provider
- future cache/queue services

### `GET /version`

Return deployment metadata:

- application version
- Git commit SHA
- build number
- build timestamp
- environment

## Active user definition

For operational capacity planning, define a currently active user as an authenticated account that has interacted with MyFitIdeas within the previous five minutes.

Initial implementation may use a session heartbeat:

```text
POST /api/session/heartbeat
```

Recommended client behavior:

- heartbeat approximately every 60 seconds while the application is active
- expiration after five minutes of inactivity

Initial storage may use PostgreSQL. A future Redis implementation should preserve the same operational definition.

## Monitoring service architecture

The monitoring frontend must not query AWS directly.

```text
Raspberry Pi
      |
monitor.myfitideas.com
      |
Monitoring API
      |
      +-- CloudWatch GetMetricData
      +-- MyFitIdeas aggregate metrics
      +-- application health checks
      +-- deployment/version metadata
      +-- alert state
```

The monitoring API should return a compact dashboard-oriented model, for example:

```json
{
  "status": "healthy",
  "users": {
    "online": 187,
    "dailyActive": 1086
  },
  "api": {
    "requestsPerMinute": 846,
    "p95Ms": 142,
    "errorRate": 0.18
  },
  "server": {
    "cpu": 24,
    "memory": 41,
    "disk": 32
  },
  "database": {
    "cpu": 19,
    "connections": 37
  }
}
```

## Wall dashboard requirements

The first production wall dashboard should show at minimum:

### Overall status

- all systems operational/degraded/critical
- current production version
- deployment age/time

### Application

- active users
- DAU
- API requests/minute
- p95 API latency
- API error rate
- process uptime

### Application server

- CPU
- memory
- disk
- network
- Node.js runtime health

### Database

- CPU
- connections
- free memory
- storage
- read/write latency
- query p95 if available
- slow query count if available

### Service reachability

- www
- app
- trainer
- admin
- API

### Activity

- registrations
- logins
- meals logged
- hydration entries
- measurements
- workouts

### Capacity indicator

Show current utilization relative to the Generation 1 design target.

Target planning capacity:

- 10,000 registered users
- 1,000 to 1,500 DAU
- 250 to 300 simultaneously active users

## Raspberry Pi kiosk security model

The Raspberry Pi should have a dedicated read-only device identity.

Example permission:

```text
monitoring.dashboard.read
```

The device must have:

- no AWS credentials
- no database credentials
- no administrative permissions
- no customer data permissions
- no write access to the production application

If the device is lost, its credential must be independently revocable.

## Threshold model

Initial thresholds should be configurable rather than hard-coded in UI components.

Suggested starting points for review:

- application CPU warning: 60 to 70 percent sustained
- memory warning: 70 to 80 percent sustained
- RDS CPU warning: approximately 70 percent sustained
- API p95 warning: tune from production baseline
- API 5xx rate warning: tune from production baseline
- database connection warning: configurable percentage of pool/RDS limit

The dashboard should clearly distinguish:

- healthy
- elevated
- warning
- critical

## Generation 1 scaling review triggers

Begin a Generation 2 architecture review when any of these become persistent during peak traffic:

- application CPU above comfortable operating range
- memory pressure
- p95/p99 latency degradation
- RDS saturation or sustained high DB load
- connection pool pressure
- background jobs affecting interactive requests
- repeated need for vertical EC2 scaling
- 300 to 500 or more truly simultaneous users
- deployment restart downtime becoming unacceptable
- availability requirements demanding redundancy

Generation 2 likely introduces:

- load balancer
- two or more API instances
- external/shared session and cache state
- S3-backed file storage
- Redis or equivalent cache/session store
- containerized workloads/ECS as justified

Kubernetes is not a Generation 1 requirement.

# Implementation phases

## Phase 0 - Architecture contract

Goal: define standards before adding telemetry code.

Tasks:

- approve metric naming conventions
- approve structured log schema
- approve privacy/redaction rules
- approve health endpoint contracts
- approve active-user definition
- approve deployment metadata fields
- define service names and environment names

Acceptance criteria:

- architecture document approved
- no production telemetry may contain health values or secrets
- naming conventions are documented and reusable

## Phase 1 - Application observability foundation

Goal: establish telemetry plumbing before the application grows further.

Tasks:

- add OpenTelemetry bootstrap to Node.js API
- create central `TelemetryService`
- add JSON structured logging
- add request ID middleware
- propagate trace IDs
- add automatic API duration/error instrumentation
- add Node.js runtime metrics
- add database timing/error instrumentation

Acceptance criteria:

- each API request has request and trace identifiers
- API latency and error metrics are emitted
- logs are structured JSON
- sensitive values are redacted or never captured

## Phase 2 - Health and deployment metadata

Goal: make production services externally diagnosable.

Tasks:

- implement `/health/live`
- implement `/health/ready`
- implement restricted `/health/dependencies`
- implement `/version`
- add graceful shutdown handling
- add build/version environment variables

Acceptance criteria:

- health endpoints return deterministic status codes
- readiness fails when the database is unavailable
- version endpoint identifies the deployed release and commit

## Phase 3 - Business-operational metrics

Goal: collect operational usage data without collecting customer content.

Tasks:

- instrument registration count
- instrument login success/failure
- instrument meal/snack/hydration entry counts
- instrument measurement/weight/workout counts
- implement active-session heartbeat
- define and compute DAU

Acceptance criteria:

- dashboard metrics can be calculated without querying sensitive user content
- active user count follows the five-minute definition
- business telemetry is aggregate-only

## Phase 4 - AWS production host observability

Goal: connect production infrastructure telemetry.

Tasks:

- install/configure CloudWatch Agent on Ubuntu
- collect memory and disk metrics
- validate EC2 native metrics
- validate RDS native metrics
- configure OpenTelemetry export path
- establish IAM role with least privilege
- create CloudWatch alarms for core resource thresholds

Acceptance criteria:

- EC2, OS, Node.js, API, and RDS metrics are visible in CloudWatch
- no long-lived AWS access keys are stored in application code
- alarms can be triggered in a controlled test

## Phase 5 - Production process management

Goal: eliminate manual startup/restart requirements.

Tasks:

- create dedicated Linux service account
- create `myfitideas-api.service`
- configure environment file permissions
- configure automatic restart
- enable service at boot
- configure Nginx virtual hosts
- configure TLS
- validate graceful service restart

Acceptance criteria:

- rebooting the server restores the application automatically
- Node.js crash causes automatic restart
- no manual terminal session is required to keep the API running

## Phase 6 - Release-based deployment and rollback

Goal: make production deployment repeatable and reversible.

Tasks:

- introduce release directories
- add `current` symlink pattern
- implement GitHub Actions build/deploy workflow
- run automated tests before deployment
- run Prisma migration step
- perform post-deploy health check
- implement rollback procedure

Acceptance criteria:

- one pipeline deploys a release
- previous release can be restored without rebuilding
- failed health check prevents or reverses a bad deployment

## Phase 7 - Monitoring API

Goal: create the private operational aggregation layer.

Tasks:

- create monitoring service/module
- configure least-privilege CloudWatch read IAM role
- query CloudWatch with `GetMetricData`
- query application aggregate metrics
- query health/version endpoints
- normalize results into a dashboard API model
- cache short-lived monitoring responses where appropriate

Acceptance criteria:

- browser receives no AWS credentials
- monitoring endpoint returns infrastructure, app, DB, health, and deployment data
- failure of one metric source does not crash the entire dashboard response

## Phase 8 - `monitor.myfitideas.com` wall dashboard

Goal: create the permanent operations display.

Tasks:

- build full-screen responsive dashboard
- design for 1080p and 4K wall displays
- implement overall health state
- implement system/resource cards
- implement trend graphs
- implement service reachability
- implement business activity summary
- implement capacity indicators
- implement deployment/version display
- implement automatic refresh/reconnect behavior
- avoid interactive controls that require routine kiosk input

Acceptance criteria:

- dashboard can run unattended for 24 hours
- temporary network loss recovers automatically
- status remains readable from across a room
- no sensitive customer information is displayed

## Phase 9 - Raspberry Pi kiosk

Goal: operate the dashboard as a dedicated appliance.

Tasks:

- provision Raspberry Pi OS
- configure Chromium kiosk mode
- configure automatic login/startup
- launch dashboard automatically
- disable screen blanking/sleep
- create dedicated read-only kiosk credential
- document credential rotation/revocation
- configure watchdog or browser restart strategy

Acceptance criteria:

- power cycle returns automatically to dashboard
- kiosk requires no keyboard/mouse for normal operation
- stolen device exposes only read-only aggregate operational information

## Phase 10 - Load testing and Generation 1 validation

Goal: verify actual production capacity rather than relying on assumptions.

Test targets:

- 300 concurrent users: required
- 400 concurrent users: required
- 500 concurrent users: desired
- 750 concurrent users: exploratory
- 1,000 concurrent users: identify limits

Measure:

- p50/p95/p99 latency
- error rate
- EC2 CPU/memory
- Node.js event loop delay
- RDS CPU/load
- connection utilization
- database latency
- throughput

Acceptance criteria:

- 300-user test completes within agreed latency/error thresholds
- bottlenecks are documented
- dashboard accurately reflects load-test conditions
- Generation 1 capacity assumptions are revised using measured results

# Suggested delivery order

```text
Phase 0
  |
Phase 1
  |
Phase 2
  |
Phase 3
  |
Phase 4
  |
Phase 5
  |
Phase 6
  |
Phase 7
  |
Phase 8
  |
Phase 9
  |
Phase 10
```

Some infrastructure phases may overlap, but observability foundations should precede production launch.

# Definition of done for Generation 1

Generation 1 is complete when:

- production starts automatically after reboot
- application processes automatically recover from failure
- Nginx terminates HTTPS and routes all production subdomains
- PostgreSQL runs on RDS
- secrets are managed outside source control
- API, database, runtime, server, and business metrics are collected
- logs are structured and privacy-safe
- request and trace correlation works
- health/version endpoints exist
- GitHub Actions performs repeatable release deployment
- rollback is documented and tested
- monitoring API aggregates AWS and application data
- `monitor.myfitideas.com` is operational
- Raspberry Pi automatically displays the dashboard in kiosk mode
- load testing validates at least the 300-concurrent-user design target
- operational thresholds and Generation 2 review triggers are documented

# Future Generation 2 considerations

Do not implement these prematurely, but keep Generation 1 compatible with them:

- Application Load Balancer
- multiple stateless API instances
- ECS/Fargate
- Redis
- distributed job queues
- shared cache/session state
- S3 for user-generated objects
- blue/green or rolling deployments
- multi-AZ redundancy
- expanded SLO/error-budget monitoring

The Generation 1 system should be intentionally simple, observable, recoverable, privacy-conscious, and easy to scale horizontally when real production metrics justify the change.
