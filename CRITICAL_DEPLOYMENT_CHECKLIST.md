# 🚨 CRITICAL DEPLOYMENT CHECKLIST - Vanguard's Blindside

**Status**: 🔴 DEMO BLOCKED - Verifier Architecture Must Be Fixed
**Date**: February 13, 2024

---

## ⚠️ BEFORE YOU PROCEED: READ THIS

### The Critical Issue

**Problem**: The current verifier contract design has a fundamental flaw:
- **One verifier contract** that embeds a single verification key (VK)
- **Three different circuits** (movement, attack, scan) each require different VKs
- **Current state**: `vk.bin` is 0 bytes

**Result**: All proof verifications will FAIL because the verifier cannot verify proofs from different circuits.

### The Fix

You MUST choose one of these options:

#### ✅ OPTION A: Three Separate Verifiers (RECOMMENDED)
- Create `vanguard_verifier_movement`, `vanguard_verifier_attack`, `vanguard_verifier_scan`
- Each embeds its own VK
- Hub contract calls appropriate verifier per action
- **Time**: 2-3 hours
- **Complexity**: Low

#### ⚠️ OPTION B: VK Registry Contract (NOT RECOMMENDED)
- Create separate contract to store all VKs
- Verifier reads VK based on action type
- **Time**: 3-4 hours
- **Complexity**: Medium
- **Gas Cost**: Higher

#### ❌ OPTION C: Embed VKs in Hub (DO NOT DO THIS)
- Hub contract embeds all VKs and verifies directly
- **Time**: 1-2 hours
- **Complexity**: Low
- **Problem**: Violates separation of concerns

**This checklist assumes OPTION A is chosen.**

---

## 🔴 PRE-DEPLOYMENT CHECKLIST - MUST COMPLETE

### Phase 0: Architecture Fix (2-3 hours)

- [ ] **Step 0.1**: Create three verifier contracts
  ```bash
  cd contracts
  mkdir vanguard_verifier_movement vanguard_verifier_attack vanguard_verifier_scan
  cp -r vanguard_verifier/* vanguard_verifier_movement/
  cp -r vanguard_verifier/* vanguard_verifier_attack/
  cp -r vanguard_verifier/* vanguard_verifier_scan/
  ```

- [ ] **Step 0.2**: Update Cargo.toml in each verifier
  ```toml
  # vanguard_verifier_movement/Cargo.toml
  [package]
  name = "vanguard_verifier_movement"
  # ... rest unchanged
  ```

- [ ] **Step 0.3**: Update lib.rs package names in each verifier
  ```rust
  // vanguard_verifier_movement/src/lib.rs
  #![no_std]
  //! Vanguard Verifier Contract - Movement Circuit
  #[contract]
  pub struct VanguardVerifierMovementContract;
  ```

- [ ] **Step 0.4**: Update hub contract to accept verifier addresses
  ```rust
  // Add to DataKey enum
  #[contracttype]
  pub enum DataKey {
      // ... existing ...
      MovementVerifier,
      AttackVerifier,
      ScanVerifier,
  }

  // Update initialize_game signature
  pub fn initialize_game(
      env: Env,
      p1: Address,
      p2: Address,
      p1_vehicle_type: u32,
      p2_vehicle_type: u32,
      movement_verifier: Address,
      attack_verifier: Address,
      scan_verifier: Address,
  ) {
      // ... existing ...
      env.storage().instance().set(&DataKey::MovementVerifier, &movement_verifier);
      env.storage().instance().set(&DataKey::AttackVerifier, &attack_verifier);
      env.storage().instance().set(&DataKey::ScanVerifier, &scan_verifier);
  }
  ```

- [ ] **Step 0.5**: Update hub contract to use correct verifier
  ```rust
  // In move_unit
  let verifier = env.storage().instance()
      .get(&DataKey::MovementVerifier).unwrap();

  // In attack
  let verifier = env.storage().instance()
      .get(&DataKey::AttackVerifier).unwrap();

  // In scan
  let verifier = env.storage().instance()
      .get(&DataKey::ScanVerifier).unwrap();
  ```

