# Vanguard Hub Contract Makefile
# Following Stellar Game Studio pattern

.PHONY: all build test clean check fmt bindings wasm optimize

# Directory structure
CONTRACT_DIR := $(shell pwd)
SRC_DIR := $(CONTRACT_DIR)/src
TARGET_DIR := $(CONTRACT_DIR)/target
WASM_DIR := $(CONTRACT_DIR)/target/wasm32-unknown-unknown/release

# Binary name
CONTRACT_NAME := vanguard_hub

# Rust toolchain
RUSTUP_DEFAULT_TOOLCHAIN := stable
CARGO_TARGET_WASM32 := wasm32-unknown-unknown

# Soroban CLI
SOROBAN_CLI := soroban

# Soroban config
NETWORK := standalone

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

all: build

## check: Check code without building
check:
	@echo "$(BLUE)[*]$(NC) Checking $(CONTRACT_NAME)..."
	cargo check --target $(CARGO_TARGET_WASM32)

## build: Build contract to WASM
build:
	@echo "$(BLUE)[*]$(NC) Building $(CONTRACT_NAME)..."
	cargo build --release --target $(CARGO_TARGET_WASM32)
	@echo "$(GREEN)[✓]$(NC) Built: $(WASM_DIR)/$(CONTRACT_NAME).wasm"

## test: Run unit tests
test:
	@echo "$(BLUE)[*]$(NC) Running tests for $(CONTRACT_NAME)..."
	cargo test --lib
	@echo "$(GREEN)[✓]$(NC) Tests passed"

## check-fmt: Check code formatting
check-fmt:
	@echo "$(BLUE)[*]$(NC) Checking code formatting..."
	cargo fmt -- --check

## fmt: Format code
fmt:
	@echo "$(BLUE)[*]$(NC) Formatting code..."
	cargo fmt

## clippy: Run Clippy linter
clippy:
	@echo "$(BLUE)[*]$(NC) Running Clippy..."
	cargo clippy --target $(CARGO_TARGET_WASM32) -- -D warnings

## optimize: Optimize WASM with soroban optimize
optimize: build
	@echo "$(BLUE)[*]$(NC) Optimizing WASM..."
	$(SOROBAN_CLI) contract optimize --wasm $(WASM_DIR)/$(CONTRACT_NAME).wasm
	@echo "$(GREEN)[✓]$(NC) Optimized: $(WASM_DIR)/$(CONTRACT_NAME).optimized.wasm"

## bindings: Generate TypeScript bindings
bindings:
	@echo "$(BLUE)[*]$(NC) Generating TypeScript bindings..."
	$(SOROBAN_CLI) contract bindings typescript --wasm $(WASM_DIR)/$(CONTRACT_NAME).wasm --output-dir ../../../bindings
	@echo "$(GREEN)[✓]$(NC) Generated TypeScript bindings in bindings/"

## clean: Clean build artifacts
clean:
	@echo "$(BLUE)[*]$(NC) Cleaning build artifacts..."
	cargo clean
	@echo "$(GREEN)[✓]$(NC) Cleaned"

## size: Show WASM file size
size: build
	@echo "$(BLUE)[*]$(NC) WASM file size:"
	@ls -lh $(WASM_DIR)/$(CONTRACT_NAME).wasm

## deploy: Deploy contract to network (requires proper setup)
deploy: optimize
	@echo "$(BLUE)[*]$(NC) Deploying $(CONTRACT_NAME) to $(NETWORK)..."
	$(SOROBAN_CLI) contract deploy --wasm $(WASM_DIR)/$(CONTRACT_NAME).optimized.wasm --network $(NETWORK)

## help: Show this help message
help:
	@echo "$(BLUE)Vanguard Hub Contract - Makefile$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'
