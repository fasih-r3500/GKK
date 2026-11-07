# GKK: Architecture

This document describes how the GKK codebase is organised, how data flows through it, and where the architecture is weak. It describes the code **as it is today**; it is not a proposal.

Everything here is verifiable against the source files cited, which were read in full for this account.

---

## 1. High-level shape

GKK is a small Expo / React Native app (~2,300 lines across 10 route/component files) with:

- **Expo Router** file-based routing (`app/`).
- **A single Supabase client** in [`supabase.js`](../supabase.js) used directly from components.
- **No service/repository layer** (except [`services/locationService.tsx`](../services/locationService.tsx) and the storage helpers in [`services/storage.ts`](../services/storage.ts)).
- **No global state library**: local React state only.

The backend is a live Supabase project. Its schema is captured in [`supabase/migrations/00000000000000_baseline.sql`](../supabase/migrations/00000000000000_baseline.sql) and documented in [`docs/DATABASE.md`](./DATABASE.md).

### Toolchain

- **Expo SDK 58** (`expo ~58.0.23`) on React Native 0.88.1 and React 19.3.0. Every `expo-*` package, `react-native` and its native peers are aligned to the versions SDK 58 expects, and `npx expo install --check` reports no drift. The SDK 58 line is what current Expo Go on a physical device runs, so the app can be opened there.
- **expo-router 58** file-based routing, **NativeWind 4.2.7** with Tailwind CSS 3 for styling, and `react-native-svg` as a direct dependency (peer of `lucide-react-native`).
- **Babel**: `babel-preset-expo` with `jsxImportSource: "nativewind"` plus the `nativewind/babel` preset. `babel-preset-expo` adds the React Native Worklets plugin itself, so the config no longer lists a reanimated plugin by hand.
- **Metro**: `withNativeWind` from `nativewind/metro` wrapping the default Expo config.
- **Green toolchain**: `npx tsc --noEmit`, `npm run lint` (zero errors), `npx expo export --platform web` and `npx expo export --platform android` all pass, and `npx expo-doctor` reports 20/20 checks.

---

## 2. Route map: `app/`

| Route | File | Responsibility |
|---|---|---|
| `_layout` | [`app/_layout.tsx`](../app/_layout.tsx) | Root `<Stack>` (headerless). Loads fonts, restores the auth session, and gates navigation: signed-out users are redirected to `/auth/login`, signed-in users are bounced out of the auth group back to `/`. |
| `/` | [`app/index.tsx`](../app/index.tsx) | Dispatcher. Fetches the current user's `profiles.user_type`, then redirects customers to `/home` and ready chefs to `/chef`. A chef with incomplete setup gets `ChefOnboarding` here. |
| `/auth/login` | [`app/auth/login.tsx`](../app/auth/login.tsx) | Email/password sign-in form. |
| `/auth/signup` | [`app/auth/signup.tsx`](../app/auth/signup.tsx) | Sign-up form with a customer/chef toggle and `+92` phone formatting. |
| `/kitchen/[chefid]` | [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx) | Customer-facing kitchen page: chef profile, dish menu, and an "Order Now" call button that opens a `tel:` link. Pushed on the root stack above the tabs. |
| `(customer)/_layout` | [`app/(customer)/_layout.tsx`](../app/(customer)/_layout.tsx) | Customer tab navigator: Home, Orders, Profile. |
| `/home` | [`app/(customer)/home.tsx`](../app/(customer)/home.tsx) | Customer home screen (kitchen list, location, filters). |
| `/orders` | [`app/(customer)/orders.tsx`](../app/(customer)/orders.tsx) | Customer Orders placeholder. |
| `/profile` | [`app/(customer)/profile.tsx`](../app/(customer)/profile.tsx) | Customer Profile tab, rendering the shared `ProfileScreen`. |
| `chef/_layout` | [`app/chef/_layout.tsx`](../app/chef/_layout.tsx) | Chef tab navigator: Home, Orders, Profile. |
| `/chef` | [`app/chef/index.tsx`](../app/chef/index.tsx) | Chef dashboard tab. |
| `/chef/orders` | [`app/chef/orders.tsx`](../app/chef/orders.tsx) | Chef Orders placeholder. |
| `/chef/profile` | [`app/chef/profile.tsx`](../app/chef/profile.tsx) | Chef Profile tab, rendering the shared `ProfileScreen`. |

### Navigation details

