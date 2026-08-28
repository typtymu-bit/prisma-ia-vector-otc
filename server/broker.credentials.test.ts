import { describe, expect, it } from "vitest";
import { verifyBrokerCredentials } from "./broker";

describe("OPTGO read-only credentials", () => {
  it("authenticates with the configured server-side credentials without returning secret values", async () => {
    const result = await verifyBrokerCredentials();
    expect(result.configured).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("ssid");
  }, 15_000);
});
