# GharKaKhana (GKK)

GKK is a charitable home-food initiative run by **Fazal-e-Insaaniyat Charity Works (FI)**, a family-run charity. It connects **home chefs in Karachi** with **customers who want home-cooked food**, through an Expo / React Native app backed by Supabase.

Chefs publish a kitchen profile and a menu of dishes; customers discover nearby kitchens, browse their menus, and order. The launch area is **Karachi**, with both sides of the marketplace (chefs and customers) in scope from day one. Ordering today works by calling the kitchen; simple in-app ordering is planned (see the roadmap).

## The problem it solves

- **For home chefs:** skilled home cooks can list a kitchen and reach customers nearby without building their own website or delivery operation. GKK gives them a profile, a menu, and an "accepting orders" switch.
- **For customers:** finding trustworthy, home-cooked meals nearby is largely word-of-mouth today. GKK lists nearby kitchens with cuisines, hygiene ratings, and menus in one place.

GKK is community-serving, not a commercial venture: prices are in PKR, phone numbers are formatted for `+92`, and ordering runs by phone call (a stopgap) until simple in-app ordering with manual settlement (cash on delivery, JazzCash, Easypaisa, or bank transfer) ships.

The Supabase database is live and populated, so sign-in, sign-up, and data loading target real data. Native auth sessions are persisted via AsyncStorage, so users stay signed in across restarts; the full status and the remaining tracked issues live in [`docs/`](./docs/).

## Direction

- **Authentication** is moving to phone number + password; SMS one-time codes are deferred. (The code today still uses email/password; that is the existing implementation, not the plan.)
- **Platform** stays cross-platform React Native, intended for both Android and iOS. Android is the first release target; iOS and App Store shipping follow later.
- **Chef first:** the owner will seed the chef side by recruiting home cooks before opening to customers, so chef onboarding and kitchen quality come before customer acquisition.
- **Chef phone numbers** stay visible to every signed-in user for now, with tightening deferred. This is a deliberate, known trade-off.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 58 (installed `~58.0.23`) |
| Runtime | React Native `0.88.1`, React `19.3.0` |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) `~58.0.30` (file-based routing) |
| Language | TypeScript `~6.0.3` (`strict: true`) |
| Styling | [NativeWind](https://www.nativewind.dev) `4.2.7` + Tailwind CSS `3.4.18` |
| Backend | [Supabase](https://supabase.com) (`@supabase/supabase-js` `2.81.1`): auth, Postgres tables, storage |
| Icons | `lucide-react-native` |
| Location | `expo-location` (geocoding + distance) |
| Images | `expo-image-picker` + `expo-image` |

## Project structure

```
app/                        Expo Router file-based routes
  _layout.tsx               Root Stack + auth gate
  index.tsx                 Customer/chef dispatch by user_type
  auth/                     Sign-in and sign-up screens
  kitchen/[chefid].tsx      Kitchen page + dish menu
  profile.tsx               Profile, password change, sign-out

components/
  chef/                     Chef dashboard and 3-step onboarding
  customer/CustomerHome.tsx Chef list, radius filter, sorting, tabs

services/locationService.tsx Geocoding, distance, radius filter, sorting

supabase.js                 Single Supabase client (hard-coded URL + anon key)
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full breakdown.

## Local setup

Prerequisites: Node.js (recent LTS) with npm, plus a phone with Expo Go (SDK 58 is supported by current Expo Go) **or** a development build.

1. **Install dependencies.** Use `npm ci` so you install exactly what the lockfile pins:

   ```bash
   npm ci
   ```

2. **Configure Supabase.** The client in [`supabase.js`](./supabase.js) hard-codes its URL and anon key for the live project:

   ```js
   // supabase.js
   export const supabase = createClient(
     'https://aqqyknwgspxnzahrdkbp.supabase.co',   // project URL
     'eyJ...'                                       // anon key
   );
   ```

   Point both values at a different project only if you are not using the live one. Moving them to `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` is future work. The app expects the schema captured in [`supabase/migrations/00000000000000_baseline.sql`](./supabase/migrations/00000000000000_baseline.sql), including the `profiles`, `chef_profiles`, and `dishes` tables, plus a public `avatars` storage bucket; see [`docs/DATABASE.md`](./docs/DATABASE.md) for the full schema and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#backend-supabase) for how the client uses it.

3. **Start the app.**

   ```bash
   npx expo start
   ```

   Press `i` / `a` for simulators, scan the QR code with a device, or press `w` for web. The app shows data from the configured project.

4. **Check the code.**

   ```bash
   npx tsc --noEmit        # type check, currently passes
   npm run lint            # eslint, currently 0 errors (warnings remain)
   ```

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): how the codebase is organised, the data flow, and known weak points.
- [`docs/FEATURES.md`](./docs/FEATURES.md): what exists today, by audience, with honest complete/partial/stub labels.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md): blockers now, in-app ordering and correctness next, growth later, plus the open questions.
- [`docs/index.html`](./docs/index.html): a standalone, single-file overview page (no build step, no network needed).

## License

GKK is released under the **MIT License**; see [`LICENSE`](./LICENSE). Licensing is settled: volunteers and other charities are free to use, modify, and share the work, provided the copyright notice is kept.
