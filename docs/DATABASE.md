# GKK database

This document describes the live Supabase Postgres schema for GharKaKhana (GKK).
The schema is captured in [`supabase/migrations/00000000000000_baseline.sql`](../supabase/migrations/00000000000000_baseline.sql), a `pg_dump --schema-only` snapshot of the `public` schema with the `on_auth_user_created` trigger on `auth.users` appended.
The earlier schema notes in this repository were reconstructed from application source and were wrong about the table count, the `user_type` type, and several columns; this document replaces them.

## How to read this

- Primary keys are UUIDs.
  `profiles.id` is the Supabase auth user id and references `auth.users(id)` with cascade delete.
- `chef_profiles.id` and `customer_profiles.id` share that same id and reference `profiles(id)` with cascade delete.
- Arrays (`cuisine_types`, `dietary_info`, `ingredients`, `dietary_restrictions`) are Postgres `text[]`.
- All `timestamp with time zone` columns default to `now()` unless a row says otherwise.
- Every table has Row Level Security enabled.

## Enum types

### `user_type`

| Value | Meaning |
| --- | --- |
| `customer` | A customer account. |
| `chef` | A home chef account. |

Used by `profiles.user_type`, which defaults to `customer`.

### `order_status`

| Value | Meaning |
| --- | --- |
| `pending` | Order placed, not yet confirmed by the chef. |
| `confirmed` | Chef accepted the order. |
| `preparing` | Chef is cooking. |
| `ready` | Food is ready for collection. |
| `completed` | Order collected and closed. |
| `cancelled` | Order cancelled. |

Used by `orders.status`, which defaults to `pending`.

### `day_of_week`

| Value |
| --- |
| `monday` |
| `tuesday` |
| `wednesday` |
| `thursday` |
| `friday` |
| `saturday` |
| `sunday` |

Used by `operating_hours.day_of_week`.

## Tables

### `profiles`

One row per auth user, created by the `on_auth_user_created` trigger.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | | Auth user id, references `auth.users(id)` with cascade delete. |
| `user_type` | `user_type` enum | no | `customer` | Which home screen the app shows. |
| `full_name` | text | yes | | Display name from signup metadata. |
| `phone_number` | text | yes | | Contact number, stored as `+92XXXXXXXXXX`. |
| `avatar_url` | text | yes | | Avatar location. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |
| `updated_at` | timestamptz | yes | `now()` | Row update time, maintained by trigger. |
| `latitude` | numeric(10,8) | yes | | User latitude, written by the customer home location lookup. |
| `longitude` | numeric(11,8) | yes | | User longitude. |
| `address` | text | yes | | User address. |
| `city` | text | yes | | User city. |

### `chef_profiles`

One row per chef kitchen, sharing its id with the matching `profiles` row.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | | Chef auth user id, references `profiles(id)` with cascade delete. |
| `kitchen_name` | text | no | | Kitchen display name. |
| `bio` | text | yes | | Kitchen description. |
| `kitchen_address` | text | no | | Kitchen street address. |
| `postcode` | text | yes | | Kitchen postcode. |
| `cuisine_types` | text[] | yes | `'{}'` | Cuisines the kitchen offers. |
| `food_hygiene_rating` | integer | yes | | Hygiene rating, check 0 to 5. |
| `is_verified` | boolean | yes | `false` | Verification flag. |
| `is_active` | boolean | yes | `true` | Whether the kitchen appears in the customer feed. |
| `is_accepting_orders` | boolean | yes | `true` | Whether the kitchen is taking orders. |
| `average_preparation_time` | integer | yes | `30` | Preparation time in minutes. |
| `social_media` | jsonb | yes | `'{}'` | Social media links. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |
| `updated_at` | timestamptz | yes | `now()` | Row update time, maintained by trigger. |
| `kitchen_image` | text | yes | | Bare file name in the `avatars` storage bucket. |
| `latitude` | numeric(10,8) | yes | | Kitchen latitude. |
| `longitude` | numeric(11,8) | yes | | Kitchen longitude. |

Constraint: `chef_profiles_food_hygiene_rating_check` requires `food_hygiene_rating` between 0 and 5.

### `customer_profiles`

One row per customer, sharing its id with the matching `profiles` row.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | | Customer auth user id, references `profiles(id)` with cascade delete. |
| `default_address` | text | yes | | Saved delivery or collection address. |
| `dietary_restrictions` | text[] | yes | | Customer dietary restrictions. |
| `notification_preferences` | jsonb | yes | `{"sms": false, "push": true, "email": true}` | Per-channel notification settings. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |
| `updated_at` | timestamptz | yes | `now()` | Row update time, maintained by trigger. |

### `dishes`

