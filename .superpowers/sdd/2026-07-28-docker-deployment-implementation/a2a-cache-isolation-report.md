# A2A cache isolation report

## Root cause

`src/a2a-http.js` maps the incoming A2A `message.contextId` into `request.context.contextId`, but `src/orchestrator.js` did not include `context.contextId` in `cacheKey()`.

That meant two otherwise identical lore requests with different A2A conversation contexts could share a cached response for the cache TTL window.

## Failing focused test

Command:

```powershell
npm.cmd test -- --test-name-pattern "isolates lore cache entries by A2A contextId" test/orchestrator.test.js
```

Expected RED output before production changes:

```text
✖ isolates lore cache entries by A2A contextId (1.573ms)
ℹ tests 1
ℹ pass 0
ℹ fail 1

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

1 !== 2
```

The failure proves the second request reused the first request's cached response instead of invoking the lore agent for `ctx-b`.

## Fix

Production change:

```js
context.contextId ?? '',
```

was added to the serialized cache key in `src/orchestrator.js`.

No TTL, cache size, API contract, or routing behavior was changed.

## Focused test after fix

Command:

```powershell
npm.cmd test -- --test-name-pattern "isolates lore cache entries by A2A contextId" test/orchestrator.test.js
```

Output:

```text
✔ isolates lore cache entries by A2A contextId (2.3994ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

## Full test result

Command:

```powershell
npm.cmd test
```

Output:

```text
ℹ tests 59
ℹ suites 0
ℹ pass 59
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 766.0638
```

## Concerns

- No functional concerns found.
- `git status` emitted warnings about inability to access `C:\Users\희정\.config\git\ignore`, but repository operations still completed.
