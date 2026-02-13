.PHONY: build test clean deploy

# Build the contract
build:
	stellar contract build

# Run tests
test:
	cargo test

# Clean build artifacts
clean:
	cargo clean

# Deploy to testnet
deploy:
	@echo "Deploying vanguard_verifier to testnet..."
	@stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/vanguard_verifier.wasm \
		--source alice \
		--network testnet \
		--alias vanguard_verifier
	@echo "Deployed! Contract ID:"
	@stellar contract id vanguard_verifier --network testnet

# Deploy to local network
deploy-local:
	@echo "Deploying vanguard_verifier to local network..."
	@stellar contract deploy \
		--wasm target/wasm32-unknown-unknown/release/vanguard_verifier.wasm \
		--source alice \
		--network local \
		--alias vanguard_verifier

# Optimize wasm
optimize:
	@echo "Optimizing wasm..."
	@wasm-opt -Oz target/wasm32-unknown-unknown/release/vanguard_verifier.wasm \
		-o target/wasm32-unknown-unknown/release/vanguard_verifier_opt.wasm
	@ls -lh target/wasm32-unknown-unknown/release/vanguard_verifier*.wasm

# Generate bindings
bindings:
	@echo "Generating TypeScript bindings..."
	@stellar contract bindings typescript \
		--wasm target/wasm32-unknown-unknown/release/vanguard_verifier.wasm \
		--output-dir ../../bindings/vanguard_verifier \
		--overwrite

# Full build and test
all: build test
