# Derived Patterns

## .get() Returns Promise, But Execution Can Be Sync

`.get()` **ALWAYS returns `Promise<T>`** — this is the API contract.

**BUT** internally, computation is sync or async depending on dependencies:

```typescript
const count$ = atom(0); // Sync value
const user$ = atom(fetchUser()); // Async value (Promise)

const doubled$ = derived(({ read }) => read(count$) * 2);
const greeting$ = derived(({ read }) => `Hello, ${read(user$).name}`);

// API always returns Promise
await doubled$.get(); // Promise<number>
await greeting$.get(); // Promise<string>
```

## Why This Matters: Sync Mental Model in UI

**In SelectContext (useSelector, derived, effect):**

- Everything runs **sync** — no awaits in your code
- Suspense handles async dependencies automatically
- You don't care if dependency is sync/async

```tsx
const doubled$ = derived(({ read }) => read(count$) * 2);

function MyComponent() {
  // Always sync execution — no Promise throw if count$ is sync
  const doubled = useSelector(doubled$);

  // Even with async dependency — still sync code, Suspense handles it
  const user = useSelector(user$);

  return (
    <div>
      {doubled} - {user.name}
    </div>
  );
}

// Wrap with Suspense to handle async deps
<Suspense fallback={<Loading />}>
  <MyComponent />
</Suspense>;
```

**Effects work the same way:**

```typescript
effect(({ read }) => {
  const count = read(count$); // Sync
  const user = read(user$); // Async — effect waits, no await needed
  console.log(count, user.name);
});
```

## Outside SelectContext: Use await

Services, utilities, event handlers — use `.get()` with await:

```typescript
// In service/utility
async function processData() {
  const user = await user$.get(); // Await because outside selector
  return transform(user);
}

// In event handler
const handleClick = async () => {
  const count = await count$.get();
  sendAnalytics(count);
};
```

## Do Utils Need Sync Values?

**No.** If a utility needs sync value, it should:

1. Accept the value as parameter (not atom)
2. Read from atom that contains sync value directly

```typescript
// ❌ Don't make utils depend on atoms
function formatCount() {
  return count$.get(); // Returns Promise, awkward
}

// ✅ Accept value as parameter
function formatCount(count: number) {
  return `Count: ${count}`;
}

// Usage in selector
useSelector(({ read }) => formatCount(read(count$)));
```

## Summary

| Context                      | Execution  | Async Handling |
| ---------------------------- | ---------- | -------------- |
| useSelector/derived/effect   | Sync code  | Suspense/wait  |
| Outside (services, handlers) | Async code | await .get()   |

## When to Use

**Use `derived()` for:**

- Combining/transforming atoms
- Computed values that auto-update
- Handling sync + async atoms uniformly

**NEVER use for:**

- **Updating atoms** — use `effect()`
- Side effects — use `effect()`
- User actions — use plain functions

## Core API

| Property/Method | Signature           | Description              |
| --------------- | ------------------- | ------------------------ |
| `get()`         | `() => Promise<T>`  | Get computed value       |
| `staleValue`    | `T \| undefined`    | Last resolved / fallback |
| `state()`       | `() => AtomState`   | State without throwing   |
| `refresh()`     | `() => void`        | Force recomputation      |
| `on()`          | `(listener) => sub` | Subscribe                |

## Selector Rules (CRITICAL)

### NEVER Update Atoms

```typescript
// ❌ FORBIDDEN
derived(({ read }) => {
  const items = read(cartItems$);
  cartTotal$.set(items.reduce((s, i) => s + i.price, 0)); // NEVER
  return total;
});

// ✅ Use effect()
effect(
  ({ read }) => {
    const items = read(cartItems$);
    cartTotal$.set(items.reduce((s, i) => s + i.price, 0));
  },
  { meta: { key: "compute.cartTotal" } }
);

// ✅ Or compute in derived
const cartTotal$ = derived(({ read }) =>
  read(cartItems$).reduce((s, i) => s + i.price, 0)
);
```

### MUST Return Sync Value

```typescript
// ❌ FORBIDDEN
derived(async ({ read }) => await fetch("/api"));
derived(({ read }) => fetch("/api").then((r) => r.json()));

// ✅ REQUIRED
const data$ = atom(fetch("/api").then((r) => r.json()));
derived(({ read }) => read(data$));
```

### NEVER try/catch — Use safe()

```typescript
// ❌ FORBIDDEN — catches Promise
derived(({ read }) => {
  try {
    return read(asyncAtom$);
  } catch (e) {
    return "fallback";
  } // Breaks Suspense
});

// ✅ REQUIRED
derived(({ read, safe }) => {
  const [err, data] = safe(() => read(asyncAtom$));
  if (err) return "error fallback";
  return data;
});
```

## staleValue

Last resolved value, or fallback if not yet resolved / error occurred.

```typescript
// Async atom dependency
const user$ = atom(fetchUser()); // Promise<User>

// Without fallback
const userName$ = derived(({ read }) => read(user$).name);
userName$.staleValue; // undefined — async not resolved yet
await userName$.get();
userName$.staleValue; // "John" — last resolved value

// With fallback — used when:
// 1. Async dependency not resolved yet
// 2. Computation error (async rejects or transform fails)
const userPosts$ = derived(({ read }) => read(userPostsAsync$).length, {
  fallback: 0,
});
userPosts$.staleValue; // 0 — async not resolved yet
await userPosts$.get();
userPosts$.staleValue; // 42 — resolved value

// If async rejects or computation throws
userPosts$.staleValue; // 0 — fallback used on error
```

