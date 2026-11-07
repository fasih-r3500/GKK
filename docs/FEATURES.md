# GKK: Features

This document lists what exists in the codebase **today**, organised by audience. Every entry is labelled:

- **Complete**: the code path is implemented and coherent, but not verified end-to-end in this repository.
- **Partial**: implemented but with known gaps or defects.
- **Stub**: the UI exists but the behaviour is missing or decorative.

**Nothing here is overstated.** Where a control is decorative or a tab is a placeholder, it is called out. The Supabase database is live and populated, but no feature has been verified end-to-end in this repository; "complete" means "the code is written and type-checks", not "proven working against live data".

**Toolchain:** Expo SDK 58 on React Native 0.88.1, aligned to the versions current Expo Go expects. `npx tsc --noEmit`, `npm run lint`, `npx expo export --platform web` and `npx expo export --platform android` pass.

---

## Shared (both audiences)

### Email/password sign-up: **Partial**
- File: [`app/auth/signup.tsx`](../app/auth/signup.tsx)
- Customer/chef toggle, `+92` phone formatting, password minimum of 6 characters, and an email-confirmation prompt after sign-up.
- Gaps: phone formatting accepts partial numbers and can store `+92` plus incomplete digits; the sign-up success message assumes a confirmation email without checking verification state.
- Uses the live Supabase auth service and the `on_auth_user_created` trigger; not verified end-to-end in this repository.

### Email/password sign-in: **Complete**
- File: [`app/auth/login.tsx`](../app/auth/login.tsx)
- Standard email/password sign-in with error display and loading state.
- Uses the live Supabase auth service; not verified end-to-end in this repository.

### Auth gate / session handling: **Complete**
- File: [`app/_layout.tsx`](../app/_layout.tsx) and [`supabase.js`](../supabase.js)
- Redirects signed-out users to login and signed-in users out of the auth screens.
- Native sessions are persisted: `supabase.js` passes AsyncStorage as the Supabase client's `auth.storage` adapter, so users stay signed in across app restarts.

### Profile screen: **Complete**
- File: [`app/profile.tsx`](../app/profile.tsx)
- View full name, email, phone, and user type; change password; sign out.
- Reads the live `profiles` table; password changes go through Supabase auth. Not verified end-to-end in this repository.

---

## Customer

### Browse nearby chefs: **Complete**
- File: [`components/customer/CustomerHome.tsx`](../components/customer/CustomerHome.tsx)
- Lists active, accepting kitchens with name, cuisines, hygiene rating, and kitchen image.
- Reads live `chef_profiles` rows; not verified end-to-end in this repository.

### Location, radius filter, and sorting: **Complete**
- Files: [`components/customer/CustomerHome.tsx`](../components/customer/CustomerHome.tsx), [`services/locationService.tsx`](../services/locationService.tsx)
- Requests foreground location, reverse-geocodes the address, saves it to `profiles`, filters chefs by radius (5 / 10 / 20 km / all), and sorts by distance, rating, or name.

### Kitchen page with menu: **Complete**
- File: [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx)
- Shows a chef's kitchen info, hygiene rating, cuisine types, and a dish menu with dish photos.
- Dish photos render from both stored shapes: the bare storage path written today and the full public URL written by older rows (`resolveStorageImageUrl` in [`services/storage.ts`](../services/storage.ts)).

### "Order Now" call button: **Complete (stopgap)**
- File: [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx), `handleOrderNow`
- Opens a `tel:` link to the chef's phone number. Disabled when the kitchen is not accepting orders.
- **This phone-call flow is the only working order path today, and it is a stopgap.** In-app ordering, order history, and settlement are planned but **not built** (see "Not yet built" below).
- Note: this exposes every chef's phone number to any authenticated customer. That is a **deliberate, known trade-off for now**: chef phone numbers stay visible to every signed-in user, with tightening deferred (see Roadmap).

### Search bar: **Stub (decorative)**
- File: [`components/customer/CustomerHome.tsx`](../components/customer/CustomerHome.tsx)
- A search `TextInput` ("Search for food or kitchens") is rendered but has **no handler** and filters nothing.

### Cart button: **Stub (decorative)**
- File: [`components/customer/CustomerHome.tsx`](../components/customer/CustomerHome.tsx)
- The header "Cart" button is rendered but has **no handler** and no cart state.

