# Hooks — Creation Tracking & Error Handling

## Overview

| Hook           | Purpose                          | Fires When             |
| -------------- | -------------------------------- | ---------------------- |
| `onCreateHook` | Track atom/derived/effect/module | Primitive created      |
| `onErrorHook`  | Global error handling            | Error in derived/effect|
| `hook()`       | Create custom hooks              | N/A (factory)          |

## CRITICAL: MUST Use .override()

**NEVER** assign `.current` directly — breaks hook chain.

```typescript
// ❌ FORBIDDEN
onCreateHook.current = (info) => { ... };

// ✅ REQUIRED
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  // your code
});

onErrorHook.override((prev) => (info) => {
  prev?.(info);
  // your code
});
```

## Hook API

| Method       | Signature               | Description            |
| ------------ | ----------------------- | ---------------------- |
| `.current`   | `T \| undefined`        | Read-only value        |
| `.override()`| `(reducer) => void`     | Set via reducer        |
| `.reset()`   | `() => void`            | Reset to initial       |
| `hook.use()` | `(setups[], fn) => T`   | Temporary hooks in fn  |

## onCreateHook

Fires on atom, derived, effect, module creation.

### CreateInfo Types

```typescript
interface MutableCreateInfo {
  type: "mutable";
  key: string | undefined;
  meta: MutableAtomMeta | undefined;
  atom: MutableAtom<unknown>;
}

interface DerivedCreateInfo {
  type: "derived";
  key: string | undefined;
  meta: DerivedAtomMeta | undefined;
  atom: DerivedAtom<unknown, boolean>;
}

interface EffectCreateInfo {
  type: "effect";
  key: string | undefined;
  meta: EffectMeta | undefined;
  effect: Effect;
}

interface ModuleCreateInfo {
  type: "module";
  key: string | undefined;
  meta: ModuleMeta | undefined;
  module: unknown;
}
```

### Use Cases

#### DevTools Registry

```typescript
const registry = {
  atoms: new Map(),
  derived: new Map(),
  effects: new Map(),
  modules: new Map(),
};

onCreateHook.override((prev) => (info) => {
  prev?.(info);
  const key = info.key ?? `anon-${Date.now()}`;
  switch (info.type) {
    case "mutable": registry.atoms.set(key, info.atom); break;
    case "derived": registry.derived.set(key, info.atom); break;
    case "effect": registry.effects.set(key, info.effect); break;
    case "module": registry.modules.set(key, info.module); break;
  }
});

window.__ATOMIRX_DEVTOOLS__ = registry;
```

#### Persistence

```typescript
declare module "atomirx" {
  interface MutableAtomMeta { persisted?: boolean; }
}

onCreateHook.override((prev) => (info) => {
  prev?.(info);
  if (info.type !== "mutable" || !info.meta?.persisted || !info.key) return;

  const storageKey = `app:${info.key}`;

  if (!info.atom.dirty()) {
    const stored = localStorage.getItem(storageKey);
    if (stored) try { info.atom.set(JSON.parse(stored)); } catch {}
  }

  info.atom.on(() => localStorage.setItem(storageKey, JSON.stringify(info.atom.get())));
});

// Usage
const settings$ = atom({ theme: "dark" }, { meta: { key: "user.settings", persisted: true } });
```

#### Validation

```typescript
declare module "atomirx" {
  interface MutableAtomMeta { validate?: (v: unknown) => boolean; }
}

onCreateHook.override((prev) => (info) => {
  prev?.(info);
  if (info.type !== "mutable" || !info.meta?.validate) return;

  const validate = info.meta.validate;
  const originalSet = info.atom.set.bind(info.atom);

  info.atom.set = (valueOrReducer) => {
    const next = typeof valueOrReducer === "function"
      ? (valueOrReducer as Function)(info.atom.get())
      : valueOrReducer;

    if (!validate(next)) {
      console.warn(`Validation failed for ${info.key}:`, next);
      return;
    }
    originalSet(valueOrReducer);
  };
});
```

#### Debug Logging

