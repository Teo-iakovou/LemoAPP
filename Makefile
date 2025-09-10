.PHONY: dev backend frontend build-frontend start

# Run backend and frontend together
dev:
	( cd barber-backend && npm run dev ) & \
	( cd barber-frontend && npm run dev ) & \
	wait

# Run only backend in dev mode
backend:
	cd barber-backend && npm run dev

# Run only frontend in dev mode
frontend:
	cd barber-frontend && npm run dev

# Build frontend for production
build-frontend:
	cd barber-frontend && npm run build

# Start backend (production)
start:
	cd barber-backend && npm start

