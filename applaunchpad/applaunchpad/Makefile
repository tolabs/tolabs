IMG ?= docker-registry.local.892048.xyz/tolabs/applaunchpad-frontend:latest

.PHONY: all
all: build

.PHONY: build
build: ## Build desktop-frontend binary.
	pnpm run build

.PHONY: run
run: ## Run a dev service from host.
	pnpm run start

.PHONY: docker-build
docker-build:
	docker build -t $(IMG) .
