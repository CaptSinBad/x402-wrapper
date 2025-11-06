// Minimal type shim for @coinbase/x402 to satisfy TypeScript during build.
// The upstream package provides ESM .d.mts types which may not be resolvable
// under the current moduleResolution. This file declares a permissive any-based
// module so the app can build. Replace with precise types if desired.

declare module '@coinbase/x402' {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const _default: any;
  export default _default;

  export function createClient(opts?: any): any;
  export function verify(...args: any[]): Promise<any> | any;
  export function settle(...args: any[]): Promise<any> | any;
  export const client: any;
}
