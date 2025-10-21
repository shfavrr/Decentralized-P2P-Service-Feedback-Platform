import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, principalCV, listCV, tupleCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_EPOCH = 101;
const ERR_NO_ALLOCATIONS = 102;
const ERR_INSUFFICIENT_BALANCE = 103;
const ERR_DISTRIBUTION_PAUSED = 104;
const ERR_INVALID_PROVIDER = 105;
const ERR_ALREADY_CLAIMED = 106;
const ERR_NO_PENDING = 107;
const ERR_INVALID_AMOUNT = 108;
const ERR_EPOCH_NOT_READY = 109;
const ERR_MAX_PROVIDERS_EXCEEDED = 110;
const ERR_INVALID_MIN_PAYOUT = 111;
const ERR_INVALID_DISTRIBUTION_FREQUENCY = 112;
const ERR_INVALID_DUST_THRESHOLD = 113;
const ERR_CONTRACT_NOT_SET = 114;
const ERR_INVALID_STATUS = 115;
const ERR_OVERFLOW = 116;
const ERR_UNDERFLOW = 117;
const ERR_DIVISION_BY_ZERO = 118;
const ERR_INVALID_PARAM = 119;
const ERR_PAUSE_NOT_ALLOWED = 120;

interface Allocation {
  provider: string;
  amount: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class MockContractCall {
  constructor(public result: any) {}
}

class AllocationDistributorMock {
  state: {
    nextEpoch: number;
    distributionPaused: boolean;
    minPayout: number;
    dustThreshold: number;
    maxProviders: number;
    distributionFrequency: number;
    admin: string;
    fundingPoolContract: string;
    allocationCalculatorContract: string;
    lastDistributionBlock: number;
    allocationsByEpoch: Map<number, Allocation[]>;
    pendingClaims: Map<string, number>;
    epochStatus: Map<number, boolean>;
    totalDistributedByEpoch: Map<number, number>;
  } = {
    nextEpoch: 1,
    distributionPaused: false,
    minPayout: 100,
    dustThreshold: 10,
    maxProviders: 500,
    distributionFrequency: 144,
    admin: "ST1ADMIN",
    fundingPoolContract: "SP000000000000000000002Q6VF78.bogus-pool",
    allocationCalculatorContract: "SP000000000000000000002Q6VF78.bogus-calc",
    lastDistributionBlock: 0,
    allocationsByEpoch: new Map(),
    pendingClaims: new Map(),
    epochStatus: new Map(),
    totalDistributedByEpoch: new Map(),
  };
  blockHeight: number = 1000;
  caller: string = "ST1ADMIN";
  transfers: Array<{ to: string; amount: number }> = [];
  events: Array<any> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextEpoch: 1,
      distributionPaused: false,
      minPayout: 100,
      dustThreshold: 10,
      maxProviders: 500,
      distributionFrequency: 144,
      admin: "ST1ADMIN",
      fundingPoolContract: "SP000000000000000000002Q6VF78.bogus-pool",
      allocationCalculatorContract: "SP000000000000000000002Q6VF78.bogus-calc",
      lastDistributionBlock: 0,
      allocationsByEpoch: new Map(),
      pendingClaims: new Map(),
      epochStatus: new Map(),
      totalDistributedByEpoch: new Map(),
    };
    this.blockHeight = 1000;
    this.caller = "ST1ADMIN";
    this.transfers = [];
    this.events = [];
  }

  getCurrentEpoch(): number {
    return Math.floor((this.blockHeight - 1) / this.state.distributionFrequency);
  }

  mockContractCall(contract: string, func: string, args: any[]): any {
    if (contract === this.state.allocationCalculatorContract && func === "compute-allocations") {
      const epoch = args[0];
      return this.state.allocationsByEpoch.get(epoch) || [];
    }
    if (contract === this.state.fundingPoolContract && func === "get-available-balance") {
      return 1000000;
    }
    if (contract === this.state.fundingPoolContract && func === "transfer-funds") {
      const [to, amount] = args;
      this.transfers.push({ to, amount });
      return { ok: true, value: true };
    }
    return { ok: false, value: ERR_CONTRACT_NOT_SET };
  }

  distributeFunds(): Result<boolean> {
    const currentEpoch = this.getCurrentEpoch();
    const prevEpoch = currentEpoch - 1;
    const allocs = this.mockContractCall(this.state.allocationCalculatorContract, "compute-allocations", [prevEpoch]);
    if (!allocs || allocs.length === 0) return { ok: false, value: ERR_NO_ALLOCATIONS };
    const poolBalance = this.mockContractCall(this.state.fundingPoolContract, "get-available-balance", []);
    if (this.state.distributionPaused) return { ok: false, value: ERR_DISTRIBUTION_PAUSED };
    if (currentEpoch < prevEpoch + 1) return { ok: false, value: ERR_EPOCH_NOT_READY };
    const totalAllocSum = allocs.reduce((sum: number, a: Allocation) => sum + a.amount, 0);
    if (poolBalance < totalAllocSum) return { ok: false, value: ERR_INSUFFICIENT_BALANCE };
    if (allocs.length > this.state.maxProviders) return { ok: false, value: ERR_MAX_PROVIDERS_EXCEEDED };
    if (this.state.epochStatus.get(prevEpoch)) return { ok: false, value: ERR_ALREADY_CLAIMED };
    allocs.forEach((alloc: Allocation) => {
      if (alloc.amount >= this.state.minPayout) {
        if (alloc.amount <= this.state.dustThreshold) {
          const currentPending = this.state.pendingClaims.get(alloc.provider) || 0;
          this.state.pendingClaims.set(alloc.provider, currentPending + alloc.amount);
        } else {
          this.mockContractCall(this.state.fundingPoolContract, "transfer-funds", [alloc.provider, alloc.amount]);
        }
      }
    });
    this.state.epochStatus.set(prevEpoch, true);
    this.state.totalDistributedByEpoch.set(prevEpoch, totalAllocSum);
    this.state.lastDistributionBlock = this.blockHeight;
    this.events.push({ event: "funds-distributed", epoch: prevEpoch, total: totalAllocSum });
    return { ok: true, value: true };
  }

  claimAllocation(): Result<number> {
    const pending = this.state.pendingClaims.get(this.caller) || 0;
    if (pending === 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.mockContractCall(this.state.fundingPoolContract, "transfer-funds", [this.caller, pending]);
    this.state.pendingClaims.delete(this.caller);
    this.events.push({ event: "allocation-claimed", provider: this.caller, amount: pending });
    return { ok: true, value: pending };
  }

  setMinPayout(newMin: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newMin <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.minPayout = newMin;
    return { ok: true, value: true };
  }

  pauseDistribution(pause: boolean): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.distributionPaused = pause;
    return { ok: true, value: true };
  }

  getPendingClaim(provider: string): number {
    return this.state.pendingClaims.get(provider) || 0;
  }
}

