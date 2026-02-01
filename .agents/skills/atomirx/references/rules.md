# Rules & Best Practices

## Service vs Store (CRITICAL)

**All state/logic MUST use `define()`. Services = stateless. Stores = atoms.**

| Type        | Purpose        | Variable      | File              | Contains                |
| ----------- | -------------- | ------------- | ----------------- | ----------------------- |
| **Service** | Stateless I/O  | `authService` | `auth.service.ts` | Pure functions          |
| **Store**   | Reactive state | `authStore`   | `auth.store.ts`   | Atoms, derived, effects |

### Service

```typescript
export const authService = define(
  (): AuthService => ({
    checkSupport: async () => {
      /* WebAuthn API */
    },
    register: async (opts) => {
      /* credential creation */
    },
    authenticate: async (opts) => {
      /* credential assertion */
    },
  })
);
```

### Store

```typescript
import { authService } from "@/services/auth/auth.service";

export const authStore = define(() => {
  const auth = authService(); // Inject via invocation

  const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
  const isAuthenticated$ = derived(({ read }) => read(user$) !== null, {
    meta: { key: "auth.isAuthenticated" },
  });

  return {
    ...readonly({ user$, isAuthenticated$ }),
    login: async () => {
      const result = await auth.authenticate({});
      if (result.success) user$.set(result.user);
    },
  };
});
```

### FORBIDDEN: Factory Pattern

```typescript
// ❌ FORBIDDEN
let instance: AuthService | null = null;
export function getAuthService(): AuthService {
  if (!instance) instance = createAuthService();
  return instance;
}

import { getAuthService } from "@/services/auth";
const auth = getAuthService(); // WRONG

// ✅ REQUIRED
import { authService } from "@/services/auth/auth.service";
const auth = authService(); // Module invocation
```

**Detection:** `get*Service()`, `create*Service()`, `*Factory()` → STOP, refactor to `define()`.

| Factory Pattern | Module Pattern (`define()`) |
| --------------- | --------------------------- |
| Not mockable    | `service.override(mock)`    |
| Hidden deps     | Explicit dependencies       |
| No lazy control | Lazy singleton default      |
| Breaks DI       | Uses atomirx DI             |

## useSelector Grouping (CRITICAL)

**MUST group multiple reads into single `useSelector`.**

```tsx
// ✅ DO
const { count, user, settings } = useSelector(({ read }) => ({
  count: read(count$),
  user: read(user$),
  settings: read(settings$),
}));

// ❌ DON'T
const count = useSelector(count$);
const user = useSelector(user$);
const settings = useSelector(settings$);
```

| Multiple Calls      | Single Grouped   |
| ------------------- | ---------------- |
| N subscriptions     | 1 subscription   |
| N checks per change | 1 check          |
| Scattered values    | Related together |

**Single `useSelector(atom$)` OK when:** only one atom needed.

## useAction with Atom Deps

**Pass atoms to `deps`, use `.get()` inside for auto re-dispatch.**

```tsx
// ✅ DO
const load = useAction(
  async () => {
    const val1 = atom1$.get();
    const val2 = await atom2$.get();
    return val1 + val2;
  },
  { deps: [atom1$, atom2$], lazy: false }
);

// ❌ DON'T
const { val1, val2 } = useSelector(({ read }) => ({
  val1: read(atom1$), // Suspends before useAction
  val2: read(atom2$),
}));
const load = useAction(async () => val1 + val2, {
  deps: [val1, val2],
  lazy: false,
});
```

## define() Isolation (CRITICAL)

**MUST use `define()` for all state/logic.**

```typescript
// ✅ DO
export const counterStore = define(() => {
  const storage = storageService();
  const count$ = atom(0, { meta: { key: "counter.count" } });

  return {
    ...readonly({ count$ }),
    increment: () => count$.set((x) => x + 1),
    save: () => storage.set("count", count$.get()),
  };
});

// ❌ DON'T
const count$ = atom(0); // Global, not testable
```

| Benefit         | Description                     |
| --------------- | ------------------------------- |
| Testing/Mocking | Override for unit tests         |
| Lazy init       | Only when first accessed        |
| DI              | Depend on services/stores       |
| Environment     | Override per platform           |
| Encapsulation   | `readonly()` prevents mutations |

### Override Pattern

```typescript
const storageService = define((): StorageService => {
  throw new Error("Not implemented");
});

// Platform implementations
const webStorage = define(
  (): StorageService => ({
    get: (key) => localStorage.getItem(key),
    set: (key, val) => localStorage.setItem(key, val),
  })
);

// Override based on environment
if (isWeb) storageService.override(webStorage);

// In tests
storageService.override(() => ({
  get: jest.fn(),
  set: jest.fn(),
}));
```

## batch() for Multiple Updates

**MUST wrap multiple updates in `batch()`.**

```typescript
// ✅ DO
batch(() => {
  user$.set(newUser);
  settings$.set(newSettings);
  lastUpdated$.set(Date.now());
}); // Single notification

// ❌ DON'T
user$.set(newUser); // Notification 1
settings$.set(newSettings); // Notification 2
lastUpdated$.set(Date.now()); // Notification 3
```

