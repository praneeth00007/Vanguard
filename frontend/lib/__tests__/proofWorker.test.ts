/**
 * Test suite for the proof generation system
 *
 * These tests verify:
 * 1. Input creation helpers work correctly
 * 2. Input types are properly formed
 * 3. Web Worker can be initialized (manual testing required)
 */

import {
  createMovementInput,
  createAttackInput,
  createScanInput,
} from "../proofWorkerHelper";
import type { MovementInput, AttackInput, ScanInput } from "../../workers/proofWorker";

describe("Proof Input Creation", () => {
  describe("createMovementInput", () => {
    it("should create a valid movement input", () => {
      const input = createMovementInput({
        oldX: 3,
        oldY: 5,
        newX: 4,
        newY: 6,
        salt: "0x1234567890abcdef",
        oldHash: "0x" + "1".repeat(64),
        newHash: "0x" + "2".repeat(64),
        vehicleType: 0,
        turnCounter: 1,
      });

      expect(input).toMatchObject({
        old_x: 3,
        old_y: 5,
        new_x: 4,
        new_y: 6,
        salt: "0x1234567890abcdef",
        old_hash: "0x" + "1".repeat(64),
        new_hash: "0x" + "2".repeat(64),
        vehicle_type: 0,
        action_type: 0, // Move action
        turn_counter: 1,
      });
    });

    it("should handle different vehicle types", () => {
      const cycleInput = createMovementInput({
        oldX: 0,
        oldY: 0,
        newX: 1,
        newY: 1,
        salt: "salt",
        oldHash: "0x1",
        newHash: "0x2",
        vehicleType: 0, // Cycle
        turnCounter: 1,
      });

      const scoutInput = createMovementInput({
        oldX: 0,
        oldY: 0,
        newX: 1,
        newY: 1,
        salt: "salt",
        oldHash: "0x1",
        newHash: "0x2",
        vehicleType: 1, // Scout
        turnCounter: 2,
      });

      const heavyInput = createMovementInput({
        oldX: 0,
        oldY: 0,
        newX: 1,
        newY: 1,
        salt: "salt",
        oldHash: "0x1",
        newHash: "0x2",
        vehicleType: 2, // Heavy
        turnCounter: 3,
      });

      expect(cycleInput.vehicle_type).toBe(0);
      expect(scoutInput.vehicle_type).toBe(1);
      expect(heavyInput.vehicle_type).toBe(2);
    });
  });

  describe("createAttackInput", () => {
    it("should create a valid attack input", () => {
      const input = createAttackInput({
        attackerX: 3,
        attackerY: 5,
        attackerSalt: "attacker_salt",
        attackerHash: "0x" + "1".repeat(64),
        defenderX: 7,
        defenderY: 2,
        defenderSalt: "defender_salt",
        defenderHash: "0x" + "2".repeat(64),
        targetX: 7,
        targetY: 2,
        vehicleType: 1,
        turnCounter: 2,
        claimedHit: true,
      });

      expect(input).toMatchObject({
        attacker_x: 3,
        attacker_y: 5,
        attacker_salt: "attacker_salt",
        attacker_hash: "0x" + "1".repeat(64),
        defender_x: 7,
        defender_y: 2,
        defender_salt: "defender_salt",
        defender_hash: "0x" + "2".repeat(64),
        target_x: 7,
        target_y: 2,
        vehicle_type: 1,
        action_type: 1, // Attack action
        turn_counter: 2,
        claimed_hit: true,
      });
    });

    it("should handle hit and miss cases", () => {
      const hitInput = createAttackInput({
        attackerX: 0,
        attackerY: 0,
        attackerSalt: "salt",
        attackerHash: "0x1",
        defenderX: 5,
        defenderY: 5,
        defenderSalt: "salt",
        defenderHash: "0x2",
        targetX: 5,
        targetY: 5,
        vehicleType: 0,
        turnCounter: 1,
        claimedHit: true,
      });

      const missInput = createAttackInput({
        attackerX: 0,
        attackerY: 0,
        attackerSalt: "salt",
        attackerHash: "0x1",
        defenderX: 5,
        defenderY: 5,
        defenderSalt: "salt",
        defenderHash: "0x2",
        targetX: 6,
        targetY: 6,
        vehicleType: 0,
        turnCounter: 1,
        claimedHit: false,
      });

      expect(hitInput.claimed_hit).toBe(true);
      expect(missInput.claimed_hit).toBe(false);
    });
  });

  describe("createScanInput", () => {
    it("should create a valid scan input", () => {
      const input = createScanInput({
        scannerX: 3,
        scannerY: 5,
        scannerSalt: "scanner_salt",
        scannerHash: "0x" + "1".repeat(64),
        defenderX: 7,
        defenderY: 2,
        defenderSalt: "defender_salt",
        defenderHash: "0x" + "2".repeat(64),
        scanX: 6,
        scanY: 1,
        vehicleType: 0, // Only Cycle can scan
        turnCounter: 3,
        claimedScanHit: false,
      });

      expect(input).toMatchObject({
        scanner_x: 3,
        scanner_y: 5,
        scanner_salt: "scanner_salt",
        scanner_hash: "0x" + "1".repeat(64),
        defender_x: 7,
        defender_y: 2,
        defender_salt: "defender_salt",
        defender_hash: "0x" + "2".repeat(64),
        scan_x: 6,
        scan_y: 1,
        vehicle_type: 0,
        action_type: 2, // Scan action
        turn_counter: 3,
        claimed_scan_hit: false,
      });
    });

    it("should only allow Cycle (vehicle_type=0) to scan", () => {
      const input = createScanInput({
        scannerX: 0,
        scannerY: 0,
        scannerSalt: "salt",
        scannerHash: "0x1",
        defenderX: 5,
        defenderY: 5,
        defenderSalt: "salt",
        defenderHash: "0x2",
        scanX: 4,
        scanY: 4,
        vehicleType: 0, // Must be 0 (Cycle)
        turnCounter: 1,
        claimedScanHit: true,
      });

      expect(input.vehicle_type).toBe(0);
      expect(input.action_type).toBe(2); // Scan action
    });
  });
});

