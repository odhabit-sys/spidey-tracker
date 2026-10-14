<div align="center">

<img src="public/icons/icon-512.png" alt="Spidey Tracker" width="112" />

# Spidey Tracker

**A retro pixel "Spidey tracker" for two friends: see each other live on a map, for one hour, only while you both agree to share.**

### [▶ Open the live demo: spidey-tracker-ten.vercel.app](https://spidey-tracker-ten.vercel.app)

No sign-up, no download, no setup. Open the link on your phone and you're in.

<!--
  HERO MEDIA: replace this comment with your final GIF or video still, e.g.
  <img src="docs/media/hero.gif" alt="Two friends tracking each other with Spidey Tracker" width="320" />
-->

</div>

---

## What it does

Spidey Tracker turns your phone into a handheld tracker gadget. You create a tracker, send the invite link to one friend, and once you **both** press START SHARING you each see the other as a pixel spider on a live map, with distance, direction and a proximity alert as you get closer.

It's built for meeting up: at a festival, in a park, outside the cinema. When you're done, either of you presses END and everything is deleted. If you forget, it expires on its own after an hour.

## How two friends use it

1. **You:** open the [live demo](https://spidey-tracker-ten.vercel.app), type a codename, choose your spider, press **CREATE TRACKER**.
2. **You:** press **INVITE FRIEND** and send the link (Messages, WhatsApp, anything).
3. **Your friend:** opens the link, picks a different spider, presses **START SHARING**.
4. **You:** press **START SHARING** too. Now you both see each other live.
5. Walk toward each other: **SPIDEY LOCATED → TARGET APPROACHING → SPIDEY IN YOUR VICINITY**.
6. Press **STOP** to pause your side, or **END** to delete the tracker for both of you.

## Screenshots

<!--
  SCREENSHOTS: drop images into docs/media/ and uncomment the table below.

| Choose your spider | Waiting for a friend | Live tracking |
| :---: | :---: | :---: |
| <img src="docs/media/choose-spider.png" width="240" /> | <img src="docs/media/invite.png" width="240" /> | <img src="docs/media/live-map.png" width="240" /> |
-->

## Features

- **Choose your spider:** 8 original pixel characters. Each person gets their own, never the same as their friend's.
- **Live map:** your friend appears as their spider, and you appear smaller on a cyan **YOU** ring.
- **Distance and direction:** a pixel web radar shows which way to walk, with a live distance readout.
- **Proximity alerts:** LOCATED, APPROACHING (under 400 m) and IN YOUR VICINITY (under 75 m).
- **Live, stale and offline indicators:** you always know how fresh your friend's position is.
- **Mutual by design:** you only see your friend while you are sharing too.
- **Temporary:** each tracker lasts one hour at most. END deletes everything right away.
- **Installable:** add it to your home screen and it opens full screen like an app.
- **No accounts:** nothing to sign up for, and no ads or analytics.

## Add it to your phone (optional)

The demo works straight from the browser. Installing it just gives you a home-screen icon and a full-screen view.

- **iPhone (Safari):** tap the **Share** button, then **Add to Home Screen**.
- **Android (Chrome):** tap **ADD SPIDEY TO YOUR PHONE** on the home screen, or use the browser menu, then **Install app** / **Add to Home screen**.

> On iPhone, the home-screen app and Safari keep separate storage. Open a tracker in the same place you created it. Invite links your friends tap will open in their browser, which is fine.

Location works from the home-screen app too. Your phone will ask for permission the first time.

## Privacy and location

Your location is sensitive, so the rules are strict:

- **Nothing is shared until you press START SHARING.** Creating or joining a tracker sends no location.
- **Mutual only:** the server returns your friend's location to you only while you are sharing yours too. Stopping hides both directions.
- **Latest position only:** each person has one row that gets overwritten. No location history is kept.
- **Short-lived:** END deletes the tracker and all its data immediately, and expired trackers are removed automatically within minutes of the one-hour limit.
- **No accounts:** access uses random, single-purpose links and tokens stored on your device. The server keeps only hashes of them.
- **Locked-down database:** the browser has no direct database access. Everything goes through the app's server.
- **While sharing:** the app sends a position about every 5 to 10 seconds while your screen is on. If you close the tab or lock the phone, updates stop and your friend sees you go STALE.

Map tiles come from MapTiler and © OpenStreetMap contributors, so your browser requests map images for the area you're viewing.

---

## For developers

<details>
<summary><strong>Tech stack</strong></summary>

- [Next.js 16](https://nextjs.org) (App Router, route handlers) and React 19, in TypeScript
- [Supabase](https://supabase.com): Postgres with RLS, `pg_cron` cleanup, and Realtime broadcast for "something changed" pings
- [MapLibre GL JS](https://maplibre.org) with a recoloured [MapTiler](https://www.maptiler.com) style
- Hosted on [Vercel](https://vercel.com)
- Pixel art defined in code and rendered as crisp SVG; app icons generated from the same pixels; Silkscreen font

</details>

<details>
<summary><strong>Run it locally</strong></summary>

You need Node 20.9+, a free Supabase project and a free MapTiler key.

1. **Clone and install**
   ```bash
   git clone https://github.com/odhabit-sys/spidey-tracker.git
   cd spidey-tracker
   npm install
   ```
2. **Supabase:** create a project. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, locks them down and schedules the cleanup job.
3. **MapTiler:** create an API key, and under **Allowed HTTP origins** add `localhost` and your production domain.
4. **Environment:** copy the example file and fill it in.
   ```bash
   cp .env.example .env.local
   ```
   | Variable | Where | Notes |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | public, has no table access |
   | `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler → API keys | public, restricted by allowed origins |
   | `SUPABASE_SERVICE_ROLE_KEY` | service-role / secret key | **server only. Never commit or expose it.** |
5. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Use two different browsers (for example Chrome and Safari) to play both friends.

Other scripts: `npm run build`, `npm run typecheck`.

</details>

<details>
<summary><strong>Deploy your own</strong></summary>

1. Import the repo into Vercel. The Next.js preset needs no extra build settings.
2. Add the four environment variables above under **Settings → Environment Variables (Production)**. Mark `SUPABASE_SERVICE_ROLE_KEY` as sensitive.
3. Add your `*.vercel.app` or custom domain to the MapTiler key's allowed origins.
4. Deploy. Existing Supabase projects that predate a schema change should run the files in [`supabase/migrations/`](supabase/migrations) in order.

</details>

<details>
<summary><strong>Project layout</strong></summary>

```
app/                 pages, API routes (app/api/*), manifest
components/          device frame, map, tracker screens, pixel UI
lib/client/          GPS publisher, API client, realtime, storage
lib/server/          Supabase admin client (server-only), session logic
lib/shared/          types, tracking rules, spider identities
supabase/            schema.sql + migrations
scripts/             MapLibre worker copy, icon generator
```

</details>

## License

The code is released under the [MIT License](LICENSE).

Spidey Tracker is an unofficial fan project. It is not affiliated with, endorsed by or sponsored by Marvel, Sony Pictures or Disney. Spider-Man and related names are trademarks of their respective owners. All pixel characters in this repository are original artwork.
