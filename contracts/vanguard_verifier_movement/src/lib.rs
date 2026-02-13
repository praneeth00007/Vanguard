#![no_std]

//! Vanguard Verifier Contract - Movement Circuit
//!
//! Minimal wrapper around the official Noir UltraHonk verifier for Soroban.
//! This contract ONLY verifies movement proofs - no game logic.

extern crate alloc;

use alloc::vec::Vec as AllocVec;
use ark_bn254::Fr;
use ark_ff::PrimeField;
use soroban_sdk::{contract, contractimpl, Bytes, Vec};
use ultrahonk_rust_verifier::{verify as ultrahonk_verify, Proof, PublicInputs, VerificationKey};

#[contract]
pub struct VanguardVerifierMovementContract;

#[contractimpl]
impl VanguardVerifierMovementContract {
    /// Verify an UltraHonk proof for the movement circuit using the embedded verification key.
    ///
    /// Returns `true` if the proof is valid, `false` otherwise.
    pub fn verify_ultrahonk(proof: Bytes, public_inputs: Vec<Bytes>) -> bool {
        let proof_vec = bytes_to_vec(&proof);
        let proof = match Proof::from_bytes(&proof_vec) {
            Ok(parsed) => parsed,
            Err(_) => return false,
        };

        let vk = match VerificationKey::from_bytes(VERIFICATION_KEY_BYTES) {
            Ok(parsed) => parsed,
            Err(_) => return false,
        };

        let public_inputs_vec = match convert_public_inputs(&public_inputs) {
            Ok(parsed) => parsed,
            Err(_) => return false,
        };
        let public_inputs = PublicInputs::new(public_inputs_vec);

        ultrahonk_verify(&vk, &proof, &public_inputs).unwrap_or(false)
    }
}

const VERIFICATION_KEY_BYTES: &[u8] = include_bytes!(concat!(env!("CARGO_MANIFEST_DIR"), "/vk.bin"));

fn bytes_to_vec(bytes: &Bytes) -> AllocVec<u8> {
    let mut vec = AllocVec::with_capacity(bytes.len() as usize);
    for i in 0..bytes.len() {
        if let Some(byte) = bytes.get(i) {
            vec.push(byte);
        }
    }
    vec
}

fn convert_public_inputs(inputs: &Vec<Bytes>) -> Result<AllocVec<Fr>, ()> {
    let mut result = AllocVec::with_capacity(inputs.len() as usize);
    for i in 0..inputs.len() {
        let bytes = inputs.get(i).ok_or(())?;
        let field = bytes_to_fr(&bytes).ok_or(())?;
        result.push(field);
    }
    Ok(result)
}

fn bytes_to_fr(bytes: &Bytes) -> Option<Fr> {
    if bytes.len() != 32 {
        return None;
    }

    let mut buffer = [0u8; 32];
    for i in 0..32 {
        buffer[i] = bytes.get(i)?;
    }

    Some(Fr::from_le_bytes_mod_order(&buffer))
}
