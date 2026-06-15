import { describe, it, expect } from "vitest";
import { checkCredentials, type AuthConfig } from "../auth";

const cfg: AuthConfig = { enabled: true, username: "kpp", password: "rahasia", secret: "s" };

describe("checkCredentials", () => {
  it("kredensial benar → true", () => {
    expect(checkCredentials("kpp", "rahasia", cfg)).toBe(true);
  });
  it("password salah → false", () => {
    expect(checkCredentials("kpp", "salah", cfg)).toBe(false);
  });
  it("username salah → false", () => {
    expect(checkCredentials("lain", "rahasia", cfg)).toBe(false);
  });
  it("password kosong selalu ditolak (walau config kosong)", () => {
    expect(checkCredentials("kpp", "", { ...cfg, password: "" })).toBe(false);
  });
});
