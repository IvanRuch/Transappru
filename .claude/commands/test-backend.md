Run payment-service test suite inside Docker and analyze results.

Argument: $ARGUMENTS (optional — test file or pattern, e.g. `tests/test_payment.py`)

## Command

```bash
cd /Volumes/HP_P800/grizodubov/IdeaProjects/TransApp_upd/payment-service && \
docker compose run --rm payment-service pytest -x --tb=short $ARGUMENTS
```

If no argument — run all tests.

## After execution

1. Report total: passed / failed / skipped / errors
2. For failures: show test name, file:line, root cause
3. If Docker fails to start — run `docker compose ps` and diagnose
4. If all tests pass — suggest committing if there are uncommitted changes
