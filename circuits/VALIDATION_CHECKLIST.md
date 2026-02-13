# Circuit Validation Checklist

Use this checklist to validate the circuits before integration.

## ✅ Pre-Integration Checklist

### Environment Setup
- [ ] Noir installed (`noirup` completed successfully)
- [ ] Nargo version >= 0.36.0 (`nargo --version`)
- [ ] Terminal path set to circuits directory

### Circuit Compilation
- [ ] Movement circuit compiles (`cd movement && nargo compile`)
- [ ] Attack circuit compiles (`cd attack && nargo compile`)
- [ ] Deployment circuit compiles (`cd deployment && nargo compile`)
- [ ] No compilation errors or warnings
- [ ] Circuit artifacts generated in `target/` directories

### Circuit Syntax Validation
- [ ] Poseidon API usage correct (`poseidon::bn254::hash_3`)
- [ ] Public inputs marked with `pub` keyword
- [ ] Field comparison methods correct (`.lt()`, `.lte()`)
- [ ] Return types specified correctly
- [ ] Comments and documentation clear

### Test Input Preparation
- [ ] Generate real Poseidon hash values for test inputs
- [ ] Update Prover.toml files with correct hashes
- [ ] Verify salt values are properly formatted hex strings
- [ ] Ensure test coordinates within [0, 9] bounds

### Circuit Execution Tests
- [ ] Movement circuit executes with valid inputs
- [ ] Attack circuit executes with valid inputs
- [ ] Deployment circuit executes with valid inputs
- [ ] Invalid inputs properly rejected with clear errors

### Proof Generation Tests
- [ ] Movement proof generates successfully
- [ ] Attack proof generates successfully
- [ ] Deployment proof generates successfully
- [ ] Proof generation time < 5 seconds (acceptable)
- [ ] Proof files created in target/ directories

### Proof Verification Tests
- [ ] Movement proof verifies successfully
- [ ] Attack proof verifies successfully
- [ ] Deployment proof verifies successfully
- [ ] Verification time < 500ms (acceptable)
- [ ] Invalid proofs rejected

## ✅ Circuit Logic Validation

### Movement Circuit
- [ ] Valid move (distance = 1) passes
- [ ] Valid move (distance = 2) passes
- [ ] Valid move (distance = 0) passes (stay in place)
- [ ] Invalid move (distance = 3) fails with error
- [ ] Out of bounds move fails with error
- [ ] Wrong old_hash fails with error
- [ ] Wrong new_hash fails with error
- [ ] Mismatched salt fails with error

### Attack Circuit
- [ ] Direct hit returns `true`
- [ ] Near miss returns `false`
- [ ] Far miss returns `false`
- [ ] Out of bounds target fails with error
- [ ] Wrong commitment fails with error
- [ ] Out of bounds defender position fails with error

### Deployment Circuit
- [ ] Center position (5, 5) passes
- [ ] Corner position (0, 0) passes
- [ ] Edge position (9, 9) passes
- [ ] Out of bounds (10, 5) fails with error
- [ ] Wrong commitment fails with error

## ✅ Security Validation

### Privacy Properties
- [ ] Coordinates never appear in proof output
- [ ] Salt never appears in proof output
- [ ] Only commitments and hit/miss revealed
- [ ] Proof is zero-knowledge (no leakage)

### Commitment Scheme
- [ ] Same inputs produce same commitment (deterministic)
- [ ] Different coordinates produce different commitments
- [ ] Different salts produce different commitments
- [ ] Commitments appear random (unpredictable)

### Constraint Coverage
- [ ] All bounds checks enforced
- [ ] All commitment verifications enforced
- [ ] All distance constraints enforced
- [ ] No constraint bypasses possible

## ✅ Integration Readiness

### Circuit Artifacts
- [ ] movement.json exported from target/
- [ ] attack.json exported from target/
- [ ] deployment.json exported from target/
- [ ] Verification keys generated
- [ ] Circuit artifacts valid JSON

### Public Input Documentation
- [ ] Movement public inputs documented: [old_hash, new_hash]
- [ ] Attack public inputs documented: [commitment, target_x, target_y]
- [ ] Deployment public inputs documented: [commitment]
- [ ] Return types documented (attack returns bool)

### Frontend Integration Plan
- [ ] Web Worker proof generation strategy documented
- [ ] Circuit artifact loading method defined
- [ ] Input formatting documented (Field types)
- [ ] Error handling strategy defined

