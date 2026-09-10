# Vantras EHS Academy

Manager-ready application release for a role-based Environment, Health & Safety learning platform.

## Application scope

Vantras EHS Academy combines a public learning website with four authenticated workspaces:

- Student Portal
- Trainer Portal
- Corporate Training Portal
- Admin Portal

The release includes course discovery, enrollment, learning progress, assessments, exams, results, certificates, resources, live-session workflows, corporate training administration, platform administration, reporting, support workflows, and the Vantras AI EHS Assistant.

## Run locally

Requirement: Python 3.10 or newer.

```bash
python app.py
```

Open:

```text
http://127.0.0.1:8173
```

Optional port override:

```bash
VANTRAS_PORT=8199 python app.py
```

The local application has no required third-party Python packages.

## Sample access accounts

The Login page does not auto-fill credentials when a portal type is selected. Sign in with the registered email/mobile and password.

| Portal | Email | Password |
|---|---|---|
| Student | student@vantras.demo | student123 |
| Trainer | trainer@vantras.demo | trainer123 |
| Corporate | corporate@vantras.demo | corporate123 |
| Admin | admin@vantras.demo | admin123 |

New accounts are stored in SQLite and return to their saved role portal on future sign-ins. New Student, Trainer, and Corporate accounts begin with user-specific workspace data rather than inheriting another user's learning records.


## Student enrollment and access flow

Student accounts open **Browse Courses** immediately after sign-in. Course-dependent areas are locked until the learner completes enrollment and payment.

The supported flow is:

1. Browse a published course.
2. Select **Enroll**.
3. Confirm billing and payment details.
4. The checkout details are saved to the database with a pending checkout record.
5. Payment and enrollment are saved together.
6. The course becomes unlocked in Browse Courses and My Courses.
7. Only assessments belonging to enrolled courses are returned to the Student portal.
8. Course Player, Learning Path, Assessments, Exams, Results, Performance, course resources, sessions, and certificates require at least one enrollment.
9. Assessment question and submission APIs also verify enrollment server-side, so a learner cannot open a locked test by calling the endpoint directly.

Student enrollment state, checkout data, payments, learning progress, assessment attempts/results, and certificates are persisted in SQLite for the local release.

## Main capabilities

### Public website

Home, About, Courses, Corporate Training, Resources, Blog, Contact, Certificate Verification, Login, and Registration.

### Student Portal

Dashboard, Browse Courses, My Courses, Course Player, Learning Path, Assessments, Exams, Results, Performance, Certificates, Payments, Resources, Live Sessions, AI EHS Assistant, Notifications, Help & Support, and Profile.

### Trainer Portal

Dashboard, My Courses, Create Course, Learners, Live Sessions, Assessments, Question Bank, Assignments, Certificates, Content Library, Feedback, Reports, Messages, Calendar, My Profile, and Help & Support.

### Corporate Training Portal

Dashboard, Training Programs, My Team, Bulk Employee Upload, Course Assignment, Enrollments, Assessments, Employee Progress, Certificates, Reports & Analytics, Resource Library, Training Requests, Notifications, Profile, Settings, and Support.

### Admin Portal

Dashboard, User Management, Course Management, Categories, Course Approvals, Enrollments, Assessments, Question Bank, Exam Management, Certificates, Certificate Verification, Payments, Refunds, Coupons, Invoices, Corporate Management, Live Sessions, Resources, CMS / Blog, Reports, Analytics, Notifications, Support Tickets, Audit Logs, Security, Roles & Permissions, and System Settings.


## Unified dashboard design

All four portal dashboards now use one shared visual system: a role-specific hero, five aligned KPI cards, four text/icon quick actions, and a balanced two-column content grid. Cards use the same blue/green accent language, spacing, equal-row alignment, hover depth and responsive behavior. Student Learning Path and Exams Ending Soon keep internal scrolling so two records remain visible while the rest can be reviewed without stretching the dashboard.

## Data and content included

The bundled SQLite database provides a realistic walkthrough dataset, including:

- 18 published EHS courses (20 course records in the catalogue database)
- assessment and question-bank data
- Student learning/enrollment records
- Trainer operational records
- Corporate training records
- Admin governance and reporting records
- certificate, payment, support, and resource data

## AI EHS Assistant

