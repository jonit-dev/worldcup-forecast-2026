.PHONY: backend-test backend-run frontend-install frontend-dev

backend-test:
	cd backend && pytest

backend-run:
	cd backend && flask --app wc_forecast.api.app run --debug

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev
