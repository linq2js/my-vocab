# Store Template

Stores = stateful modules with atoms. Use `define()`.

## Template

```typescript
// features/[feature]/stores/[name].store.ts
import { atom, derived, effect, readonly, batch, define } from "atomirx";
import { someService } from "@/services/some/some.service";

// ==================== Types ====================

interface EntityState {
  id: string;
  name: string;
  status: "idle" | "loading" | "error";
}

// ==================== Store ====================

export const entityStore = define(() => {
  // ---------- Dependencies ----------
  const api = someService();

  // ---------- State ----------
  const entities$ = atom<Map<string, EntityState>>(new Map(), {
    meta: { key: "entity.entities" },
  });

  const currentId$ = atom<string | undefined>(undefined, {
    meta: { key: "entity.currentId" },
  });

  const filter$ = atom("", {
    meta: { key: "entity.filter" },
  });

  // ---------- Derived ----------
  const currentEntity$ = derived(
    ({ read, ready }) => {
      const id = ready(currentId$);
      return read(entities$).get(id) ?? null;
    },
    { meta: { key: "entity.current" }, fallback: null }
  );

  const filteredEntities$ = derived(
    ({ read }) => {
      const entities = read(entities$);
      const filter = read(filter$).toLowerCase();
      if (!filter) return [...entities.values()];
      return [...entities.values()].filter((e) =>
        e.name.toLowerCase().includes(filter)
      );
    },
    { meta: { key: "entity.filtered" } }
  );

  // ---------- Effects ----------
  effect(
    ({ read }) => {
      const current = read(currentEntity$);
      if (current) localStorage.setItem("lastEntity", current.id);
    },
    { meta: { key: "entity.persistLast" } }
  );

  // ---------- Actions ----------
  const setFilter = (value: string) => filter$.set(value);

  const selectEntity = (id: string | undefined) => currentId$.set(id);

  const fetchEntity = async (id: string) => {
    batch(() => {
      entities$.set((prev) => {
        const next = new Map(prev);
        const existing = next.get(id);
        next.set(id, { ...(existing ?? { id, name: "" }), status: "loading" });
        return next;
      });
    });

    try {
      const data = await api.fetch(id);
      entities$.set((prev) => {
        const next = new Map(prev);
        next.set(id, { ...data, status: "idle" });
        return next;
      });
      return data;
    } catch (error) {
      entities$.set((prev) => {
        const next = new Map(prev);
        const existing = next.get(id);
        if (existing) next.set(id, { ...existing, status: "error" });
        return next;
      });
      throw error;
    }
  };

  const updateEntity = async (id: string, updates: Partial<EntityState>) => {
    const prev = entities$.get().get(id);
    if (!prev) throw new Error(`Entity ${id} not found`);

    // Optimistic
    entities$.set((map) => {
      const next = new Map(map);
      next.set(id, { ...prev, ...updates });
      return next;
    });

    try {
      await api.update(id, updates);
    } catch (error) {
      // Rollback
      entities$.set((map) => {
        const next = new Map(map);
        next.set(id, prev);
        return next;
      });
      throw error;
    }
  };

  const reset = () => {
    batch(() => {
      entities$.reset();
      currentId$.reset();
      filter$.reset();
    });
  };

  // ---------- Return ----------
  return {
    // Read-only state
    ...readonly({ entities$, currentId$, filter$, currentEntity$, filteredEntities$ }),

    // Actions
    setFilter,
    selectEntity,
    fetchEntity,
    updateEntity,
    reset,
  };
});
```

## Structure

```
features/
└── [feature]/
    └── stores/
        ├── [name].store.ts    # Store definition
        └── index.ts           # Export
```

## Checklist

| Item                     | Required |
| ------------------------ | -------- |
| Use `define()`           | ✅       |
| `meta.key` on ALL atoms  | ✅       |
| `meta.key` on derived    | ✅       |
| `meta.key` on effects    | ✅       |
| `readonly()` for state   | ✅       |
| Actions return Promises  | When async |
| Use `batch()` multi-update | ✅     |
| Inject services via call | ✅       |
| Optimistic + rollback    | For UX   |

## Naming

| Type      | Pattern          | Example                |
| --------- | ---------------- | ---------------------- |
| Store     | `[name]Store`    | `entityStore`          |
| File      | `[name].store.ts`| `entity.store.ts`      |
| Atoms     | `[name]$`        | `entities$`, `filter$` |
| Derived   | `[computed]$`    | `currentEntity$`       |
| Actions   | verb-led         | `fetchEntity`, `reset` |

## Usage

```tsx
function EntityList() {
  const store = entityStore();

  const entities = useSelector(({ read }) => read(store.filteredEntities$));
  const stable = useStable({
    onSelect: (id: string) => store.selectEntity(id),
  });

  return (
    <ul>
      {entities.map((e) => (
        <li key={e.id} onClick={() => stable.onSelect(e.id)}>
          {e.name}
        </li>
      ))}
    </ul>
  );
}
```
