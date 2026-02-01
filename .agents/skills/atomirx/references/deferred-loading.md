# Deferred Loading with ready()

## The Problem

When atom value is `undefined`/`null` during initialization:

```typescript
// ❌ Problem: id starts undefined
const currentUserId$ = atom<string | undefined>(undefined);

const userProfile$ = derived(({ read, from }) => {
  const userId = read(currentUserId$); // undefined initially
  const user$ = from(userPool, userId); // Error: can't create entry
  return read(user$);
});
```

## Solution: ready()

`ready()` returns `never` when value is `undefined`/`null`, blocking computation until value exists:

```typescript
// ✅ Correct
const userProfile$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$); // Blocks until truthy
  const user$ = from(userPool, userId);
  return read(user$);
});
```

## How It Works

| Input                         | Output          |
| ----------------------------- | --------------- |
| `ready(atom<T \| undefined>)` | `T` when truthy |
| Value is `undefined`/`null`   | Returns `never` |
| Value is truthy               | Returns `T`     |

```typescript
const id$ = atom<string | undefined>(undefined);

derived(({ ready }) => {
  const id = ready(id$);
  //    ^? string (not string | undefined)
  return fetchUser(id);
});
```

## Behavior

```typescript
const userId$ = atom<string | undefined>(undefined);

const profile$ = derived(({ read, ready, from }) => {
  const userId = ready(userId$);
  const user$ = from(userPool, userId);
  return read(user$);
});

// Initially:
profile$.get(); // Promise never resolves (blocked)
profile$.staleValue; // fallback if set, else undefined

// After:
userId$.set("user-123");
await profile$.get(); // { name: "John", ... }
```

## Use Cases

### Pool with Optional Params

```typescript
const currentEntityId$ = atom<string | undefined>(undefined);

const entityDetails$ = derived(({ read, ready, from }) => {
  const id = ready(currentEntityId$);
  const entity$ = from(entityPool, id);
  return read(entity$);
}, { fallback: null });
```

### Dependent Computation

```typescript
const config$ = atom<Config | null>(null);
const apiUrl$ = atom<string | undefined>(undefined);

const data$ = derived(({ read, ready }) => {
  const config = ready(config$);
  const url = ready(apiUrl$);
  return read(atom(() => fetch(`${url}/data?version=${config.version}`)));
});
```

### Conditional UI

```typescript
function UserDashboard() {
  const user = useSelector(({ read, ready }) => {
    return ready(currentUser$);
  });

  return <Dashboard user={user} />;
}

// With state() fallback
function UserCard() {
  const result = useSelector(({ state }) => state(currentUser$));

  if (result.status === "loading") return <Skeleton />;
  if (result.status === "error") return <Error />;
  if (!result.value) return <LoginPrompt />;
  return <Card user={result.value} />;
}
```

### Effect with Guard

```typescript
effect(({ read, ready }) => {
  const userId = ready(currentUserId$);
  analytics.identify(userId);
}, { meta: { key: "analytics.identify" } });
```

### Multi-ready

```typescript
const report$ = derived(({ read, ready, from }) => {
  const userId = ready(currentUserId$);
  const projectId = ready(currentProjectId$);
  const teamId = ready(currentTeamId$);

  const user$ = from(userPool, userId);
  const project$ = from(projectPool, projectId);
  const team$ = from(teamPool, teamId);

  const [user, project, team] = [read(user$), read(project$), read(team$)];
  return { user, project, team };
});
```

## ready() vs Manual Check

```typescript
// ❌ Verbose, TypeScript still sees string | undefined
const profile$ = derived(({ read }) => {
  const id = read(currentUserId$);
  if (!id) return null;
  return read(from(userPool, id)); // Type: still string | undefined
});

// ✅ Concise, TypeScript narrows to string
const profile$ = derived(({ ready, read, from }) => {
  const id = ready(currentUserId$);
  //    ^? string
  return read(from(userPool, id));
});
```

## With Suspense

```tsx
function EntityPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <EntityDetails />
    </Suspense>
  );
}

function EntityDetails() {
  const entity = useSelector(({ read, ready, from }) => {
    const id = ready(currentEntityId$); // Suspends until ID set
    return read(from(entityPool, id));
  });

  return <Details entity={entity} />;
}
```

## Summary

| Scenario                        | Solution                    |
| ------------------------------- | --------------------------- |
| Pool with optional params       | `ready(params$)` + `from()` |
| Dependent chains                | `ready()` per dependency    |
| Wait for auth state             | `ready(currentUser$)`       |
| Multi-value gate                | Multiple `ready()` calls    |
| Type narrowing                  | `ready()` removes `null`    |
