import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("tracker ships essential experiences", async () => { const source = await readFile(new URL("../app/tracker.tsx", import.meta.url), "utf8"); for (const feature of ["Christmas countdown", "night-city-lights", "ETA Search", "LETTERS PICKED UP", "Send Popper a message", "Naughty or Nice", "ALTITUDE", "Interactive globe"]) assert.match(source, new RegExp(feature, "i")); });
test("ETA window is constrained to 181 minutes", async () => { const source = await readFile(new URL("../app/tracker.tsx", import.meta.url), "utf8"); assert.match(source, /% 181/); });
test("route stops are restricted to the local nighttime window", async () => { const source = await readFile(new URL("../app/tracker.tsx", import.meta.url), "utf8"); assert.match(source, /hour >= 22 \|\| hour < 4/); });
test("environment template documents required keys", async () => { const env = await readFile(new URL("../.env.example", import.meta.url), "utf8"); assert.match(env, /NEXT_PUBLIC_MAPBOX_TOKEN/); assert.match(env, /MAPBOX_ACCESS_TOKEN/); });
