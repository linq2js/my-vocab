# Service Template

Services = stateless modules. NO atoms. Pure functions only.

## Template

```typescript
// services/[name]/[name].service.ts
import { define } from "atomirx";

// ==================== Types ====================

export interface EntityDTO {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateEntityInput {
  name: string;
}

export interface UpdateEntityInput {
  name?: string;
}

export interface EntityService {
  fetch: (id: string) => Promise<EntityDTO>;
  list: (params?: { limit?: number; offset?: number }) => Promise<EntityDTO[]>;
  create: (input: CreateEntityInput) => Promise<EntityDTO>;
  update: (id: string, input: UpdateEntityInput) => Promise<EntityDTO>;
  delete: (id: string) => Promise<void>;
}

// ==================== Service ====================

export const entityService = define((): EntityService => {
  const BASE_URL = "/api/entities";

  const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  };

  return {
    fetch: async (id) => {
      const res = await fetch(`${BASE_URL}/${id}`);
      return handleResponse<EntityDTO>(res);
    },

    list: async (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.offset) searchParams.set("offset", String(params.offset));

      const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL;
      const res = await fetch(url);
      return handleResponse<EntityDTO[]>(res);
    },

    create: async (input) => {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return handleResponse<EntityDTO>(res);
    },

    update: async (id, input) => {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return handleResponse<EntityDTO>(res);
    },

    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete ${id}`);
    },
  };
});
```

## Structure

```
services/
└── [name]/
    ├── [name].service.ts  # Service definition
    └── index.ts           # Export
```

## Checklist

| Item                  | Required |
| --------------------- | -------- |
| Use `define()`        | ✅       |
| Return type interface | ✅       |
| Pure functions only   | ✅       |
| NO atoms              | ✅       |
| NO side effects       | ✅       |
| Error handling        | ✅       |

## Naming

| Type    | Pattern              | Example              |
| ------- | -------------------- | -------------------- |
| Service | `[name]Service`      | `entityService`      |
| File    | `[name].service.ts`  | `entity.service.ts`  |
| Methods | verb-led             | `fetch`, `create`    |

## Platform Override

```typescript
// services/storage/storage.service.ts
export interface StorageService {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export const storageService = define((): StorageService => {
  throw new Error("StorageService not implemented. Override for platform.");
});

// services/storage/storage.web.ts
export const webStorageService = define((): StorageService => ({
  get: async (key) => localStorage.getItem(key),
  set: async (key, value) => localStorage.setItem(key, value),
  remove: async (key) => localStorage.removeItem(key),
}));

// services/storage/storage.native.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const nativeStorageService = define((): StorageService => ({
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
}));

// app/init.ts
import { storageService } from "@/services/storage/storage.service";
import { webStorageService } from "@/services/storage/storage.web";

storageService.override(webStorageService);
```

## Usage in Store

```typescript
import { entityService } from "@/services/entity/entity.service";

export const entityStore = define(() => {
  const api = entityService(); // Inject via invocation

  const entities$ = atom<EntityDTO[]>([], { meta: { key: "entity.list" } });

  const loadEntities = async () => {
    const data = await api.list();
    entities$.set(data);
  };

  return { ...readonly({ entities$ }), loadEntities };
});
```
