#!/usr/bin/env node
/**
 * Sign security.txt with OpenPGP cleartext signature (RFC 9116 §2.3)
 *
 * Produces both a cleartext-signed security.txt (RFC 4880 §7) and a
 * detached binary signature (.sig) for belt-and-suspenders verification.
 *
 * Required environment variables:
 *   GPG_PRIVATE_KEY  - ASCII-armored GPG private key
 *   GPG_KEY_ID       - Key fingerprint or ID for signing
 *
 * Usage: node scripts/sign-security-txt.js [--dry-run]
 *
 * @see https://www.rfc-editor.org/rfc/rfc9116#section-2.3
 * @see https://www.rfc-editor.org/rfc/rfc4880#section-7
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SECURITY_TXT = "_site/.well-known/security.txt";
const DRY_RUN = process.argv.includes("--dry-run");

function main() {
  if (!existsSync(SECURITY_TXT)) {
    console.error(`[sign] ${SECURITY_TXT} not found — run build first`);
    process.exit(1);
  }

  const privateKey = process.env.GPG_PRIVATE_KEY;
  const keyId = process.env.GPG_KEY_ID;

  if (!privateKey || !keyId) {
    console.warn("[sign] GPG_PRIVATE_KEY or GPG_KEY_ID not set, skipping signature");
    return;
  }

  const content = readFileSync(SECURITY_TXT, "utf-8");

  if (DRY_RUN) {
    console.log("[sign] dry-run: would sign security.txt with key", keyId);
    console.log("[sign] dry-run: content to sign:");
    console.log(content);
    return;
  }

  // Use a temporary GPG home to avoid polluting the user's keyring
  const gpgHome = mkdtempSync(join(tmpdir(), "gpg-sign-"));
  const gpgOpts = `--homedir ${gpgHome} --batch --yes --pinentry-mode loopback`;

  try {
    // Import the private key via stdin to avoid shell escaping issues
    execSync(`gpg ${gpgOpts} --import`, { input: privateKey });

    // Cleartext signature (RFC 9116 compliant)
    const clearsigned = execSync(
      `gpg ${gpgOpts} --local-user ${keyId} --clearsign`,
      { input: content, encoding: "utf-8" }
    );
    writeFileSync(SECURITY_TXT, clearsigned);
    console.log("[sign] wrote cleartext-signed", SECURITY_TXT);

    // Detached binary signature
    execSync(
      `gpg ${gpgOpts} --local-user ${keyId} --detach-sign --output ${SECURITY_TXT}.sig ${SECURITY_TXT}`
    );
    console.log("[sign] wrote detached signature", `${SECURITY_TXT}.sig`);
  } finally {
    rmSync(gpgHome, { recursive: true, force: true });
  }
}

main();