- [ ] **Step 0.6**: Verify hub contract compiles
  ```bash
  cd contracts/vanguard_hub
  cargo check
  ```

---

### Phase 1: Circuit Compilation (1 hour)

- [ ] **Step 1.1**: Compile movement circuit
  ```bash
  cd /home/engine/project/circuits/movement
  nargo compile
  # Expected: "Built in X seconds"
  ```

- [ ] **Step 1.2**: Generate movement VK
  ```bash
  nargo codegen-vk
  # Expected: VK file generated in target/
  ```

- [ ] **Step 1.3**: Generate movement PK
  ```bash
  nargo codegen-pk
  # Expected: PK file generated in target/
  ```

- [ ] **Step 1.4**: Compile attack circuit
  ```bash
  cd /home/engine/project/circuits/attack
  nargo compile
  ```

- [ ] **Step 1.5**: Generate attack VK
  ```bash
  nargo codegen-vk
  ```

- [ ] **Step 1.6**: Generate attack PK
  ```bash
  nargo codegen-pk
  ```

- [ ] **Step 1.7**: Compile scan circuit
  ```bash
  cd /home/engine/project/circuits/scan
  nargo compile
  ```

- [ ] **Step 1.8**: Generate scan VK
  ```bash
  nargo codegen-vk
  ```

- [ ] **Step 1.9**: Generate scan PK
  ```bash
  nargo codegen-pk
  ```

- [ ] **Step 1.10**: Verify all VKs exist
  ```bash
  ls -lh /home/engine/project/circuits/movement/target/*.vk
  ls -lh /home/engine/project/circuits/attack/target/*.vk
  ls -lh /home/engine/project/circuits/scan/target/*.vk
  # Expected: Each should show file size > 0
  ```

---

### Phase 2: Circuit JSON Generation (30 minutes)

- [ ] **Step 2.1**: Check if JSON files exist
  ```bash
  ls -lh /home/engine/project/frontend/public/circuits/*.json
  ```

- [ ] **Step 2.2**: Verify JSON structure matches circuit
  ```bash
  # Check movement.json has correct public inputs
  cat /home/engine/project/frontend/public/circuits/movement.json | jq '.public_inputs'
  # Expected: Should match movement circuit public inputs
  ```

- [ ] **Step 2.3**: Verify JSON has correct private inputs
  ```bash
  cat /home/engine/project/frontend/public/circuits/movement.json | jq '.abi.main.parameters'
  # Expected: Should list old_x, old_y, new_x, new_y, salt, etc.
  ```

- [ ] **Step 2.4**: Repeat for attack and scan
  ```bash
  cat /home/engine/project/frontend/public/circuits/attack.json | jq '.public_inputs'
  cat /home/engine/project/frontend/public/circuits/scan.json | jq '.public_inputs'
  ```

- [ ] **Step 2.5**: If JSON is outdated, regenerate (requires noir-js tools)
  ```bash
  # This step requires noir-js to convert compiled circuit to JSON
  # Skip for now if files exist and look correct
  ```

---

### Phase 3: Contract Build (30 minutes)

- [ ] **Step 3.1**: Build movement verifier
  ```bash
  cd /home/engine/project/contracts/vanguard_verifier_movement
  cargo build --release --target wasm32-unknown-unknown
  # Expected: .wasm file generated
  ```

- [ ] **Step 3.2**: Build attack verifier
  ```bash
  cd /home/engine/project/contracts/vanguard_verifier_attack
  cargo build --release --target wasm32-unknown-unknown
  ```

- [ ] **Step 3.3**: Build scan verifier
  ```bash
  cd /home/engine/project/contracts/vanguard_verifier_scan
  cargo build --release --target wasm32-unknown-unknown
  ```

- [ ] **Step 3.4**: Build hub contract
  ```bash
  cd /home/engine/project/contracts/vanguard_hub
  cargo build --release --target wasm32-unknown-unknown
  ```

- [ ] **Step 3.5**: Verify all WASM files exist
  ```bash
  ls -lh contracts/vanguard_verifier_movement/target/wasm32-unknown-unknown/release/*.wasm
  ls -lh contracts/vanguard_verifier_attack/target/wasm32-unknown-unknown/release/*.wasm
  ls -lh contracts/vanguard_verifier_scan/target/wasm32-unknown-unknown/release/*.wasm
  ls -lh contracts/vanguard_hub/target/wasm32-unknown-unknown/release/*.wasm
  # Expected: Each should show file size > 0
  ```

- [ ] **Step 3.6**: Optimize WASM files (optional)
  ```bash
  # Install wasm-opt
  sudo apt-get install binaryen

  # Optimize each WASM
  wasm-opt contracts/vanguard_verifier_movement/target/wasm32-unknown-unknown/release/*.wasm \
    -O4 -o optimized_movement.wasm
  wasm-opt contracts/vanguard_verifier_attack/target/wasm32-unknown-unknown/release/*.wasm \
    -O4 -o optimized_attack.wasm
  wasm-opt contracts/vanguard_verifier_scan/target/wasm32-unknown-unknown/release/*.wasm \
    -O4 -o optimized_scan.wasm
  wasm-opt contracts/vanguard_hub/target/wasm32-unknown-unknown/release/*.wasm \
    -O4 -o optimized_hub.wasm
  ```

---

### Phase 4: Testnet Setup (15 minutes)

- [ ] **Step 4.1**: Install Stellar CLI (if not installed)
  ```bash
  cargo install stellar-cli
  ```

- [ ] **Step 4.2**: Configure network
  ```bash
  stellar network testnet
  ```

- [ ] **Step 4.3**: Create wallet
  ```bash
  stellar account create
  # Save the public key!
  ```

- [ ] **Step 4.4**: Fund wallet
  ```bash
  stellar account fund
  # Or use friendbot: https://friendbot.stellar.org/?address=YOUR_PUBLIC_KEY
  ```

- [ ] **Step 4.5**: Check balance
  ```bash
  stellar account info
  # Expected: Should show 10,000 lumens
  ```

- [ ] **Step 4.6**: Set wallet address as environment variable
  ```bash
  export MY_WALLET_ADDRESS="YOUR_PUBLIC_KEY_HERE"
  echo "Wallet: $MY_WALLET_ADDRESS"
  ```

---

### Phase 5: Contract Deployment (15 minutes)

- [ ] **Step 5.1**: Deploy movement verifier
  ```bash
  cd /home/engine/project

  export MOVEMENT_VERIFIER_ID=$(stellar contract deploy \
    contracts/vanguard_verifier_movement/target/wasm32-unknown-unknown/release/vanguard_verifier_movement.wasm \
    --source $MY_WALLET_ADDRESS)

  echo "Movement Verifier ID: $MOVEMENT_VERIFIER_ID"
  # Expected: Contract ID output
  ```

- [ ] **Step 5.2**: Deploy attack verifier
  ```bash
  export ATTACK_VERIFIER_ID=$(stellar contract deploy \
    contracts/vanguard_verifier_attack/target/wasm32-unknown-unknown/release/vanguard_verifier_attack.wasm \
    --source $MY_WALLET_ADDRESS)

  echo "Attack Verifier ID: $ATTACK_VERIFIER_ID"
  ```

- [ ] **Step 5.3**: Deploy scan verifier
  ```bash
  export SCAN_VERIFIER_ID=$(stellar contract deploy \
    contracts/vanguard_verifier_scan/target/wasm32-unknown-unknown/release/vanguard_verifier_scan.wasm \
    --source $MY_WALLET_ADDRESS)

  echo "Scan Verifier ID: $SCAN_VERIFIER_ID"
  ```

