# Verifier Integration Guide

This document explains how to integrate the official UltraHonk verifier into the Vanguard Verifier contract.

## Overview

The Vanguard Verifier contract is currently a **stub implementation** that provides the correct interface but needs to be connected to the actual `ultrahonk-rust-verifier` library.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VERIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. Frontend generates proof using @noir-lang/noir_js
   └─> UltraHonk proof + public inputs

2. Hub contract receives move/attack transaction
   └─> Calls verifier contract

3. Verifier contract (vanguard_verifier)
   └─> Wraps ultrahonk-rust-verifier
   └─> Delegates to Soroban BN254 host functions

4. Result returned to hub contract
   └─> Updates game state or rejects
```

## Integration Steps

### Step 1: Add ultrahonk-rust-verifier Dependency

Update `Cargo.toml`:

```toml
[dependencies]
soroban-sdk = "22.0.0"
ultrahonk-rust-verifier = { git = "https://github.com/yugocabrio/ultrahonk-rust-verifier", branch = "soroban-compatible" }

# Additional dependencies for no_std compatibility
ark-bn254 = { version = "0.4", default-features = false }
ark-ec = { version = "0.4", default-features = false }
ark-ff = { version = "0.4", default-features = false }
```

**Note**: Exact dependency versions and features depend on the ultrahonk-rust-verifier release. Check the library's documentation for the correct setup.

### Step 2: Import Verifier Types

Add to `src/lib.rs`:

```rust
use ultrahonk_rust_verifier::{
    verify as ultrahonk_verify,
    VerificationKey,
    Proof,
    PublicInputs,
};
```

### Step 3: Implement Verification Key Storage

The verification key is constant for each circuit type (movement, attack, deployment). Store them once to reduce transaction costs.

```rust
use soroban_sdk::{contracttype, BytesN};

#[contracttype]
pub enum StorageKey {
    VerificationKey(Bytes), // VK indexed by vk_id
}

/// Store a verification key
fn store_verification_key(env: &Env, vk_id: &Bytes, vk_data: &Bytes) {
    let key = StorageKey::VerificationKey(vk_id.clone());
    env.storage().persistent().set(&key, vk_data);
}

/// Load a verification key
fn load_verification_key(env: &Env, vk_id: &Bytes) -> Result<Bytes, Error> {
    let key = StorageKey::VerificationKey(vk_id.clone());
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(Error::VerificationKeyNotFound)
}
```

### Step 4: Implement Type Conversions

UltraHonk verifier uses Arkworks types; Soroban uses its own types. Convert between them:

```rust
use ark_bn254::{Fr, G1Affine};
use ark_ec::AffineRepr;
use ark_ff::PrimeField;

/// Convert Soroban Bytes (32-byte field element) to Arkworks Fr
fn bytes_to_fr(bytes: &Bytes) -> Result<Fr, Error> {
    if bytes.len() != 32 {
        return Err(Error::InvalidFieldElement);
    }
    
    let vec = bytes_to_vec(bytes);
    let mut array = [0u8; 32];
    array.copy_from_slice(&vec);
    
    // Fr::from_le_bytes_mod_order expects little-endian bytes
    Ok(Fr::from_le_bytes_mod_order(&array))
}

/// Convert Vec<Bytes> to Vec<Fr> for public inputs
fn convert_public_inputs(inputs: &Vec<Bytes>) -> Result<alloc::vec::Vec<Fr>, Error> {
    let mut result = alloc::vec::Vec::with_capacity(inputs.len() as usize);
    
    for i in 0..inputs.len() {
        let bytes = inputs.get(i).unwrap();
        let fr = bytes_to_fr(&bytes)?;
        result.push(fr);
    }
    
    Ok(result)
}
```

### Step 5: Implement Soroban BN254 Backend

The verifier needs access to BN254 operations. Create an adapter that bridges ultrahonk-rust-verifier to Soroban host functions:

```rust
use soroban_sdk::crypto;

/// Adapter for Soroban BN254 host functions
pub struct SorobanBn254Backend<'a> {
    env: &'a Env,
}

impl<'a> SorobanBn254Backend<'a> {
    pub fn new(env: &'a Env) -> Self {
        Self { env }
    }
    
