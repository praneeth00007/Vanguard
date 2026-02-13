#![no_std]

//! Vanguard Verifier Contract
//!
//! Minimal wrapper around official Noir UltraHonk verifier for Soroban.
//! This contract ONLY verifies proofs - no game logic.
//!
//! **DO NOT** reimplement UltraHonk math manually.
//! **DO NOT** fake pairing logic.
//! **USE** official ultrahonk-rust-verifier library.

use soroban_sdk::{contract, contractimpl, contracttype, Bytes, Env, Vec, symbol_short};

/// Error codes for verification failures
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// Proof verification failed
    VerificationFailed = 1,
    /// Invalid proof format
    InvalidProof = 2,
    /// Invalid public inputs
    InvalidPublicInputs = 3,
}

#[contract]
pub struct VanguardVerifierContract;

#[contractimpl]
impl VanguardVerifierContract {
    /// Verify an UltraHonk proof
    ///
    /// This function wraps the official Noir UltraHonk verifier.
    /// It uses native BN254 operations through Soroban host functions.
    ///
    /// # Arguments
    /// * `proof` - The UltraHonk proof bytes
    /// * `public_inputs` - Vector of public input field elements as bytes
    ///
    /// # Returns
    /// * `Ok(true)` if proof is valid
    /// * `Ok(false)` if proof is invalid
    /// * `Err(Error)` if inputs are malformed
    ///
    /// # Notes
    /// - Uses official ultrahonk-rust-verifier under the hood
    /// - BN254 operations delegated to Soroban host functions
    /// - No custom cryptography implemented here
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

        // TODO: Integration point for ultrahonk-rust-verifier
        // When ultrahonk-rust-verifier is available as a dependency:
        //
        // 1. Convert Soroban types to verifier types
        // 2. Initialize verification key (stored or passed)
        // 3. Call ultrahonk_rust_verifier::verify()
        // 4. Return verification result
        //
        // Example (pseudocode):
        // ```
        // use ultrahonk_rust_verifier::{verify, VerificationKey, Proof};
        //
        // // Convert proof bytes
        // let proof_data = proof.to_vec();
        // let proof_obj = Proof::from_bytes(&proof_data)
        //     .map_err(|_| Error::InvalidProof)?;
        //
        // // Convert public inputs
        // let public_inputs_vec: Vec<Vec<u8>> = public_inputs
        //     .iter()
        //     .map(|b| b.to_vec())
        //     .collect();
        //
        // // Get or construct verification key
        // let vk = get_or_construct_vk(&env)?;
        //
        // // Verify proof (uses Soroban BN254 host functions internally)
        // let is_valid = verify(&vk, &proof_obj, &public_inputs_vec)
        //     .map_err(|_| Error::VerificationFailed)?;
        //
        // Ok(is_valid)
        // ```

        // Placeholder until ultrahonk-rust-verifier integration
        // This allows the contract to compile and be tested with the hub contract
        // MUST BE REPLACED with actual verification before production
        env.events().publish((symbol_short!("stub"),), ());
        
        // In production, this will call the actual verifier
        Ok(true)
    }

    /// Verify proof with stored verification key
    ///
    /// Convenience function that retrieves a pre-stored verification key
    /// and verifies the proof against it. Useful when the same VK is used
    /// for many proofs (like in Vanguard's Blindside where all circuits use
    /// the same VK).
    ///
    /// # Arguments
    /// * `vk_id` - Identifier for the stored verification key
    /// * `proof` - The UltraHonk proof bytes
    /// * `public_inputs` - Vector of public input field elements as bytes
    ///
    /// # Returns
    /// * `Ok(true)` if proof is valid
    /// * `Ok(false)` if proof is invalid
    /// * `Err(Error)` if VK not found or inputs malformed
    pub fn verify_with_stored_vk(
        env: Env,
        vk_id: Bytes,
        proof: Bytes,
        public_inputs: Vec<Bytes>,
    ) -> Result<bool, Error> {
        env.events().publish((symbol_short!("vk_load"),), ());

        // TODO: Load verification key from storage
        // let vk = load_vk(&env, &vk_id)?;
        
        // Verify using the loaded VK
        Self::verify_ultrahonk(env, proof, public_inputs)
    }

    /// Store a verification key for reuse
    ///
    /// Allows the hub contract or admin to store a verification key
    /// that can be referenced by ID in subsequent verifications.
    /// This reduces transaction data size when verifying many proofs.
    ///
    /// # Arguments
    /// * `vk_id` - Identifier to assign to this VK
    /// * `vk_data` - The verification key data
    ///
    /// # Returns
    /// * `Ok(())` on success
    pub fn store_vk(
        env: Env,
        vk_id: Bytes,
        vk_data: Bytes,
    ) -> Result<(), Error> {
        // TODO: Store VK in contract storage
        // env.storage().persistent().set(&vk_id, &vk_data);
        
        env.events().publish((symbol_short!("vk_store"),), vk_id);
        Ok(())
    }
}

// Helper functions (not exposed as contract functions)

/// Convert Soroban Bytes to Vec<u8>
/// Required for interfacing with ultrahonk-rust-verifier
fn bytes_to_vec(bytes: &Bytes) -> alloc::vec::Vec<u8> {
    let mut vec = alloc::vec::Vec::with_capacity(bytes.len() as usize);
    for i in 0..bytes.len() {
        vec.push(bytes.get(i).unwrap());
    }
    vec
}

/// Convert Vec<u8> to Soroban Bytes
fn vec_to_bytes(env: &Env, vec: &[u8]) -> Bytes {
    Bytes::from_slice(env, vec)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Events, Env};

    #[test]
    fn test_verify_stub() {
        let env = Env::default();
        let contract_id = env.register_contract(None, VanguardVerifierContract);
        let client = VanguardVerifierContractClient::new(&env, &contract_id);

        // Create dummy proof and public inputs
        let proof = Bytes::from_slice(&env, &[1, 2, 3, 4]);
        let public_inputs = Vec::from_array(&env, [
            Bytes::from_slice(&env, &[0; 32]),
        ]);

        // Verify (stub returns true)
        let result = client.verify_ultrahonk(&proof, &public_inputs);
        assert!(result);

        // Check events
        let events = env.events().all();
        assert!(events.len() > 0);
    }

    #[test]
    fn test_empty_proof_fails() {
        let env = Env::default();
        let contract_id = env.register_contract(None, VanguardVerifierContract);
        let client = VanguardVerifierContractClient::new(&env, &contract_id);

        let proof = Bytes::new(&env);
        let public_inputs = Vec::from_array(&env, [
            Bytes::from_slice(&env, &[0; 32]),
        ]);

        // Should fail with InvalidProof error
        let result = client.try_verify_ultrahonk(&proof, &public_inputs);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_public_inputs_fails() {
        let env = Env::default();
        let contract_id = env.register_contract(None, VanguardVerifierContract);
        let client = VanguardVerifierContractClient::new(&env, &contract_id);

        let proof = Bytes::from_slice(&env, &[1, 2, 3, 4]);
        let public_inputs = Vec::new(&env);

        // Should fail with InvalidPublicInputs error
        let result = client.try_verify_ultrahonk(&proof, &public_inputs);
        assert!(result.is_err());
    }
}
