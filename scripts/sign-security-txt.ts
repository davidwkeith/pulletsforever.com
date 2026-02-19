#!/usr/bin/env node
import "dotenv/config";
import { addSriHashes, signSecurityTxt } from "@dwk/eleventy-shared/postbuild";

const buildDir = "./_site";
const dryRun = process.argv.includes("--dry-run");

try {
  await addSriHashes(buildDir);
  await signSecurityTxt(buildDir, { dryRun });
} catch (e) {
  console.error("Postbuild error:", e);
  process.exit(1);
}