describe("AllocationDistributor", () => {
  let contract: AllocationDistributorMock;

  beforeEach(() => {
    contract = new AllocationDistributorMock();
    contract.reset();
  });

  it("distributes funds successfully", () => {
    contract.state.allocationsByEpoch.set(0, [
      { provider: "ST1PROV", amount: 500 },
      { provider: "ST2PROV", amount: 500 },
    ]);
    contract.blockHeight = 145;
    const result = contract.distributeFunds();
    expect(result.ok).toBe(true);
    expect(contract.transfers).toEqual([
      { to: "ST1PROV", amount: 500 },
      { to: "ST2PROV", amount: 500 },
    ]);
    expect(contract.events[0]).toEqual({ event: "funds-distributed", epoch: 0, total: 1000 });
    expect(contract.state.epochStatus.get(0)).toBe(true);
    expect(contract.state.totalDistributedByEpoch.get(0)).toBe(1000);
  });

  it("claims pending allocation successfully", () => {
    contract.state.pendingClaims.set("ST1PROV", 200);
    contract.caller = "ST1PROV";
    const result = contract.claimAllocation();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(200);
    expect(contract.transfers).toEqual([{ to: "ST1PROV", amount: 200 }]);
    expect(contract.events[0]).toEqual({ event: "allocation-claimed", provider: "ST1PROV", amount: 200 });
    expect(contract.state.pendingClaims.has("ST1PROV")).toBe(false);
  });

  it("rejects claim with no pending", () => {
    const result = contract.claimAllocation();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("sets min payout successfully", () => {
    const result = contract.setMinPayout(200);
    expect(result.ok).toBe(true);
    expect(contract.state.minPayout).toBe(200);
  });

  it("rejects set min payout by non-admin", () => {
    contract.caller = "ST2FAKE";
    const result = contract.setMinPayout(200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects distribution with insufficient balance", () => {
    contract.state.allocationsByEpoch.set(0, [
      { provider: "ST1PROV", amount: 1000001 },
    ]);
    contract.blockHeight = 145;
    const result = contract.distributeFunds();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INSUFFICIENT_BALANCE);
  });
  
  it("handles max providers exceeded", () => {
    const allocs: Allocation[] = [];
    for (let i = 0; i < 501; i++) {
      allocs.push({ provider: `ST${i}PROV`, amount: 1 });
    }
    contract.state.allocationsByEpoch.set(0, allocs);
    contract.blockHeight = 145;
    const result = contract.distributeFunds();
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PROVIDERS_EXCEEDED);
  });
});