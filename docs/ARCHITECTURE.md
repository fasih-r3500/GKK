# GKK: Architecture

This document describes how the GKK codebase is organised, how data flows through it, and where the architecture is weak. It describes the code **as it is today**; it is not a proposal.

Everything here is verifiable against the source files cited, which were read in full for this account.

---

## 1. High-level shape

GKK is a small Expo / React Native app (~2,300 lines across 10 route/component files) with:

- **Expo Router** file-based routing (`app/`).
- **A single Supabase client** in [`supabase.js`](../supabase.js) used directly from components.
- **No service/repository layer** (except [`services/locationService.tsx`](../services/locationService.tsx)).
- **No global state library**: local React state only.

The backend is a Supabase project. As of writing, that project's host (`aqqyknwgspxnzahrdkbp.supabase.co`) does not resolve, so the backend is offline and the app cannot function end-to-end (see README "Current status").

---

## 2. Route map: `app/`

| Route | File | Responsibility |
|---|---|---|
| `_layout` | [`app/_layout.tsx`](../app/_layout.tsx) | Root `<Stack>` (headerless). Loads fonts, restores the auth session, and gates navigation: signed-out users are redirected to `/auth/login`, signed-in users are bounced out of the auth group back to `/`. |
| `/` | [`app/index.tsx`](../app/index.tsx) | Dispatcher. Fetches the current user's `profiles.user_type`, then renders `CustomerHome`, `ChefOnboarding` (if a chef's setup is incomplete), or `ChefDashboard`. |
| `/auth/login` | [`app/auth/login.tsx`](../app/auth/login.tsx) | Email/password sign-in form. |
| `/auth/signup` | [`app/auth/signup.tsx`](../app/auth/signup.tsx) | Sign-up form with a customer/chef toggle and `+92` phone formatting. |
| `/kitchen/[chefid]` | [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx) | Customer-facing kitchen page: chef profile, dish menu, and an "Order Now" call button that opens a `tel:` link. |
| `/profile` | [`app/profile.tsx`](../app/profile.tsx) | Profile screen: view profile fields, change password, sign out. **Also imported as a plain component** by both home screens (see §6). |

### Navigation details

- Navigation is a **root Stack** defined in [`app/_layout.tsx:56`](../app/_layout.tsx). Auth pages and the dispatcher are stack routes.
- The customer/chef "tabs" (Home / Orders / Profile) are **hand-rolled** bottom nav bars, duplicated in [`components/customer/CustomerHome.tsx`](../components/customer/CustomerHome.tsx) and [`components/chef/ChefDashboard.tsx`](../components/chef/ChefDashboard.tsx). They are not React Navigation tabs.
- Both home screens render the Profile tab by importing the route module `../../app/profile` directly as a component (route-as-component anti-pattern, §6).

---

## 3. Components: `components/`

### Customer: `components/customer/CustomerHome.tsx`

The customer home screen:

- Fetches active, accepting chefs from `chef_profiles` (`fetchChefs`, `CustomerHome.tsx:59-90`).
- Resolves chef kitchen images to public URLs via the `avatars` bucket.
- Loads the user's location via `LocationService.getCurrentLocation()` and saves it back to `profiles` (`saveUserLocation`, `CustomerHome.tsx:36-57`).
- Filters by radius and sorts by distance / rating / name (`getSortedChefs`, `CustomerHome.tsx:92-138`).
- Navigates to `/kitchen/[chefid]` with the selected chef's id.

### Chef: `components/chef/ChefDashboard.tsx` and `components/chef/ChefOnboarding.tsx`

- **`ChefOnboarding.tsx`** is a 3-step wizard (kitchen info → location → cuisines). It geocodes the kitchen address via `LocationService`, uploads a kitchen photo to the `avatars` bucket (`uploadImage`, `ChefOnboarding.tsx:84-103`), and writes the profile to `chef_profiles`.
- **`ChefDashboard.tsx`** (the largest file, ~847 lines) provides:
  - An "Accepting Orders" toggle (`toggleAcceptingOrders`).
  - Inline editing of kitchen name, bio, address, and cuisine types.
  - Dish CRUD in a modal, including image upload to `avatars/dish-images/` (`uploadDishImage`, `ChefDashboard.tsx:199-224`).
  - Per-dish availability toggles and delete.

### Shared: `app/profile.tsx`

Profile viewing, password change, and sign-out. Used as a route and embedded as a tab in both home screens.

---

## 4. Backend (Supabase)

