# GKK — Roadmap

> **Informed by the product owner, with a few questions still open.** This roadmap orders the work the owner has asked for. Where a decision is still genuinely unowned, it is listed under **Open questions** rather than guessed at.

**Context from the owner:**

- GKK is run by **Fazal-e-Insaaniyat Charity Works (FI)**, a family-run charity. It is a charitable home-food initiative — community-serving, not a venture-backed commercial product.
- Launch geography: **Karachi first**.
- Both sides of the marketplace are in scope from day one: **home chefs** who list a kitchen, and **customers** who order from them.
- **In-app ordering is required**, deliberately simple, with **manual settlement** (cash on delivery, JazzCash, Easypaisa, or bank transfer). The current phone-call flow is a stopgap.
- **Cost sensitivity is an explicit constraint.** Where this roadmap has to name infrastructure, prefer the cheapest viable option — in practice that means continuing to use the Supabase backend already in place rather than introducing a new paid stack.

**Baseline (today):** Expo SDK 54 / React Native app, TypeScript type-checks, web bundle builds, but the Supabase backend is offline so the app cannot authenticate or load data. Native sessions are not persisted, `react-native-svg` is missing, and lint fails (5 errors / 14 warnings). The only working order path is the phone-call button. Full detail in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and [`docs/FEATURES.md`](./FEATURES.md).

---

## Now — blockers

These stop the app from being usable at all.

1. **Restore or recreate the Supabase backend.**
   - The project host `aqqyknwgspxnzahrdkbp.supabase.co` no longer resolves (NXDOMAIN); the project is paused or deleted.
   - Until it returns, sign-up, sign-in, and all data loading fail.
   - Supabase is the cost-conscious choice — it is already the configured backend, so restoring it avoids new infrastructure spend.
   - After restore: verify Row Level Security on `profiles`, `chef_profiles`, `dishes` (owner-scoped policies) and the `avatars` bucket, then rotate the anon key (valid until 2035, present in public git history).

2. **Persist auth sessions on native.**
   - Install `@react-native-async-storage/async-storage` and pass it as the Supabase client's `auth.storage` adapter in [`supabase.js`](../supabase.js).
   - Today sessions are memory-only, so users are logged out on every app restart.

3. **Add the missing `react-native-svg` dependency.**
   - Required as a peer of `lucide-react-native`; icons crash in native builds outside Expo Go without it.

---

## Next — simple in-app ordering, then correctness and hygiene

### Simple in-app ordering (the owner's core requirement)

The phone-call flow is a stopgap. Build the deliberately simple ordering path:

- A customer can place an order from a kitchen's menu (no cart/payment complexity required initially).
- An **order record** persists per order (an `orders` table or equivalent), visible to both the customer and the chef — the Orders tabs on both home screens are the placeholder for this.
- **Settlement stays manual and out-of-app:** cash on delivery, JazzCash, Easypaisa, or bank transfer. No in-app payment processing.
- Reuse the existing Supabase backend (cheapest option) for the order table rather than adding new infrastructure.

### Code bugs (two, surgical)

1. Fix the **Rules-of-Hooks violation** in [`app/kitchen/[chefid].tsx`](../app/kitchen/[chefid].tsx) — hoist the hooks above the early return so a missing `chefid` can't change hook order and crash the screen.
2. Fix the **dish image double-wrap** — store the bare storage path in `dishes.image_url` (matching kitchen images) instead of the full public URL, so customer-facing dish images load.

### Dependency and SDK alignment

- Plan an **Expo SDK 58** upgrade (currently SDK 54, four majors behind and outside the current Expo Go support window).
- Align the 14 packages below the SDK 54 patch line (`npx expo install --check`).
- Work through the `npm audit` findings (44 at audit time; the bulk are dev/build toolchain, with `decode-uri-component`/`query-string` and `postcss` the runtime-relevant ones).
- Prune unused direct dependencies (see [`docs/FEATURES.md`](./FEATURES.md) dead code list).

### Repository hygiene

- ✅ Build-artifact ignore patterns (`*.apk`, `*.aab`, `*.ipa`, `*.keystore`) — added in the same change as these docs.
- Relocate or delete the stray untracked `build-*.apk` artifact (it is **not** committed and must not be).
- Resolve the stale `broken-nativewind` branch — it contains useful fixes (`react-native-svg`, `expo-dev-client`, an APK build type, a reanimated override) but merges in a way that deletes the whole feature set. Port the useful fixes, then delete the branch.
- Fix the `reset-project` npm script, which points at a missing `scripts/` directory.
- Fix the `tailwind.config.js` brand-colour override of `green-100` (rename to a `brand` token).
- Green the lint (5 errors / 14 warnings) and remove dead code and unused template assets.

---

## Later — what ordering unlocks

Once simple in-app ordering exists, the capabilities below become possible. They are directions, ordered only loosely, and none is committed until the owner chooses.

- **Order status for both sides** (placed → confirmed → ready → completed).
- **Notifications** (order received, order ready).
- **Ratings / reviews** for kitchens.
- **Order history and repeat ordering**.
- Any **privacy and data-lifecycle** handling that accompanies storing orders and customer details (see Open questions).

---

## Open questions

These decisions are still genuinely unowned. Do not guess at them.

1. **Authentication method** — the owner asked for the *cheapest viable option* but did not specify one. Email/password (what the app uses today) is the obvious low-cost default; decide whether that stays, or whether a phone/OTP flow (common in Pakistan) is preferred despite higher cost.
2. **Chef phone-number visibility** — should a chef's phone number stay visible to every signed-in customer (the current call-to-order flow), or should it be hidden once in-app ordering replaces the phone call?
3. **iOS release** — is iOS ever a shipping target? The iOS bundle identifier is currently unset (`com.placeholder.appid`), so iOS builds are not shippable as-is. Android is configured (`com.fazaleinsaaniyat.gkk`).
4. **License** — which license should the repository carry? (None exists today; it is the owner's choice and is deliberately not added here.)
