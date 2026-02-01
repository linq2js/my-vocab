# React Integration

## Overview

| Hook          | Purpose                      | Subscription |
| ------------- | ---------------------------- | ------------ |
| `useSelector` | Read atoms, auto re-render   | Yes          |
| `rx`          | Inline reactive components   | Yes          |
| `useAction`   | Async ops with state         | No (manual)  |
| `useStable`   | Stable refs for callbacks    | No           |

## useSelector

### CRITICAL: One useSelector Per Component

`useSelector` is **powerful** — handles complex expressions, multiple atoms, computed values. **Almost never need multiple calls.**

```tsx
// ✅ REQUIRED — Single useSelector, complex selection
const { count, user, settings, isAdmin, cartTotal } = useSelector(({ read, use }) => ({
  count: read(count$),
  user: read(user$),
  settings: read(settings$),
  isAdmin: read(user$)?.role === "admin",
  cartTotal: use(selectCartTotal),
}));

// ❌ FORBIDDEN — Multiple useSelectors
const count = useSelector(count$);
const user = useSelector(user$);
const settings = useSelector(settings$);
```

### Rare Exception: Hook Dependencies

Only use multiple `useSelector` when a selected value must be passed to another hook:

```tsx
// ✅ OK — Rare case: hook needs selected value
function useProductDetails() {
  const productId = useSelector(({ read }) => read(currentProductId$));
  const analytics = useAnalyticsHook(productId); // Hook needs productId
  const { product, reviews } = useSelector(({ read, from }) => ({
    product: read(from(productPool, productId)),
    reviews: read(from(reviewPool, productId)),
  }));

  return { product, reviews, analytics };
}
```

**If you don't need to pass value to another hook, use single useSelector.**

### Basic

```tsx
const count = useSelector(count$);                           // Shorthand
const doubled = useSelector(({ read }) => read(count$) * 2); // Computed
```

### With Pool

```tsx
const user = useSelector(({ read, from }) => {
  const user$ = from(userPool, userId);
  return read(user$);
});
```

### All Context Methods

```tsx
const [user, posts] = useSelector(({ all }) => all([user$, posts$]));
const userState = useSelector(({ state }) => state(user$));
const result = useSelector(({ read, safe }) => {
  const [err, data] = safe(() => JSON.parse(read(rawJson$)));
  return err ? { error: err.message } : { data };
});
const canEdit = useSelector(({ and }) => and([isLoggedIn$, hasEditRole$]));
```

### Custom Equality

```tsx
const userName = useSelector(
  ({ read }) => read(user$)?.name,
  (prev, next) => prev === next
);
const data = useSelector(({ read }) => read(data$), "deep");
```

## rx() — Inline Reactive

```tsx
function Stats() {
  return (
    <footer>
      {rx(({ read }) => {
        const { total, completed } = read(stats$);
        return <span>{completed} of {total}</span>;
      })}
    </footer>
  );
}
```

### With Loading/Error

```tsx
{rx(({ read }) => <UserCard user={read(user$)} />, {
  loading: <Skeleton />,
  error: (err) => <ErrorMessage error={err} />,
})}
```

### With deps

```tsx
{rx(({ read }) => {
  const user = read(user$);
  return <ExpensiveComponent user={user} filter={filter} />;
}, { deps: [filter] })}
```

## useAction

Async ops with loading/error state.

### Basic

```tsx
const save = useAction(async ({ signal }) => {
  await saveData(data$.get(), { signal });
});

return (
  <button onClick={save} disabled={save.status === "loading"}>
    {save.status === "loading" ? "Saving..." : "Save"}
  </button>
);
```

### API

```tsx
const action = useAction(async ({ signal }) => fetchData({ signal }));

action();            // Call, returns AbortablePromise
await action();
action.abort();      // Abort current

action.status;       // "idle" | "loading" | "success" | "error"
action.result;       // TResult | undefined
action.error;        // unknown
action.reset();      // Reset to idle
```

### Options

```typescript
interface UseActionOptions {
  lazy?: boolean;       // true = manual call, false = auto on mount/deps
  exclusive?: boolean;  // true = abort previous, false = concurrent
  deps?: unknown[];     // Re-execute when changed (lazy: false)
}
```

### Auto-execute (lazy: false)

```tsx
const fetchUser = useAction(
  async ({ signal }) => (await fetch(`/api/users/${userId}`, { signal })).json(),
  { lazy: false, deps: [userId] }
);
```

### Atom Deps (IMPORTANT)

**Pass atoms to `deps`, use `.get()` inside:**

```tsx
// ✅ REQUIRED
const loadData = useAction(
  async ({ signal }) => {
    const filter = filterAtom$.get();
    const config = await configAtom$.get();
    return fetchData(filter, config, { signal });
  },
  { deps: [filterAtom$, configAtom$], lazy: false }
);

// ❌ FORBIDDEN
const { filter, config } = useSelector(({ read }) => ({
  filter: read(filterAtom$),  // Suspends BEFORE useAction
  config: read(configAtom$),
}));
const loadData = useAction(async () => fetchData(filter, config), {
  deps: [filter, config], lazy: false,
});
```

### Error Handling

