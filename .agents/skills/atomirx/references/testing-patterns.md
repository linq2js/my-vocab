# Testing Patterns

## Core Principles

1. **Isolate** — Each test gets fresh atoms
2. **Override** — Use `define().override()` for mocks
3. **Reset hooks** — Clear between tests
4. **Test behaviors** — Not internals

## Testing Atoms

### Basic

```typescript
describe("counterAtom", () => {
  it("should initialize to 0", () => {
    const count$ = atom(0, { meta: { key: "test.count" } });
    expect(count$.get()).toBe(0);
  });

  it("should update value", () => {
    const count$ = atom(0);
    count$.set(5);
    expect(count$.get()).toBe(5);
  });

  it("should use reducer", () => {
    const count$ = atom(0);
    count$.set((prev) => prev + 1);
    expect(count$.get()).toBe(1);
  });

  it("should reset to initial", () => {
    const count$ = atom(() => 10);
    count$.set(99);
    count$.reset();
    expect(count$.get()).toBe(10);
  });

  it("should track dirty state", () => {
    const form$ = atom({ name: "" });
    expect(form$.dirty()).toBe(false);
    form$.set({ name: "John" });
    expect(form$.dirty()).toBe(true);
    form$.reset();
    expect(form$.dirty()).toBe(false);
  });
});
```

### Subscriptions

```typescript
it("should notify on change", () => {
  const count$ = atom(0);
  const values: number[] = [];
  const unsub = count$.on(() => values.push(count$.get()));

  count$.set(1);
  count$.set(2);
  expect(values).toEqual([1, 2]);

  unsub();
  count$.set(3);
  expect(values).toEqual([1, 2]); // No 3
});
```

### Async Atoms

```typescript
it("should handle async", async () => {
  const user$ = atom(Promise.resolve({ name: "John" }));
  const result = await user$.get();
  expect(result.name).toBe("John");
});

it("should refetch on reset", async () => {
  let callCount = 0;
  const data$ = atom(() => {
    callCount++;
    return Promise.resolve(callCount);
  });

  expect(await data$.get()).toBe(1);
  data$.reset();
  expect(await data$.get()).toBe(2);
});
```

## Testing Derived

```typescript
describe("derived", () => {
  it("should compute from source", async () => {
    const count$ = atom(5);
    const doubled$ = derived(({ read }) => read(count$) * 2);
    expect(await doubled$.get()).toBe(10);
  });

  it("should update on source change", async () => {
    const count$ = atom(5);
    const doubled$ = derived(({ read }) => read(count$) * 2);
    
    count$.set(10);
    expect(await doubled$.get()).toBe(20);
  });

  it("should combine atoms", async () => {
    const a$ = atom(1);
    const b$ = atom(2);
    const sum$ = derived(({ read }) => read(a$) + read(b$));
    
    expect(await sum$.get()).toBe(3);
    a$.set(10);
    expect(await sum$.get()).toBe(12);
  });

  it("should handle async sources", async () => {
    const user$ = atom(Promise.resolve({ name: "John" }));
    const greeting$ = derived(({ read }) => `Hello, ${read(user$).name}`);
    expect(await greeting$.get()).toBe("Hello, John");
  });

  it("should use fallback during loading", () => {
    const data$ = derived(({ read }) => read(atom(Promise.resolve(42))), {
      fallback: 0,
    });
    expect(data$.staleValue).toBe(0);
  });
});
```

## Testing Effects

```typescript
describe("effect", () => {
  it("should run on creation", () => {
    const log: number[] = [];
    const count$ = atom(5);
    effect(({ read }) => log.push(read(count$)));
    expect(log).toEqual([5]);
  });

  it("should run on change", () => {
    const log: number[] = [];
    const count$ = atom(0);
    effect(({ read }) => log.push(read(count$)));
    
    count$.set(1);
    count$.set(2);
    expect(log).toEqual([0, 1, 2]);
  });

  it("should cleanup", () => {
    const cleanups: number[] = [];
    const count$ = atom(0);

    effect(({ read, onCleanup }) => {
      const val = read(count$);
      onCleanup(() => cleanups.push(val));
    });

    count$.set(1);
    expect(cleanups).toEqual([0]);
    count$.set(2);
    expect(cleanups).toEqual([0, 1]);
  });

  it("should dispose", () => {
    const log: number[] = [];
    const count$ = atom(0);
    const e = effect(({ read }) => log.push(read(count$)));

    count$.set(1);
    expect(log).toEqual([0, 1]);

    e.dispose();
    count$.set(2);
    expect(log).toEqual([0, 1]); // No 2
  });
});
```

## Testing Stores (define)

### Mocking Services

