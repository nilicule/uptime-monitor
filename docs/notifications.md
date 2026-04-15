# Notifications

The uptime monitor can send alerts when a service goes down or recovers. It supports two channels — Discord webhooks and email via Cloudflare Email Workers — which can be enabled independently or used together.

Notifications fire only on state transitions (up→down and down→up). If a monitor is already down when the next cron runs, no duplicate alert is sent.

---

## Discord

**1. Create a webhook in Discord**

Go to your server → Edit Channel → Integrations → Webhooks → New Webhook. Copy the webhook URL.

**2. Store it as a secret**

```bash
echo '{"webhookUrl":"https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"}' \
  | wrangler secret put NOTIFICATION_DISCORD
```

**3. Deploy**

```bash
wrangler deploy
```

That's it. Down and recovery alerts will appear in the channel you chose.

---

## Email

Email uses [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/), which requires Cloudflare Email Routing to be active on your domain.

**1. Enable Cloudflare Email Routing**

In the Cloudflare dashboard, go to your domain → Email → Email Routing. Enable it and follow the prompts to add the required DNS records.

**2. Verify a destination address**

Under Email Routing → Destination addresses, add and verify the address you want alerts sent to.

**3. Uncomment the send_email binding in wrangler.toml**

```toml
[[send_email]]
name = "EMAIL"
```

The `from` address must be on your Cloudflare-managed domain (e.g. `alerts@yourdomain.com`). It does not need to be a real inbox — Cloudflare Email Routing handles routing at the DNS level, and the `send_email` binding lets the Worker send outbound mail from any address on your domain.

**4. Store the config as a secret**

```bash
echo '{"from":"alerts@yourdomain.com","to":"you@example.com"}' \
  | wrangler secret put NOTIFICATION_EMAIL
```

**5. Deploy**

```bash
wrangler deploy
```

---

## Using both channels

Set both secrets and, if using email, uncomment the `send_email` binding. Both channels will receive the same alerts independently.

---

## Disabling a channel

Remove the secret and redeploy:

```bash
wrangler secret delete NOTIFICATION_DISCORD
# or
wrangler secret delete NOTIFICATION_EMAIL
wrangler deploy
```

---

## Message format

**Down alert**

```
🔴 rc6.org is down

rc6.org is down as of 2026-04-15 14:23 UTC.
Error: connection refused

--
Uptime Monitor
```

**Recovery alert**

```
🟢 rc6.org is back up

rc6.org recovered at 2026-04-15 14:31 UTC.
Was down for: 8 minutes

--
Uptime Monitor
```

Discord sends the same content as a colour-coded embed (red for down, green for recovery).

---

## Troubleshooting

**Email: "EMAIL send_email binding is missing"** in logs
→ You set `NOTIFICATION_EMAIL` but forgot to uncomment `[[send_email]]` in `wrangler.toml`. Add it and redeploy.

**Email: send fails with an auth or policy error**
→ The `from` address must be on a domain with Cloudflare Email Routing active. Double-check the domain is fully set up (DNS records verified in the dashboard).

**Discord: webhook returns 404**
→ The webhook was deleted. Create a new one and update the secret:
```bash
echo '{"webhookUrl":"https://discord.com/api/webhooks/NEW_ID/NEW_TOKEN"}' \
  | wrangler secret put NOTIFICATION_DISCORD
wrangler deploy
```

**No alerts arriving despite config being set**
→ Check `wrangler tail` for error logs from the worker. The notification errors are logged but do not crash the worker, so KV checks continue even if a send fails.

**Getting alerts for a monitor that is already down**
→ This can happen once after deployment if `notif:state:{id}` doesn't exist yet in KV. The dedup key is written on first notification and prevents repeats thereafter.
