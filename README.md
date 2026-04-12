# uptime-monitor

A self-hosted uptime monitor that runs entirely on Cloudflare's free tier. It checks HTTP endpoints and TCP ports every 5 minutes and serves a live status page.

### Front page
![Status page screenshot showing monitors with uptime bars](docs/screenshot.png)
### Detail page
![Status page screenshot showing detail page](docs/screenshot_detail.png)

## What it does

- Checks HTTP and TCP endpoints on a 5-minute cron schedule
- Reports response time as TTFB (time to first byte), excluding DNS/TLS overhead for a ping-like latency value
- Stores 90 days of history in Cloudflare KV
- Serves a status page at `/` with per-service uptime bars, a dynamic favicon, and a light/dark mode toggle
- No external services, no database, no server to manage

## Requirements

- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is sufficient)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and logged in (`wrangler login`)
- `jq` (used by the monitor management scripts)

## Cloudflare setup

If you haven't used Workers before:

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Install Wrangler: `npm install -g wrangler` or `brew install cloudflare-wrangler`
3. Log in: `wrangler login`

No paid plan required. The free tier includes 100,000 Worker requests/day and 1 GB of KV storage.

**KV write quota:** The free tier allows 1,000 KV write operations per day. Each check writes 2 keys per monitor plus 1 for the dashboard snapshot. At the default 5-minute interval that works out to roughly 865 writes/day for 1 monitor, or 1,153 for 2. If you're running more monitors or approaching the limit, increase the cron interval in `wrangler.toml` (e.g. `*/10 * * * *` for every 10 minutes).

## Deploy

**1. Clone and bootstrap**

```bash
git clone https://github.com/nilicule/uptime-monitor
cd uptime-monitor
./bootstrap.sh
```

`bootstrap.sh` will:
- Create the KV namespace in your Cloudflare account
- Generate a local `wrangler.toml` with your namespace IDs (gitignored)
- Prompt you for your monitors config and store it as a secret

**2. Add your monitors when prompted**

The script will walk you through adding monitors one at a time — type, name, URL (or host/port for TCP), and expected status codes. You can add as many as you like before deploying.

**3. Deploy**

```bash
wrangler deploy
```

Your status page will be live at `https://uptime-monitor.<your-subdomain>.workers.dev`.

## Managing monitors

```bash
./scripts/monitors.sh list     # Show current monitors
./scripts/monitors.sh add      # Add a monitor interactively
./scripts/monitors.sh remove   # Remove a monitor interactively
```

## Maintenance mode

Put a monitor in maintenance mode to suppress downtime alerts and exclude the period from uptime calculations.

```bash
./scripts/monitors.sh maintenance on <id>               # indefinite
./scripts/monitors.sh maintenance on <id> 2h            # expires in 2 hours
./scripts/monitors.sh maintenance on <id> 2h "Upgrade"  # with message

./scripts/monitors.sh maintenance off <id>              # disable immediately
./scripts/monitors.sh maintenance extend <id> 1h        # extend by 1 hour
./scripts/monitors.sh maintenance status                # show all monitors
./scripts/monitors.sh maintenance status <id>           # show one monitor
```

While in maintenance:
- The dashboard shows a blue **Maintenance** badge on the monitor card
- The detail page shows a blue "in maintenance" banner with the optional message
- Uptime bars for the maintenance period are shown in blue
- The period is excluded from all uptime percentage calculations
- Checks still run — state changes (up/down) are still recorded in the event log

Duration format: `30m` (minutes), `2h` (hours), `1d` (days).

## License

[CC BY-NC 4.0](LICENSE) — free to use and modify, attribution required, no commercial use.

## Further reading

See [docs/reference.md](docs/reference.md) for the KV data model, API endpoints, local development setup, and troubleshooting.
