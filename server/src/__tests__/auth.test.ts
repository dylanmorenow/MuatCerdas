import { describe, it, expect } from "vitest";
import { isDriverAllowed } from "../auth";

describe("isDriverAllowed (penegakan peran driver, FR-0004-2)", () => {
  it("driver boleh GET surface miliknya", () => {
    expect(isDriverAllowed("GET", "/api/driver/me")).toBe(true);
    expect(isDriverAllowed("GET", "/api/auth/me")).toBe(true);
    expect(isDriverAllowed("GET", "/api/roadmap")).toBe(true);
  });
  it("driver TIDAK boleh layar admin / mutasi", () => {
    expect(isDriverAllowed("GET", "/api/dashboard")).toBe(false);
    expect(isDriverAllowed("GET", "/api/tires/units")).toBe(false);
    expect(isDriverAllowed("PUT", "/api/roadmap/segment/SEG-1")).toBe(false);
    expect(isDriverAllowed("POST", "/api/finance/params")).toBe(false);
  });
  it("driver boleh POST lapor massa unitnya (F2); kepemilikan unit dicek di route", () => {
    expect(isDriverAllowed("POST", "/api/mass")).toBe(true);
    expect(isDriverAllowed("GET", "/api/mass/monitoring")).toBe(false); // monitoring = admin
  });
});
