declare module '@coinbase/x402' {
  // Minimal typings for the parts we use. This file intentionally uses `any`
  // for runtime flexibility; replace with stricter typings if desired.

  export function createClient(opts: { apiKeyId: string; apiKeySecret: string }): any;

  const _default: {
    createClient?: (opts: { apiKeyId: string; apiKeySecret: string }) => any;
    verify?: (req: any) => Promise<any>;
    settle?: (req: any) => Promise<any>;
  } & ((opts: any) => any);

  export default _default;
}

declare module 'x402' {
  // sometimes the package exposes x402 namespace; keep flexible
  const anything: any;
  export default anything;
}
