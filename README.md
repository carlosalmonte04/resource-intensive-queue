# resource-intensive-queue

Limit how many Playwright route handlers run a resource-intensive request at once. The package exports a ready-to-use queue.

## Install

```bash
npm install resource-intensive-queue
```

## Usage

```ts
import riQueue from "resource-intensive-queue";

await page.route("**/*", async (route) => {
  const url = route.request().url();

  if (!url.includes("/resource-intensive-api")) {
    return route.continue();
  }

  await riQueue.add(async () => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body,
    });
  });
});
```

Holder files live in `.ri-queue`. One job runs at a time by default. Stale holders older than 15 seconds are removed.

Optional environment overrides:

- `RI_QUEUE_DIR`
- `RI_QUEUE_CONCURRENCY`
- `RI_QUEUE_STALE_TIMEOUT_MS`
- `RI_QUEUE_POLL_INTERVAL_MS`
- `RI_QUEUE_HEARTBEAT_INTERVAL_MS`
