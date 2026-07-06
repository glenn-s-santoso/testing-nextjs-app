# Manual Test: Direct App Access Must Not Consume Mythos Credits

Goal: prove that using the calculator **directly** (not launched through Mythos) never touches the Mythos wallet — only a valid, Mythos-issued `launch_token` (`lt`) triggers `verifyLaunchToken`/`reportUsage`.

Why this holds, by code (read before testing, not assumed):
- `pages/api/calculate.ts:29` — returns `400 { error: 'Missing lt, operation, a, or b' }` immediately if `lt` is absent, **before** `verifyLaunchToken`/`reportUsage` are ever called.
- `pages/calculator.tsx:62` — if there's no `?lt=` in the URL, the page renders `"Missing lt query param."` and never fires the `verify-session` fetch at all.

So "direct access" has no code path that reaches Mythos. These tests are there to prove that in practice, not just in theory.

## Prereqs

- Backend running on `http://localhost:5001`, calculator on `http://localhost:3001`, local Supabase stack up.
- Test user: `carol@example.com` / `Test@1234`.
- Get a token and check the wallet balance first — write down the number, you'll compare against it after every test below.

```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carol@example.com","password":"Test@1234"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

curl -s http://localhost:5001/api/wallet -H "Authorization: Bearer $TOKEN"
```

Note the `total` value as `BEFORE`.

## Test 1 — Baseline: real Mythos flow DOES consume (control case)

Confirms the wallet check itself is working before you trust a "no change" result later.

```bash
LISTING_ID=57ed6495-1542-41c3-8308-1f66e43d18b0

LT=$(curl -s -X POST "http://localhost:5001/api/apps/$LISTING_ID/launch" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['launch_token'])")

curl -s "http://localhost:3001/api/verify-session?lt=$LT"
curl -s -X POST http://localhost:3001/api/calculate -H "Content-Type: application/json" \
  -d "{\"lt\":\"$LT\",\"operation\":\"add\",\"a\":2,\"b\":3}"

curl -s http://localhost:5001/api/wallet -H "Authorization: Bearer $TOKEN"
```

**Expected:** `total` drops by 1 vs `BEFORE`. If it doesn't, something's broken upstream — fix that before trusting Test 2/3 below.

## Test 2 — Browser: open the calculator with no `lt` at all

Open `http://localhost:3001/calculator` directly in a browser — no query string, no launch flow, no harness.

**Expected:** page shows exactly `Missing lt query param.` — no calculator UI, no network request to `/api/verify-session` or `/api/calculate` (check the Network tab: zero requests to either).

```bash
curl -s http://localhost:5001/api/wallet -H "Authorization: Bearer $TOKEN"
```

**Expected:** `total` unchanged from whatever it was right before this test (should still be `BEFORE - 1` from Test 1, not lower).

## Test 3 — API: call `/api/calculate` directly with no `lt` (simulates hitting your own SaaS's calculation logic without going through Mythos)

```bash
curl -s -i -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"operation":"add","a":2,"b":3}'
```

**Expected:** `400`, body `{"success":false,"error":"Missing lt, operation, a, or b"}`. No result returned, no credits charged.

```bash
curl -s http://localhost:5001/api/wallet -H "Authorization: Bearer $TOKEN"
```

**Expected:** `total` unchanged again.

## Test 4 — API: garbage/forged `lt` (simulates someone trying to fake a session)

```bash
curl -s -i -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"lt":"not.a.real.token","operation":"add","a":2,"b":3}'
```

**Expected:** `401`, a JWT-verification error message (not a 200, not a charge). `verifyLaunchToken` throws before `reportUsage` is ever reached.

```bash
curl -s http://localhost:5001/api/wallet -H "Authorization: Bearer $TOKEN"
```

**Expected:** `total` unchanged again.

## Test 5 — Reused (already-consumed) `lt` on `/api/calculate`

Take the `$LT` from Test 1 (already consumed by `verify-session`) and try `/api/calculate` with it directly, skipping the harness/calculator page entirely.

```bash
curl -s -i -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d "{\"lt\":\"$LT\",\"operation\":\"add\",\"a\":1,\"b\":1}"
```

**Expected:** this one is worth noting either way — `/api/calculate` calls `verifyLaunchToken` (non-consuming re-verify), not `requireLaunchToken`, so a JWT that's already been consumed by `verify-session` can still pass verification here and get metered again, as long as the JWT itself hasn't expired (5 min TTL) and the wallet has funds. This is expected per the mockup's design (`verify-session` consumes once for session establishment; `calculate` re-verifies + meters per operation) — **not** a "direct access" bypass, since it still requires a real, validly-signed, non-expired Mythos `lt`. Confirm the wallet **does** drop by 1 here, and note this is different from Tests 2–4 (which have no `lt` or an invalid one at all).

## Summary table to fill in

| Test | Expected wallet delta | Actual wallet delta | Pass? |
|---|---|---|---|
| 1. Real flow (control) | −1 | | |
| 2. Browser, no `lt` | 0 | | |
| 3. API, no `lt` | 0 | | |
| 4. API, garbage `lt` | 0 | | |
| 5. API, reused valid `lt` | −1 (expected — still a real Mythos token) | | |

If 2/3/4 show any wallet movement, that's a real bug — stop and report it, don't just note it here.
