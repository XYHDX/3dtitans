# 3D Titans — iOS / Android app

Flutter app for **https://3dtitans.org**, the 3D-model & print-on-demand marketplace.
It talks directly to the website's existing API (`/api/products`, `/api/stores`,
`/api/cart`, NextAuth login, …) so products, stores, carts and accounts are the
same everywhere.

| | |
|---|---|
| Dart package | `titans_app` (v1.1.0) |
| iOS bundle id | `org.threedtitans.app` |
| Android application id | `org.threedtitans.app` |
| Display name | 3D Titans |
| Languages | English, Arabic (full RTL) |
| Theme | Light / dark, pixel-art brand (Arcade Yellow `#FFC107`, Titan Black `#0F0F11`, Press Start 2P + Space Mono) |

## What's in version 1

- **Home** — hero, new arrivals, store directory, print-on-demand, "creators' choice".
- **Shop** — all models, instant search, category chips (the site's free-text
  categories are normalised so `Vase`/`vase`, `Book Mark`/`book marks` merge), sorting.
- **Product page** — image gallery, honest ratings (no fake 4.5★), description,
  tags, quantity, add to cart, wishlist, reviews (read, and write when logged in).
- **Stores** — directory + store pages with their products.
- **Cart** — works as a guest (saved on the device); after login it is merged
  into the account cart on the server (`POST /api/cart/merge`) so the website
  sees exactly the same items.
- **Checkout (native, v1.1)** — shipping form with saved addresses, payment
  method picker (cash on delivery, bank transfer, Sham Cash, Syriatel Cash,
  Stripe card payment in an in-app browser sheet), order placed through
  `POST /api/orders`, payment-proof screenshot / reference upload.
- **Orders (native, v1.1)** — list, details, status, request cancellation.
- **Upload for print (native, v1.1)** — pick an .STL from Files, add notes and
  phone, upload; see your previous requests and their status.
- **Wishlist** — device for guests, account when logged in.
- **Account** — email/password login & sign-up via the site's NextAuth
  credentials flow; profile; orders; uploads; support.
- **Support / Privacy / Terms (native, v1.1)** — FAQ, contact form
  (`POST /api/contact`), and policy pages in EN + AR (`lib/core/legal_content.dart`
  — a first draft, review before publishing).
- **Settings** — language (system/EN/AR), appearance (system/light/dark).
  Arabic uses Noto Kufi Arabic (a geometric Kufi that pairs with the pixel
  headline font) at larger sizes.

### Website changes the app depends on (deploy `Desktop/3dtitans-main`)

Uploads (STL files and payment screenshots) go through a new server route,
`src/app/api/storage/upload/route.ts`, which stores the file in Supabase
Storage with the service-role key and returns the URL the existing
`/api/uploads` and `/api/payments/proof` endpoints require. Until that route is
deployed, the app shows "The website does not have the upload endpoint yet".
Vercel needs these environment variables: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` (same project).
Buckets `model-uploads` and `payment-proofs` are created automatically.
Payment methods and bank/wallet numbers come from the website admin →
Settings (`payment.*` keys) via `GET /api/payments/settings`.

## 1. One-time Mac setup (if Flutter isn't installed yet)

1. **Xcode** — install from the App Store, open it once and accept the licence, then:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -runFirstLaunch
   xcodebuild -downloadPlatform iOS      # iOS simulator runtime
   ```
2. **Flutter SDK** (Apple Silicon):
   ```bash
   brew install --cask flutter           # or download from https://docs.flutter.dev/get-started/install/macos/mobile-ios
   flutter --version
   ```
   If you installed manually, add `export PATH="$HOME/development/flutter/bin:$PATH"` to `~/.zshrc`.
3. **CocoaPods** (still recommended for some plugins):
   ```bash
   brew install cocoapods
   ```
4. Check everything:
   ```bash
   flutter doctor
   ```

## 2. Run the app

```bash
cd ~/Desktop/3dTitansApp
flutter pub get                     # downloads the packages listed in pubspec.yaml
open -a Simulator                   # or plug in your iPhone
flutter run                         # pick the device when asked
```

### Open in Xcode

```bash
flutter build ios --config-only     # generates ios/Flutter/ephemeral (Swift packages) + Podfile
open ios/Runner.xcworkspace         # always the .xcworkspace, not the .xcodeproj
```

