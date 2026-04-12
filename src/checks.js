import { connect } from "cloudflare:sockets";

/**
 * Perform an HTTP HEAD check against a monitor.
 * @param {{ id: string, name: string, url: string, expectedStatus: number[] }} monitor
 * @returns {Promise<object>} result
 */
export async function checkHttp(monitor) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    let response = await fetch(monitor.url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    // Some servers don't support HEAD — fall back to GET and discard the body
    if (response.status === 405) {
      response = await fetch(monitor.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
      await response.body?.cancel();
    }

    const ms = Date.now() - start;
    const ok = monitor.expectedStatus.includes(response.status);

    return {
      id: monitor.id,
      name: monitor.name,
      type: "http",
      ts: Math.floor(start / 1000),
      ok,
      ms,
      statusCode: response.status,
      statusText: response.statusText,
      redirected: response.redirected,
      finalUrl: response.url,
      error: null,
      colo: null, // cf.colo is only available on inbound requests, not outbound fetch responses
    };
  } catch (err) {
    const ms = Date.now() - start;
    return {
      id: monitor.id,
      name: monitor.name,
      type: "http",
      ts: Math.floor(start / 1000),
      ok: false,
      ms,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: err.message,
      colo: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform a TCP connect check against a monitor.
 * @param {{ id: string, name: string, host: string, port: number }} monitor
 * @returns {Promise<object>} result
 */
export async function checkTcp(monitor) {
  const start = Date.now();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("TCP connect timeout after 5s")), 5_000)
  );

  const connectPromise = (async () => {
    const socket = connect({ hostname: monitor.host, port: monitor.port });
    await socket.opened;
    const ms = Date.now() - start;
    socket.close();
    return ms;
  })();

  try {
    const ms = await Promise.race([connectPromise, timeoutPromise]);

    return {
      id: monitor.id,
      name: monitor.name,
      type: "tcp",
      ts: Math.floor(start / 1000),
      ok: true,
      ms,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: null,
      colo: null,
    };
  } catch (err) {
    const ms = Date.now() - start;
    return {
      id: monitor.id,
      name: monitor.name,
      type: "tcp",
      ts: Math.floor(start / 1000),
      ok: false,
      ms,
      statusCode: null,
      statusText: null,
      redirected: false,
      finalUrl: null,
      error: err.message,
      colo: null,
    };
  }
}
