import { describe, it, expect } from "vitest";
import {
  getNextProgressStep,
  isProgressAdvanceAllowed,
} from "./progress";

describe("vendor progress transitions", () => {
  it("determines next step from menunggu to dipersiapkan", () => {
    const step = getNextProgressStep("menunggu");
    expect(step.next).toBe("dipersiapkan");
    expect(step.nextLabel).toBe("Mulai Proses");
    expect(step.isComplete).toBe(false);
  });

  it("determines next step from dipersiapkan to dikirim", () => {
    const step = getNextProgressStep("dipersiapkan");
    expect(step.next).toBe("dikirim");
    expect(step.nextLabel).toBe("Tandai Dikirim");
    expect(step.isComplete).toBe(false);
  });

  it("determines next step from dikirim to sampai", () => {
    const step = getNextProgressStep("dikirim");
    expect(step.next).toBe("sampai");
    expect(step.nextLabel).toBe("Tandai Sampai");
    expect(step.isComplete).toBe(false);
  });

  it("determines next step from sampai to selesai", () => {
    const step = getNextProgressStep("sampai");
    expect(step.next).toBe("selesai");
    expect(step.nextLabel).toBe("Tandai Selesai");
    expect(step.isComplete).toBe(false);
  });

  it("returns null next step when already selesai", () => {
    const step = getNextProgressStep("selesai");
    expect(step.next).toBeNull();
    expect(step.nextLabel).toBeNull();
    expect(step.isComplete).toBe(true);
  });

  it("validates that progress can only advance forward", () => {
    expect(isProgressAdvanceAllowed("menunggu", "dipersiapkan")).toBe(true);
    expect(isProgressAdvanceAllowed("dipersiapkan", "dikirim")).toBe(true);
    expect(isProgressAdvanceAllowed("dikirim", "sampai")).toBe(true);
    expect(isProgressAdvanceAllowed("sampai", "selesai")).toBe(true);

    // Backward transition disallowed
    expect(isProgressAdvanceAllowed("selesai", "sampai")).toBe(false);
    expect(isProgressAdvanceAllowed("dikirim", "dipersiapkan")).toBe(false);
    expect(isProgressAdvanceAllowed("dipersiapkan", "menunggu")).toBe(false);

    // Same step disallowed
    expect(isProgressAdvanceAllowed("dipersiapkan", "dipersiapkan")).toBe(false);
  });
});