```typescript
if (process.env.NODE_ENV === "development") {
  onCreateHook.override((prev) => (info) => {
    prev?.(info);
    console.log(`[atomirx] Created ${info.type}: ${info.key ?? "anon"}`);
  });
}
```

## onErrorHook

Fires on derived/effect errors.

```typescript
interface ErrorInfo {
  source: CreateInfo;
  error: unknown;
}
```

### Use Cases

#### Sentry

```typescript
onErrorHook.override((prev) => (info) => {
  prev?.(info);
  Sentry.captureException(info.error, {
    tags: { source_type: info.source.type, source_key: info.source.key ?? "anon" },
    extra: { meta: info.source.meta },
  });
});
```

#### Console

```typescript
onErrorHook.override((prev) => (info) => {
  prev?.(info);
  console.error(`[atomirx] Error in ${info.source.type}: ${info.source.key ?? "anon"}`, info.error);
});
```

#### Toast

```typescript
onErrorHook.override((prev) => (info) => {
  prev?.(info);
  if (info.error instanceof UserFacingError) toast.error(info.error.message);
});
```

## Custom Hooks

```typescript
const debugHook = hook(false);
debugHook.current; // false
debugHook.override(() => true);
debugHook.current; // true
debugHook.reset();
debugHook.current; // false
```

### Temporary Hooks

```typescript
const loggerHook = hook<(msg: string) => void>();

const result = hook.use(
  [loggerHook(() => (msg) => console.log("[TEST]", msg))],
  () => {
    loggerHook.current?.("Inside hook.use()");
    return "result";
  }
);

loggerHook.current?.("Outside"); // Does nothing
```

## Testing (IMPORTANT)

### Isolate Tests

```typescript
describe("MyStore", () => {
  beforeEach(() => {
    onCreateHook.reset();
    onErrorHook.reset();
  });

  afterEach(() => {
    onCreateHook.reset();
    onErrorHook.reset();
  });

  it("should track created atoms", () => {
    const created: string[] = [];
    onCreateHook.override((prev) => (info) => {
      prev?.(info);
      if (info.key) created.push(info.key);
    });

    myStore();
    expect(created).toContain("myStore.counter");
  });
});
```

### Verify Error Hook

```typescript
it("should call error hook", async () => {
  const errors: ErrorInfo[] = [];
  onErrorHook.override((prev) => (info) => { prev?.(info); errors.push(info); });

  const buggy$ = derived(({ read }) => { throw new Error("test"); }, { meta: { key: "buggy" } });

  try { await buggy$.get(); } catch {}

  expect(errors).toHaveLength(1);
  expect(errors[0].source.key).toBe("buggy");
});
```

## Initialization Order (CRITICAL)

**MUST** set up hooks BEFORE atoms are created:

```typescript
// src/app/init.ts
import { onCreateHook, onErrorHook } from "atomirx";

// 1. DevTools
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  window.__ATOMIRX_REGISTRY__?.add(info);
});

// 2. Error monitoring
onErrorHook.override((prev) => (info) => {
  prev?.(info);
  Sentry.captureException(info.error);
});

// 3. Persistence
onCreateHook.override((prev) => (info) => {
  prev?.(info);
  if (info.type === "mutable" && info.meta?.persisted) setupPersistence(info);
});

// src/app/main.tsx
import "./init"; // Run first
import { App } from "./App";
```

## Summary

| Task                  | Hook           | Pattern                             |
| --------------------- | -------------- | ----------------------------------- |
| Track creation        | `onCreateHook` | `.override((prev) => (info) => {})` |
| Global error logging  | `onErrorHook`  | `.override((prev) => (info) => {})` |
| Persistence           | `onCreateHook` | Check `info.meta?.persisted`        |
| Validation            | `onCreateHook` | Wrap `info.atom.set()`              |
| DevTools              | `onCreateHook` | Register in global registry         |
| Reset all             | Both           | `.reset()` in tests                 |
| Temporary (tests)     | `hook.use()`   | `hook.use([setup], fn)`             |