In Xcode: select the **Runner** target → *Signing & Capabilities* → choose your
**Team** (your Apple ID). The bundle identifier is `org.threedtitans.app`
(change it there if you own a different reverse-domain). Then press ▶︎.

To run on a real iPhone: Settings → Privacy & Security → **Developer Mode** on,
and after the first install trust the developer certificate under
Settings → General → VPN & Device Management.

### Tests & analysis

```bash
flutter analyze
flutter test
```

## 3. Project layout

```
lib/
  main.dart                 app entry (SharedPreferences bootstrap)
  app.dart                  providers + MaterialApp (theme, locale, routes)
  core/
    config.dart             base URL + website hand-off links
    theme.dart              brand colours, fonts, pixel-style component themes
    l10n.dart               EN/AR strings (abstract class ⇒ missing translation = compile error)
    format.dart             price, category normalisation, title-casing, URLs
  data/
    models.dart             Product, Store, Review, SiteSettings, SessionUser, CartLine
    titans_api.dart         HTTP client for https://3dtitans.org/api (+ NextAuth login)
    cookie_jar.dart         persistent session cookie handling
  state/                    ChangeNotifiers: settings, auth, catalog, cart, wishlist
  ui/
    widgets/                PixelFrame/PixelButton/…, product & store cards, states
    screens/                shell (tabs), home, products, product detail, stores,
                            store detail, cart, wishlist, search, account/login,
                            settings, about
test/                       model/format/cookie tests + widget tests with a fake API
assets/fonts                Press Start 2P, Space Mono (OFL)
assets/images               logo & cube (rasterised from the website SVGs)
assets/branding             1024px master app icon + source SVGs
ios/, android/              native projects (icons already branded)
```

## 4. API used (from `src/app/api` of the website)

| Endpoint | Used for |
|---|---|
| `GET /api/products[?storeSlug=]` | catalog / store products |
| `GET /api/products/{id}` | product detail |
| `GET/POST /api/products/{id}/reviews` | reviews (POST needs login) |
| `GET /api/stores`, `GET /api/stores/{slug}` | store directory / store page |
| `GET /api/settings` | About page copy, social links |
| `GET /api/auth/csrf` → `POST /api/auth/callback/credentials` → `GET /api/auth/session` | login (NextAuth) |
| `POST /api/auth/signup` | create account |
| `POST /api/auth/signout` | logout |
| `GET/POST/DELETE /api/cart`, `POST /api/cart/merge` | account cart |
| `GET/POST/DELETE /api/wishlist` | account wishlist |
| `GET /api/addresses`, `POST /api/addresses` | saved shipping addresses |
| `GET /api/payments/settings` | enabled payment methods + bank/wallet details |
| `GET /api/orders/idempotency-key`, `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/{id}` | checkout, order list, cancellation request |
| `POST /api/payments/stripe/checkout` | Stripe hosted checkout URL (opened in-app) |
| `POST /api/storage/upload` (new), `POST /api/payments/proof` | payment screenshot upload + attach |
| `POST /api/storage/upload` (new), `GET/POST /api/uploads` | STL upload for print |
| `POST /api/contact` | support contact form |

The session cookie (`__Secure-next-auth.session-token`) is stored with
`shared_preferences`; moving it to the iOS Keychain (`flutter_secure_storage`)
is a good follow-up.

## 5. Ideas for version 2

- Google sign-in (web OAuth flow into the app, e.g. `flutter_web_auth_2`).
- Push notifications for order status changes; address book management.
- 3D preview for models flagged `has3dPreview`.
- Store-owner dashboard for sellers.
- Move the session cookie to the iOS Keychain (`flutter_secure_storage`).

## Troubleshooting

- *Xcode says a package is missing* → run `flutter build ios --config-only` (or `flutter run`) once; it creates `ios/Flutter/ephemeral`.
- *Want to regenerate the native folders* →
  `rm -rf ios android && flutter create . --org org.threedtitans --project-name titans_app --platforms ios,android`
  (then restore the icons from `assets/branding/app_icon_1024.png`, e.g. with the `flutter_launcher_icons` package, and set the display name to "3D Titans" in `ios/Runner/Info.plist` and `android/app/src/main/AndroidManifest.xml`).
- *Pointing the app at a local website* → edit `AppConfig.baseUrl` in `lib/core/config.dart`.
