// ─── Notification helpers ─────────────────────────────────────────────────────

/**
 * Parse NOTIFICATION_EMAIL secret. Returns config object or null if absent/invalid.
 */
function parseEmailConfig(env) {
  if (!env.NOTIFICATION_EMAIL) return null;
  try {
    const config = JSON.parse(env.NOTIFICATION_EMAIL);
    if (!config.to || !config.from) {
      console.error("NOTIFICATION_EMAIL must contain 'to' and 'from' fields");
      return null;
    }
    return config;
  } catch {
    console.error("NOTIFICATION_EMAIL is not valid JSON");
    return null;
  }
}

/**
 * Parse NOTIFICATION_DISCORD secret. Returns config object or null if absent/invalid.
 */
function parseDiscordConfig(env) {
  if (!env.NOTIFICATION_DISCORD) return null;
  try {
    const config = JSON.parse(env.NOTIFICATION_DISCORD);
    if (!config.webhookUrl) {
      console.error("NOTIFICATION_DISCORD must contain a 'webhookUrl' field");
      return null;
    }
    return config;
  } catch {
    console.error("NOTIFICATION_DISCORD is not valid JSON");
    return null;
  }
}

/**
 * Format a Unix timestamp (seconds) as "YYYY-MM-DD HH:MM" UTC.
 */
function formatTs(ts) {
  const d = new Date(ts * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Calculate how long a monitor was down. Finds the most recent "down" event
 * in prevEvents and computes the duration to the recovery timestamp.
 * Returns a human-readable string, e.g. "8 minutes", or null if unknown.
 */
function calcDownDuration(prevEvents, nowTs) {
  if (!prevEvents || !prevEvents.length) return null;
  const lastDown = [...prevEvents].reverse().find((e) => e.type === "down");
  if (!lastDown) return null;
  const seconds = nowTs - lastDown.ts;
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// ─── Channel senders ──────────────────────────────────────────────────────────

/**
 * Send email via Cloudflare Email Workers send_email binding.
 */
async function sendEmail(emailBinding, config, monitor, event, downDuration) {
  const isDown = event.type === "down";
  const subject = isDown
    ? `🔴 ${monitor.name} is down`
    : `🟢 ${monitor.name} is back up`;

  const timestamp = formatTs(event.ts);
  let body;
  if (isDown) {
    const errorLine = event.error ? `\r\nError: ${event.error}` : "";
    body = `${monitor.name} is down as of ${timestamp} UTC.${errorLine}\r\n\r\n--\r\nUptime Monitor`;
  } else {
    const durationLine = downDuration ? `\r\nWas down for: ${downDuration}` : "";
    body = `${monitor.name} recovered at ${timestamp} UTC.${durationLine}\r\n\r\n--\r\nUptime Monitor`;
  }

  const raw = [
    `From: ${config.from}`,
    `To: ${config.to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    body,
  ].join("\r\n");

  const { EmailMessage } = await import("cloudflare:email");
  const encoded = new TextEncoder().encode(raw);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
  const msg = new EmailMessage(config.from, config.to, stream);
  await emailBinding.send(msg);
}

/**
 * Send notification via Discord webhook.
 */
async function sendDiscord(config, monitor, event, downDuration) {
  const isDown = event.type === "down";
  const title = isDown
    ? `🔴 ${monitor.name} is down`
    : `🟢 ${monitor.name} is back up`;
  const color = isDown ? 0xe74c3c : 0x2ecc71;
  const timestamp = formatTs(event.ts);

  let description;
  if (isDown) {
    description = `Down as of ${timestamp} UTC`;
    if (event.error) description += `\nError: \`${event.error}\``;
  } else {
    description = `Recovered at ${timestamp} UTC`;
    if (downDuration) description += `\nWas down for: ${downDuration}`;
  }

  const res = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [{ title, description, color }] }),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook returned ${res.status}`);
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Send notifications on a down or up transition.
 *
 * Reads notif:state:{id} from KV as a dedup guard — if the last-notified state
 * already matches the new state, the notification is skipped. This prevents
 * spurious re-alerts if the 1h TTL on latest:{id} expires while a monitor is
 * still down.
 *
 * @param {KVNamespace} kv
 * @param {object} env          Worker environment bindings
 * @param {{ id: string, name: string }} monitor
 * @param {{ type: string, ts: number, error?: string }} event  The transition event
 * @param {Array} prevEvents    Events array before this run (used for duration calc)
 */
export async function sendNotification(kv, env, monitor, event, prevEvents) {
  const newState = event.type === "down" ? "down" : "up";
  const notifKey = `notif:state:${monitor.id}`;

  const lastNotified = await kv.get(notifKey);
  if (lastNotified === newState) return;

  const emailConfig = parseEmailConfig(env);
  const discordConfig = parseDiscordConfig(env);
  if (!emailConfig && !discordConfig) return;

  const downDuration = newState === "up" ? calcDownDuration(prevEvents, event.ts) : null;

  const sends = [];

  if (emailConfig) {
    if (!env.EMAIL) {
      console.error("NOTIFICATION_EMAIL is set but the EMAIL send_email binding is missing from wrangler.toml");
    } else {
      sends.push(
        sendEmail(env.EMAIL, emailConfig, monitor, event, downDuration).catch((err) => {
          console.error(`Email notification failed for ${monitor.id}:`, err.message);
        })
      );
    }
  }

  if (discordConfig) {
    sends.push(
      sendDiscord(discordConfig, monitor, event, downDuration).catch((err) => {
        console.error(`Discord notification failed for ${monitor.id}:`, err.message);
      })
    );
  }

  await Promise.all(sends);
  await kv.put(notifKey, newState);
}