- Navigation is a **root Stack** defined in [`app/_layout.tsx`](../app/_layout.tsx). Auth pages, the dispatcher, and the kitchen detail page are stack routes.
- The customer and chef surfaces are **Expo Router `Tabs` layouts** in two route groups. Both render [`components/navigation/AppTabs.tsx`](../components/navigation/AppTabs.tsx), which is the single tab bar definition; the per-surface tab list lives in [`components/navigation/tabs.ts`](../components/navigation/tabs.ts).
- The Profile tab is a real route on each surface. Both routes render the shared screen component in [`components/profile/ProfileScreen.tsx`](../components/profile/ProfileScreen.tsx); no screen imports a route file as a component.

---

## 3. Components: `components/`

### Customer: `components/customer/CustomerHome.tsx`

The customer home screen:

- Fetches active, accepting chefs from `chef_profiles` (`fetchChefs`).
- Resolves chef kitchen images to public URLs via the `avatars` bucket.
- Loads the user's location via `LocationService.getCurrentLocation()` and saves it back to `profiles` (`saveUserLocation`).
- Filters by radius and sorts by distance / rating / name in a `useMemo` (`sortedChefs`), so the work runs only when an input changes.
- Renders the kitchen list with `FlatList`, memoised rows in [`ChefCard.tsx`](../components/customer/ChefCard.tsx), and a memoised filter bar in [`ChefFilters.tsx`](../components/customer/ChefFilters.tsx) that owns its dropdown state.
- Navigates to `/kitchen/[chefid]` with the selected chef's id.

Images in list rows go through [`components/ui/RemoteImage.tsx`](../components/ui/RemoteImage.tsx), which asks Supabase for a display-sized variant and falls back to the original URL when image transformations are not enabled on the project.

### Chef: `components/chef/ChefDashboard.tsx` and `components/chef/ChefOnboarding.tsx`

- **`ChefOnboarding.tsx`** is a 3-step wizard (kitchen info → location → cuisines). It geocodes the kitchen address via `LocationService`, uploads a kitchen photo to the `avatars` bucket (`uploadImage`), and writes the profile to `chef_profiles`.
- **`ChefDashboard.tsx`** renders a virtualised `FlatList` of dishes with the kitchen overview as its header. It provides:
  - An "Accepting Orders" toggle (`toggleAcceptingOrders`).
  - Inline kitchen editing, in [`KitchenInfoCard.tsx`](../components/chef/KitchenInfoCard.tsx), which keeps edit state local to the card.
  - Dish CRUD in a modal, in [`DishFormModal.tsx`](../components/chef/DishFormModal.tsx), including image upload to `avatars/dish-images/`. The bare object path is stored in `dishes.image_url`, and the bytes are uploaded with an explicit content type so the storage bucket MIME allowlist accepts them.
  - Per-dish availability toggles and delete, with memoised rows in [`DishCard.tsx`](../components/chef/DishCard.tsx) and local list updates instead of a full refetch.
- Shared chef model types live in [`components/chef/types.ts`](../components/chef/types.ts).

### Shared: `components/profile/ProfileScreen.tsx`

Profile viewing, password change, and sign-out. Rendered by both the customer and chef Profile tab routes.

---

## 4. Backend (Supabase)

### Client: `supabase.js`

```js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export const supabase = createClient(
  'https://aqqyknwgspxnzahrdkbp.supabase.co',
  'eyJ...', // anon key
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    },
  }
);
```

A single shared client instance. Two things matter:

