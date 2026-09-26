# MaybeWe — Solo Traveler Matching Platform

MaybeWe is a curated solo traveler matching and trip discovery application built with Expo (React Native) localized for India with Supabase backend services.

---

## Architecture

```
MaybeWe
├── frontend
│   ├── app
│   ├── components
│   ├── assets
│   ├── data
│   ├── lib
│   ├── hooks
│   └── utils
│
├── backend
│   └── supabase
│       ├── migrations
│       ├── functions
│       └── ...
│
└── test
```

### Module Roles

- **`frontend/`**: Expo / React Native client application containing the user interface, navigation routes, client-side state, hooks, UI components, static assets, and client Supabase SDK connection.
- **`backend/`**: Supabase database and backend infrastructure, including SQL schemas, migrations, security policies (RLS), stored procedures (RPC), Edge Functions, and database seeds.
- **`test/`**: Automated project-level test suites (`test/verify.js`) validating security architecture, brand integrity, date overlap algorithms, theme preferences, and schema compliance.
- **Root**: Essential project-level tooling and build configurations (`package.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `netlify.toml`).

---

## Future Development Guidelines

All future development must follow this strict directory layout:

| Category | Target Directory | Description |
|---|---|---|
| **New UI Screen** | `frontend/app/` | Expo Router routes and screen layouts |
| **Reusable UI Component** | `frontend/components/` (or `frontend/components/ui/`) | Buttons, cards, modals, headers, badges |
| **Client-Side Business Logic** | `frontend/lib/` | State helpers, matching algorithms, API wrappers |
| **Custom React Hooks** | `frontend/hooks/` | Reusable hooks for device, auth, data lifecycle |
| **Client Utility Functions** | `frontend/utils/` | Formatting, date math, validation helpers |
| **Database Migrations** | `backend/supabase/migrations/` | Versioned SQL scripts, RLS policies, tables |
| **Supabase Edge Functions** | `backend/supabase/functions/` | Deno-based serverless functions |
| **Backend Seed / DB Scripts** | `backend/supabase/seed/` | Database seeds and admin maintenance scripts |

### Architectural Rules

1. **Determine Domain First**: Decide whether the addition is frontend (client application) or backend (Supabase / database).
2. **Reuse Existing Directories**: Do not create random new top-level directories.
3. **Preserve Client/Backend Boundaries**: Client-side Supabase calls (`supabaseClient.js`) belong in `frontend/lib/`. Database DDL, RLS, and RPCs belong in `backend/supabase/`.
4. **Zero TypeScript Source**: All code is standard JavaScript (`.js` / `.jsx`).
5. **Brand Integrity**: All user-facing UI copy and labels must adhere to the "MaybeWe" identity.

---

## Validation & Quality Checks

Run the verification pipeline:

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
node test/verify.js

# 3. Export web bundle to verify builds
npx expo export --platform web
```