The AI EHS Assistant is configured as a general-purpose assistant with strong EHS expertise. It can answer EHS questions as well as coding, mathematics, writing, study and general-knowledge questions. The application calls Z.AI and Ollama concurrently; Z.AI is preferred when both succeed, while Ollama is the immediate fallback. A small local fallback remains available for common EHS concepts, greetings, basic programming definitions and simple arithmetic when both model providers are unavailable. Configure provider values in `.env` using `.env.example` as a reference. The UI does not expose provider names to learners.

## Project structure

```text
Vantras_EHS_Academy/
├── app.py
├── backend/
│   └── main.py
├── database/
│   ├── schema.sql
│   └── vantras.db
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── workspace-details.js
│   ├── dashboard.js
│   ├── styles.css
│   ├── dashboard.css
│   └── assets/managed/
├── deployment/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── github-actions/ci.yml
├── tests/
├── .env.example
├── .gitignore
└── requirements.txt
```

## Verification

Run the checks from the project root:

```bash
python tests/smoke_test.py
python tests/all_portals_smoke_test.py
python tests/functionality_test.py
python tests/ai_concurrent_test.py
python tests/assets_test.py
python tests/detail_workspace_test.py
```

JavaScript syntax can also be checked with Node.js when available:

```bash
node --check frontend/app.js
node --check frontend/workspace-details.js
node --check frontend/dashboard.js
```

## Release cleanup

This cleaned release removes generated caches and temporary artifacts, consolidates the previous Corporate Learning / inner-scroll styling into one documented CSS section, and keeps the current dashboard layout isolated in `dashboard.js` and `dashboard.css`. Existing media assets are retained only when referenced by current public pages, course content, previews or portal hero sections.

The current UI uses one shared interaction system for cards, buttons, icons, navigation and hero sections: blue/green accents, restrained hover lift, image zoom, press feedback and stronger depth shadows. Signed-in portals keep the application shell fixed while only the inner content pane scrolls.

## Production readiness

The application is suitable for product walkthroughs, stakeholder review, functional validation, and continued engineering. Before a production launch, replace local infrastructure with organization-approved identity/MFA, production database and object storage, payment provider verification, secure media delivery, notification services, rate limiting/WAF, centralized secrets, monitoring, backups/DR, formal security testing, and deployment-specific observability.


## AI Assistant setup

The AI Assistant answers both EHS and general questions. The project is configured for a dual-provider setup with Z.AI and Ollama.

1. Copy `.env.example` to `.env` in the project root.
2. Add your own `ZAI_API_KEY` to `.env`. Keep the real key local and out of Git or shared ZIP files.
3. Cloud provider: `glm-4.5-flash` is the primary model and `glm-4.7-flash` is the configured Z.AI fallback model.
4. Z.AI uses a 25-second timeout, up to 4096 output tokens, and thinking is disabled for interactive chat latency.
5. Local provider: Ollama uses `qwen2.5:7b`, a 45-second timeout, 1400 predicted tokens, and a 30-minute keep-alive.
6. With `OLLAMA_AUTO_START=true`, the backend can start a locally installed Ollama service when it is not already running. With `OLLAMA_AUTO_PULL=true`, it can start pulling the configured model if it is missing.
7. With `AI_PROVIDER_RACE=true`, Z.AI and Ollama are started together and the first complete successful answer is returned. If the Z.AI primary model fails, the configured Z.AI fallback model is tried automatically.
8. `AGENTIC_TOOL_CALLING=true` is retained as a project capability flag; actual tool calling only takes effect when application tools are explicitly implemented and registered.

After editing `.env`, restart the application. Provider status is available through the backend status endpoint for development diagnostics, while the user-facing chat can remain answer-only.


## Student Dashboard AI Copilot

The **Vantras AI Copilot** is intentionally limited to the **Student Dashboard** in this release. It can summarize the current dashboard, recommend the next learning step, build a learning plan and answer general questions using the same Z.AI/Ollama provider pipeline as the main AI Assistant. Trainer, Corporate and Admin dashboards remain focused operational workspaces without a Copilot column.

The backend route `POST /api/ai/agent` remains available for the Student dashboard. Provider diagnostics are kept out of learner-facing responses.

Security note: `.env.example` intentionally contains a blank `ZAI_API_KEY`. Put the real key only in a local `.env` file and do not commit or share it.