### Orders tab: **Stub (placeholder)**
- File: [`components/customer/CustomerHome.tsx`](../components/customer/CustomerHome.tsx), `renderContent` → `"Orders"`
- Renders the literal text "Orders tab content here". No order history exists.

---

## Chef

### Kitchen onboarding: **Complete**
- File: [`components/chef/ChefOnboarding.tsx`](../components/chef/ChefOnboarding.tsx)
- 3-step wizard: kitchen info (name, bio, photo) → location (auto-geocode or manual, postcode) → cuisine selection.
- Writes to `chef_profiles` and uploads a kitchen photo to the `avatars` bucket.
- Writes to the live `chef_profiles` table and the `avatars` bucket; not verified end-to-end in this repository.

### Chef dashboard: **Complete**
- File: [`components/chef/ChefDashboard.tsx`](../components/chef/ChefDashboard.tsx)
- "Accepting Orders" toggle, inline editing of kitchen name/bio/address/cuisines, and dish management (add, edit, delete, availability toggle).
- Reads and writes the live `chef_profiles` and `dishes` tables; not verified end-to-end in this repository.

### Dish management with image upload: **Complete**
- File: [`components/chef/ChefDashboard.tsx`](../components/chef/ChefDashboard.tsx)
- Full CRUD modal including dietary tags, spice level, prep time, serving size, ingredients, and photo upload.
- Uploaded dish photos store the bare storage path (`dish-images/<user>-<timestamp>.<ext>`) in `dishes.image_url`, matching how `chef_profiles.kitchen_image` stores kitchen photos. A failed upload raises an alert that names the reason, so a silent failure can no longer look like success.
- Display tolerates both stored shapes through `resolveStorageImageUrl` in [`services/storage.ts`](../services/storage.ts), so dish photos written as full public URLs before this change still render.
- Not verified on a physical device from this repository.

### Orders tab: **Stub (placeholder)**
- File: [`components/chef/ChefDashboard.tsx`](../components/chef/ChefDashboard.tsx), `renderContent` → `"Orders"`
- Renders the literal text "Orders tab content here". No order management exists.

---

## Not yet built (planned)

These are required by the product owner but do not exist in the codebase yet. They are planned, not presented as working.

- **In-app ordering**: a simple flow for a customer to place an order from a kitchen's menu. The current phone-call button is the stopgap.
- **Order records / order history**: the `orders` and `order_items` tables exist in the live schema, but order history views and UI do not. The Orders tabs on both home screens are placeholders for this.
- **Settlement**: manual, outside the app, via cash on delivery (COD), JazzCash, Easypaisa, or bank transfer. No payment processing is built or planned in-app.
- **Phone + password authentication**: replace the current email/password sign-in/sign-up with phone number + password; SMS one-time codes are deferred.

See [`docs/ROADMAP.md`](./ROADMAP.md) for the ordering of this work.

---

## Dead code / unused paths

These exist in the source but do nothing (not presented as features):

- `handleOpenInMaps`: defined but never rendered ([`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx)).
- `kitchenImageUrl`: computed but unused ([`components/chef/ChefDashboard.tsx`](../components/chef/ChefDashboard.tsx)).
- Unused template assets: `assets/images/location.png`, `react-logo*.png`, `partial-react-logo.png`.
- Unused dependencies: `@react-navigation/bottom-tabs`, `@react-navigation/elements`, `expo-haptics`, `expo-symbols`, `expo-web-browser`, `expo-system-ui`, `expo-linking`, `expo-constants`, `@expo/vector-icons`, `prettier-plugin-tailwindcss` (see [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and the audit notes).

---

## Summary table

| Audience | Feature | State |
|---|---|---|
| Shared | Sign-up | Partial |
| Shared | Sign-in | Complete |
| Shared | Auth gate / session | Complete |
| Shared | Profile | Complete |
| Customer | Browse chefs | Complete |
| Customer | Location / radius / sort | Complete |
| Customer | Kitchen page + menu | Complete |
| Customer | Call-to-order | Complete |
| Customer | Search | Stub |
| Customer | Cart | Stub |
| Customer | Orders | Stub |
| Chef | Onboarding | Complete |
| Chef | Dashboard | Complete |
| Chef | Dish CRUD + upload | Complete |
| Chef | Orders | Stub |

Planned but **not built**: in-app ordering, order history, and settlement (COD / JazzCash / Easypaisa / bank transfer).

> "Complete" = code implemented and type-checks, **not** verified live in this repository.