- [ ] **Step 5.4**: Deploy hub contract
  ```bash
  export HUB_CONTRACT_ID=$(stellar contract deploy \
    contracts/vanguard_hub/target/wasm32-unknown-unknown/release/vanguard_hub.wasm \
    --source $MY_WALLET_ADDRESS)

  echo "Hub Contract ID: $HUB_CONTRACT_ID"
  ```

- [ ] **Step 5.5**: Record all contract IDs
  ```bash
  cat > /home/engine/project/CONTRACT_IDS.txt << EOF
MOVEMENT_VERIFIER_ID=$MOVEMENT_VERIFIER_ID
ATTACK_VERIFIER_ID=$ATTACK_VERIFIER_ID
SCAN_VERIFIER_ID=$SCAN_VERIFIER_ID
HUB_CONTRACT_ID=$HUB_CONTRACT_ID
DEPLOYED_DATE=$(date)
EOF

  echo "Contract IDs saved to CONTRACT_IDS.txt"
  cat /home/engine/project/CONTRACT_IDS.txt
  ```

- [ ] **Step 5.6**: Verify contracts deployed
  ```bash
  stellar contract info $MOVEMENT_VERIFIER_ID
  stellar contract info $ATTACK_VERIFIER_ID
  stellar contract info $SCAN_VERIFIER_ID
  stellar contract info $HUB_CONTRACT_ID
  # Expected: Each should show contract info
  ```

---

### Phase 6: TypeScript Bindings (15 minutes)

- [ ] **Step 6.1**: Install Soroban CLI (if not installed)
  ```bash
  cargo install soroban-cli
  ```

- [ ] **Step 6.2**: Generate bindings
  ```bash
  cd /home/engine/project/contracts/vanguard_hub

  soroban contract bindings typescript \
    --contract-id $HUB_CONTRACT_ID \
    --output-dir /home/engine/project/bindings
  ```

- [ ] **Step 6.3**: Verify bindings generated
  ```bash
  ls -lh /home/engine/project/bindings/vanguard_hub.ts
  # Expected: File exists with TypeScript bindings
  ```

- [ ] **Step 6.4**: Update hub client to use multiple verifiers
  ```bash
  # Edit /home/engine/project/frontend/lib/hubClient.ts
  # Replace with:
  export function getMovementVerifierId() {
    const id = process.env.NEXT_PUBLIC_VERIFIER_MOVEMENT_ID;
    if (!id) throw new Error("Missing movement verifier ID");
    return id;
  }

  export function getAttackVerifierId() {
    const id = process.env.NEXT_PUBLIC_VERIFIER_ATTACK_ID;
    if (!id) throw new Error("Missing attack verifier ID");
    return id;
  }

  export function getScanVerifierId() {
    const id = process.env.NEXT_PUBLIC_VERIFIER_SCAN_ID;
    if (!id) throw new Error("Missing scan verifier ID");
    return id;
  }
  ```

---

### Phase 7: Frontend Configuration (10 minutes)

- [ ] **Step 7.1**: Create .env.local
  ```bash
  cd /home/engine/project/frontend

  cat > .env.local << EOF
NEXT_PUBLIC_HUB_CONTRACT_ID="$HUB_CONTRACT_ID"
NEXT_PUBLIC_VERIFIER_MOVEMENT_ID="$MOVEMENT_VERIFIER_ID"
NEXT_PUBLIC_VERIFIER_ATTACK_ID="$ATTACK_VERIFIER_ID"
NEXT_PUBLIC_VERIFIER_SCAN_ID="$SCAN_VERIFIER_ID"
NEXT_PUBLIC_NETWORK="testnet"
EOF

  echo ".env.local created"
  cat .env.local
  ```

- [ ] **Step 7.2**: Verify .env.local
  ```bash
  cat /home/engine/project/frontend/.env.local
  # Expected: All contract IDs present
  ```

