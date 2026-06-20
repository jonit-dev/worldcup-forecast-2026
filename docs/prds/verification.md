# PRD: Automation and Verification Evidence

## Scope

- Provide repeatable refresh and forecast generation commands.
- Capture current verification evidence for backend, frontend, and E2E checks.
- Document model limitations so forecast probabilities are not presented as statistically significant.

## Commands

```bash
./scripts/refresh_data.sh 2026-06-20
./scripts/run_forecast.sh 2026-06-20
make backend-test
cd frontend && npm test && npm run lint && npm run build && npm run test:e2e
```

## Evidence on 2026-06-20

- Backend: `make backend-test` collected 15 tests and all passed.
- Current tournament snapshot now validates 48 teams, 12 groups, and 72 group matches.
- Historical performance snapshot contains recent pre-cutoff international results from the Mart
  Jürisoo dataset when `FETCH_HISTORY=1` is enabled.
- Backend lint: `python -m ruff check .` passed in `backend`.
- Frontend unit tests: `npm test` ran 3 tests and all passed.
- Frontend lint: `npm run lint` passed.
- Frontend build: `npm run build` completed TypeScript and Vite production build.
- E2E smoke: `npm run test:e2e` passed the dashboard team-selection and match-selection flow.

## Acceptance Notes

- Source data is sample-only and stored with as-of metadata.
- Forecast math normalizes probabilities and rounds display output to six decimals or fewer.
- Current outputs are baseline estimates, not statistically significant claims.