```typescript
const authService = define((): AuthService => ({
  login: async () => ({ success: true, user: { id: "1", name: "Test" } }),
  logout: async () => {},
}));

const authStore = define(() => {
  const auth = authService();
  const user$ = atom<User | null>(null);

  return {
    ...readonly({ user$ }),
    login: async () => {
      const result = await auth.login();
      if (result.success) user$.set(result.user);
    },
    logout: () => user$.set(null),
  };
});

describe("authStore", () => {
  beforeEach(() => {
    authService.reset();
    authStore.reset();
  });

  it("should login with mock", async () => {
    authService.override(() => ({
      login: async () => ({ success: true, user: { id: "mock", name: "Mock" } }),
      logout: async () => {},
    }));

    const store = authStore();
    await store.login();
    expect(store.user$.get()).toEqual({ id: "mock", name: "Mock" });
  });

  it("should handle login failure", async () => {
    authService.override(() => ({
      login: async () => ({ success: false, error: "Invalid" }),
      logout: async () => {},
    }));

    const store = authStore();
    await store.login();
    expect(store.user$.get()).toBeNull();
  });
});
```

### Isolation

```typescript
describe("counterStore", () => {
  const counterStore = define(() => {
    const count$ = atom(0);
    return {
      ...readonly({ count$ }),
      increment: () => count$.set((p) => p + 1),
    };
  });

  beforeEach(() => counterStore.reset());

  it("test 1", () => {
    const store = counterStore();
    store.increment();
    expect(store.count$.get()).toBe(1);
  });

  it("test 2 (isolated)", () => {
    const store = counterStore();
    expect(store.count$.get()).toBe(0); // Fresh
  });
});
```

## Testing Pools

```typescript
describe("userPool", () => {
  const userPool = pool(
    (id: string) => ({ id, name: `User ${id}`, posts: [] }),
    { gcTime: 60_000 }
  );

  afterEach(() => userPool.clear());

  it("should create entries", () => {
    expect(userPool.has("1")).toBe(false);
    userPool.get("1");
    expect(userPool.has("1")).toBe(true);
  });

  it("should update entries", () => {
    userPool.get("1");
    userPool.set("1", (p) => ({ ...p, name: "Updated" }));
    expect(userPool.get("1").name).toBe("Updated");
  });

  it("should remove entries", () => {
    userPool.get("1");
    userPool.remove("1");
    expect(userPool.has("1")).toBe(false);
  });

  it("should work with derived", async () => {
    userPool.set("1", { id: "1", name: "John", posts: [] });

    const userName$ = derived(({ read, from }) => {
      const user$ = from(userPool, "1");
      return read(user$).name;
    });

    expect(await userName$.get()).toBe("John");
  });
});
```

## Testing Hooks

```typescript
describe("onCreateHook", () => {
  beforeEach(() => {
    onCreateHook.reset();
    onErrorHook.reset();
  });

  afterEach(() => {
    onCreateHook.reset();
    onErrorHook.reset();
  });

  it("should track atoms", () => {
    const created: string[] = [];
    onCreateHook.override((prev) => (info) => {
      prev?.(info);
      if (info.key) created.push(info.key);
    });

    atom(0, { meta: { key: "test.a" } });
    atom(0, { meta: { key: "test.b" } });

    expect(created).toContain("test.a");
    expect(created).toContain("test.b");
  });
});

describe("onErrorHook", () => {
  beforeEach(() => onErrorHook.reset());
  afterEach(() => onErrorHook.reset());

  it("should capture errors", async () => {
    const errors: unknown[] = [];
    onErrorHook.override((prev) => (info) => {
      prev?.(info);
      errors.push(info.error);
    });

    const buggy$ = derived(() => { throw new Error("test"); });

    try { await buggy$.get(); } catch {}
    expect(errors).toHaveLength(1);
  });
});
```

## Testing React

```tsx
import { render, screen, act } from "@testing-library/react";
import { Suspense } from "react";

describe("useSelector", () => {
  const count$ = atom(0, { meta: { key: "test.count" } });

  beforeEach(() => count$.reset());

  it("should read value", () => {
    function Counter() {
      const count = useSelector(count$);
      return <span data-testid="count">{count}</span>;
    }

    render(<Counter />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("should update on change", async () => {
    function Counter() {
      const count = useSelector(count$);
      return <span data-testid="count">{count}</span>;
    }

    render(<Counter />);
    await act(() => count$.set(5));
    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });
});

describe("rx", () => {
  it("should render inline", () => {
    const name$ = atom("John");

    render(
      <div data-testid="greeting">
        {rx(({ read }) => <>Hello, {read(name$)}</>)}
      </div>
    );

    expect(screen.getByTestId("greeting")).toHaveTextContent("Hello, John");
  });
});

describe("useAction", () => {
  it("should handle async", async () => {
    function Form() {
      const submit = useAction(async () => "done");
      return (
        <>
          <button onClick={() => submit()}>Submit</button>
          <span data-testid="status">{submit.status}</span>
        </>
      );
    }

    render(<Form />);
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });
});
```

## Best Practices

| Practice              | Description                         |
| --------------------- | ----------------------------------- |
| `reset()` in beforeEach | Fresh state per test              |
| `override()` for mocks | Swap implementations               |
| Test behaviors        | Not implementation details          |
| Test subscriptions    | Verify reactive updates             |
| Test cleanup          | Verify resources released           |
| Use act()             | For React state updates             |
| Wrap Suspense         | For async atoms in React            |
