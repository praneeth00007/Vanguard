# Vanguard's Blindside - Quick Reference

## Circuit Inputs Summary

### Movement Circuit
```
Private:  old_x, old_y, new_x, new_y, salt
Public:   old_hash, new_hash
Proves:   Valid move (distance ≤ 2) without revealing coordinates
```

### Attack Circuit
```
Private:  x, y, salt
Public:   commitment, target_x, target_y, hit
Proves:   Honest hit/miss result without revealing defender position
```

### Deployment Circuit (Optional)
```
Private:  x, y, salt
Public:   commitment
Proves:   Valid initial placement within bounds
```

---

## Hash Function

**Poseidon2 with 3 inputs:**
```
hash = Poseidon(x, y, salt)
```

Must be computed identically in:
- Noir circuits: `poseidon2::Poseidon2::hash([x, y, salt], 3)`
- Soroban: `env.crypto().poseidon_hash(&[x, y, salt])`
- Frontend: Compatible Poseidon library

---

## Game Rules

**Grid:** 10×10 (coordinates 0-9)
**Movement:** Manhattan distance ≤ 2
**Health:** Each unit starts with HP (e.g., 3)
**Victory:** First to reduce opponent HP to 0

---

## Build Commands

```bash
# Build circuit
cd circuits/<circuit_name>
nargo build

# Generate proof (local test)
nargo prove

# Verify proof (local test)
nargo verify

# Export circuit for frontend
nargo export
```

---

## Circuit Files Location

```
circuits/
├── movement/
│   ├── Nargo.toml
│   ├── Prover.toml
│   └── src/main.nr
├── attack/
│   ├── Nargo.toml
│   ├── Prover.toml
│   └── src/main.nr
└── deployment/
    ├── Nargo.toml
    ├── Prover.toml
    └── src/main.nr
```

---

## Common Issues

### Issue: Hash mismatch between circuit and contract
**Solution:** Ensure all implementations use same Poseidon parameters (field, rounds, inputs)

### Issue: Proof generation slow in browser
**Solution:** Use Web Worker to avoid blocking main thread

### Issue: Circuit build fails
**Solution:** Check Noir version (`nargo --version` should be >=0.38.0)

### Issue: Proof verification fails on-chain
**Solution:** Ensure public inputs are in same order as circuit definition

---

## Next Steps

1. ✅ Circuits complete
2. ⏳ Build Soroban verifier (wrap official Noir template)
3. ⏳ Build Soroban hub (game logic)
4. ⏳ Implement Web Worker proof generation
5. ⏳ Build frontend UI
6. ⏳ End-to-end testing

---

## Resources

- **Noir Docs:** https://noir-lang.org/docs
- **Noir Stellar:** https://github.com/noir-lang/noir-stellar
- **SGS Reference:** https://github.com/Junman140/Stellar-Game-Studio
- **Soroban Docs:** https://soroban.stellar.org/