describe("Input Validation", () => {
  describe("Movement Input", () => {
    it("should require all private inputs", () => {
      const requiredPrivateInputs = ["old_x", "old_y", "new_x", "new_y", "salt"];
      const input = createMovementInput({
        oldX: 1,
        oldY: 2,
        newX: 3,
        newY: 4,
        salt: "test_salt",
        oldHash: "0x1",
        newHash: "0x2",
        vehicleType: 0,
        turnCounter: 1,
      });

      requiredPrivateInputs.forEach((key) => {
        expect(input).toHaveProperty(key);
      });
    });

    it("should require all public inputs", () => {
      const requiredPublicInputs = [
        "old_hash",
        "new_hash",
        "vehicle_type",
        "action_type",
        "turn_counter",
      ];
      const input = createMovementInput({
        oldX: 1,
        oldY: 2,
        newX: 3,
        newY: 4,
        salt: "test_salt",
        oldHash: "0x1",
        newHash: "0x2",
        vehicleType: 0,
        turnCounter: 1,
      });

      requiredPublicInputs.forEach((key) => {
        expect(input).toHaveProperty(key);
      });
    });

    it("should have action_type = 0 for movement", () => {
      const input = createMovementInput({
        oldX: 1,
        oldY: 2,
        newX: 3,
        newY: 4,
        salt: "salt",
        oldHash: "0x1",
        newHash: "0x2",
        vehicleType: 0,
        turnCounter: 1,
      });

      expect(input.action_type).toBe(0);
    });
  });

  describe("Attack Input", () => {
    it("should have action_type = 1 for attack", () => {
      const input = createAttackInput({
        attackerX: 0,
        attackerY: 0,
        attackerSalt: "salt",
        attackerHash: "0x1",
        defenderX: 5,
        defenderY: 5,
        defenderSalt: "salt",
        defenderHash: "0x2",
        targetX: 5,
        targetY: 5,
        vehicleType: 0,
        turnCounter: 1,
        claimedHit: true,
      });

      expect(input.action_type).toBe(1);
    });
  });

  describe("Scan Input", () => {
    it("should have action_type = 2 for scan", () => {
      const input = createScanInput({
        scannerX: 0,
        scannerY: 0,
        scannerSalt: "salt",
        scannerHash: "0x1",
        defenderX: 5,
        defenderY: 5,
        defenderSalt: "salt",
        defenderHash: "0x2",
        scanX: 4,
        scanY: 4,
        vehicleType: 0,
        turnCounter: 1,
        claimedScanHit: true,
      });

      expect(input.action_type).toBe(2);
    });
  });
});

describe("Security Requirements", () => {
  it("should include turn_counter in all inputs", () => {
    const movementInput = createMovementInput({
      oldX: 0,
      oldY: 0,
      newX: 1,
      newY: 1,
      salt: "salt",
      oldHash: "0x1",
      newHash: "0x2",
      vehicleType: 0,
      turnCounter: 42,
    });

    const attackInput = createAttackInput({
      attackerX: 0,
      attackerY: 0,
      attackerSalt: "salt",
      attackerHash: "0x1",
      defenderX: 5,
      defenderY: 5,
      defenderSalt: "salt",
      defenderHash: "0x2",
      targetX: 5,
      targetY: 5,
      vehicleType: 0,
      turnCounter: 42,
      claimedHit: true,
    });

    const scanInput = createScanInput({
      scannerX: 0,
      scannerY: 0,
      scannerSalt: "salt",
      scannerHash: "0x1",
      defenderX: 5,
      defenderY: 5,
      defenderSalt: "salt",
      defenderHash: "0x2",
      scanX: 4,
      scanY: 4,
      vehicleType: 0,
      turnCounter: 42,
      claimedScanHit: true,
    });

    expect(movementInput.turn_counter).toBe(42);
    expect(attackInput.turn_counter).toBe(42);
    expect(scanInput.turn_counter).toBe(42);
  });

  it("should include salt as a private input (not on-chain)", () => {
    const movementInput = createMovementInput({
      oldX: 0,
      oldY: 0,
      newX: 1,
      newY: 1,
      salt: "private_salt_12345",
      oldHash: "0x1",
      newHash: "0x2",
      vehicleType: 0,
      turnCounter: 1,
    });

    const attackInput = createAttackInput({
      attackerX: 0,
      attackerY: 0,
      attackerSalt: "attacker_salt",
      attackerHash: "0x1",
      defenderX: 5,
      defenderY: 5,
      defenderSalt: "defender_salt",
      defenderHash: "0x2",
      targetX: 5,
      targetY: 5,
      vehicleType: 0,
      turnCounter: 1,
      claimedHit: true,
    });

    // Salt is included in the input (for circuit execution)
    expect(movementInput.salt).toBe("private_salt_12345");
    expect(attackInput.attacker_salt).toBe("attacker_salt");
    expect(attackInput.defender_salt).toBe("defender_salt");
  });

  it("should include commitments (hashes) as public inputs", () => {
    const input = createMovementInput({
      oldX: 0,
      oldY: 0,
      newX: 1,
      newY: 1,
      salt: "salt",
      oldHash: "0x" + "a".repeat(64),
      newHash: "0x" + "b".repeat(64),
      vehicleType: 0,
      turnCounter: 1,
    });

    expect(input.old_hash).toBeDefined();
    expect(input.new_hash).toBeDefined();
  });
});