- [ ] **Step 7.3**: Add to .gitignore (already should be there)
  ```bash
  grep ".env.local" /home/engine/project/frontend/.gitignore || echo ".env.local" >> /home/engine/project/frontend/.gitignore
  ```

---

### Phase 8: Frontend Build (10 minutes)

- [ ] **Step 8.1**: Install dependencies
  ```bash
  cd /home/engine/project/frontend
  npm install
  # Expected: No errors
  ```

- [ ] **Step 8.2**: Build frontend
  ```bash
  npm run build
  # Expected: "Compiled successfully" message
  ```

- [ ] **Step 8.3**: Verify build output
  ```bash
  ls -lh .next/
  # Expected: Build output exists
  ```

- [ ] **Step 8.4**: Test locally
  ```bash
  npm run dev
  # Open http://localhost:3000
  # Expected: Frontend loads
  # Press Ctrl+C to stop
  ```

---

### Phase 9: Integration Testing (1-2 hours)

- [ ] **Step 9.1**: Test wallet connection
  ```bash
  # In browser, open http://localhost:3000
  # Click "Connect Wallet"
  # Verify: Freighter wallet connects
  # Verify: Wallet address displayed
  ```

- [ ] **Step 9.2**: Test game initialization
  ```bash
  # In browser console or UI:
  # Call initialize_game with two addresses
  # Verify: No errors
  # Verify: Contract state updated
  ```

- [ ] **Step 9.3**: Test position commitment
  ```bash
  # Player 1: Commit position
  # Verify: Commitment accepted
  # Player 2: Commit position
  # Verify: Commitment accepted
  ```

- [ ] **Step 9.4**: Test movement
  ```bash
  # Player 1: Move unit
  # Verify: Proof generated in worker
  # Verify: Proof submitted to contract
  # Verify: Movement accepted
  # Verify: Turn counter incremented
  ```

- [ ] **Step 9.5**: Test attack
  ```bash
  # Player 2: Attack
  # Verify: Proof generated
  # Verify: Attack accepted
  # Verify: HP decremented if HIT
  # Verify: Turn counter incremented
  ```

- [ ] **Step 9.6**: Test scan
  ```bash
  # If using Cycle: Test scan
  # Verify: Scan proof generated
  # Verify: Scan accepted
  # Verify: Turn counter incremented
  ```

- [ ] **Step 9.7**: Test invalid move
  ```bash
  # Try to move out of range
  # Verify: Proof fails or rejected
  # Verify: No state change
  ```

- [ ] **Step 9.8**: Test out-of-turn action
  ```bash
  # Try to act when not your turn
  # Verify: Transaction rejected
  # Verify: Error message "Not player's turn"
  ```

- [ ] **Step 9.9**: Test replay attack
  ```bash
  # Try to reuse old proof
  # Verify: Transaction rejected
  # Verify: Error message "Invalid turn counter"
  ```

- [ ] **Step 9.10**: Test game end
  ```bash
  # Continue playing until HP reaches 0
  # Verify: Game ends
  # Verify: Final reveal shows positions
  # Verify: Victory/defeat message
  ```

---

### Phase 10: Demo Preparation (30 minutes)

- [ ] **Step 10.1**: Clear browser storage
  ```bash
  # In browser DevTools:
  # Application > Local Storage > Clear all
  ```

- [ ] **Step 10.2**: Test full match
  ```bash
  # Play complete match from start to finish
  # Verify: All actions work
  # Verify: No errors
  # Verify: Game ends correctly
  ```

- [ ] **Step 10.3**: Prepare demo wallets
  ```bash
  # Create at least 2 test wallets
  # Fund both wallets
  # Record addresses for demo
  ```

- [ ] **Step 10.4**: Test with different vehicles
  ```bash
  # Test with Cycle
  # Test with Rover
  # Test with Tank
  # Verify: All work correctly
  ```

