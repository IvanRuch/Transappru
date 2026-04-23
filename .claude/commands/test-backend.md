---
description: Run payment-service pytest suite inside Docker and analyze results
argument-hint: [empty | tests/test_foo.py | tests/test_foo.py::test_bar]
---

Run payment-service test suite inside Docker and analyze results.

Argument: `$ARGUMENTS` — optional test file or pattern (e.g. `tests/test_payment.py` or `tests/test_payment.py::test_foo`)
If empty — run the full suite.

## Prerequisite

Docker must be running. If `docker compose ps` shows no services, warn and stop.

## Command

```bash
cd payment-service && docker compose run --rm payment-service pytest -x --tb=short $ARGUMENTS 2>&1 | tail -80
```

Keep output to the last 80 lines — `-x` stops at first failure, so the failure will be at the tail.

## After execution

1. Report totals: **passed / failed / skipped / errors** (parse pytest summary line).
2. On failure — for each failed test output:
   - test id (`file::test_name`)
   - file:line
   - one-line root cause (assertion / exception)
3. If Docker failed to start — run `docker compose ps` and diagnose.
4. If ALL tests pass and working tree is dirty — suggest committing.

## Output

```
## Tests: <scope or "all">

**Result:** <N passed, M failed, K skipped>

<on failure, for each: test id | file:line | root cause>

<if all green and dirty tree: "Suggest: commit changes">
```
