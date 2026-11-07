# GKK: Roadmap

> **Informed by the product owner.** Where a decision is still genuinely unowned, it is listed under **Open questions** at the end rather than guessed at.

**Context from the owner:**

- GKK is run by **Fazal-e-Insaaniyat Charity Works (FI)**, a family-run charity. It is a charitable home-food initiative: community-serving, not a venture-backed commercial product.
- Launch geography: **Karachi first**.
- Both sides of the marketplace are in scope from day one: **home chefs** who list a kitchen, and **customers** who order from them.
- **In-app ordering is required**, deliberately simple, with **manual settlement** (cash on delivery, JazzCash, Easypaisa, or bank transfer). The current phone-call flow is a stopgap.
- **Cost sensitivity is an explicit constraint.** Where this roadmap has to name infrastructure, prefer the cheapest viable option; in practice, continue using the Supabase backend already in place rather than introducing a new paid stack.
- **Authentication: phone number + password.** SMS one-time codes are deferred to later. (The code today still uses email/password; that is the existing implementation, not the plan.)
- **Chef phone numbers stay visible to every signed-in user for now**, with tightening deferred. This is a deliberate, known trade-off, recorded below as a follow-up item, not an unresolved question and not an omission.
- **Platform:** the codebase stays cross-platform React Native and is intended to run on both Android and iOS. **Android is the first release target; iOS (and App Store shipping) follows later.** GKK is not Android-only.
- **Cold start:** the owner will seed the **chef side first** by recruiting home cooks before opening to customers, so chef onboarding and kitchen quality come before customer acquisition.

**Baseline (today):** Expo SDK 58 / React Native app, TypeScript type-checks, web and Android bundles build, and lint passes with zero errors (warnings remain). The Supabase database is live and populated, and its schema is captured in [`supabase/migrations/00000000000000_baseline.sql`](../supabase/migrations/00000000000000_baseline.sql). Native sessions are not persisted, and the only working order path is the phone-call button. Full detail in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and [`docs/FEATURES.md`](./FEATURES.md).

---

## Now: blockers

These stop the app from being usable at all.

1. **Persist auth sessions on native.**
   - Install `@react-native-async-storage/async-storage` and pass it as the Supabase client's `auth.storage` adapter in [`supabase.js`](../supabase.js).
   - Today sessions are memory-only, so users are logged out on every app restart.

2. ✅ **Add the missing `react-native-svg` dependency.**
   - Done: `react-native-svg` is now a direct dependency (peer of `lucide-react-native`).

3. ✅ **Upgrade to Expo SDK 58** (see §5): the app targets the SDK that current Expo Go supports, so it can be opened in Expo Go on a physical device again.

---

## Next: chef first, then ordering, then correctness and hygiene

Ordered to match the cold start: **chef onboarding and kitchen quality come before customer acquisition.**

### 1. Chef-side readiness (first)

- Polish chef onboarding and kitchen quality so recruited home cooks can present a good kitchen and menu.
- Recruit/seed home cooks through FI before opening to customers.
- The dish-image bug below is chef-visible quality work and belongs here.

### 2. Simple in-app ordering (the owner's core requirement)

- A customer can place an order from a kitchen's menu (no cart/payment complexity required initially).
- An **order record** persists per order in the existing `orders` and `order_items` tables, visible to both the customer and the chef; the Orders tabs on both home screens are the placeholder for this.
- **Settlement stays manual and out-of-app:** cash on delivery, JazzCash, Easypaisa, or bank transfer. No in-app payment processing.
- Use the existing `orders`, `order_items`, and `order_status` schema rather than adding new infrastructure.

### 3. Authentication: phone number + password

- Replace the current email/password sign-in/sign-up with **phone number + password**.
- SMS one-time codes are deferred to later (see below).

### 4. Code bugs (two, surgical)

1. ✅ Fix the **Rules-of-Hooks violation** in [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx): the hooks are hoisted above the early return, so a missing `chefid` can no longer change hook order and crash the screen.
2. ✅ Fix the **dish image double-wrap**: `dishes.image_url` now stores the bare storage path (matching kitchen images), and every read resolves both the bare-path and the legacy full-URL shape through `resolveStorageImageUrl` in [`services/storage.ts`](../services/storage.ts), so customer-facing dish images load without a data migration.

### 5. Dependency and SDK alignment

- ✅ **Expo SDK 58 upgrade done**: `expo`, every `expo-*` package, `react-native` 0.88.1, React 19.3.0, `expo-router` 58, `react-native-reanimated` 4.7.1, `react-native-screens`, `react-native-gesture-handler` and `react-native-worklets` are aligned with `npx expo install --fix` / `--check`, and NativeWind is at 4.2.7.
- ✅ The patch-line drift is cleared (`npx expo install --check` reports no outdated packages, `npx expo-doctor` passes 20/20).
- ✅ Toolchain is green: `npx tsc --noEmit`, `npm run lint` (zero errors), `npx expo export --platform web` and `npx expo export --platform android` all pass.
- Work through the remaining `npm audit` findings (the bulk are dev/build toolchain, with `decode-uri-component`/`query-string` and `postcss` the runtime-relevant ones).
- Prune unused direct dependencies (see [`docs/FEATURES.md`](./FEATURES.md) dead code list).

### 6. Repository hygiene

- ✅ Build-artifact ignore patterns (`*.apk`, `*.aab`, `*.ipa`, `*.keystore`), added in the same change as these docs.
- Relocate or delete the stray untracked `build-*.apk` artifact (it is **not** committed and must not be).
- Resolve the stale `broken-nativewind` branch; it contains useful fixes (`expo-dev-client`, an APK build type, a reanimated override) but merges in a way that deletes the whole feature set. Port the useful fixes, then delete the branch.
- Fix the `reset-project` npm script, which points at a missing `scripts/` directory.
- Fix the `tailwind.config.js` brand-colour override of `green-100` (rename to a `brand` token).
- Green the lint: it now reports zero errors, with the remaining warnings (mostly unused variables and `exhaustive-deps`) still to clear, alongside dead code and unused template assets.
- Rotate the Supabase anon key committed in [`supabase.js`](../supabase.js); it is valid until 2035 and sits in public git history.

---

## Later: what ordering unlocks

Once simple in-app ordering exists, the capabilities below become possible. They are directions, ordered only loosely, and none is committed until the owner chooses.

- **Order status for both sides** (`pending`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`).
- **Notifications** (order received, order ready).
- **Ratings / reviews** for kitchens.
- **Order history and repeat ordering**.
- **SMS one-time codes** for authentication (deferred from the phone+password change).
- **Tighten chef phone-number visibility** once in-app ordering replaces the phone call: the deliberate follow-up to today's known trade-off (see Context).
- **iOS release / App Store shipping** (deferred; Android ships first).

---

## Open questions

These decisions are still genuinely unowned. Do not guess at them.

1. **Whether to begin the high-severity fix batch**: the remaining "Now" blocker (persist sessions) is identified, but starting that work awaits the owner's go-ahead.