```tsx
const submit = useAction(async ({ signal }) => {
  const res = await fetch("/api/submit", { method: "POST", signal });
  if (!res.ok) throw new Error("Failed");
  return res.json();
});

{submit.status === "error" && <div className="error">{submit.error.message}</div>}
```

### Form Pattern

```tsx
function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "" });

  const submit = useAction(async ({ signal }) => {
    if (!formData.name) throw new Error("Name required");
    const res = await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(formData),
      signal,
    });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input value={formData.name} onChange={...} />
      <button disabled={submit.status === "loading"}>
        {submit.status === "loading" ? "Submitting..." : "Submit"}
      </button>
      {submit.status === "error" && <p className="error">{submit.error.message}</p>}
    </form>
  );
}
```

## useStable (CRITICAL)

**MUST use instead of React's useCallback/useMemo. NEVER use useCallback/useMemo.**

### Why

Inline objects/callbacks create new refs every render:

```tsx
// ❌ Problem: new refs every render
function Parent() {
  const config = { theme: "dark" };        // New object!
  const onClick = () => doSomething();     // New function!
  return <Child config={config} onClick={onClick} />;
}

// ✅ Solution
function Parent() {
  const stable = useStable({
    config: { theme: "dark" },
    onClick: () => doSomething(),
  });
  return <Child config={stable.config} onClick={stable.onClick} />;
}
```

### How It Works

| Type       | Equality    | Behavior                         |
| ---------- | ----------- | -------------------------------- |
| Functions  | N/A         | Stable ref, calls latest impl    |
| Arrays     | shallow     | Stable if items equal            |
| Dates      | timestamp   | Stable if same time              |
| Objects    | shallow     | Stable if keys have equal values |
| Primitives | strict      | Stable if same value             |

### Basic

```tsx
const stable = useStable({
  onSubmit: () => auth.register(username),
  onLogin: () => auth.login(),
  config: { timeout: 5000, retries: 3 },
  columns: [{ key: "name", label: "Name" }],
});

stable.onSubmit();
<Table columns={stable.columns} />
```

### Custom Equality

```tsx
const stable = useStable(
  { user: { id: 1, profile: { name: "John" } } },
  { user: "deep" }
);

const stable2 = useStable(
  { user: { id: 1, updatedAt: new Date() } },
  { user: (a, b) => a?.id === b?.id }
);
```

### Logic Hook Pattern

```tsx
export function useAuthPageLogic() {
  const auth = authStore();
  const [view, setView] = useState("checking");
  const [username, setUsername] = useState("");

  const stable = useStable({
    onRegister: async () => username.trim() && auth.register(username.trim()),
    onLogin: async () => auth.login(),
    onSwitchToRegister: () => { auth.clearError(); setView("register"); },
    formOptions: { validateOnBlur: true },
  });

  return { view, username, setUsername, ...stable };
}
```

### useStable vs useCallback

| Use Case               | Use                       |
| ---------------------- | ------------------------- |
| Callbacks/handlers     | `useStable` (ALWAYS)      |
| Config objects         | `useStable` (REQUIRED)    |
| Arrays as props        | `useStable` (REQUIRED)    |
| Expensive computations | `useMemo`                 |

```tsx
// ❌ FORBIDDEN
const handleSubmit = useCallback(() => auth.register(username), [auth, username]);
const config = useMemo(() => ({ timeout: 5000 }), []);

// ✅ REQUIRED
const stable = useStable({
  handleSubmit: () => auth.register(username),
  config: { timeout: 5000 },
});
```

## Suspense (REQUIRED)

**MUST** wrap async atoms with `Suspense` and `ErrorBoundary`:

```tsx
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <Dashboard />
      </Suspense>
    </ErrorBoundary>
  );
}

function Dashboard() {
  const user = useSelector(user$); // Suspends when loading
  return <h1>Welcome, {user.name}</h1>;
}
```

### Nested Boundaries

```tsx
function ArticlePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticleHeader />
      <Suspense fallback={<CommentsSkeleton />}>
        <ArticleComments />
      </Suspense>
    </Suspense>
  );
}
```

### Non-Suspense with state()

```tsx
function UserCard() {
  const userState = useSelector(({ state }) => state(user$));

  if (userState.status === "loading") return <Skeleton />;
  if (userState.status === "error") return <Error error={userState.error} />;
  return <div>{userState.value.name}</div>;
}
```

## Comparison

| Use Case       | atomirx                                  | Jotai                       |
| -------------- | ---------------------------------------- | --------------------------- |
| Single atom    | `useSelector(atom$)`                     | `useAtomValue(atom)`        |
| Derived        | `useSelector(({ read }) => ...)`         | `useAtomValue(derivedAtom)` |
| Multiple atoms | `useSelector(({ all }) => all([a$,b$]))` | Multiple hooks              |
| Loadable       | `useSelector(({ state }) => state(a$))`  | `useAtomValue(loadable(a))` |

### Advantages

1. Single unified hook
2. Composable selectors
3. Flexible async modes
4. Built-in utilities: `all`, `any`, `race`, `settled`, `safe`, `state`, `and`, `or`
5. Type-safe
6. useStable — no dependency array footguns