1. The URL and anon key are **hard-coded** (committed to the public repo). Anon keys are designed to ship client-side, so the exposure itself is not a leak; the real boundary is Row Level Security (RLS), which is defined in the live schema and documented in [`docs/DATABASE.md`](./DATABASE.md).
2. The client passes **AsyncStorage as the `auth.storage` adapter on native**, so sessions are persisted and survive a cold start. On web it passes no adapter and lets the client use localStorage, which also keeps the static export working (AsyncStorage's web build reads `window` during prerender).

### Tables

The client reads and writes three tables (all via inline `supabase.from(...)` calls):

| Table | Where it is used | Notable columns the client relies on |
|---|---|---|
| `profiles` | `app/index.tsx`, `app/auth/signup.tsx` (via auth metadata), `components/profile/ProfileScreen.tsx`, `app/kitchen/[chefid].tsx` (join), `components/customer/CustomerHome.tsx` | `id`, `user_type`, `full_name`, `phone_number`, `latitude`, `longitude`, `address`, `city` |
| `chef_profiles` | `app/index.tsx`, `app/kitchen/[chefid].tsx`, `components/chef/ChefDashboard.tsx`, `components/chef/ChefOnboarding.tsx`, `components/customer/CustomerHome.tsx` | `id`, `kitchen_name`, `bio`, `kitchen_address`, `postcode`, `cuisine_types`, `food_hygiene_rating`, `is_verified`, `is_accepting_orders`, `is_active`, `average_preparation_time`, `kitchen_image`, `social_media`, `latitude`, `longitude` |
| `dishes` | `app/kitchen/[chefid].tsx`, `components/chef/ChefDashboard.tsx` | `id`, `chef_id`, `name`, `description`, `price`, `category`, `cuisine_type`, `dietary_info`, `spice_level`, `preparation_time`, `serving_size`, `ingredients`, `image_url`, `is_available`, `created_at` |

> The client uses the columns listed here. The full live schema, including all nine tables, is in [`supabase/migrations/00000000000000_baseline.sql`](../supabase/migrations/00000000000000_baseline.sql) and [`docs/DATABASE.md`](./DATABASE.md).

### Storage

- Bucket: **`avatars`** (public). It holds kitchen photos and dish photos; there is no separate dish bucket.
- Canonical stored value for an image column is a **bare object path** inside the bucket. Reads resolve that path to a public URL with `resolveStorageImageUrl` in [`services/storage.ts`](../services/storage.ts).
- Kitchen images are uploaded to the bucket root (`ChefOnboarding.tsx:268-271`) and stored as a bare path (the file name built at `ChefOnboarding.tsx:265`) in `chef_profiles.kitchen_image`.
- Dish images are uploaded under `dish-images/` and stored as a bare path such as `dish-images/<user>-<timestamp>.jpg` in `dishes.image_url` (`buildDishImagePath` and the `uploadDishImage` helper in `DishFormModal.tsx`).
- `dishes.image_url` rows written before this convention hold a full public URL. `resolveStorageImageUrl` returns an absolute URL as is and only builds a public URL for a bare path, so both shapes render and no data migration is needed.

### Data flow

```text
Component
   │  inline supabase.from("profiles" | "chef_profiles" | "dishes").select/update/insert/delete
   ▼
supabase.js  (single shared client; hard-coded URL + anon key)
   │
   ▼
Supabase REST/PostgREST + Storage
```

There is no intermediate service layer: components talk to Supabase directly. The one exception is `LocationService`, which wraps `expo-location` and provides distance/sort/filter helpers.

---

## 5. State management

There is **no global state library** (no Redux, Zustand, or Context). State is local:

- `useState` / `useEffect` in each component.
- The only cross-cutting state is the **auth session**, held in [`app/_layout.tsx:17-18`](../app/_layout.tsx) and driven by `supabase.auth.onAuthStateChange` ([`app/_layout.tsx:36`](../app/_layout.tsx)).
- `app/index.tsx` re-derives the current user's role by querying `profiles` on mount.

Several Supabase models are still typed as `any` despite `strict: true` (`session` in `_layout.tsx`, the `chefs` state in `CustomerHome.tsx`, and the `LocationService` signatures). The chef side now uses the shared interfaces in `components/chef/types.ts`; `app/kitchen/[chefid].tsx` still defines its own overlapping `ChefProfile` and `Dish` interfaces.

---

## 6. Known architectural weak points

These are structural issues, distinct from the specific code bugs listed in §7.

1. **No service/repository layer.** Every data operation is an inline `supabase.from(...)` call in a component. There is no API abstraction, so changing backend behaviour or adding caching/offline support would touch every screen.
2. **`any`-typed models, duplicated inline.** Model shapes are still `any[]` in several components, and `app/kitchen/[chefid].tsx` defines local `ChefProfile` and `Dish` interfaces that overlap `components/chef/types.ts`. There is no app-wide shared types module.
3. **Silent error handling.** Most fetch paths `console.error` and render empty states; some flows surface `Alert`s. There are no error boundaries, and `app/index.tsx` swallows profile-fetch errors (a chef whose profile fails to load silently renders the customer home).
4. **Redirect-loop risk.** If a signed-in user's `profiles` row is missing or blocked, `app/index.tsx` pushes them to `/auth/login` while `app/_layout.tsx` immediately bounces any signed-in user out of the auth group: a potential infinite loop that depends on the live `profiles` row and the RLS policies.

---

## 7. Specific defects (separate work items)

These are documented here for accuracy; they are not fixed by the documentation work.

| Defect | Location | Effect |
|---|---|---|
| Dish image URL double-wrapped | The dish upload helper stored the full public URL; `[chefid].tsx` re-wrapped it with `getPublicUrl` | Customer-facing dish images broken. **Fixed**: uploads store the bare path and every read goes through `resolveStorageImageUrl` |
| Auth redirect loop | `app/index.tsx` ↔ `app/_layout.tsx` | Possible infinite loop on missing profile row |

See [`docs/ROADMAP.md`](./ROADMAP.md) for the proposed ordering.