- [ ] **Step 10.5**: Document demo flow
  ```bash
  # Create step-by-step demo script:
  # 1. Connect wallets
  # 2. Initialize game
  # 3. Commit positions
  # 4. Move
  # 5. Attack
  # 6. Scan (if Cycle)
  # 7. Continue to end
  ```

---

## 🎯 FINAL VERIFICATION CHECKLIST

### Pre-Demo (Must Pass All)

- [ ] All three circuits compile successfully
- [ ] All three VKs generated successfully
- [ ] All three verifier contracts deployed
- [ ] Hub contract deployed
- [ ] All contract IDs saved
- [ ] TypeScript bindings generated
- [ ] Frontend builds successfully
- [ ] Frontend runs locally without errors
- [ ] Wallet connection works
- [ ] Game initialization works
- [ ] Position commitment works
- [ ] Movement works
- [ ] Attack works
- [ ] Scan works
- [ ] Invalid moves rejected
- [ ] Out-of-turn actions rejected
- [ ] Replay attacks prevented
- [ ] Game ends correctly at HP=0
- [ ] Final reveal works

### Demo Day (Quick Checklist)

- [ ] Testnet wallet funded
- [ ] All contracts deployed on testnet
- [ ] Frontend deployed or running locally
- [ ] Browser dev tools open for debugging
- [ ] Demo script prepared
- [ ] Backup wallets ready
- [ ] Internet connection stable

---

## ⚠️ COMMON PITFALLS

### Issue #1: VK Files Are Empty
**Cause**: `nargo codegen-vk` not run
**Fix**: Run `nargo codegen-vk` for each circuit

### Issue #2: Wrong Verifier Called
**Cause**: Hub contract uses wrong verifier address
**Fix**: Update hub contract to store and use three separate verifiers

### Issue #3: JSON Outdated
**Cause**: Circuit modified but JSON not regenerated
**Fix**: Regenerate JSON with noir-js tools

### Issue #4: Contract Deploy Fails
**Cause**: Insufficient funds
**Fix**: Fund wallet with testnet lumens

### Issue #5: Proof Generation Fails
**Cause**: JSON doesn't match circuit
**Fix**: Verify JSON structure, regenerate if needed

### Issue #6: Browser Console Errors
**Cause**: Environment variables not set
**Fix**: Check .env.local has all contract IDs

### Issue #7: Freighter Not Responding
**Cause**: Browser extension not installed
**Fix**: Install Freighter wallet extension

---

## 📞 EMERGENCY PROCEDURES

### Demo Crashing Mid-Game

1. **Check browser console** for errors
2. **Check network tab** for failed requests
3. **Restart frontend** if needed
4. **Clear localStorage** if state corrupted
5. **Use backup wallets** if needed

### Contract Transaction Failing

1. **Check contract ID** is correct
2. **Check verifier ID** is correct for action type
3. **Check wallet balance** has enough lumens
4. **Check network** is testnet (not mainnet)

### Proof Generation Hanging

1. **Check worker is running** (Network tab)
2. **Check circuit JSON is loading** (Network tab)
3. **Check browser console** for errors
4. **Reload page** and try again

---

## ✅ SUCCESS CRITERIA

### Technical
- [ ] All contracts deployed without errors
- [ ] All proof verifications work correctly
- [ ] Frontend runs without console errors
- [ ] All game actions complete successfully

### User Experience
- [ ] Wallet connection is smooth
- [ ] UI is responsive during proof generation
- [ ] Game flow is intuitive
- [ ] Victory/defeat is clear

### Demo Readiness
- [ ] Can complete full match in under 5 minutes
- [ ] Can explain all features clearly
- [ ] Have backup plan if something fails
- [ ] Have Q&A answers prepared

---

**Created by**: Senior Soroban Developer
**Date**: February 13, 2024
**Status**: 🔴 BLOCKED - Architecture fix required first
**Estimated Time to Demo**: 6-8 hours (including architecture fix)
