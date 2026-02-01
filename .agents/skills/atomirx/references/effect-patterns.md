# Effect Patterns

Effects run side effects when atoms change. Handles sync/async atoms, executes synchronously.

```typescript
const user$ = atom(fetchUser());

effect(
  ({ read }) => {
    const user = read(user$); // Suspends until resolved
    console.log(`User: ${user.name}`);
    localStorage.setItem("lastUser", user.id);
  },
  { meta: { key: "log.user" } }
);
```

## When to Use

**Use `effect()` for:**

- Logging, persisting, syncing
- Triggering events, updating atoms
- Reacting to state changes with side effects
- Kicking off async work (fire-and-forget)

**NEVER use for:**

- User-triggered actions → plain function with `.set()`
- Computed values → `derived()`
- Operations needing return value → `derived()`

## Async in Effects

Effects are **sync** but CAN trigger async work:

```typescript
// ✅ Fire-and-forget async call
effect(
  ({ read }) => {
    const productId = read(currentProductId$);
    fetchAnalytics(productId); // No await, just trigger
  },
  { meta: { key: "analytics.product" } }
);

// ✅ Assign Promise to atom (atom stores the Promise)
effect(
  ({ read }) => {
    const productId = read(currentProductId$);
    productDetails$.set(fetchProductDetails(productId)); // Promise assigned
  },
  { meta: { key: "fetch.productDetails" } }
);

// ✅ Async with signal for cancellation
effect(
  ({ read, signal }) => {
    const userId = read(userId$);
    fetch(`/api/user/${userId}`, { signal })
      .then((r) => r.json())
      .then((data) => userDetails$.set(data))
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });
  },
  { meta: { key: "fetch.user" } }
);
```

| Pattern | Description |
| ------- | ----------- |
| `fetchSomething()` | Fire-and-forget, no await |
| `atom$.set(fetchX())` | Store Promise in atom |
| `fetch(..., { signal })` | Cancelable with AbortSignal |

## Features

| Feature          | Description                       |
| ---------------- | --------------------------------- |
| Auto cleanup     | Previous cleanup runs first       |
| Suspense-aware   | Waits for async atoms             |
| Batched updates  | Atom updates batched              |
| Conditional deps | Only tracks accessed atoms        |
| Eager execution  | Runs immediately (unlike derived) |

## Core API

```typescript
interface Effect {
  dispose: VoidFunction;
  meta?: EffectMeta;
}

interface EffectContext extends SelectContext {
  onCleanup: (fn: VoidFunction) => void;
  signal: AbortSignal;
}
```

## CRITICAL Rules

### MUST Be Sync

```typescript
// ❌ FORBIDDEN
effect(async ({ read }) => {
  const data = await fetch("/api");
});

// ✅ REQUIRED
const data$ = atom(fetch("/api").then((r) => r.json()));
effect(({ read }) => console.log(read(data$)));
```

### NEVER try/catch — Use safe()

```typescript
// ❌ FORBIDDEN
effect(({ read }) => {
  try {
    riskyOp(read(asyncAtom$));
  } catch (e) {
    console.error(e);
  } // Catches Promise!
});

// ✅ REQUIRED
effect(({ read, safe }) => {
  const [err, data] = safe(() => riskyOp(read(asyncAtom$)));
  if (err) console.error("Failed:", err);
});
```

### MUST Define meta.key

```typescript
// ✅ REQUIRED
effect(({ read }) => localStorage.setItem("count", String(read(count$))), {
  meta: { key: "persist.count" },
});

// ❌ FORBIDDEN
effect(({ read }) => localStorage.setItem("count", String(read(count$))));
```

### Single Workflow

```typescript
// ❌ FORBIDDEN — multiple workflows
effect(({ read }) => {
  localStorage.setItem("count", String(read(count$)));
  syncToServer(read(count$));
  trackEvent("count_changed", read(count$));
});

// ✅ REQUIRED — separate effects
effect(({ read }) => localStorage.setItem("count", String(read(count$))), {
  meta: { key: "persist.count" },
});
effect(({ read }) => syncToServer(read(count$)), {
  meta: { key: "sync.count" },
});
effect(({ read }) => trackEvent("count_changed", read(count$)), {
  meta: { key: "analytics.count" },
});
```

## Cleanup Patterns

### Basic

```typescript
effect(({ read, onCleanup }) => {
  const id = setInterval(() => console.log(read(count$)), 1000);
  onCleanup(() => clearInterval(id));
});
```

### Multiple (FIFO)

```typescript
effect(({ read, onCleanup }) => {
  const sub1 = eventBus.subscribe("a", handler1);
  const sub2 = eventBus.subscribe("b", handler2);
  onCleanup(() => sub1.unsubscribe()); // First
  onCleanup(() => sub2.unsubscribe()); // Second
});
```

### AbortSignal

```typescript
effect(({ read, signal }) => {
  const userId = read(userId$);
  fetch(`/api/user/${userId}`, { signal })
    .then((r) => r.json())
    .then((data) => userDetails$.set(data))
    .catch((err) => {
      if (err.name !== "AbortError") console.error(err);
    });
});
```

### WebSocket

