# Vanguard's Blindside - Implementation Checklist

This checklist tracks the complete implementation progress across all components.

---

## ✅ Phase 1: ZK Circuits (COMPLETE)

### Movement Circuit
- [x] Circuit logic implementation
- [x] Poseidon2 hash integration
- [x] Bounds checking (0-9 grid)
- [x] Manhattan distance constraint (≤2)
- [x] Commitment verification
- [x] Nargo.toml configuration
- [x] Example Prover.toml
- [x] Documentation

**File:** `circuits/movement/src/main.nr` (55 lines)

### Attack Circuit
- [x] Circuit logic implementation
- [x] Poseidon2 hash integration
- [x] Bounds checking
- [x] Hit/miss honesty constraint
- [x] Commitment verification
- [x] Nargo.toml configuration
- [x] Example Prover.toml
- [x] Documentation

**File:** `circuits/attack/src/main.nr` (36 lines)

### Deployment Circuit
- [x] Circuit logic implementation
- [x] Poseidon2 hash integration
- [x] Bounds checking
- [x] Commitment verification
- [x] Nargo.toml configuration
- [x] Example Prover.toml
- [x] Documentation

**File:** `circuits/deployment/src/main.nr` (25 lines)

### Circuit Documentation
- [x] README.md - Main circuit documentation
- [x] INTEGRATION.md - Integration guide
- [x] TESTING_EXAMPLES.md - Test scenarios
- [x] QUICK_REFERENCE.md - Fast lookup
- [x] SUMMARY.md - Implementation summary
- [x] CIRCUIT_DIAGRAMS.md - Visual diagrams
- [x] test-circuits.sh - Build automation

---

## ⏳ Phase 2: Soroban Contracts (TODO)

### Verifier Contract
- [ ] Import official Noir Soroban verifier template
- [ ] Wrap UltraHonk verification
- [ ] Implement `verify(proof, public_inputs)` function
- [ ] Add error handling
- [ ] Write unit tests
- [ ] Deploy to testnet
- [ ] Verify deployment
- [ ] Document contract interface

**Target:** `contracts/vanguard_verifier/src/lib.rs`

### Hub Contract
- [ ] Define game state struct
  - [ ] Player addresses
  - [ ] Position commitments
  - [ ] HP tracking
  - [ ] Turn counter
  - [ ] Game status
- [ ] Implement deployment phase
  - [ ] `deploy_unit()` function
  - [ ] Commitment storage
  - [ ] Both players must deploy
- [ ] Implement movement phase
  - [ ] `move_unit()` function
  - [ ] Turn validation
  - [ ] Verifier contract call
  - [ ] Commitment update
  - [ ] Replay protection
- [ ] Implement attack phase
  - [ ] `attack()` function
  - [ ] Target selection
  - [ ] Defender proof verification
  - [ ] HP update
  - [ ] Win condition check
- [ ] Add helper functions
  - [ ] Poseidon hash wrapper
  - [ ] Game state getters
  - [ ] Turn validation
- [ ] Write comprehensive tests
- [ ] Deploy to testnet
- [ ] Verify integration with verifier
- [ ] Document contract interface

**Target:** `contracts/vanguard_hub/src/lib.rs`

### Contract Testing
- [ ] Unit tests for verifier
- [ ] Unit tests for hub
- [ ] Integration tests (hub + verifier)
- [ ] Invalid proof rejection tests
- [ ] Replay attack prevention tests
- [ ] Turn order enforcement tests
- [ ] Win condition tests

---

## ⏳ Phase 3: TypeScript Bindings (TODO)

### Generation
- [ ] Configure stellar CLI binding generation
- [ ] Generate bindings for verifier contract
- [ ] Generate bindings for hub contract
- [ ] Export types and functions
- [ ] Add JSDoc comments
- [ ] Package for npm distribution

**Target:** `bindings/`

### Testing
- [ ] Test binding imports
- [ ] Verify type safety
- [ ] Test contract calls
- [ ] Document usage examples

---

## ⏳ Phase 4: Frontend (TODO)

### Web Worker: Proof Generation
- [ ] Create `workers/prover.worker.ts`
- [ ] Import noir_js and backend
- [ ] Load circuit artifacts
- [ ] Implement proof generation for movement
- [ ] Implement proof generation for attack
- [ ] Implement proof generation for deployment
- [ ] Add error handling
- [ ] Add progress reporting
- [ ] Test with example inputs

**Target:** `frontend/workers/prover.worker.ts`

### Poseidon Hash Client
- [ ] Find compatible Poseidon library
- [ ] Verify compatibility with Stellar native function
- [ ] Implement hash wrapper
- [ ] Test hash consistency
- [ ] Document usage

**Target:** `frontend/lib/poseidon.ts`

### Game State Management
- [ ] Create game state store (Zustand/Redux)
- [ ] Track player position (local)
- [ ] Track opponent commitment (from chain)
- [ ] Track salt (local, persistent)
- [ ] Track HP (from chain)
- [ ] Track turn counter (from chain)
- [ ] Sync with blockchain

**Target:** `frontend/lib/game-state.ts`

### UI Components
- [ ] Game board component (10x10 grid)
- [ ] Unit placement component
- [ ] Movement selector component
- [ ] Attack target selector component
- [ ] HP display component
- [ ] Turn indicator component
- [ ] Proof generation status component
- [ ] Transaction status component
- [ ] Win/lose screen component

**Target:** `frontend/components/`

### Wallet Integration
- [ ] Connect Freighter wallet
- [ ] Display connected address
- [ ] Sign transactions
- [ ] Handle network switching
- [ ] Error handling

