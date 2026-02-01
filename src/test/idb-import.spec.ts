import { describe, it, expect } from 'vitest';
import { openDB, deleteDB, wrap, unwrap } from 'idb';
import type { DBSchema } from 'idb';

describe('idb library', () => {
  it('should export openDB function', () => {
    expect(typeof openDB).toBe('function');
  });

  it('should export deleteDB function', () => {
    expect(typeof deleteDB).toBe('function');
  });

  it('should export wrap function', () => {
    expect(typeof wrap).toBe('function');
  });

  it('should export unwrap function', () => {
    expect(typeof unwrap).toBe('function');
  });

  it('should allow DBSchema type definition', () => {
    // Verify TypeScript types work correctly
    interface TestSchema extends DBSchema {
      'test-store': {
        key: string;
        value: { id: string; name: string };
      };
    }

    // This is a type-level test - if it compiles, types are working
    const schemaCheck: TestSchema['test-store']['key'] = 'test-key';
    expect(schemaCheck).toBe('test-key');
  });
});
