# SelectContext API

SelectContext provides methods for `derived`, `effect`, `useSelector`, and `rx`.

## Methods

| Method          | Returns                        | Description                           |
| --------------- | ------------------------------ | ------------------------------------- |
| `read(atom)`    | `T`                            | Get value, suspends if loading        |
| `ready(atom)`   | `T` (non-nullable)             | Block until truthy                    |
| `ready(values)` | `T[]` (non-nullable elements)  | Block until all elements truthy       |
| `state(atom)`   | `AtomState<T>`                 | Get state without suspending          |
| `untrack(atom)` | `T`                            | Read without tracking dep             |
| `untrack(fn)`   | `T`                            | Execute fn without tracking           |
| `safe(fn)`      | `[error?, value?]`             | Catch errors, rethrow Promise         |
| `all(atoms)`    | `T[]`                          | Wait for all                          |
| `any(record)`   | `KeyedResult` (discriminated)  | First to resolve, narrows on key      |
| `race(record)`  | `KeyedResult` (discriminated)  | First to settle, narrows on key       |
| `settled()`     | `SettledResult<T>[]`           | All with status                       |
| `from(pool)`    | `ScopedAtom<T>`                | Get atom from pool                    |
| `track(atom)`   | `void`                         | Track without reading                 |
| `and(conds)`    | `boolean`                      | Logical AND                           |
| `or(conds)`     | `boolean`                      | Logical OR                            |

## CRITICAL Rules

### Sync Access Only

**All methods MUST be called synchronously:**

```typescript
// ❌ FORBIDDEN
derived(({ read }) => {
  setTimeout(() => read(atom$), 100); // Throws
  return "value";
});

// ✅ REQUIRED
derived(({ read }) => {
  const value = read(atom$); // Sync call
  return value;
});
```

### read() + Suspense

`read()` suspends (throws Promise) when atom loading:

```tsx
// Wrap with Suspense
<Suspense fallback={<Loading />}>
  <Component />
</Suspense>

function Component() {
  const data = useSelector(({ read }) => read(asyncAtom$)); // May suspend
  return <div>{data}</div>;
}
```

### from() Returns ScopedAtom

**MUST use with `read()`, NEVER `.get()`:**

```typescript
// ❌ FORBIDDEN
derived(({ from }) => {
  const user$ = from(userPool, "user-1");
  return user$.get(); // THROWS
});

// ✅ REQUIRED
derived(({ read, from }) => {
  const user$ = from(userPool, "user-1");
  return read(user$);
});
```

### untrack() — Read Without Tracking

**Read atoms or execute functions without creating dependencies.**

Use `untrack()` when you need a value but don't want re-computation when it changes.

```typescript
// Form 1: Pass atom directly
const combined$ = derived(({ read, untrack }) => {
  const count = read(count$);       // ✅ Tracked — re-computes on change
  const config = untrack(config$);  // ❌ NOT tracked — no re-compute
  return count * config.multiplier;
});

// Form 2: Pass function for multiple reads
const snapshot$ = derived(({ read, untrack }) => {
  const liveData = read(liveData$);  // Tracked
  const snapshot = untrack(() => {
    // None of these create dependencies
    return { a: read(a$), b: read(b$), c: read(c$) };
  });
  return { liveData, snapshot };
});
```

**When to use:**

| Scenario | Use |
| -------- | --- |
| Need latest value, re-compute on change | `read()` |
| Need value once, ignore future changes | `untrack()` |
| Initial value / config that rarely changes | `untrack()` |
| Snapshot of multiple atoms | `untrack(() => ...)` |

**Flow Diagram:**

```
untrack(input)
      │
      ▼
  Is input an Atom?
      │
  ┌───┴───┐
  │Yes    │No (function)
  ▼       ▼
 Read    Disable tracking
 value    │
 (no      ▼
 track)  Execute fn()
  │       │
  │       ▼
  │      Re-enable tracking
  │       │
  └───────┴──→ Return value
```

## Type Definitions

