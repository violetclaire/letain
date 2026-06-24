import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeTargetsSource = readFileSync("client/src/pages/RouteTargets.tsx", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function snippetsAround(source: string, marker: string): string {
  let snippets = "";
  let index = 0;

  while ((index = source.indexOf(marker, index)) !== -1) {
    snippets += source.slice(Math.max(0, index - 700), Math.min(source.length, index + 900));
    index += marker.length;
  }

  assert.notEqual(snippets, "", `Missing source marker: ${marker}`);
  return snippets;
}

const contactReadinessSource = [
  sliceBetween(routeTargetsSource, "function contactMetadataText", "function toPayload"),
  snippetsAround(routeTargetsSource, "Contact readiness"),
  sliceBetween(inquiryWorkspaceSource, "function contactMetadataText", "function textTokens"),
  snippetsAround(inquiryWorkspaceSource, "Contact readiness"),
].join("\n");

test("RouteTargets renders private network contact readiness labels", () => {
  assert.match(routeTargetsSource, /Contact readiness/);
  assert.match(routeTargetsSource, /Ready to contact/);
  assert.match(routeTargetsSource, /Phone ready/);
  assert.match(routeTargetsSource, /Email ready/);
  assert.match(routeTargetsSource, /Instagram\/notes only/);
  assert.match(routeTargetsSource, /Contact method missing/);
  assert.match(routeTargetsSource, /Preferred channel unknown/);
  assert.match(routeTargetsSource, /Preferred channel missing/);
  assert.match(routeTargetsSource, /Add phone or email before preflight/);
  assert.match(routeTargetsSource, /Known, but not safely reachable yet/);
});

test("contact readiness is derived from existing route target metadata only", () => {
  assert.match(routeTargetsSource, /function contactReadinessFor/);
  assert.match(routeTargetsSource, /t\.phone\?\.trim\(\)/);
  assert.match(routeTargetsSource, /t\.email\?\.trim\(\)/);
  assert.match(routeTargetsSource, /Pick<RouteTarget, "notes" \| "tags" \| "capabilities">/);
  assert.match(routeTargetsSource, /\.\.\.\(t\.tags \?\? \[\]\)/);
  assert.match(routeTargetsSource, /\.\.\.\(t\.capabilities \?\? \[\]\)/);
  assert.match(routeTargetsSource, /instagram\|insta\|ig/);
  assert.doesNotMatch(routeTargetsSource, /preferred_contact|contact_readiness|contactReadiness:/);
});

test("Inquiry Workspace surfaces the same readiness in existing route-target displays", () => {
  assert.match(inquiryWorkspaceSource, /email\?: string \| null/);
  assert.match(inquiryWorkspaceSource, /phone\?: string \| null/);
  assert.match(inquiryWorkspaceSource, /Contact readiness/);
  assert.match(inquiryWorkspaceSource, /const readiness = contactReadinessFor\(target\)/);
  assert.match(inquiryWorkspaceSource, /Internal draft routing candidates/);
  assert.match(inquiryWorkspaceSource, /Trusted network/);
});

test("contact readiness does not introduce send, preflight, SMS, email, or upload endpoint behavior", () => {
  assert.doesNotMatch(contactReadinessSource, /\/api\/inquiry-routes\/[^"`']+\/preflight/);
  assert.doesNotMatch(contactReadinessSource, /\/api\/inquiry-responses\/[^"`']+\/send/);
  assert.doesNotMatch(contactReadinessSource, /sendSMS|sendSms|sendEmail|sendInfoSheetEmail|sendProposalEmail/);
  assert.doesNotMatch(contactReadinessSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(contactReadinessSource, /createPayment|createContract|Square/);
});

test("contact readiness does not add schema, migrations, scoring, ranking, or reputation language", () => {
  assert.doesNotMatch(contactReadinessSource, /pgTable|drizzle|migration|migrations/i);
  assert.doesNotMatch(contactReadinessSource, /trust_score|provider_score|person_score|trustScore|providerScore|personScore/);
  assert.doesNotMatch(contactReadinessSource, /trust score|provider score|person score|reputation|ranking|paid placement/i);
});