| Scenario       | Without fallback | With fallback  |
| -------------- | ---------------- | -------------- |
| Before resolve | `undefined`      | fallback value |
| After resolve  | Last value       | Last value     |
| On error       | `undefined`      | fallback value |

### Show Cached While Loading

```tsx
function PostCount() {
  const state = useSelector(({ state }) => state(postCount$));
  const stale = postCount$.staleValue;

  if (state.status === "loading")
    return <div className="loading">{stale ?? "..."}</div>;
  return <div>{state.value}</div>;
}
```

## state()

Get state without Suspense:

```typescript
data$.state();
// { status: "ready", value: T }
// { status: "error", error: unknown }
// { status: "loading", promise: Promise<T> }
```

## refresh()

Force recomputation:

```tsx
function DataList() {
  const stable = useStable({ onRefresh: () => data$.refresh() });
  return (
    <PullToRefresh onRefresh={stable.onRefresh}>
      <List />
    </PullToRefresh>
  );
}
```

## Options

```typescript
interface DerivedOptions<T> {
  meta?: { key?: string };
  equals?: Equality<T>;
  fallback?: T;
  onError?: (error: unknown) => void;
}

// Shallow equality
const user$ = derived(({ read }) => ({ ...read(userData$) }), {
  equals: "shallow",
});

// Custom equality
const data$ = derived(({ read }) => read(source$), {
  equals: (a, b) => a.id === b.id,
});

// Error callback
const risky$ = derived(({ read }) => JSON.parse(read(raw$)), {
  onError: (err) => Sentry.captureException(err),
});
```

## Common Patterns

### Computed Property

```typescript
const fullName$ = derived(({ read }) => {
  const { firstName, lastName } = read(user$);
  return `${firstName} ${lastName}`;
});
```

### Filtered List

```typescript
const filteredTodos$ = derived(({ read }) => {
  const todos = read(todos$);
  const filter = read(filter$);
  switch (filter) {
    case "active":
      return todos.filter((t) => !t.completed);
    case "completed":
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
});
```

### Combined Async

```typescript
const dashboard$ = derived(({ all }) => {
  const [user, posts, notifications] = all([user$, posts$, notifications$]);
  return { user, posts, notifications };
});
```

### Conditional Dependencies

```typescript
const data$ = derived(({ read, and }) => {
  if (!and([isLoggedIn$, hasPermission$])) return null;
  return read(expensiveData$);
});
```

### Error-Resilient

```typescript
const dashboard$ = derived(({ settled }) => {
  const [userR, postsR, statsR] = settled([user$, posts$, stats$]);
  return {
    user: userR.status === "ready" ? userR.value : null,
    posts: postsR.status === "ready" ? postsR.value : [],
    errors: [userR, postsR, statsR]
      .filter((r) => r.status === "error")
      .map((r) => r.error),
  };
});
```

### Race Cache vs API

```typescript
const article$ = derived(({ race }) => {
  const result = race({ cache: cachedArticle$, network: fetchedArticle$ });
  console.log(`From: ${result.key}`);
  return result.value;
});
```

### From Pool

```typescript
const currentUser$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$);
  const user$ = from(userPool, userId);
  return read(user$);
});
```

### Non-Reactive Config (untrack)

Read values without creating dependencies — useful for config or initial values that shouldn't trigger re-computation:

```typescript
// Config doesn't change often — don't re-compute when it does
const formatted$ = derived(({ read, untrack }) => {
  const data = read(data$);           // Re-compute when data changes
  const format = untrack(format$);    // DON'T re-compute when format changes
  return formatData(data, format);
});

// Snapshot multiple atoms at once
const snapshot$ = derived(({ read, untrack }) => {
  const trigger = read(trigger$);     // Only re-compute on trigger
  return untrack(() => ({
    a: read(a$),
    b: read(b$),
    c: read(c$),
    timestamp: Date.now(),
  }));
});

// Initial value pattern
const counter$ = derived(({ read, untrack }) => {
  const count = read(count$);
  const initial = untrack(initialValue$);  // Don't re-run if initial changes
  return count - initial;
});
```

| Use Case | Method |
| -------- | ------ |
| Value that triggers re-compute | `read()` |
| Config/settings rarely changing | `untrack()` |
| Snapshot of multiple atoms | `untrack(() => ...)` |
| Initial/reference values | `untrack()` |

## Effect vs Derived

| Aspect       | derived()         | effect()            |
| ------------ | ----------------- | ------------------- |
| Returns      | `Promise<T>`      | void                |
| Execution    | Lazy (on access)  | Eager (immediately) |
| Purpose      | Transform/combine | Sync, persist, log  |
| **Can set**  | **❌ NEVER**      | **✅ Yes**          |
| Subscription | When accessed     | Always active       |

## When to Use What

| Scenario                         | Solution       |
| -------------------------------- | -------------- |
| User clicks → modify atoms       | Plain function |
| React to changes → compute value | `derived()`    |
| React to changes → side effects  | `effect()`     |
| Combine multiple atoms           | `derived()`    |
| Persist/log/sync on changes      | `effect()`     |
