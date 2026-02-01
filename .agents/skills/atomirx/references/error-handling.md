# Error Handling: safe() Not try/catch

## The Problem

`read()` uses **Suspense**: loading atoms throw Promise. try/catch catches the Promise:

```typescript
// ❌ WRONG — breaks Suspense
const data$ = derived(({ read }) => {
  try {
    const user = read(asyncUser$); // Throws Promise when loading
    return processUser(user);
  } catch (e) {
    // Catches BOTH:
    // 1. Promise (loading) — breaks Suspense
    // 2. Actual errors
    return null;
  }
});
```

**Problems:**
- Loading state lost
- No Suspense fallback
- Can't distinguish loading from error

## The Solution: safe()

`safe()` catches errors, **re-throws Promises**:

```typescript
// ✅ CORRECT
const data$ = derived(({ read, safe }) => {
  const [err, user] = safe(() => {
    const raw = read(asyncUser$); // Can throw Promise ✓
    return processUser(raw);       // Can throw Error ✓
  });

  if (err) return { error: err.message };
  return { user };
});
```

## How safe() Works

| Scenario   | `try/catch`        | `safe()`                    |
| ---------- | ------------------ | --------------------------- |
| Loading    | ❌ Catches Promise | ✅ Re-throws → Suspense     |
| Error      | ✅ Catches         | ✅ Returns `[error, undef]` |
| Success    | ✅ Returns         | ✅ Returns `[undef, value]` |

## Use Cases

### Parsing/Validation

```typescript
const parsed$ = derived(({ read, safe }) => {
  const [err, config] = safe(() => {
    const raw = read(rawConfig$);
    return JSON.parse(raw);
  });

  if (err) return { valid: false, error: "Invalid JSON" };
  return { valid: true, config };
});
```

### Graceful Degradation

```typescript
const dashboard$ = derived(({ read, safe }) => {
  const user = read(user$); // Required

  const [err1, analytics] = safe(() => read(analytics$));
  const [err2, notifications] = safe(() => read(notifications$));

  return {
    user,
    analytics: err1 ? null : analytics,
    notifications: err2 ? [] : notifications,
    errors: [err1, err2].filter(Boolean),
  };
});
```

### Effects

```typescript
effect(({ read, safe }) => {
  const [err, data] = safe(() => {
    const raw = read(asyncData$);
    return transformData(raw);
  });

  if (err) {
    console.error("Failed:", err);
    return;
  }
  saveToLocalStorage(data);
});
```

### React Components

```tsx
function UserProfile() {
  const result = useSelector(({ read, safe }) => {
    const [err, user] = safe(() => read(user$));
    return { err, user };
  });

  if (result.err) return <ErrorMessage error={result.err} />;
  return <Profile user={result.user} />;
}
```

### With rx()

```tsx
<Suspense fallback={<Loading />}>
  {rx(({ read, safe }) => {
    const [err, posts] = safe(() => read(posts$));
    if (err) return <ErrorBanner message="Failed to load" />;
    return posts.map((p) => <PostCard key={p.id} post={p} />);
  })}
</Suspense>
```

## Alternative: state()

For manual loading handling (no Suspense):

```typescript
const result = useSelector(({ state }) => state(user$));
// { status: "loading" | "ready" | "error", value?, error? }

if (result.status === "loading") return <Loading />;
if (result.status === "error") return <Error error={result.error} />;
return <User data={result.value} />;
```