    /// G1 scalar multiplication using Soroban host function
    pub fn g1_mul(&self, point: &G1Affine, scalar: &Fr) -> G1Affine {
        // Convert types and call Soroban crypto::bn254_g1_mul
        // Implementation depends on exact Soroban API
        let point_bytes = g1_to_bytes(point);
        let scalar_bytes = fr_to_bytes(scalar);
        
        let result_bytes = crypto::bn254_g1_mul(self.env, &point_bytes, &scalar_bytes);
        bytes_to_g1(&result_bytes)
    }
    
    /// G1 multi-scalar multiplication
    pub fn g1_msm(&self, points: &[G1Affine], scalars: &[Fr]) -> G1Affine {
        // Implement using g1_mul + g1_add or native MSM if available
        // This is a performance-critical operation
        assert_eq!(points.len(), scalars.len());
        
        let mut result = G1Affine::zero();
        for (point, scalar) in points.iter().zip(scalars.iter()) {
            let term = self.g1_mul(point, scalar);
            result = self.g1_add(&result, &term);
        }
        result
    }
    
    /// Pairing check using Soroban host function
    pub fn pairing_check(&self, pairs: &[(G1Affine, G2Affine)]) -> bool {
        // Convert pairs to bytes and call Soroban pairing check
        let pairs_bytes = pairs_to_bytes(pairs);
        crypto::bn254_pairing_check(self.env, &pairs_bytes)
    }
}
```

**Note**: The exact API depends on Soroban's BN254 host function implementation. This is a conceptual example.

### Step 6: Replace Stub in verify_ultrahonk()

Replace the TODO placeholder with actual verification:

```rust
pub fn verify_ultrahonk(
    env: Env,
    proof: Bytes,
    public_inputs: Vec<Bytes>,
) -> Result<bool, Error> {
    // Log verification attempt
    env.events().publish((symbol_short!("verify"),), ());

    // Validate inputs
    if proof.len() == 0 {
        return Err(Error::InvalidProof);
    }

    if public_inputs.len() == 0 {
        return Err(Error::InvalidPublicInputs);
    }

    // Convert proof bytes to verifier format
    let proof_vec = bytes_to_vec(&proof);
    let proof_obj = Proof::from_bytes(&proof_vec)
        .map_err(|_| Error::InvalidProof)?;

    // Convert public inputs
    let public_inputs_vec = convert_public_inputs(&public_inputs)?;
    let public_inputs_obj = PublicInputs::new(public_inputs_vec);

    // Get verification key (circuit-specific)
    // For Vanguard, we have 3 circuits: movement, attack, deployment
    // The VK should be stored once and loaded here
    // For now, we'll need to determine which circuit based on context
    // or have the hub contract pass a vk_id
    
    // TODO: Decide how to identify which circuit VK to use
    // Option 1: Hub passes vk_id as additional parameter
    // Option 2: Infer from public inputs structure
    // Option 3: Separate verify functions per circuit
    
    let vk_id = Bytes::from_slice(&env, b"movement"); // Example
    let vk_data = load_verification_key(&env, &vk_id)?;
    let vk_vec = bytes_to_vec(&vk_data);
    let vk = VerificationKey::from_bytes(&vk_vec)
        .map_err(|_| Error::InvalidVerificationKey)?;

    // Initialize Soroban BN254 backend
    let backend = SorobanBn254Backend::new(&env);
    
    // Set the backend globally (required by ultrahonk-rust-verifier)
    // This is how the verifier accesses Soroban's BN254 operations
    ultrahonk_rust_verifier::set_backend(backend);

    // Perform verification
    let is_valid = ultrahonk_verify(&vk, &proof_obj, &public_inputs_obj)
        .map_err(|_| Error::VerificationFailed)?;

    if is_valid {
        env.events().publish((symbol_short!("valid"),), ());
    } else {
        env.events().publish((symbol_short!("invalid"),), ());
    }

    Ok(is_valid)
}
```

### Step 7: Implement store_vk()

```rust
pub fn store_vk(
    env: Env,
    vk_id: Bytes,
    vk_data: Bytes,
) -> Result<(), Error> {
    // Validate VK data
    if vk_data.len() == 0 {
        return Err(Error::InvalidVerificationKey);
    }
    
    // Store in persistent storage
    store_verification_key(&env, &vk_id, &vk_data);
    
    env.events().publish((symbol_short!("vk_store"),), vk_id);
    Ok(())
}
```

### Step 8: Test with Real Proofs

Create integration tests using actual Noir proofs:

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;
    
    #[test]
    fn test_verify_real_movement_proof() {
        let env = Env::default();
        let contract_id = env.register_contract(None, VanguardVerifierContract);
        let client = VanguardVerifierContractClient::new(&env, &contract_id);

        // Load VK from compiled circuit
        let vk_data = include_bytes!("../../../circuits/movement/target/vk");
        let vk_id = Bytes::from_slice(&env, b"movement");
        client.store_vk(&vk_id, &Bytes::from_slice(&env, vk_data));

        // Load proof generated by Noir
        let proof_data = include_bytes!("../../../circuits/movement/target/proof");
        let proof = Bytes::from_slice(&env, proof_data);

        // Public inputs: old_hash, new_hash
        let public_inputs = vec![
            Bytes::from_slice(&env, &hex!("1234...")), // old_hash
            Bytes::from_slice(&env, &hex!("5678...")), // new_hash
        ];

        // Verify
        let result = client.verify_with_stored_vk(&vk_id, &proof, &Vec::from_slice(&env, &public_inputs));
        assert!(result);
    }
}
```