```typescript
effect(
  ({ read, onCleanup }) => {
    const socket = new WebSocket(read(wsUrl$));
    socket.onmessage = (e) => messages$.set((p) => [...p, e.data]);
    onCleanup(() => socket.close());
  },
  { meta: { key: "ws.connection" } }
);
```

## Common Patterns

### LocalStorage

```typescript
effect(
  ({ read }) => {
    localStorage.setItem("settings", JSON.stringify(read(settings$)));
  },
  { meta: { key: "persist.settings" } }
);
```

### Analytics

```typescript
effect(
  ({ read }) => {
    analytics.track("page_view", { page: read(currentPage$) });
  },
  { meta: { key: "analytics.pageView" } }
);
```

### Debug (Dev Only)

```typescript
if (process.env.NODE_ENV === "development") {
  effect(
    ({ read }) => {
      console.log("[DEBUG]", { user: read(user$), cart: read(cart$) });
    },
    { meta: { key: "debug.state" } }
  );
}
```

### Conditional

```typescript
effect(
  ({ read }) => {
    if (!read(featureFlag$)) return;
    syncToExternalService(read(data$));
  },
  { meta: { key: "sync.external" } }
);
```

### Debounced

```typescript
effect(
  ({ read, onCleanup }) => {
    const data = read(formData$);
    const id = setTimeout(
      () => localStorage.setItem("draft", JSON.stringify(data)),
      500
    );
    onCleanup(() => clearTimeout(id));
  },
  { meta: { key: "persist.formDraft" } }
);
```

### Cross-Tab Sync

```typescript
effect(
  ({ read, onCleanup }) => {
    const settings = read(settings$);
    const channel = new BroadcastChannel("settings");
    channel.postMessage(settings);

    const handler = (e: MessageEvent) => settings$.set(e.data);
    channel.addEventListener("message", handler);
    onCleanup(() => {
      channel.removeEventListener("message", handler);
      channel.close();
    });
  },
  { meta: { key: "sync.crossTab" } }
);
```

### Document Title

```typescript
effect(
  ({ read }) => {
    const count = read(unreadCount$);
    document.title = count > 0 ? `(${count}) My App` : "My App";
  },
  { meta: { key: "ui.documentTitle" } }
);
```

### Non-Reactive Config (untrack)

Read config/settings without triggering re-run when they change:

```typescript
// Effect only re-runs when userId$ changes, NOT when apiConfig$ changes
effect(
  ({ read, untrack }) => {
    const userId = read(userId$);           // Tracked — triggers re-run
    const config = untrack(apiConfig$);     // NOT tracked — no re-run
    fetch(`${config.baseUrl}/users/${userId}`);
  },
  { meta: { key: "fetch.user" } }
);

// Snapshot multiple atoms for logging without tracking all of them
effect(
  ({ read, untrack }) => {
    const currentPage = read(currentPage$); // Only track page changes
    const snapshot = untrack(() => ({
      user: read(user$),
      settings: read(settings$),
      cart: read(cart$),
    }));
    analytics.track("page_view", { page: currentPage, ...snapshot });
  },
  { meta: { key: "analytics.pageView" } }
);
```

| Use Case | Method |
| -------- | ------ |
| Value that triggers effect | `read()` |
| Config/reference values | `untrack()` |
| Snapshot for logging | `untrack(() => ...)` |

## Options

```typescript
interface EffectOptions {
  meta?: { key?: string };
  onError?: (error: unknown) => void;
}

effect(({ read }) => riskyOp(read(data$)), {
  meta: { key: "risky.op" },
  onError: (err) => Sentry.captureException(err),
});
```

## Effect vs Derived

| Aspect       | effect()      | derived()      |
| ------------ | ------------- | -------------- |
| Returns      | void          | Computed value |
| Execution    | Eager         | Lazy           |
| Purpose      | Side effects  | Transform data |
| **Can set**  | **✅ Yes**    | **❌ NEVER**   |
| Subscription | Always active | When accessed  |

## Lifecycle

```
Created → Initial run → Dep changed → Cleanup → Re-run → ... → dispose() → Final cleanup → Stopped
```

## Testing

```typescript
it("should persist to localStorage", () => {
  const count$ = atom(0, { meta: { key: "test.count" } });
  const e = effect(
    ({ read }) => localStorage.setItem("count", String(read(count$))),
    {
      meta: { key: "test.persist" },
    }
  );

  expect(localStorage.getItem("count")).toBe("0");
  count$.set(5);
  expect(localStorage.getItem("count")).toBe("5");
  e.dispose();
});

it("should cleanup on dispose", () => {
  const cleanup = vi.fn();
  const count$ = atom(0);
  const e = effect(({ read, onCleanup }) => {
    read(count$);
    onCleanup(cleanup);
  });

  expect(cleanup).not.toHaveBeenCalled();
  e.dispose();
  expect(cleanup).toHaveBeenCalledOnce();
});
```

## When to Use

✅ **Use effect:**

- Sync to storage, analytics, logging
- Manage subscriptions (WS, events)
- Update DOM properties
- Mutate atoms based on computed

❌ **NEVER use effect:**

- User triggers action → plain function
- Computing derived values → `derived()`
- Need return value → `derived()`