**Target:** `frontend/lib/wallet.ts`

### Game Flow
- [ ] Deployment phase UI
- [ ] Movement phase UI
- [ ] Attack phase UI
- [ ] Proof coordination
- [ ] Transaction submission
- [ ] Event listening
- [ ] State synchronization

**Target:** `frontend/app/game/page.tsx`

---

## ⏳ Phase 5: Build Automation (TODO)

### Scripts
- [ ] `bun run setup` - Initial setup
  - Install dependencies
  - Install Noir
  - Install Stellar CLI
  - Generate keys
- [ ] `bun run build` - Build all components
  - Build circuits
  - Build contracts
  - Build frontend
- [ ] `bun run deploy` - Deploy to testnet
  - Deploy verifier contract
  - Deploy hub contract
  - Save contract IDs
- [ ] `bun run bindings` - Generate TypeScript bindings
  - Generate from deployed contracts
  - Copy to frontend
- [ ] `bun run dev` - Development mode
  - Run frontend dev server
  - Watch for changes
- [ ] `bun run test` - Run all tests
  - Circuit tests
  - Contract tests
  - Frontend tests

**Target:** `scripts/`

---

## ⏳ Phase 6: End-to-End Testing (TODO)

### Test Scenarios
- [ ] Complete game: P1 wins
- [ ] Complete game: P2 wins
- [ ] Invalid move rejection
- [ ] Invalid attack rejection
- [ ] Replay attack prevention
- [ ] Turn order enforcement
- [ ] Out-of-bounds rejection
- [ ] Distance constraint enforcement

### Integration Tests
- [ ] Deploy both players
- [ ] Execute movement
- [ ] Execute attack (hit)
- [ ] Execute attack (miss)
- [ ] Handle game completion
- [ ] Verify state consistency

**Target:** `tests/e2e/`

---

## ⏳ Phase 7: Documentation (TODO)

### User Documentation
- [ ] How to play guide
- [ ] Wallet setup guide
- [ ] Troubleshooting guide
- [ ] FAQ

### Developer Documentation
- [ ] Architecture overview
- [ ] Contract API reference
- [ ] Frontend API reference
- [ ] Deployment guide
- [ ] Contributing guide

---

## Current Status Summary

| Phase | Component | Status | Progress |
|-------|-----------|--------|----------|
| 1 | Movement Circuit | ✅ Complete | 100% |
| 1 | Attack Circuit | ✅ Complete | 100% |
| 1 | Deployment Circuit | ✅ Complete | 100% |
| 1 | Circuit Documentation | ✅ Complete | 100% |
| 2 | Verifier Contract | ⏳ TODO | 0% |
| 2 | Hub Contract | ⏳ TODO | 0% |
| 3 | TypeScript Bindings | ⏳ TODO | 0% |
| 4 | Web Worker | ⏳ TODO | 0% |
| 4 | Frontend UI | ⏳ TODO | 0% |
| 5 | Build Scripts | ⏳ TODO | 0% |
| 6 | E2E Tests | ⏳ TODO | 0% |
| 7 | User Docs | ⏳ TODO | 0% |

**Overall Progress:** Phase 1 complete (circuits), ready for Phase 2 (contracts)

---

## Next Immediate Steps

1. **Implement Verifier Contract**
   - Clone Noir Soroban verifier template
   - Adapt for UltraHonk backend
   - Deploy to testnet
   - Verify it can validate proofs

2. **Implement Hub Contract**
   - Define game state
   - Implement deployment logic
   - Implement movement logic
   - Implement attack logic
   - Call verifier contract

3. **Test Contract Integration**
   - Generate proofs locally
   - Submit to hub contract
   - Verify on-chain verification works
   - Test full game flow

---

## Dependencies

### Already Installed
- [x] Git

### Need to Install
- [ ] Noir (nargo) >= 0.38.0
- [ ] Stellar CLI >= 21.0.0
- [ ] Bun >= 1.0.0
- [ ] Node.js >= 18
- [ ] Rust (for contract compilation)

### Installation Commands
```bash
# Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Stellar CLI
cargo install --locked stellar-cli

# Bun
curl -fsSL https://bun.sh/install | bash

# Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

---

## Success Criteria

### Phase 1: Circuits ✅
- [x] All circuits compile without errors
- [x] Constraints correctly enforce game rules
- [x] Documentation is comprehensive

### Phase 2: Contracts
- [ ] Verifier correctly validates UltraHonk proofs
- [ ] Hub correctly manages game state
- [ ] Invalid proofs are rejected
- [ ] Replay attacks are prevented
- [ ] Turn order is enforced

### Phase 3: Integration
- [ ] Proof generation works in browser
- [ ] Proofs verify on-chain
- [ ] Frontend correctly displays game state
- [ ] Transactions succeed

### Phase 4: E2E
- [ ] Complete game playable from start to finish
- [ ] All edge cases handled
- [ ] Performance acceptable (<5s proof generation)

---

## Risk Mitigation

### Risk: Poseidon hash inconsistency
**Mitigation:** Test hash computation across all three environments (Noir, Soroban, Frontend) with same inputs

### Risk: Proof generation too slow
**Mitigation:** Use Web Worker, consider proof caching, optimize circuit size

### Risk: On-chain verification too expensive
**Mitigation:** UltraHonk is designed for efficiency; monitor gas costs

### Risk: Replay attacks
**Mitigation:** Hub contract tracks used proof hashes

### Risk: Turn order bypass
**Mitigation:** Strict turn counter and player validation in hub

---

**Last Updated:** 2026-02-13  
**Current Phase:** Circuits Complete ✅  
**Next Phase:** Soroban Contracts 🚧
