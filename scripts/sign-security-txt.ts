#!/usr/bin/env node
/**
 * Sign security.txt with OpenPGP cleartext signature (RFC 9116 §2.3)
 *
 * Uses openpgp.js — no gpg binary required.
 *
 * Required environment variables:
 *   GPG_PRIVATE_KEY  - ASCII-armored PGP private key
 *
 * Usage: node scripts/sign-security-txt.ts [--dry-run]
 *
 * @see https://www.rfc-editor.org/rfc/rfc9116#section-2.3
 * @see https://www.rfc-editor.org/rfc/rfc4880#section-7
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as openpgp from "openpgp";

const SECURITY_TXT = "_site/.well-known/security.txt";
const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  if (!existsSync(SECURITY_TXT)) {
    console.error(`[sign] ${SECURITY_TXT} not found — run build first`);
    process.exit(1);
  }

  const armoredKey = process.env.GPG_PRIVATE_KEY;

  if (!armoredKey) {
    console.warn("[sign] GPG_PRIVATE_KEY not set, skipping signature");
    return;
  }

  const privateKey = await openpgp.readPrivateKey({ armoredKey });
  const content = readFileSync(SECURITY_TXT, "utf-8");

  if (DRY_RUN) {
    console.log("[sign] dry-run: would sign security.txt with key", privateKey.getKeyID().toHex());
    console.log("[sign] dry-run: content to sign:");
    console.log(content);
    return;
  }

  // Cleartext signature (RFC 9116 compliant)
  const message = await openpgp.createCleartextMessage({ text: content });
  const clearsigned = await openpgp.sign({
    message,
    signingKeys: privateKey,
  });
  writeFileSync(SECURITY_TXT, clearsigned);
  console.log("[sign] wrote cleartext-signed", SECURITY_TXT);
}

main();
