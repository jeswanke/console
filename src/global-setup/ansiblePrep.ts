import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import { isTruthyEnv } from './envTruthy';
import { LOG_ANSIBLE_PREP } from './logPrefix';
import { assertAapOperatorRunning } from './operatorPreflight';
import { getRepoRoot } from './repoRoot';

const execFileAsync = promisify(execFile);

/** Explicit override to skip global Ansible secret prep. */
export function isAnsiblePrepExplicitlySkipped(): boolean {
  return isTruthyEnv(process.env.E2E_SKIP_ANSIBLE_PREP);
}

/**
 * Global Ansible prep (non-unit runs): resolve ANSIBLE env and bootstrap
 * templates via scripts/ansible/setup-ansible-template.sh.
 */
export async function runAnsiblePrep(authDir: string): Promise<void> {
  if (isAnsiblePrepExplicitlySkipped()) {
    console.log(`${LOG_ANSIBLE_PREP} Skipping (E2E_SKIP_ANSIBLE_PREP is set).`);
    return;
  }

  const scriptPath = path.join(getRepoRoot(), 'scripts', 'ansible', 'setup-ansible-template.sh');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`${LOG_ANSIBLE_PREP} script not found: ${scriptPath}`);
  }

  await assertAapOperatorRunning();

  console.log(`${LOG_ANSIBLE_PREP} Running setup-ansible-template.sh …`);
  console.log(`${LOG_ANSIBLE_PREP} cwd=${authDir} (timeout 400s)`);

  try {
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
      cwd: authDir,
      env: process.env,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 400_000,
      encoding: 'utf8',
    });
    const combined = [stderr, stdout].filter((s) => s?.trim()).join('\n');
    if (combined) {
      console.log(`${LOG_ANSIBLE_PREP} Script output:\n${combined}`);
    }
    console.log(`${LOG_ANSIBLE_PREP} Finished setup-ansible-template.sh.`);
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const out = [e.stderr, e.stdout].filter(Boolean).join('\n');
    throw new Error(
      `${LOG_ANSIBLE_PREP} ${scriptPath} failed${out ? `:\n${out}` : `: ${e.message ?? String(err)}`}`
    );
  }
}
