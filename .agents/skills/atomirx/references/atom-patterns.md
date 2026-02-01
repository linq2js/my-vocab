# Atom Patterns

## Overview

```typescript
const count$ = atom(0);
const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
const data$ = atom(() => expensiveInit());
```

## Core API

| Method       | Signature                  | Description              |
| ------------ | -------------------------- | ------------------------ |
| `get()`      | `() => T`                  | Get current value        |
| `set()`      | `(value \| reducer)`       | Update value             |
| `reset()`    | `() => void`               | Reset to initial         |
| `dirty()`    | `() => boolean`            | Changed since init/reset |
| `on()`       | `(listener) => unsub`      | Subscribe to changes     |
| `_dispose()` | `() => void`               | Cleanup (used by pool)   |

## Lazy Initialization

```typescript
const config$ = atom(() => parseExpensiveConfig());

// reset() re-runs initializer
const timestamp$ = atom(() => Date.now());
timestamp$.reset(); // New timestamp

// Store function as value
const callback$ = atom(() => () => console.log("hello"));
```

## Dirty Tracking

```typescript
const form$ = atom({ name: "", email: "" }, { meta: { key: "form" } });

form$.dirty(); // false
form$.set({ name: "John", email: "" });
form$.dirty(); // true
form$.reset();
form$.dirty(); // false
```

```tsx
function FormButtons() {
  const isDirty = useSelector(() => form$.dirty());
  return (
    <div>
      <button disabled={!isDirty}>Save</button>
      <button onClick={() => form$.reset()}>Reset</button>
    </div>
  );
}
```

## AtomContext — Signal & Cleanup

Lazy initializer receives context:

```typescript
interface AtomContext {
  signal: AbortSignal;           // Aborted on set()/reset()
  onCleanup(fn: VoidFunction): void; // Runs on value change
}
```

### Abort Signal

```typescript
const data$ = atom((ctx) => {
  const controller = new AbortController();
  ctx.signal.addEventListener("abort", () => controller.abort());
  return fetch("/api/data", { signal: controller.signal });
});

data$.set(fetch("/api/data/new")); // Previous fetch aborted
```

### Cleanup

```typescript
const subscription$ = atom((ctx) => {
  const sub = websocket.subscribe("channel");
  ctx.onCleanup(() => sub.unsubscribe());
  return sub;
});

subscription$.reset(); // Unsubscribes, creates new
```

### Combined

```typescript
const realtime$ = atom((ctx) => {
  const socket = new WebSocket("wss://api.example.com");
  ctx.onCleanup(() => socket.close());
  fetchInitialData({ signal: ctx.signal });
  return socket;
});
```

## Equality Options

```typescript
// Default: strict (Object.is)
const count$ = atom(0);

// Shallow
const user$ = atom({ name: "", email: "" }, { equals: "shallow" });
user$.set((prev) => ({ ...prev })); // No notification

// Deep
const config$ = atom({ nested: { value: 1 } }, { equals: "deep" });

// Custom
const data$ = atom(
  { id: 1, timestamp: Date.now() },
  { equals: (a, b) => a.id === b.id }
);
```

| Shorthand    | Description                  |
| ------------ | ---------------------------- |
| `"strict"`   | Object.is (default, fastest) |
| `"shallow"`  | Compare keys with Object.is  |
| `"shallow2"` | 2 levels deep                |
| `"shallow3"` | 3 levels deep                |
| `"deep"`     | Full recursive (slowest)     |

## readonly() (REQUIRED)

**MUST** expose atoms as read-only:

```typescript
const myModule = define(() => {
  const count$ = atom(0, { meta: { key: "counter" } });

  return {
    count$: readonly(count$), // Consumers can't set()
    increment: () => count$.set((p) => p + 1),
  };
});

// Usage
const { count$, increment } = myModule();
count$.get();   // ✅ OK
count$.set(5);  // ❌ TypeScript error
increment();    // ✅ Use action
```

Multiple atoms:

```typescript
return { ...readonly({ count$, name$ }), setName: (n) => name$.set(n) };
```

## Async Values

Atom stores Promises as-is:

```typescript
const posts$ = atom(fetchPosts());
posts$.get(); // Promise<Post[]>
posts$.set(fetchPosts()); // Store new Promise

// With lazy init
const lazyPosts$ = atom(() => fetchPosts());
lazyPosts$.reset(); // Refetches
```

**Note:** Use `derived()` with `read()` for automatic Promise unwrapping and Suspense.

## Plugin System (.use())

```typescript
const count$ = atom(0)
  .use((src) => ({ ...src, double: () => src.get() * 2 }))
  .use((src) => ({ ...src, triple: () => src.get() * 3 }));

count$.double(); // 0
count$.triple(); // 0
```

## Common Patterns

### Form State

```typescript
const form$ = atom<FormState>(
  { values: {}, errors: {}, touched: {} },
  { meta: { key: "contactForm" }, equals: "shallow" }
);

const setField = (name: string, value: string) => {
  form$.set((p) => ({
    ...p,
    values: { ...p.values, [name]: value },
    touched: { ...p.touched, [name]: true },
  }));
};
```

### Cache with Expiration

```typescript
const cache$ = atom((ctx) => {
  const data = new Map<string, unknown>();
  const timeout = setTimeout(() => data.clear(), 300_000);
  ctx.onCleanup(() => clearTimeout(timeout));
  return data;
});
```

### WebSocket

```typescript
const ws$ = atom((ctx) => {
  const socket = new WebSocket("wss://api.example.com");
  socket.onopen = () => console.log("Connected");
  ctx.onCleanup(() => socket.close());
  return socket;
});

ws$.reset(); // Closes old, creates new
```

## When to Use

| Use Case                | MutableAtom | Derived |
| ----------------------- | ----------- | ------- |
| User input/form state   | ✅          | ❌      |
| API response storage    | ✅          | ❌      |
| Computed from atoms     | ❌          | ✅      |
| Transformed async data  | ❌          | ✅      |
| Cached calculations     | ❌          | ✅      |
