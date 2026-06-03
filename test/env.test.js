import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv } from "../src/lib/env.js";

test("parses dotenv-style values", () => {
  const env = parseEnv(`
# comment
VANTA_CLIENT_ID=vci_test
TEST_SECRET="secret=value"
VANTA_API_SCOPE='vanta-api.all:read'
IGNORED_LINE
`);

  assert.deepEqual(env, {
    VANTA_CLIENT_ID: "vci_test",
    TEST_SECRET: "secret=value",
    VANTA_API_SCOPE: "vanta-api.all:read",
  });
});
