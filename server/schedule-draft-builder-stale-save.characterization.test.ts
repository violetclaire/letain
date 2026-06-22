import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");

test("Schedule Draft Builder sends the loaded updatedAt as a private save version", () => {
  assert.match(builderSource, /updatedAt\?: string \| null/);
  assert.match(builderSource, /const \[loadedUpdatedAt, setLoadedUpdatedAt\] = useState<string \| null>\(null\)/);
  assert.match(builderSource, /setLoadedUpdatedAt\(d\.updatedAt \?\? null\)/);
  assert.match(builderSource, /expectedUpdatedAt: loadedUpdatedAt/);
});

test("Schedule Draft Builder updates the loaded version only after a successful save", () => {
  assert.match(builderSource, /const data = await res\.json\(\) as Draft/);
  assert.match(builderSource, /setSavedSnapshot\(snapshot\)/);
  assert.match(builderSource, /setLoadedUpdatedAt\(data\.updatedAt \?\? null\)/);
});

test("stale schedule draft saves return a clear private-draft conflict", () => {
  assert.match(routesSource, /body\.expectedUpdatedAt/);
  assert.match(routesSource, /scheduleDraftVersionChanged\(draft\.updatedAt, body\.expectedUpdatedAt\)/);
  assert.match(routesSource, /res\.status\(409\)\.json/);
  assert.match(routesSource, /This schedule draft changed elsewhere\. Refresh before saving\./);
});
