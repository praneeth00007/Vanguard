# Vanguard's Blindside

A 1v1 zero-knowledge tactical game on Stellar's Soroban blockchain.

Players compete on a 10×10 grid where unit positions are cryptographically hidden. Only commitments are stored on-chain. All gameplay actions are proven using zero-knowledge proofs.

---

## 🎮 Game Overview

- **Grid:** 10×10 invisible battlefield
- **Players:** 1v1 competitive
- **Movement:** Manhattan distance ≤ 2 per turn
- **Combat:** Blind attacks with ZK hit/miss proofs
- **Victory:** First to eliminate opponent wins

**Key Feature:** Opponent units are completely invisible until eliminated.

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  Next.js + Web Worker (proof generation)
│   (Next.js)     │  TypeScript bindings
└────────┬────────┘
         │ proof + public inputs
         ▼
┌─────────────────────────────┐
│  Soroban Hub Contract       │  Game logic + state
│  (vanguard_hub)             │  Turn enforcement
└────────┬────────────────────┘
         │ verify(proof)
         ▼
┌─────────────────────────────┐
│  Soroban Verifier Contract  │  Wraps Noir UltraHonk
│  (vanguard_verifier)        │  ZK proof verification
└─────────────────────────────┘
         ▲
         │ circuits compiled to bytecode
         │
┌─────────────────────────────┐
│  Noir ZK Circuits           │  Movement + Attack proofs
│  (circuits/)                │  Poseidon commitments
└─────────────────────────────┘
```

---

## 📁 Project Structure

```
vanguard/
├── circuits/              # ✅ COMPLETE - Noir ZK circuits
│   ├── movement/         # Proves valid movement
│   ├── attack/           # Proves honest hit/miss
│   ├── deployment/       # Proves valid initial placement
│   ├── README.md         # Circuit documentation
│   ├── INTEGRATION.md    # Integration guide
│   ├── TESTING_EXAMPLES.md
│   └── test-circuits.sh
│
├── contracts/            # ⏳ TODO - Soroban smart contracts
│   ├── vanguard_hub/     # Game logic + state
│   └── vanguard_verifier/ # UltraHonk proof verification
│
├── frontend/             # ⏳ TODO - Next.js UI
│   ├── components/       # Game board, move selector
│   ├── workers/          # Proof generation (Web Worker)
│   └── lib/              # TypeScript bindings
│
├── bindings/             # ⏳ TODO - Generated TS bindings
│
└── scripts/              # ⏳ TODO - Build automation
    ├── setup.ts
    ├── build.ts
    ├── deploy.ts
    └── test.ts
```

---

## ✅ Completed: ZK Circuits

Three Noir v1.x circuits are complete and ready for integration:

### 1. Movement Circuit
Proves a unit moved from position A to position B without revealing coordinates.

**Constraints:**
- Verifies old and new position commitments
- Enforces Manhattan distance ≤ 2
- Validates grid bounds (0-9)

### 2. Attack Circuit
Proves whether an attack hit or missed without revealing defender's position.

**Constraints:**
- Verifies defender's commitment
- Enforces honest hit/miss reporting
- Prevents lying about results

### 3. Deployment Circuit
Proves initial unit placement is valid within bounds.

**See `circuits/README.md` for detailed documentation.**

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **ZK Circuits** | Noir v1.x (✅ complete) |
| **Proof System** | UltraHonk (SNARK) |
| **Hash Function** | Poseidon2 (3 inputs) |
| **Blockchain** | Stellar (Soroban Protocol 25) |
| **Smart Contracts** | Rust + Soroban SDK |
| **Frontend** | Next.js + TypeScript |
| **Proof Generation** | noir_js + Web Worker |
| **Build Tools** | Bun + stellar CLI + nargo |

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install Noir
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup

# Install Stellar CLI
cargo install --locked stellar-cli

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installations
nargo --version   # >= 0.38.0
stellar --version # >= 21.0.0
bun --version     # >= 1.0.0
```

### Build Circuits

```bash
cd circuits

# Build all circuits
./test-circuits.sh

# Or individually
cd movement && nargo build
cd ../attack && nargo build
cd ../deployment && nargo build
```

### Next Steps (TODO)

```bash
# Build contracts
cd contracts
stellar contract build

# Deploy to testnet
bun run deploy

# Generate TypeScript bindings
bun run bindings

# Run frontend
cd frontend
bun run dev
```

---

## 🎯 Game Flow