One row per menu item, owned by a chef.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | `gen_random_uuid()` | Dish id. |
| `chef_id` | uuid | no | | Owning chef, references `chef_profiles(id)` with cascade delete. |
| `name` | text | no | | Dish name. |
| `description` | text | yes | | Dish description. |
| `price` | numeric(10,2) | no | | Price in PKR, check greater than 0. |
| `image_url` | text | yes | | Dish image location. |
| `category` | text | yes | `'main'` | Menu category such as starter, main, dessert, side, or drink. |
| `cuisine_type` | text | yes | | Dish cuisine. |
| `dietary_info` | text[] | yes | `'{}'` | Dietary tags. |
| `spice_level` | integer | yes | | Spice level, check 0 to 5. |
| `preparation_time` | integer | yes | `30` | Preparation time in minutes. |
| `serving_size` | text | yes | | Serving size description. |
| `ingredients` | text[] | yes | | Ingredient list. |
| `is_available` | boolean | yes | `true` | Whether the dish is on the menu. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |
| `updated_at` | timestamptz | yes | `now()` | Row update time, maintained by trigger. |

Constraints: `dishes_price_check` requires `price > 0`; `dishes_spice_level_check` requires `spice_level` between 0 and 5.

### `favorites`

A customer's saved kitchens, one row per customer and chef pair.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | `gen_random_uuid()` | Favorite id. |
| `customer_id` | uuid | no | | Customer, references `customer_profiles(id)` with cascade delete. |
| `chef_id` | uuid | no | | Chef, references `chef_profiles(id)` with cascade delete. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |

Constraint: `favorites_customer_id_chef_id_key` makes `(customer_id, chef_id)` unique.

### `operating_hours`

A chef's weekly opening hours, one row per day.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | `gen_random_uuid()` | Row id. |
| `chef_id` | uuid | no | | Chef, references `chef_profiles(id)` with cascade delete. |
| `day_of_week` | `day_of_week` enum | no | | Day this row describes. |
| `open_time` | time | no | | Opening time. |
| `close_time` | time | no | | Closing time. |
| `is_closed` | boolean | yes | `false` | Whether the kitchen is closed that day. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |

Constraint: `operating_hours_chef_id_day_of_week_key` makes `(chef_id, day_of_week)` unique.

### `orders`

One row per placed order.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | `gen_random_uuid()` | Order id. |
| `order_number` | text, unique | no | | Human-readable number generated by trigger as `ORD-YYYYMMDD-NNNN`. |
| `customer_id` | uuid | no | | Customer, references `customer_profiles(id)`. |
| `chef_id` | uuid | no | | Chef, references `chef_profiles(id)`. |
| `status` | `order_status` enum | no | `pending` | Order lifecycle state. |
| `collection_time` | timestamptz | no | | When the customer collects the order. |
| `collection_address` | text | no | | Collection address. |
| `total_amount` | numeric(10,2) | no | | Order total, check greater than or equal to 0. |
| `customer_notes` | text | yes | | Notes from the customer. |
| `chef_notes` | text | yes | | Notes from the chef. |
| `cancelled_reason` | text | yes | | Reason the order was cancelled. |
| `cancelled_by` | uuid | yes | | Profile that cancelled, references `profiles(id)`. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |
| `updated_at` | timestamptz | yes | `now()` | Row update time, maintained by trigger. |

Constraints: `orders_order_number_key` makes `order_number` unique; `orders_total_amount_check` requires `total_amount >= 0`.

### `order_items`

One row per dish line in an order.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | `gen_random_uuid()` | Line id. |
| `order_id` | uuid | no | | Parent order, references `orders(id)` with cascade delete. |
| `dish_id` | uuid | no | | Ordered dish, references `dishes(id)`. |
| `dish_name` | text | no | | Dish name copied at order time. |
| `quantity` | integer | no | | Quantity, check greater than 0. |
| `price_at_time` | numeric(10,2) | no | | Unit price copied at order time. |
| `special_instructions` | text | yes | | Customer instructions for this line. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |

Constraint: `order_items_quantity_check` requires `quantity > 0`.

### `reviews`

One review per completed order.

| Column | Type | Null | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | uuid, primary key | no | `gen_random_uuid()` | Review id. |
| `order_id` | uuid, unique | no | | Reviewed order, references `orders(id)` with cascade delete. |
| `customer_id` | uuid | no | | Reviewing customer, references `customer_profiles(id)`. |
| `chef_id` | uuid | no | | Reviewed chef, references `chef_profiles(id)`. |
| `rating` | integer | no | | Overall rating, check 1 to 5. |
| `comment` | text | yes | | Review text. |
| `food_quality` | integer | yes | | Food quality rating, check 1 to 5. |
| `service_rating` | integer | yes | | Service rating, check 1 to 5. |
| `is_visible` | boolean | yes | `true` | Whether the review is publicly readable. |
| `created_at` | timestamptz | yes | `now()` | Row creation time. |
| `updated_at` | timestamptz | yes | `now()` | Row update time. There is no update trigger on this table. |

