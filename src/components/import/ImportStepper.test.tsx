import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ImportStepper } from "./ImportStepper";

describe("ImportStepper Component", () => {
  it("renders all 3 steps with correct numbers and labels", () => {
    const html = renderToString(
      <ImportStepper currentStep="unggah" className="max-w-2xl mx-auto" />
    );

    expect(html).toContain("1");
    expect(html).toContain("Unggah");
    expect(html).toContain("2");
    expect(html).toContain("Periksa");
    expect(html).toContain("3");
    expect(html).toContain("Konfirmasi");
    expect(html).toContain("max-w-2xl mx-auto");
  });

  it("indicates active, completed, and pending steps accurately", () => {
    const html = renderToString(
      <ImportStepper
        currentStep="periksa"
        canNavigateToPeriksa={true}
        canNavigateToKonfirmasi={false}
      />
    );

    // Step 1 completed (primary color)
    expect(html).toContain("bg-primary/80");
    // Step 2 active
    expect(html).toContain("bg-primary text-white shadow-xs");
  });

  it("enables step 3 when canNavigateToKonfirmasi is true", () => {
    const html = renderToString(
      <ImportStepper
        currentStep="periksa"
        canNavigateToPeriksa={true}
        canNavigateToKonfirmasi={true}
      />
    );

    // Step 3 clickable styling
    expect(html).toContain("bg-primary-50 text-primary border border-primary/30");
  });
});
