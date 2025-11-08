// Minimal shims for third-party modules and globals to silence TypeScript errors

declare module '@supabase/supabase-js' {
  // Export any to avoid requiring full types in this repo
  export function createClient(...args: any[]): any;
  export type SupabaseClient = any;
}

declare module 'pg' {
  export class Pool {
    constructor(opts?: any);
    query(sql: string, params?: any[]): Promise<any>;
    connect(): Promise<any>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(opts?: any);
    connect(): Promise<void>;
    query(sql: string, params?: any[]): Promise<any>;
    end(): Promise<void>;
  }
  export type PoolClient = any;
}

// Provide a loose process global for scripts that run in Node.js
declare var process: any;

// Allow importing .js modules without types
declare module '*.js';
