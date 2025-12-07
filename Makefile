run:
	@echo "Starting Vite dev server with LAN-friendly settings…"
	VITE_API_BASE_URL=http://192.168.1.101:8000 npm run dev -- --host 0.0.0.0