| Without batch       | With batch       |
| ------------------- | ---------------- |
| N notifications     | 1 notification   |
| Intermediate states | Only final state |
| UI flicker          | Clean update     |

## Single Effect, Single Workflow (CRITICAL)

**Each effect = ONE workflow. Split multiple workflows.**

```typescript
// ❌ WRONG
effect(({ read }) => {
  const id = read(currentId$);
  const filter = read(filter$);
  fetchEntity(id); // Workflow 1
  localStorage.setItem("filter", filter); // Workflow 2
  trackPageView(id); // Workflow 3
});

// ✅ CORRECT
effect(
  ({ read }) => {
    const id = read(currentId$);
    if (id) fetchEntity(id);
  },
  { meta: { key: "fetch.entity" } }
);

effect(
  ({ read }) => {
    localStorage.setItem("filter", read(filter$));
  },
  { meta: { key: "persist.filter" } }
);

effect(
  ({ read }) => {
    const id = read(currentId$);
    if (id) trackPageView(id);
  },
  { meta: { key: "analytics.pageView" } }
);
```

| Multiple Workflows | Single Workflow      |
| ------------------ | -------------------- |
| Hard to trace      | Clear cause → effect |
| Combined triggers  | Independent          |
| Hard to test       | Test in isolation    |
| Hard to disable    | Comment one effect   |

## meta.key (CRITICAL)

**MUST define for ALL atoms, derived, effects.**

```typescript
// ✅ CORRECT
const user$ = atom<User | null>(null, { meta: { key: "auth.user" } });
const isAuth$ = derived(({ read }) => read(user$) !== null, {
  meta: { key: "auth.isAuthenticated" },
});
effect(({ read }) => analytics.identify(read(user$)?.id), {
  meta: { key: "auth.identifyUser" },
});

// ❌ WRONG
const user$ = atom<User | null>(null);
const isAuth$ = derived(({ read }) => read(user$) !== null);
```

| Pattern             | Example                |
| ------------------- | ---------------------- |
| `store.atomName`    | `auth.user`            |
| `store.derivedName` | `auth.isAuthenticated` |
| `store.effectName`  | `sync.autoSave`        |

## Atom Storage

**NEVER store atoms in component scope.**

```typescript
// ❌ BAD - memory leak
function Component() {
  const data$ = useRef(atom(0)).current;
}

// ✅ GOOD
const dataStore = define(() => {
  const data$ = atom(0, { meta: { key: "data" } });
  return { ...readonly({ data$ }), update: (v) => data$.set(v) };
});
```

## Mutation Co-location

**All mutations MUST be in the store that owns the atom.**

```typescript
// ✅ CORRECT
const counterStore = define(() => {
  const count$ = atom(0, { meta: { key: "counter.count" } });
  return {
    ...readonly({ count$ }),
    increment: () => count$.set((p) => p + 1),
    decrement: () => count$.set((p) => p - 1),
    reset: () => count$.reset(),
  };
});

// ❌ WRONG
const { count$ } = counterStore();
count$.set(10); // External mutation
```

## SelectContext: Sync Only

**All context methods MUST be called synchronously.**

```typescript
// ❌ WRONG
derived(({ read }) => {
  setTimeout(() => read(atom$), 100); // Error
  return "value";
});

// ✅ CORRECT
effect(({ read }) => {
  const config = read(config$);
  setTimeout(() => {
    const data = myAtom$.get(); // Use .get() for async
    console.log(data);
  }, 100);
});
```

## Error Handling: safe() Not try/catch

**NEVER try/catch with read() — breaks Suspense.**

```typescript
// ❌ WRONG
derived(({ read }) => {
  try {
    return read(asyncAtom$);
  } catch (e) {
    return null; // Catches Promise!
  }
});

// ✅ CORRECT
derived(({ read, safe }) => {
  const [err, value] = safe(() => read(asyncAtom$));
  if (err) return { error: err.message };
  return { value };
});
```

## Naming Conventions

```typescript
// All atoms: $ suffix
const count$ = atom(0);
const user$ = atom<User | null>(null);
const productList$ = atom(fetchProducts()); // Async — still just $
const config$ = atom(loadConfig());

// Derived: $ suffix
const doubled$ = derived(({ read }) => read(count$) * 2);
const userName$ = derived(({ read }) => read(user$).name);

// Services: *Service (NO atoms)
const authService = define((): AuthService => ...);

// Stores: *Store (HAS atoms)
const authStore = define(() => ...);

// Actions: verb-led
navigateTo, invalidate, refresh, fetchUser, logout
```

| Type                 | Suffix    | Example                  |
| -------------------- | --------- | ------------------------ |
| Atom (sync or async) | `$`       | `count$`, `productList$` |
| Derived              | `$`       | `doubled$`, `userName$`  |
| Pool                 | `Pool`    | `userPool`               |
| Service              | `Service` | `authService`            |
| Store                | `Store`   | `authStore`              |

**Why no `Async$`?** Atomirx abstracts async/sync — you don't care in SelectContext (Suspense handles it), and services receive values as parameters.

### File Structure

```
src/
├── services/           # Stateless
│   ├── auth/
│   │   └── auth.service.ts
│   └── crypto/
│       └── crypto.service.ts
└── stores/             # Stateful
    ├── auth.store.ts
    └── todos.store.ts
```
