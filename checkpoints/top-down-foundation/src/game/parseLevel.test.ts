import { describe, expect, it } from "vitest";
import { parseLevel } from "./parseLevel";

describe("parseLevel", () => {
  it("rejects ragged maps", () => {
    expect(() =>
      parseLevel(`
####
#P.#
#X#
####
`),
    ).toThrow(/width/);
  });
});