```typescript
interface SelectContext {
  read<T>(atom: ReadableAtom<T>): T;
  ready<T>(atom: ReadableAtom<T | undefined | null>): T;
  ready<T extends Record<string, unknown>>(result: KeyedResult<T>): NonNullableKeyedResult<T>;
  ready<A extends readonly unknown[]>(values: A): { [K in keyof A]: Exclude<A[K], null | undefined> };
  state<T>(atom: ReadableAtom<T>): AtomState<T>;
  untrack<T>(atom: ReadableAtom<T>): T;
  untrack<T>(fn: () => T): T;
  safe<T>(fn: () => T): [unknown, undefined] | [undefined, T];
  all<T extends readonly ReadableAtom<unknown>[]>(atoms: T): MapAtomValues<T>;
  any<T extends Record<string, ReadableAtom<unknown>>>(atoms: T): KeyedResult<MapAtomValues<T>>;
  race<T extends Record<string, ReadableAtom<unknown>>>(atoms: T): KeyedResult<MapAtomValues<T>>;
  settled<T extends readonly ReadableAtom<unknown>[]>(atoms: T): MapSettledResults<T>;
  from<P, T>(pool: Pool<P, T>, params: P): ScopedAtom<T>;
  track(atom: ReadableAtom<unknown>): void;
  and(conditions: Condition[]): boolean;
  or(conditions: Condition[]): boolean;
}

// KeyedResult is a discriminated union - checking key narrows value
type KeyedResult<T extends Record<string, unknown>> = {
  [K in keyof T & string]: KeyedResultEntry<K, T[K]>;
}[keyof T & string];

type KeyedResultEntry<K extends string, V> = readonly [K, V] & { key: K; value: V };

type NonNullableKeyedResult<T extends Record<string, unknown>> =
  KeyedResult<{ [K in keyof T]: Exclude<T[K], null | undefined> }>;

type AtomState<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown }
  | { status: "loading"; promise: Promise<T> };

type SettledResult<T> =
  | { status: "ready"; value: T }
  | { status: "error"; error: unknown };

type Condition = boolean | ReadableAtom<unknown> | (() => boolean | ReadableAtom<unknown>);
```

## EffectContext

Effects get additional methods:

```typescript
interface EffectContext extends SelectContext {
  onCleanup: (fn: VoidFunction) => void;
  signal: AbortSignal;
}
```

## Usage in Primitives

### derived

```typescript
const doubled$ = derived(({ read }) => read(count$) * 2);

const combined$ = derived(({ all }) => {
  const [a, b, c] = all([atom1$, atom2$, atom3$]);
  return a + b + c;
});

const guarded$ = derived(({ ready, read, from }) => {
  const id = ready(currentId$);
  return read(from(userPool, id));
});
```

### effect

```typescript
effect(({ read, onCleanup, signal }) => {
  const id = read(userId$);
  
  fetch(`/api/user/${id}`, { signal })
    .then(r => r.json())
    .then(data => userDetails$.set(data))
    .catch(err => {
      if (err.name !== "AbortError") console.error(err);
    });

  const sub = eventBus.subscribe("update", handler);
  onCleanup(() => sub.unsubscribe());
}, { meta: { key: "fetch.user" } });
```

### useSelector

```tsx
const data = useSelector(({ read, safe }) => {
  const [err, value] = safe(() => JSON.parse(read(rawJson$)));
  return err ? { error: err.message } : { data: value };
});
```

### rx

```tsx
{rx(({ read, state }) => {
  const userState = state(user$);
  if (userState.status === "loading") return <Skeleton />;
  if (userState.status === "error") return <ErrorMsg />;
  return <UserCard user={userState.value} />;
})}
```

## use() — Composable Selectors

Split and reuse selection logic with `use()`:

```typescript
// Reusable selector functions
const selectProduct = ({ read }: SelectContext) => read(product$);
const selectUser = ({ read }: SelectContext) => read(user$);
const selectCart = ({ read, from }: SelectContext) => {
  const userId = read(userId$);
  return read(from(cartPool, userId));
};

// Compose in derived
const checkout$ = derived(({ use }) => {
  const product = use(selectProduct);
  const user = use(selectUser);
  const cart = use(selectCart);
  return { product, user, cart };
});

// Reuse in effect
effect(({ use }) => {
  const user = use(selectUser);
  analytics.identify(user.id);
});

// Reuse in useSelector
const { product, user } = useSelector(({ use }) => ({
  product: use(selectProduct),
  user: use(selectUser),
}));
```

**Benefits:**
- Reusable selection logic across derived/effect/useSelector
- Cleaner, more readable selectors
- Easy to test individual selectors
- Single source of truth for data access patterns

## .get() vs read()

| Context                     | Use        | Why                          |
| --------------------------- | ---------- | ---------------------------- |
| Inside selector callback    | `read()`   | Tracks dependencies          |
| setTimeout/setInterval      | `.get()`   | Outside reactive context     |
| Event handlers              | `.get()`   | Outside reactive context     |
| After await                 | `.get()`   | Context no longer valid      |

```typescript
effect(({ read }) => {
  const config = read(config$); // ✅ read() — tracked

  setTimeout(() => {
    const value = count$.get(); // ✅ .get() — outside context
    console.log(value);
  }, 1000);
});

// In event handler
const handleClick = () => {
  const current = count$.get(); // ✅ .get() — not in selector
  console.log(current);
};
```

## Best Practices

1. **Group reads** in useSelector
2. **Use `safe()`** for error handling (not try/catch)
3. **Use `ready()`** for optional params
4. **Use `state()`** when you need loading/error states without Suspense
5. **Use `all()`** for parallel async atoms
6. **Use `settled()`** for graceful degradation
7. **Use `from()`** only with `read()` — never `.get()`
8. **Use `read()`** inside selectors, `.get()` outside
9. **Use `untrack()`** when you need a value but don't want re-computation on change