## Circuit-Specific Verification

Vanguard has 3 different circuits. We need to handle each:

### Option A: Separate Functions

```rust
pub fn verify_movement(env: Env, proof: Bytes, old_hash: Bytes, new_hash: Bytes) -> Result<bool, Error>;
pub fn verify_attack(env: Env, proof: Bytes, commitment: Bytes, target_x: Bytes, target_y: Bytes) -> Result<bool, Error>;
pub fn verify_deployment(env: Env, proof: Bytes, commitment: Bytes) -> Result<bool, Error>;
```

**Pros**: Type-safe, clear intent
**Cons**: More functions, less flexible

### Option B: Generic with VK ID

```rust
pub fn verify_ultrahonk(env: Env, vk_id: Bytes, proof: Bytes, public_inputs: Vec<Bytes>) -> Result<bool, Error>;
```

**Pros**: Flexible, fewer functions
**Cons**: Hub contract must know VK IDs

### Recommended: Option B

Use the generic function with VK IDs stored for each circuit:
- `"movement"` → Movement circuit VK
- `"attack"` → Attack circuit VK
- `"deployment"` → Deployment circuit VK

Hub contract passes the appropriate `vk_id` based on the action type.

## Error Handling

Add more specific errors:

```rust
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    VerificationFailed = 1,
    InvalidProof = 2,
    InvalidPublicInputs = 3,
    InvalidVerificationKey = 4,
    VerificationKeyNotFound = 5,
    InvalidFieldElement = 6,
    BackendError = 7,
}
```

## Performance Considerations

### Gas Optimization

1. **Store VKs Once**: Don't pass VKs in every transaction
2. **Batch Verifications**: If possible, batch multiple proofs
3. **Precompute Constants**: Cache any precomputable values

### Expected Costs

| Operation | Compute Units |
|-----------|---------------|
| G1 mul | ~100K |
| G1 add | ~10K |
| G1 MSM (n=100) | ~10M |
| Pairing | ~20M |
| Full Verification | ~30-50M |

**Total per proof**: ~30-50M compute units

## Security Checklist

- [ ] VK storage access controlled
- [ ] Proof bytes validated before parsing
- [ ] Public inputs count matches circuit
- [ ] Field elements properly validated
- [ ] No custom pairing math
- [ ] Backend properly initialized
- [ ] Error handling doesn't leak info

## Deployment Checklist

- [ ] ultrahonk-rust-verifier integrated
- [ ] All tests passing with real proofs
- [ ] Gas costs measured
- [ ] VKs stored for all 3 circuits
- [ ] Hub contract integration tested
- [ ] Error messages documented

## Troubleshooting

### "Verification failed" with valid proof

- Check public inputs order matches circuit
- Verify field element byte order (little-endian vs big-endian)
- Ensure VK matches the circuit that generated the proof

### Gas limit exceeded

- Ensure using latest Soroban with BN254 host functions
- Check that backend is properly delegating to host functions
- Consider proof aggregation for multiple moves

### VK not found error

- Ensure VKs stored before first verification
- Check VK IDs match between storage and retrieval
- Verify storage persistence settings

## References

- [ultrahonk-rust-verifier](https://github.com/yugocabrio/ultrahonk-rust-verifier)
- [indextree UltraHonk Soroban](https://github.com/indextree/ultrahonk_soroban_contract)
- [Soroban Crypto Functions](https://docs.rs/soroban-sdk/latest/soroban_sdk/crypto/)
- [Arkworks BN254](https://docs.rs/ark-bn254/)

---

**Next**: After integration, proceed to hub contract implementation
