# Async Patterns

## Summary

| Utility     | Input           | Output                        | Behavior                   |
| ----------- | --------------- | ----------------------------- | -------------------------- |
| `all()`     | Array of atoms  | Array of values               | Waits for all              |
| `any()`     | Record of atoms | `KeyedResult` (discriminated) | First to resolve           |
| `race()`    | Record of atoms | `KeyedResult` (discriminated) | First to settle            |
| `settled()` | Array of atoms  | Array of SettledResult        | Waits for all settled      |
| `and()`     | Array of conds  | boolean                       | AND with short-circuit     |
| `or()`      | Array of conds  | boolean                       | OR with short-circuit      |

## all() — Promise.all

Waits for ALL atoms. Returns array.

```typescript
const dashboard$ = derived(({ all }) => {
  const [user, posts, comments] = all([user$, posts$, comments$]);
  return { user, posts, comments };
});
```

**Use when:** Need all data before rendering.

## any() — Promise.any

Returns first resolved. Uses object for key identification.
Returns a **discriminated union** — checking `key` narrows `value` type.

```typescript
const data$ = derived(({ any }) => {
  const result = any({ primary: primaryApi$, fallback: fallbackApi$ });
  
  // Type narrowing works!
  if (result.key === "primary") {
    result.value; // narrowed to primaryApi$ type
  }
  
  // Tuple destructuring also works
  const [winner, value] = result;
  
  return result.value;
});
```

**Use when:** Multiple redundant sources, want fastest.

## race() — Promise.race

Returns first settled (ready OR error). Uses object.
Returns a **discriminated union** — checking `key` narrows `value` type.

```typescript
const data$ = derived(({ race }) => {
  const result = race({ cache: cache$, api: api$ });
  
  // Type narrowing works!
  if (result.key === "cache") {
    result.value; // narrowed to cache$ type
  }
  
  // Tuple destructuring also works
  const [source, value] = result;
  
  return result.value;
});
```

**Use when:** Show whatever resolves first.

### KeyedResult Type

`race()` and `any()` return a `KeyedResult<T>` discriminated union:

```typescript
// For race({ num: numAtom$, str: strAtom$ })
// Returns: KeyedResultEntry<"num", number> | KeyedResultEntry<"str", string>

type KeyedResultEntry<K, V> = readonly [K, V] & { key: K; value: V };

// Both access patterns work:
const result = race({ num: numAtom$, str: strAtom$ });
result.key;    // "num" | "str"
result.value;  // number | string (narrowed when key checked)
result[0];     // same as key
result[1];     // same as value
```

## settled() — Promise.allSettled

Returns status for each. Waits until all settled.

```typescript
const results$ = derived(({ settled }) => {
  const [userResult, postsResult] = settled([user$, posts$]);
  return {
    user: userResult.status === "ready" ? userResult.value : null,
    posts: postsResult.status === "ready" ? postsResult.value : [],
    hasErrors: userResult.status === "error" || postsResult.status === "error",
  };
});
```

**Use when:** Handle partial failures gracefully.

### SettledResult Type

```typescript
type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };
```

## state() — No Throwing

Get state without Suspense.

```typescript
const data$ = derived(({ state }) => {
  const userState = state(user$);
  if (userState.status === "loading") return { loading: true };
  if (userState.status === "error") return { error: userState.error };
  return { user: userState.value };
});
```

### AtomState Type

```typescript
type AtomState<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown }
  | { status: "loading"; promise: Promise<T> };
```

## ready() with Async Utilities

Use `ready()` to ensure values from `all()`, `race()`, or `any()` are non-null/non-undefined:

### ready() + all()

Suspend if ANY atom value is null/undefined:

```typescript
const dashboard$ = derived(({ ready, all }) => {
  // Suspends if user$ or posts$ value is null/undefined
  const [user, posts] = ready(all([user$, posts$]));
  // user and posts are guaranteed non-null
  return { user, posts };
});
```

### ready() + race()

Suspend if winning value is null/undefined. Preserves discriminated union:

```typescript
const data$ = derived(({ ready, race }) => {
  const result = ready(race({ cache: cache$, api: api$ }));
  
  // Type narrowing still works!
  if (result.key === "cache") {
    result.value; // narrowed to cache type (non-null)
  }
  
  return { source: result.key, data: result.value };
});
```

### ready() + any()

Same pattern as race():

```typescript
const data$ = derived(({ ready, any }) => {
  const [winner, value] = ready(any({ primary: primary$, fallback: fallback$ }));
  // value is guaranteed non-null
  return { source: winner, data: value };
});
```

## Combining Patterns

### Graceful Degradation

```typescript
const dashboard$ = derived(({ read, settled }) => {
  const user = read(user$); // Required

  const [analyticsResult, notificationsResult] = settled([analytics$, notifications$]);

  return {
    user,
    analytics: analyticsResult.status === "ready" ? analyticsResult.value : null,
    notifications: notificationsResult.status === "ready" ? notificationsResult.value : [],
    warnings: [analyticsResult, notificationsResult]
      .filter((r) => r.status === "error")
      .map((r) => r.error),
  };
});
```

### Cache-First

```typescript
const article$ = derived(({ race }) => {
  const result = race({ cache: cachedArticle$, network: fetchedArticle$ });
  console.log(`From: ${result.key}`);
  return result.value;
});
```

### Parallel Loading

```typescript
const [user, posts, comments] = useSelector(({ all }) =>
  all([user$, posts$, comments$])
);
```

## and() — Logical AND

Short-circuit. Returns true if ALL truthy.

```typescript
const canEdit$ = derived(({ and }) => and([isLoggedIn$, hasPermission$]));

// Lazy evaluation
const canDelete$ = derived(({ and }) => and([
  isLoggedIn$,
  () => hasDeletePermission$, // Only if logged in
]));
```

### Condition Types

```typescript
type Condition =
  | boolean              // Static
  | Atom<unknown>        // Always read
  | (() => boolean | Atom<unknown>); // Lazy
```

## or() — Logical OR

Short-circuit. Returns true if ANY truthy.

```typescript
const hasData$ = derived(({ or }) => or([cacheData$, apiData$]));

// Lazy fallback
const data$ = derived(({ or }) => or([
  () => primaryData$,
  () => fallbackData$,
]));
```

## Boolean + Async

```typescript
// (A && B) || C
const result$ = derived(({ or, and }) => or([and([a$, b$]), c$]));

// Guard expensive ops
const data$ = derived(({ and, read }) => {
  if (!and([isLoggedIn$, hasPermission$])) return null;
  return read(expensiveData$);
});
```
