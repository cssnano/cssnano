import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const loader = fileURLToPath(new URL('./mutation-loader.mjs', import.meta.url));

function argument(name, args) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) {
    throw new Error(`Missing required argument ${name}`);
  }
  return args[index + 1];
}

function runNode(args, env, timeout) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveResult({ code, signal, stderr, stdout, timedOut });
    });
  });
}

function printFailure(label, result) {
  const detail = result.stderr.trim() || result.stdout.trim();
  console.error(
    `${label}: ${detail || `exit ${result.code ?? result.signal}`}`
  );
}

function mutationStatus(result) {
  if (result.timedOut) return 'timed out';
  if (result.code === 0) return 'survived';
  if (result.stderr.includes('Mutation loader error')) return 'errored';
  if (result.code === 1) return 'killed';
  return 'errored';
}

const args = process.argv.slice(2);
try {
  if (process.versions.node.split('.')[0] !== '24') {
    throw new Error('Mutation testing requires Node 24');
  }

  const catalogPath = resolve(argument('--catalog', args));
  const testPath = resolve(argument('--test', args));
  const timeoutIndex = args.indexOf('--timeout');
  const timeout = Number(timeoutIndex === -1 ? 10000 : args[timeoutIndex + 1]);
  const catalog = await import(pathToFileURL(catalogPath));
  const mutations = catalog.mutations;
  const target = catalog.target;

  if (!Array.isArray(mutations) || typeof target !== 'string') {
    throw new Error('Catalog must export a string target and mutations array');
  }

  const baseline = await runNode(['--test', testPath], process.env, timeout);
  if (baseline.timedOut || baseline.code !== 0) {
    printFailure('Baseline failed', baseline);
    process.exitCode = 1;
  } else {
    const results = [];
    for (const mutation of mutations) {
      const environment = {
        ...process.env,
        CSSNANO_MUTATION_TARGET: target,
        CSSNANO_MUTATION: JSON.stringify(mutation),
      };
      const result = await runNode(
        ['--import', loader, '--test', testPath],
        environment,
        timeout
      );
      const status = mutationStatus(result);
      results.push({ mutation, result, status });
    }

    for (const { mutation, result, status } of results) {
      console.log(`${status}: ${mutation.name}`);
      if (status === 'errored' || status === 'timed out') {
        printFailure(`  ${status}`, result);
      }
    }

    const counts = Object.groupBy(results, ({ status }) => status);
    console.log(
      `Mutation summary: ${results.length} total, ${counts.killed?.length ?? 0} killed, ${counts.survived?.length ?? 0} survived, ${counts['timed out']?.length ?? 0} timed out, ${counts.errored?.length ?? 0} errored`
    );
    if (counts.survived?.length) {
      console.error('Surviving mutations:');
      for (const { mutation } of counts.survived)
        console.error(`- ${mutation.name}`);
    }
    if (
      counts.survived?.length ||
      counts.errored?.length ||
      counts['timed out']?.length
    ) {
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`Mutation harness error: ${error.message}`);
  process.exitCode = 1;
}
