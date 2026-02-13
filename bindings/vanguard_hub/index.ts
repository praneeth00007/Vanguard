// Auto-generated bindings should live here. This minimal shim keeps the frontend buildable.
// Replace with the output from `bun run bindings`.

export type MoveUnitArgs = {
  player: string;
  verifier: string;
  proof: Uint8Array;
  publicInputs: Uint8Array[];
};

export type AttackArgs = {
  attacker: string;
  verifier: string;
  proof: Uint8Array;
  publicInputs: Uint8Array[];
};

export class VanguardHubContract {
  constructor(public readonly contractId: string) {}

  async move_unit(_args: MoveUnitArgs): Promise<void> {
    throw new Error("Bindings not generated. Run bun run bindings.");
  }

  async attack(_args: AttackArgs): Promise<void> {
    throw new Error("Bindings not generated. Run bun run bindings.");
  }
}
