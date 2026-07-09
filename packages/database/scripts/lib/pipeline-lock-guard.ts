/**
 * Optional confirmation when a pipeline step would run without lock protection
 * while the database still has locked catalogue rows (misconfiguration).
 */
import readline from 'readline';
import type { PipelineLockLoadResult } from './load-pipeline-locks';

export function shouldBlockUnprotectedRun(
  lockResult: PipelineLockLoadResult,
  dbLockedFranchises: number,
): boolean {
  if (lockResult.lockedFranchises.length > 0) return false;
  if (process.env.PIPELINE_ALLOW_UNPROTECTED === '1') return false;
  return dbLockedFranchises > 0;
}

export async function confirmRiskyPipelineRun(message: string): Promise<boolean> {
  if (process.env.PIPELINE_ALLOW_UNPROTECTED === '1') return true;
  if (!process.stdin.isTTY) return false;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (value) => {
      rl.close();
      resolve(value.trim().toLowerCase());
    });
  });
  return answer === 'y' || answer === 'yes';
}