Constraints: `reviews_order_id_key` makes `order_id` unique; `reviews_rating_check`, `reviews_food_quality_check`, and `reviews_service_rating_check` keep each rating between 1 and 5.

## Relationships

- `profiles.id` references `auth.users.id` with cascade delete.
- `chef_profiles.id` and `customer_profiles.id` reference `profiles.id` with cascade delete.
- `dishes.chef_id` references `chef_profiles.id` with cascade delete.
- `favorites.customer_id` references `customer_profiles.id` with cascade delete.
- `favorites.chef_id` references `chef_profiles.id` with cascade delete.
- `operating_hours.chef_id` references `chef_profiles.id` with cascade delete.
- `orders.customer_id` references `customer_profiles.id`.
- `orders.chef_id` references `chef_profiles.id`.
- `orders.cancelled_by` references `profiles.id`.
- `order_items.order_id` references `orders.id` with cascade delete.
- `order_items.dish_id` references `dishes.id`.
- `reviews.order_id` references `orders.id` with cascade delete.
- `reviews.customer_id` references `customer_profiles.id`.
- `reviews.chef_id` references `chef_profiles.id`.

## Functions

### `handle_new_user()`

A `SECURITY DEFINER` trigger function with `search_path` set to `public`.
On a new `auth.users` row it inserts a `profiles` row from the signup metadata (`user_type`, `full_name`, `phone_number`), then inserts a `customer_profiles` row for a customer or a `chef_profiles` row for a chef.
It catches all errors and raises a warning instead of failing user creation.

### `set_order_number()`

A before-insert trigger function on `orders`.
When `NEW.order_number` is null it sets it to `generate_order_number()`.

### `generate_order_number()`

Returns a text order number in the form `ORD-YYYYMMDD-NNNN`, where the last four digits are random.

### `update_updated_at_column()`

A before-update trigger function that sets `NEW.updated_at` to `now()`.

### `calculate_chef_rating(chef_uuid uuid)`

Returns the rounded average `reviews.rating` for a chef over visible reviews, or `0` when there are none.

### `calculate_distance(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)`

An `IMMUTABLE` haversine helper that returns the distance in kilometres between two coordinates.

## Triggers

- `on_auth_user_created` on `auth.users`, after insert, runs `handle_new_user()`.
  This trigger is not part of the `public` schema, so it is appended to the baseline by hand.
- `generate_order_number_trigger` on `orders`, before insert, runs `set_order_number()`.
- `update_profiles_updated_at` on `profiles`, before update, runs `update_updated_at_column()`.
- `update_chef_profiles_updated_at` on `chef_profiles`, before update, runs `update_updated_at_column()`.
- `update_customer_profiles_updated_at` on `customer_profiles`, before update, runs `update_updated_at_column()`.
- `update_dishes_updated_at` on `dishes`, before update, runs `update_updated_at_column()`.
- `update_orders_updated_at` on `orders`, before update, runs `update_updated_at_column()`.

## Indexes

Beyond the primary keys and unique constraints, the baseline creates these indexes:

- `profiles`: `idx_profiles_user_type` on `user_type`.
- `chef_profiles`: `idx_chef_profiles_active` on `is_active`; `idx_chef_profiles_accepting_orders` on `is_accepting_orders`; `idx_chef_profiles_cuisine` on `cuisine_types` (GIN).
- `dishes`: `idx_dishes_chef` on `chef_id`; `idx_dishes_available` on `is_available`; `idx_dishes_category` on `category`; `idx_dishes_dietary` on `dietary_info` (GIN).
- `favorites`: `idx_favorites_customer` on `customer_id`.
- `operating_hours`: `idx_operating_hours_chef` on `chef_id`.
- `orders`: `idx_orders_customer` on `customer_id`; `idx_orders_chef` on `chef_id`; `idx_orders_status` on `status`; `idx_orders_created` on `created_at` descending.
- `order_items`: `idx_order_items_order` on `order_id`.
- `reviews`: `idx_reviews_chef` on `chef_id`; `idx_reviews_rating` on `rating`.

## Views

### `chef_statistics`

One row per chef with `id`, `kitchen_name`, `is_active`, `is_accepting_orders`, `total_completed_orders`, `active_orders`, `average_rating`, `total_reviews`, `total_favorites`, `total_dishes`, and `total_revenue`.

### `popular_dishes`

One row per available dish with `id`, `name`, `chef_id`, `kitchen_name`, `price`, `image_url`, `times_ordered`, and `total_quantity_sold`, ordered by `times_ordered` descending.

