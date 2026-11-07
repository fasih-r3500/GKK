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

**Baseline (today):** Expo SDK 54 / React Native app, TypeScript type-checks, web bundle builds, but the Supabase backend is offline so the app cannot authenticate or load data. Native sessions are not persisted, `react-native-svg` is missing, and lint fails (5 errors / 14 warnings). The only working order path is the phone-call button. Full detail in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and [`docs/FEATURES.md`](./FEATURES.md).

---

## Now: blockers

These stop the app from being usable at all.

1. **Restore or recreate the Supabase backend.**
   - The project host `aqqyknwgspxnzahrdkbp.supabase.co` no longer resolves (NXDOMAIN); the project is paused or deleted.
   - Until it returns, sign-up, sign-in, and all data loading fail.
   - Supabase is the cost-conscious choice: it is already the configured backend, so restoring it avoids new infrastructure spend.
   - After restore: verify Row Level Security on `profiles`, `chef_profiles`, `dishes` (owner-scoped policies) and the `avatars` bucket, then rotate the anon key (valid until 2035, present in public git history).

2. **Persist auth sessions on native.**
   - Install `@react-native-async-storage/async-storage` and pass it as the Supabase client's `auth.storage` adapter in [`supabase.js`](../supabase.js).
   - Today sessions are memory-only, so users are logged out on every app restart.

3. **Add the missing `react-native-svg` dependency.**
   - Required as a peer of `lucide-react-native`; icons crash in native builds outside Expo Go without it.

---

## Next: chef first, then ordering, then correctness and hygiene

Ordered to match the cold start: **chef onboarding and kitchen quality come before customer acquisition.**

### 1. Chef-side readiness (first)

- Polish chef onboarding and kitchen quality so recruited home cooks can present a good kitchen and menu.
- Recruit/seed home cooks through FI before opening to customers.
- The dish-image bug below is chef-visible quality work and belongs here.

### 2. Simple in-app ordering (the owner's core requirement)

- A customer can place an order from a kitchen's menu (no cart/payment complexity required initially).
- An **order record** persists per order (an `orders` table or equivalent), visible to both the customer and the chef; the Orders tabs on both home screens are the placeholder for this.
- **Settlement stays manual and out-of-app:** cash on delivery, JazzCash, Easypaisa, or bank transfer. No in-app payment processing.
- Reuse the existing Supabase backend (cheapest option) for the order table rather than adding new infrastructure.

### 3. Authentication: phone number + password

- Replace the current email/password sign-in/sign-up with **phone number + password**.
- SMS one-time codes are deferred to later (see below).

### 4. Code bugs (two, surgical)

1. Fix the **Rules-of-Hooks violation** in [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx): hoist the hooks above the early return so a missing `chefid` can't change hook order and crash the screen.
2. Fix the **dish image double-wrap**: store the bare storage path in `dishes.image_url` (matching kitchen images) instead of the full public URL, so customer-facing dish images load.

### 5. Dependency and SDK alignment

- Plan an **Expo SDK 58** upgrade (currently SDK 54, four majors behind and outside the current Expo Go support window).
- Align the 14 packages below the SDK 54 patch line (`npx expo install --check`).
- Work through the `npm audit` findings (44 at audit time; the bulk are dev/build toolchain, with `decode-uri-component`/`query-string` and `postcss` the runtime-relevant ones).
- Prune unused direct dependencies (see [`docs/FEATURES.md`](./FEATURES.md) dead code list).

### 6. Repository hygiene

- ✅ Build-artifact ignore patterns (`*.apk`, `*.aab`, `*.ipa`, `*.keystore`), added in the same change as these docs.
- Relocate or delete the stray untracked `build-*.apk` artifact (it is **not** committed and must not be).
- Resolve the stale `broken-nativewind` branch; it contains useful fixes (`react-native-svg`, `expo-dev-client`, an APK build type, a reanimated override) but merges in a way that deletes the whole feature set. Port the useful fixes, then delete the branch.
- Fix the `reset-project` npm script, which points at a missing `scripts/` directory.
- Fix the `tailwind.config.js` brand-colour override of `green-100` (rename to a `brand` token).
- Green the lint (5 errors / 14 warnings) and remove dead code and unused template assets.

---

## Later: what ordering unlocks

Once simple in-app ordering exists, the capabilities below become possible. They are directions, ordered only loosely, and none is committed until the owner chooses.

- **Order status for both sides** (placed → confirmed → ready → completed).
- **Notifications** (order received, order ready).
- **Ratings / reviews** for kitchens.
- **Order history and repeat ordering**.
- **SMS one-time codes** for authentication (deferred from the phone+password change).
- **Tighten chef phone-number visibility** once in-app ordering replaces the phone call: the deliberate follow-up to today's known trade-off (see Context).
- **iOS release / App Store shipping** (deferred; Android ships first).

---

## Open questions

These decisions are still genuinely unowned. Do not guess at them.

1. **Whether to begin the high-severity fix batch**: the "Now" blockers above (restore the backend, persist sessions, add `react-native-svg`) are identified, but starting that work awaits the owner's go-ahead.