### Contract Integration Plan
- [ ] Verifier contract requirements documented
- [ ] Hub contract integration points identified
- [ ] Public input passing format defined
- [ ] State update logic documented

## ✅ Performance Validation

### Proof Generation
- [ ] Movement proof < 5 seconds
- [ ] Attack proof < 5 seconds
- [ ] Deployment proof < 5 seconds
- [ ] Optimization opportunities identified

### Proof Verification
- [ ] Movement verification < 500ms
- [ ] Attack verification < 500ms
- [ ] Deployment verification < 500ms
- [ ] Contract gas estimation reasonable

### Proof Size
- [ ] Proof sizes documented (bytes)
- [ ] Proof size acceptable for on-chain storage
- [ ] Compression opportunities identified

## ✅ Documentation Validation

### Completeness
- [ ] README.md covers all circuits
- [ ] QUICK_START.md has all commands
- [ ] TESTING_GUIDE.md has comprehensive tests
- [ ] CIRCUIT_DIAGRAMS.md has visual aids
- [ ] CIRCUITS_COMPLETE.md has summary
- [ ] All code has inline comments

### Accuracy
- [ ] Commands execute successfully
- [ ] Examples match actual circuit inputs
- [ ] Constraint counts verified
- [ ] Performance numbers realistic

### Usability
- [ ] Non-expert can follow installation
- [ ] Commands copy-paste ready
- [ ] Error messages clear
- [ ] Troubleshooting section helpful

## ✅ Code Quality

### Style
- [ ] Consistent naming conventions
- [ ] Clear variable names
- [ ] Logical function organization
- [ ] No dead code

### Comments
- [ ] All constraints explained
- [ ] Complex logic documented
- [ ] Public/private inputs labeled
- [ ] Edge cases noted

### Error Messages
- [ ] All assertions have descriptive messages
- [ ] Error messages indicate which constraint failed
- [ ] Error messages suggest fixes

## ✅ Edge Cases

### Boundary Conditions
- [ ] Coordinate (0, 0) handled correctly
- [ ] Coordinate (9, 9) handled correctly
- [ ] Movement distance 0 allowed
- [ ] Movement distance 2 allowed
- [ ] Self-targeting in attack allowed

### Numerical Edge Cases
- [ ] Salt with all zeros works
- [ ] Salt with all ones works
- [ ] Maximum Field values handled
- [ ] Negative coordinate attempts rejected

### Game Logic Edge Cases
- [ ] Multiple moves with same salt work
- [ ] Different players can occupy same historical position
- [ ] Attack on empty space returns miss

## ✅ Testing Evidence

### Test Results
- [ ] All test cases documented
- [ ] Pass/fail results recorded
- [ ] Error messages captured
- [ ] Performance metrics measured

### Test Coverage
- [ ] Valid inputs tested
- [ ] Invalid inputs tested
- [ ] Edge cases tested
- [ ] Integration scenarios tested

## ✅ Handoff Preparation

### For Frontend Team
- [ ] Circuit artifacts packaged
- [ ] Integration example provided
- [ ] Public input format documented
- [ ] Error handling guide provided

### For Contract Team
- [ ] Verifier requirements documented
- [ ] Public input format specified
- [ ] State update logic defined
- [ ] Test vectors provided

### For QA Team
- [ ] Test plan documented
- [ ] Expected behaviors listed
- [ ] Known limitations documented
- [ ] Bug report template provided

## 🎯 Final Sign-off

### Circuit Developer
- [ ] All circuits implemented correctly
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for integration

**Signed**: _________________ **Date**: _________

### Circuit Reviewer
- [ ] Code review completed
- [ ] Security review completed
- [ ] Documentation reviewed
- [ ] Approved for integration

**Signed**: _________________ **Date**: _________

### Integration Lead
- [ ] Integration plan reviewed
- [ ] Resources allocated
- [ ] Timeline agreed
- [ ] Ready to proceed

**Signed**: _________________ **Date**: _________

---

## Status Tracking

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| Circuit Implementation | ✅ Complete | - | All 3 circuits |
| Documentation | ✅ Complete | - | 7 docs created |
| Compilation | ⏳ Pending | - | Needs nargo |
| Testing | ⏳ Pending | - | Needs test vectors |
| Integration | ⏳ Pending | - | Needs contracts |

## Notes

Use this space to record any issues, blockers, or additional information:

```
[Add notes here]
```

---

**Last Updated**: Circuit implementation phase complete
**Next Milestone**: Circuit compilation and testing
**Blocker**: None (circuits ready for nargo toolchain)