### Phase 1: Deployment
```
1. Player generates secret salt (32 bytes)
2. Player chooses position (x, y)
3. Player computes commitment = Poseidon(x, y, salt)
4. Player submits commitment to hub contract
```

### Phase 2: Movement
```
1. Player moves from (x1, y1) to (x2, y2)
2. Player generates ZK proof:
   - old_hash = Poseidon(x1, y1, salt)
   - new_hash = Poseidon(x2, y2, salt)
   - distance ≤ 2
3. Player submits proof + new_hash
4. Hub verifies proof and updates commitment
```

### Phase 3: Attack
```
1. Attacker chooses target (tx, ty)
2. Defender generates ZK proof:
   - commitment = Poseidon(x, y, salt)
   - hit = (x == tx && y == ty)
3. Defender submits proof + hit result
4. Hub verifies proof and updates HP
5. If HP == 0: Defender eliminated, game ends
```

---

## 🔒 Security Features

- ✅ **Position Privacy:** Coordinates never revealed (only commitments)
- ✅ **Movement Validation:** Cannot teleport or move out of bounds
- ✅ **Attack Honesty:** Cannot lie about hit/miss (ZK enforced)
- ✅ **Replay Protection:** Hub tracks used proofs
- ✅ **Turn Enforcement:** Strict alternating player order
- ✅ **No Shortcuts:** All proofs verified on-chain (no trust)

---

## 📖 Documentation

| File | Description |
|------|-------------|
| [circuits/README.md](circuits/README.md) | Circuit overview and usage |
| [circuits/INTEGRATION.md](circuits/INTEGRATION.md) | Soroban + frontend integration |
| [circuits/TESTING_EXAMPLES.md](circuits/TESTING_EXAMPLES.md) | Test scenarios |
| [circuits/QUICK_REFERENCE.md](circuits/QUICK_REFERENCE.md) | Fast lookup reference |
| [circuits/SUMMARY.md](circuits/SUMMARY.md) | Implementation summary |

---

## 🧪 Testing

### Circuit Tests (Local)
```bash
cd circuits/movement
nargo prove   # Generate proof
nargo verify  # Verify proof locally
```

### Contract Tests (TODO)
```bash
cd contracts
stellar contract test
```

### End-to-End Tests (TODO)
```bash
bun run test:e2e
```

---

## 🎨 Design Philosophy

**Inspired by [Stellar Game Studio](https://github.com/Junman140/Stellar-Game-Studio):**

- Use official tools (no custom crypto)
- Keep circuits minimal and auditable
- Leverage native Soroban features (Poseidon host function)
- Automate with Bun scripts
- Generate TypeScript bindings
- No overengineering

**We are NOT:**
- ❌ Building a protocol
- ❌ Reimplementing cryptography
- ❌ Creating a general-purpose ZK framework

**We ARE:**
- ✅ Building a playable ZK game
- ✅ Using proven tools (Noir + Soroban)
- ✅ Focusing on game mechanics
- ✅ Creating a reference implementation

---

## 📊 Project Status

| Component | Status |
|-----------|--------|
| Movement Circuit | ✅ Complete |
| Attack Circuit | ✅ Complete |
| Deployment Circuit | ✅ Complete |
| Circuit Documentation | ✅ Complete |
| Verifier Contract | ⏳ TODO |
| Hub Contract | ⏳ TODO |
| TypeScript Bindings | ⏳ TODO |
| Web Worker Prover | ⏳ TODO |
| Frontend UI | ⏳ TODO |
| E2E Tests | ⏳ TODO |

**Current Phase:** Circuits complete, ready for Soroban contract implementation

---

## 🤝 Contributing

This is a reference implementation for ZK gaming on Stellar.

### Contribution Areas
- Soroban contract implementation
- Frontend UI/UX improvements
- Additional game modes
- Performance optimizations
- Documentation improvements

---

## 📝 License

TBD

---

## 🔗 References

- [Noir Documentation](https://noir-lang.org/docs)
- [Noir Soroban Verifier](https://github.com/noir-lang/noir-stellar)
- [Stellar Game Studio](https://github.com/Junman140/Stellar-Game-Studio)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Protocol 25 Features](https://soroban.stellar.org/docs/protocol-25)

---

## 📧 Contact

For questions or discussions:
- Check documentation in `circuits/` directory
- Review integration guides
- Open an issue (coming soon)

---

**Built with Noir, Soroban, and zero-knowledge proofs.**

*Keep positions hidden. Prove actions honestly. Win strategically.*
