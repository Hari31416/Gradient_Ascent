PNPM = pnpm

.PHONY: install dev build export preview deploy clean help lint

help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make dev      - Start development server"
	@echo "  make build    - Build production application"
	@echo "  make export   - Export to static HTML (GitHub Pages format)"
	@echo "  make preview  - Build and serve production version locally"
	@echo "  make deploy   - Push to main to trigger GitHub Pages deployment"
	@echo "  make lint     - Run linter"
	@echo "  make clean    - Remove build artifacts"

install:
	$(PNPM) install

dev:
	$(PNPM) dev

build:
	$(PNPM) build

export:
	EXPORT=1 UNOPTIMIZED=1 $(PNPM) build

preview: build
	$(PNPM) serve

deploy:
	git push origin main

lint:
	$(PNPM) lint

clean:
	rm -rf .next out
