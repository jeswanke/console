import fs from 'fs';
import path from 'path';
import { runAnsiblePrep } from './global-setup/ansiblePrep';
import { LOG_GLOBAL_SETUP } from './global-setup/logPrefix';
import { runGitOpsPrep, isGitOpsPrepEnabled } from './global-setup/gitOpsPrep';
import {
  isManagedClusterPrepExplicitlySkipped,
  runManagedClusterPrep,
} from './global-setup/clusterPrep';
import {
  requestedProjectsAreAllUnit,
  requestedProjectsIncludeAlc,
} from './global-setup/projectArgv';

async function globalSetup() {
  const authDir = path.join(__dirname, '../.auth');

  if (process.env.SKIP_SETUP === 'true' && fs.existsSync(path.join(authDir, 'admin.json'))) {
    console.log(`${LOG_GLOBAL_SETUP} SKIP_SETUP=true and admin.json exists — preserving .auth`);
    return;
  }

  // Clean up .auth directory before each test run
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true });
    console.log(`${LOG_GLOBAL_SETUP} Cleaned up .auth directory`);
  }

  // Recreate the directory
  fs.mkdirSync(authDir, { recursive: true });

  const skipManagedByEnv = isManagedClusterPrepExplicitlySkipped();
  const unitOnly = requestedProjectsAreAllUnit();

  if (skipManagedByEnv) {
    console.log(
      `${LOG_GLOBAL_SETUP} Skipping managed cluster prep (E2E_SKIP_MANAGED_CLUSTER_PREP is set).`
    );
  } else if (unitOnly) {
    console.log(
      `${LOG_GLOBAL_SETUP} Skipping managed cluster prep (only --project unit / -p unit).`
    );
  } else {
    await runManagedClusterPrep(authDir);
  }

  if (unitOnly) {
    console.log(`${LOG_GLOBAL_SETUP} Skipping Ansible prep (only --project unit / -p unit).`);
  } else {
    await runAnsiblePrep(authDir);
  }

  const runGitOps = isGitOpsPrepEnabled() && !unitOnly && requestedProjectsIncludeAlc();

  if (isGitOpsPrepEnabled() && unitOnly) {
    console.log(`${LOG_GLOBAL_SETUP} Skipping GitOps prep (only --project unit / -p unit).`);
  } else if (isGitOpsPrepEnabled() && !requestedProjectsIncludeAlc()) {
    console.log(
      `${LOG_GLOBAL_SETUP} Skipping GitOps prep (--project does not include alc; use ./start.sh alc or pass --project alc).`
    );
  } else if (runGitOps) {
    await runGitOpsPrep();
  }
}

export default globalSetup;