## Row level security

Row Level Security is enabled on all nine tables.
Owner-scoped policies compare `auth.uid()` with the row's user or chef id, and the browse policies for kitchen data are granted to the `authenticated` role.
Requests without a signed-in session have no `auth.uid()` to match, so the app's queries return no rows.

### `profiles`

- `Users can view their own profile`: select own row, `authenticated`.
- `Anyone can view chef profiles`: select rows where `user_type = 'chef'`, `authenticated`.
- `Users can update their own profile`: update own row, `authenticated`.
- No insert or delete policy; rows are created by the security definer trigger.

### `chef_profiles`

- `Anyone can view active chef profiles`: select rows where `is_active = true`, `authenticated`.
- `Chefs can update their own profile`: update own row, `authenticated`.
- No insert or delete policy; rows are created by the security definer trigger.

### `customer_profiles`

- `Customers can manage their own profile`: all commands on own row.

### `dishes`

- `Anyone can view available dishes`: select rows where `is_available = true`, `authenticated`.
- `Chefs can manage their own dishes`: all commands on rows where `chef_id = auth.uid()`, `authenticated`.

### `favorites`

- `Customers can manage their favorites`: all commands on rows where `customer_id = auth.uid()`.

### `operating_hours`

- `Anyone can view operating hours`: select all rows, `authenticated`.
- `Chefs can manage their operating hours`: all commands on rows where `chef_id = auth.uid()`.

### `orders`

- `Customers can create orders`: insert where `customer_id = auth.uid()`.
- `Customers can view their own orders`: select where `customer_id = auth.uid()`.
- `Chefs can view orders for their kitchen`: select where `chef_id = auth.uid()`.
- `Chefs can update their kitchen orders`: update where `chef_id = auth.uid()`.
- No delete policy.

### `order_items`

- `Order items inherit order policies`: select rows whose parent order belongs to the current customer or chef.
- `Customers can create order items with orders`: insert rows whose parent order belongs to the current customer.

### `reviews`

- `Anyone can view visible reviews`: select rows where `is_visible = true`.
  This policy has no `TO` clause, so it applies to every role, including `anon`.
  This is the one browse policy an anonymous request can read.
- `Customers can create reviews for completed orders`: insert where `customer_id = auth.uid()` and the reviewed order belongs to that customer and has status `completed`.

## Which screens read which tables

The current app source reads and writes three tables directly.
The remaining tables, views, and functions are in the live schema and are ready for the ordering and review work on the roadmap, but no screen queries them yet.

| Screen or component | Tables | Operation |
| --- | --- | --- |
| `app/index.tsx` | `profiles` | Reads `user_type` for the signed-in user. |
| `app/index.tsx` | `chef_profiles` | Reads `kitchen_name`, `kitchen_address`, and `cuisine_types` to decide whether chef onboarding is complete. |
| `app/profile.tsx` | `profiles` | Reads `full_name`, `phone_number`, and `user_type` for the signed-in user. |
| `app/auth/signup.tsx` | `profiles`, `customer_profiles`, `chef_profiles` | Writes only through `supabase.auth.signUp` metadata; the `on_auth_user_created` trigger creates the rows. |
| `app/kitchen/[chefid].tsx` | `chef_profiles` | Reads all columns plus the joined `profiles.phone_number` for one chef. |
| `app/kitchen/[chefid].tsx` | `dishes` | Reads all columns for the chef's available dishes. |
| `components/customer/CustomerHome.tsx` | `chef_profiles` | Reads `id`, `kitchen_name`, `cuisine_types`, `food_hygiene_rating`, `kitchen_image`, `latitude`, `longitude`, and `kitchen_address` where `is_active` and `is_accepting_orders` are true. |
| `components/customer/CustomerHome.tsx` | `profiles` | Updates the signed-in user's `latitude`, `longitude`, `address`, and `city`. |
| `components/chef/ChefOnboarding.tsx` | `chef_profiles` | Updates the chef's kitchen fields and sets `is_active` and `is_accepting_orders` to true. |
| `components/chef/ChefDashboard.tsx` | `chef_profiles` | Reads all columns, updates `is_accepting_orders`, and edits individual kitchen fields. |
| `components/chef/ChefDashboard.tsx` | `dishes` | Reads all columns, inserts, updates, and deletes the chef's dishes. |

Not yet read by any screen: `favorites`, `operating_hours`, `orders`, `order_items`, `reviews`, `chef_statistics`, `popular_dishes`, `calculate_chef_rating`, and `calculate_distance`.

## Migration file

- `supabase/migrations/00000000000000_baseline.sql`

Apply instructions live in [`supabase/README.md`](../supabase/README.md).
