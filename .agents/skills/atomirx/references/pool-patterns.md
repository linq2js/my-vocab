# Pool Patterns

Pool = collection of atoms indexed by params with automatic GC. Like `atomFamily` but with built-in GC and ScopedAtom safety.

## Features

| Feature         | Description                          |
| --------------- | ------------------------------------ |
| Auto GC         | Removed after `gcTime` of inactivity |
| Promise-aware   | GC pauses while Promise pending      |
| ScopedAtom      | Prevents stale reference leaks       |
| Value API       | Public API uses values, not atoms    |
| Reactive API    | `from(pool, params)` in selectors    |

## Creating

```typescript
// Object params
const userPool = pool((params: { id: string }) => fetchUser(params.id), {
  gcTime: 60_000,
  meta: { key: "users" },
});

// Primitive params
const articlePool = pool((id: string) => fetchArticle(id), {
  gcTime: 300_000,
  meta: { key: "articles" },
});

// With context
const dataPool = pool((params: { id: string }, ctx) => {
  const controller = new AbortController();
  ctx.onCleanup(() => controller.abort());
  return fetchData(params.id, { signal: controller.signal });
}, { gcTime: 60_000 });
```

## Options

```typescript
interface PoolOptions<P> {
  gcTime: number;                // Required
  equals?: Equality<P>;          // Default: "shallow"
  meta?: { key?: string };
}
```

## Public API (Value-based)

```typescript
const userPool = pool((id: string) => ({ name: "", email: "" }), { gcTime: 60_000 });

userPool.get("user-1");           // Get/create
userPool.set("user-1", { name: "John", email: "j@e.com" });
userPool.set("user-1", (p) => ({ ...p, name: "Jane" })); // Reducer
userPool.has("user-1");           // Check existence
userPool.remove("user-1");        // Remove
userPool.clear();                 // Clear all
userPool.forEach((val, params) => console.log(params, val));

// Subscribe
const unsub = userPool.onChange((params, value) => console.log("Changed:", params));
const unsub2 = userPool.onRemove((params, value) => console.log("Removed:", params));
```

## Reactive API (from())

In `derived`, `effect`, `useSelector`:

```typescript
// derived
const userPosts$ = derived(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$).posts;
});

// effect
effect(({ read, from }) => {
  const user$ = from(userPool, currentUserId);
  console.log("User:", read(user$));
});

// useSelector
const user = useSelector(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$);
});
```

## ScopedAtom (CRITICAL)

ScopedAtom is a temporary wrapper:
- **ONLY** exists during select context
- **THROWS** if accessed outside
- **MUST** use with `read()`, **NEVER** with `.get()`

```typescript
// ❌ FORBIDDEN
derived(({ from }) => {
  const user$ = from(userPool, "user-1");
  return user$.get(); // THROWS
});

// ❌ FORBIDDEN
let cached: ScopedAtom<User>;
derived(({ from }) => { cached = from(userPool, "user-1"); });
cached._getAtom(); // THROWS after context ends

// ✅ REQUIRED
derived(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$);
});
```

## GC Behavior

Timer resets on: creation, value change, access.

GC pauses while Promise pending:

```typescript
const asyncPool = pool((id: string) => fetchData(id), { gcTime: 5000 });
asyncPool.get("1"); // Timer starts AFTER Promise resolves
```

## Params Equality

Default `"shallow"` — order doesn't matter:

```typescript
const pool1 = pool((p: { a: number; b: number }) => p.a + p.b, { gcTime: 60_000 });
pool1.get({ a: 1, b: 2 }); // Creates
pool1.get({ b: 2, a: 1 }); // Same entry

// Custom
const pool2 = pool(
  (p: { id: string; version?: number }) => fetchData(p.id, p.version),
  { gcTime: 60_000, equals: (a, b) => a.id === b.id }
);
```

## Common Patterns

### Entity Cache

```typescript
const userCache = pool(
  async (id: string) => (await fetch(`/api/users/${id}`)).json(),
  { gcTime: 300_000, meta: { key: "userCache" } }
);

const user = useSelector(({ read, from }) => read(from(userCache, userId)));
```

### Form State per Entity

```typescript
const formPool = pool(
  (entityId: string): FormState => ({ values: {}, errors: {}, dirty: false }),
  { gcTime: 600_000, meta: { key: "forms" } }
);

formPool.set(entityId, (p) => ({
  ...p,
  values: { ...p.values, [field]: value },
  dirty: true,
}));
```

### Optimistic Updates

```typescript
async function updateUserName(id: string, name: string) {
  userPool.set(id, (p) => ({ ...p, name })); // Optimistic
  try {
    await api.updateUser(id, { name });
  } catch {
    userPool.set(id, await fetchUser(id)); // Rollback
    throw error;
  }
}
```

### Derived from Pool

```typescript
const currentUser$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$);
  const user$ = from(userPool, userId);
  return read(user$);
});
```

### Multiple Pools

```typescript
const userDashboard$ = derived(({ read, from, all }) => {
  const userId = "user-1";
  const user$ = from(userPool, userId);
  const posts$ = from(postsPool, userId);
  const [user, posts] = all([user$, posts$]);
  return { user, posts };
});
```

## Pool vs Manual Map

| Feature        | pool()                   | Manual Map              |
| -------------- | ------------------------ | ----------------------- |
| GC             | Auto with `gcTime`       | Manual cleanup          |
| Memory safety  | ScopedAtom prevents leaks| Easy to leak            |
| Promise-aware  | GC waits for pending     | Manual handling         |
| Events         | `onChange`, `onRemove`   | Implement manually      |
| Reactive       | Works with `from()`      | Manual subscriptions    |
| Testing        | Easy mock via `define()` | Harder isolation        |

## When to Use

✅ **Use pool:**
- Parameterized state (users, articles, forms)
- Entries with natural TTL (cache, session)
- Reactive subscriptions per entry
- Memory management matters

❌ **NEVER use pool:**
- Single global atom → use `atom`
- State doesn't vary by key
- Entries should NEVER be GC'd → use Map