### Client: `supabase.js`

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://aqqyknwgspxnzahrdkbp.supabase.co',
  'eyJ...' // anon key
);
```

A single shared client instance. Two things matter:

1. The URL and anon key are **hard-coded** (committed to the public repo). Anon keys are designed to ship client-side, so the exposure itself is not a leak; the real boundary is Row Level Security (RLS) on the backend, which cannot be verified while the project is offline.
2. The client is created **without a storage adapter**, and `@react-native-async-storage/async-storage` is not installed. On native, auth sessions therefore live only in memory and are lost on every restart (see §7).

### Tables

The client reads and writes three tables (all via inline `supabase.from(...)` calls):

| Table | Where it is used | Notable columns the client relies on |
|---|---|---|
| `profiles` | `app/index.tsx`, `app/auth/signup.tsx` (via auth metadata), `app/profile.tsx`, `app/kitchen/[chefid].tsx` (join), `components/customer/CustomerHome.tsx` | `id`, `user_type`, `full_name`, `phone_number`, `latitude`, `longitude`, `address`, `city` |
| `chef_profiles` | `app/index.tsx`, `app/kitchen/[chefid].tsx`, `components/chef/ChefDashboard.tsx`, `components/chef/ChefOnboarding.tsx`, `components/customer/CustomerHome.tsx` | `id`, `kitchen_name`, `bio`, `kitchen_address`, `postcode`, `cuisine_types`, `food_hygiene_rating`, `is_verified`, `is_accepting_orders`, `is_active`, `average_preparation_time`, `kitchen_image`, `social_media`, `latitude`, `longitude` |
| `dishes` | `app/kitchen/[chefid].tsx`, `components/chef/ChefDashboard.tsx` | `id`, `chef_id`, `name`, `description`, `price`, `category`, `cuisine_type`, `dietary_info`, `spice_level`, `preparation_time`, `serving_size`, `ingredients`, `image_url`, `is_available`, `created_at` |

> These column lists are inferred from the queries in the source, not from a live schema: the backend is offline, so the actual table definitions could not be inspected.

### Storage

- Bucket: **`avatars`** (public).
- Kitchen images are uploaded to the bucket root (`ChefOnboarding.tsx:92-94`) and stored as a bare path (the file name built at `ChefOnboarding.tsx:90`) in `chef_profiles.kitchen_image`.
- Dish images are uploaded to `dish-images/` (`ChefDashboard.tsx:206-218`), but the **full public URL** is stored in `dishes.image_url` rather than the bare path, which causes the dish-image bug in §7.

### Data flow

```text
Component
   │  inline supabase.from("profiles" | "chef_profiles" | "dishes").select/update/insert/delete
   ▼
supabase.js  (single shared client; hard-coded URL + anon key)
   │
   ▼
Supabase REST/PostgREST + Storage  ── currently offline
```

There is no intermediate service layer: components talk to Supabase directly. The one exception is `LocationService`, which wraps `expo-location` and provides distance/sort/filter helpers.

---

## 5. State management

There is **no global state library** (no Redux, Zustand, or Context). State is local:

- `useState` / `useEffect` in each component.
- The only cross-cutting state is the **auth session**, held in [`app/_layout.tsx:17-18`](../app/_layout.tsx) and driven by `supabase.auth.onAuthStateChange` ([`app/_layout.tsx:36`](../app/_layout.tsx)).
- `app/index.tsx` re-derives the current user's role by querying `profiles` on mount.

All Supabase models are typed as `any` in 11 places despite `strict: true` (`session` in `_layout.tsx`, `chefs`/`kitchen`/`dishes` in the home and dashboard components, and the `LocationService` signatures). `app/kitchen/[chefid].tsx` defines local `ChefProfile` and `Dish` interfaces that duplicate these models; there is no shared types module.

---

## 6. Known architectural weak points

These are structural issues, distinct from the specific code bugs listed in §7.

1. **No service/repository layer.** Every data operation is an inline `supabase.from(...)` call in a component. There is no API abstraction, so changing backend behaviour or adding caching/offline support would touch every screen.
2. **Hand-rolled tab bars.** The customer and chef "tabs" are duplicated `TouchableOpacity` nav bars rather than a shared tab navigator. The installed `@react-navigation/bottom-tabs` dependency is unused.
3. **Route-as-component anti-pattern.** `CustomerHome.tsx` and `ChefDashboard.tsx` both `import ProfileScreen from '../../app/profile'` and render it as a plain component. This couples a route module to two screens and bypasses the router for that tab.
4. **`any`-typed models, duplicated inline.** Model shapes are `any[]` in most components, with interfaces redefined only in `[chefid].tsx`. There is no shared types module.
5. **Silent error handling.** Most fetch paths `console.error` and render empty states; some flows surface `Alert`s. There are no error boundaries, and `app/index.tsx` swallows profile-fetch errors (a chef whose profile fails to load silently renders the customer home).
6. **Redirect-loop risk.** If a signed-in user's `profiles` row is missing or blocked, `app/index.tsx` pushes them to `/auth/login` while `app/_layout.tsx` immediately bounces any signed-in user out of the auth group: a potential infinite loop that depends on backend setup we cannot currently verify.

---

## 7. Specific defects (separate work items)

These are documented here for accuracy; they are not fixed by the documentation work.

| Defect | Location | Effect |
|---|---|---|
| Backend offline | `supabase.js` project host | All auth + data loading fails |
| Session not persisted | `supabase.js` (no storage adapter) | Logged out on every native restart |
| Missing `react-native-svg` | `package.json` (peer of `lucide-react-native`) | Icons crash in native builds outside Expo Go |
| Rules-of-Hooks violation | `app/kitchen/[chefid].tsx:42-53` (early return before hooks) | Crash path when `chefid` is missing |
| Dish image URL double-wrapped | `ChefDashboard.tsx:214-218` stores full URL; `[chefid].tsx:99-100` re-wraps with `getPublicUrl` | Customer-facing dish images broken |
| Auth redirect loop | `app/index.tsx` ↔ `app/_layout.tsx` | Possible infinite loop on missing profile row |

See [`docs/ROADMAP.md`](./ROADMAP.md) for the proposed ordering.
