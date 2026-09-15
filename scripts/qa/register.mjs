// Registers the extensionless-.ts resolver so `node --test` can import src/lib modules
// as they are written (Next/TypeScript style relative imports without extensions).
// Usage: node --import ./scripts/qa/register.mjs --test scripts/qa/<file>.test.ts
import { register } from 'node:module'
register('./resolve-ts-hook.mjs', import.meta.url)
