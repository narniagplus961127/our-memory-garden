import test from "node:test";
import assert from "node:assert/strict";
import { maintenanceAuthorized } from "../../src/lib/maintenance-auth.ts";
test("scheduled maintenance fails closed without a strong matching bearer credential", () => {
  const secret = "local-test-secret-with-more-than-32-characters";
  assert.equal(maintenanceAuthorized(null, secret), false);
  assert.equal(maintenanceAuthorized("Bearer undefined", undefined), false);
  assert.equal(maintenanceAuthorized("Bearer short", "short"), false);
  assert.equal(maintenanceAuthorized("Bearer " + secret + "x", secret), false);
  assert.equal(maintenanceAuthorized("Bearer " + secret, secret), true);
});
