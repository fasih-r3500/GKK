# Ghar Ki Kitchen (GKK)

GKK is a charitable home-food initiative run by **Fazal-e-Insaaniyat Charity Works (FI)**, a family-run charity. It connects **home chefs in Karachi** with **customers who want home-cooked food**, through an Expo / React Native app backed by Supabase.

Chefs set up a kitchen profile and publish a menu of dishes; customers discover nearby kitchens, browse their menus, and order. The initial operating area is **Karachi**, with both sides of the marketplace — chefs and customers — in scope from day one. Today ordering works by calling the kitchen; simple in-app ordering is planned (see the roadmap).

---

## The problem it solves

- **For home chefs** — skilled home cooks can list a kitchen and reach customers nearby without building their own website or delivery operation. GKK gives them a profile, a menu, and an "accepting orders" switch.
- **For customers** — finding trustworthy, home-cooked meals nearby is largely word-of-mouth today. GKK lists nearby kitchens with cuisines, hygiene ratings, and menus in one place.

GKK is a community-serving initiative, not a commercial venture: prices are in PKR, phone numbers are formatted for `+92`, and the launch area is **Karachi**. Ordering today is by phone call (a stopgap); simple in-app ordering with manual settlement — cash on delivery, JazzCash, Easypaisa, or bank transfer — is planned.

---

## Direction

- **Authentication** is moving to phone number + password; SMS one-time codes are deferred. (The code today still uses email/password — that is the existing implementation, not the plan.)
- **Platform** stays cross-platform React Native, intended for both Android and iOS. Android is the first release target; iOS and App Store shipping follow later.
- **Chef first** — the owner will seed the chef side by recruiting home cooks before opening to customers, so chef onboarding and kitchen quality come before customer acquisition.
- **Chef phone numbers** stay visible to every signed-in user for now, with tightening deferred — a deliberate, known trade-off.

---

## Current status — read this first

**The app is not currently usable end-to-end.** Be honest about where it stands before investing time in it:

| Area | Status |
|---|---|
| Code compiles and types | ✅ `npx tsc --noEmit` passes (`strict: true`) |
| Web bundle | ✅ `npx expo export --platform web` builds successfully |
| **Supabase backend** | ❌ **Offline.** The project host `aqqyknwgspxnzahrdkbp.supabase.co` no longer resolves (verified NXDOMAIN). The Supabase project is paused or deleted. **The app cannot sign in, sign up, or load any data until it is restored.** |
| Native session persistence | ❌ Broken — login is not remembered between app restarts (see below) |
| Icon rendering in native builds | ❌ `react-native-svg` is missing as a direct dependency |
| Lint | ⚠️ `npm run lint` reports 5 errors and 14 warnings |

The Supabase URL and anon key are hard-coded in [`supabase.js`](./supabase.js). They point at a project that is currently offline, so every screen that touches the backend renders empty or errors until that project is restored or recreated.

> For the full picture, read the architecture and feature docs under [`docs/`](./docs/).

---

## Screenshots

No real screenshots yet. Because the Supabase backend is offline, the app cannot render live data, so we are not publishing misleading captures.

<!-- Placeholder: add a customer home screenshot here once the backend is restored -->
<!-- Placeholder: add a kitchen/menu page screenshot here -->
<!-- Placeholder: add a chef onboarding or dashboard screenshot here -->

A standalone overview of the product (with the same honest status) lives in [`docs/index.html`](./docs/index.html) — open it directly in a browser.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 54 (installed `~54.0.20`; latest is 58) |
| Runtime | React Native `0.81.5`, React `19.1.0` |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) `~6.0.13` (file-based routing) |
| Language | TypeScript `~5.9.2` (`strict: true`) |
| Styling | [NativeWind](https://www.nativewind.dev) `4.2.1` + Tailwind CSS `3.4.18` |
| Backend | [Supabase](https://supabase.com) (`@supabase/supabase-js` `2.81.1`) — auth, Postgres tables, storage |
| Icons | `lucide-react-native` |
| Location | `expo-location` (geocoding + distance) |
| Images | `expo-image-picker` + `expo-image` |

---

## Project structure

```
app/                        Expo Router file-based routes
  _layout.tsx               Root Stack + auth gate (redirect logic)
  index.tsx                 Dispatches to customer/chef home based on user_type
  auth/login.tsx            Email/password sign-in
  auth/signup.tsx           Sign-up (customer/chef toggle, phone formatting)
  kitchen/[chefid].tsx      Customer-facing kitchen page + dish menu
  profile.tsx               Profile screen (view profile, change password, sign out)
  global.css                Tailwind entry for NativeWind

components/
  chef/ChefDashboard.tsx    Chef home: order toggle, inline editing, dish CRUD
  chef/ChefOnboarding.tsx   3-step kitchen setup (info → location → cuisines)
  customer/CustomerHome.tsx Customer home: chef list, radius/sort filters, tabs

services/
  locationService.tsx       Geocoding, haversine distance, radius filter, sorting

supabase.js                 Single Supabase client (hard-coded URL + anon key)
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for a detailed breakdown.

---

## Local setup

### Prerequisites

- Node.js (recent LTS) and npm
- A phone with Expo Go **or** a development build — note that Expo SDK 54 is outside the current Expo Go support window, so the app may need a development build rather than the latest Expo Go app.

### 1. Install dependencies

Use `npm ci` so you install exactly what the lockfile pins:

```bash
npm ci
```

### 2. Configure Supabase

The Supabase client reads its URL and anon key from [`supabase.js`](./supabase.js). Today those values are hard-coded and point to a project that is **offline**:

```js
// supabase.js
export const supabase = createClient(
  'https://aqqyknwgspxnzahrdkbp.supabase.co',   // project URL
  'eyJ...'                                       // anon key
);
```

Until a working Supabase project is available and those values point at it, the app will fail to authenticate and load data. To point the app at a restored or new project, update both values in `supabase.js` (or move them to `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — that refactor is future work, not yet done).

The backend tables the app expects are `profiles`, `chef_profiles`, and `dishes`, plus a public storage bucket named `avatars`. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#backend-supabase) for the schema the client assumes.

### 3. Start the app

```bash
npx expo start
```

Then press `i` / `a` for simulators, scan the QR code with a device, or press `w` for web. The web bundle is known to build; the app will still be empty without a reachable backend.

### 4. Check the code

```bash
npx tsc --noEmit        # type check — currently passes
npm run lint            # eslint — currently 5 errors / 14 warnings
```

---

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — how the codebase is organised, the data flow, and known weak points.
- [`docs/FEATURES.md`](./docs/FEATURES.md) — what exists today, by audience, with honest complete/partial/stub labels.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — the roadmap: blockers now, simple in-app ordering and correctness next, growth later, plus the decisions still open for the product owner.
- [`docs/index.html`](./docs/index.html) — a standalone, single-file overview page (no build step, no network needed).

---

## Known issues (tracked, not yet fixed)

These are documented, not hidden. Each is a separate work item:

1. **Supabase backend offline** — blocks all auth and data loading.
2. **No native session persistence** — the client is created without a storage adapter and `@react-native-async-storage/async-storage` is not installed, so users are logged out on every restart.
3. **`react-native-svg` missing** — icons crash in native builds outside Expo Go.
4. Two code bugs: a Rules-of-Hooks violation in `app/kitchen/[chefid].tsx`, and dish image URLs being double-wrapped so customer-facing dish images break.
5. Dependency drift — SDK 54 is four majors behind (58), plus `npm audit` findings.

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for the full ordering and the decisions that still need a product owner.
