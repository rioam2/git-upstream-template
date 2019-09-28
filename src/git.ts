import * as chalk from 'chalk';
import { spawn } from 'child_process';
import * as inquirer from 'inquirer';

const DEBUG = false;

export interface Commit {
	message: string;
	hash: string;
	timestamp: number;
}

export function git(
	cmd: string,
	{ noPager, verbose }: { noPager?: boolean; verbose?: boolean } = { noPager: false, verbose: false }
) {
	const gitCmd = `git${(noPager && " --no-pager") || ""}`;
	return run(`${gitCmd} ${cmd}`, { verbose });
}

function run(inputCommand: string, { verbose }: { verbose?: boolean } = { verbose: false }): Promise<string> {
	let output = "";

	const [cmd, ...args] = (
		inputCommand.match(/[A-z0-9\-\_\:\/\\\.\@\!\#\$\%\^\&\*\(\)\{\}\[\]\;\<\>\=\+\~]+|"[^\"]+"|'[^\']+'/g) || []
	).map(arg => arg.replace(/\"/g, ""));
	if (DEBUG) console.log(`» ${inputCommand}`, cmd, args);
	const process = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"] });
	process.stdout.on("data", chunk => {
		if (verbose) console.log(chunk.toString());
		output += chunk;
	});
	process.stderr.on("data", chunk => {
		if (verbose) console.log(chunk.toString());
		output += chunk;
	});
	return new Promise((res, rej) => {
		if (DEBUG) console.log(`« ${output}`);
		process.on("exit", code => {
			if (code) {
				rej(output);
			} else {
				res(output);
			}
		});
	});
}

export async function addRemote(remoteName: string, remoteUrl: string) {
	return successful(() => git(`remote add -f ${remoteName} ${remoteUrl}`));
}

export async function removeRemote(remoteName: string) {
	return successful(() => git(`remote remove ${remoteName}`));
}

export async function getCurrentBranchName() {
	const branchOutput = await git(`branch`);
	return (branchOutput.match(/\*\s(\S+)/) as any)[1];
}

export async function getUpdates(updateBranch: string) {
	const currentBranch = await getCurrentBranchName();
	const currentMessages = (await git(`log ${currentBranch} --format=%s`)).trim().split("\n");
	const currentDates = (await git(`log ${currentBranch} --format=%at`)).trim().split("\n");
	const templateHashes = (await git(`log ${updateBranch} --format=%h`)).trim().split("\n");
	const templateMessages = (await git(`log ${updateBranch} --format=%s`)).trim().split("\n");
	const templateDates = (await git(`log ${updateBranch} --format=%at`)).trim().split("\n");

	const forkDate = +currentDates[currentDates.length - 1];
	const afterFork = (commit: Commit) => commit.timestamp >= forkDate;
	const notApplied = (commit: Commit) =>
		currentMessages.findIndex(msg => msg.includes("🔄") && msg.includes(commit.hash)) === -1;
	const updates = templateHashes
		.map((hash, idx) => ({ hash, message: templateMessages[idx], timestamp: +templateDates[idx] } as Commit))
		.filter(notApplied)
		.filter(afterFork);

	return updates;
}

export async function successful(fn: () => any) {
	try {
		await fn();
		return true;
	} catch {
		return false;
	}
}

export async function applyUpdate(commit: Commit) {
	const commitMessage = generateUpdateCommitMessage(commit);

	console.log(chalk.default.yellow`Stashing your current working directory before applying updates...`);
	const stashed = !(await git(`stash save Before applying upstream-template update ${commit.hash}`, {
		verbose: true
	})).includes("No local changes");

	await successful(() => git(`cherry-pick ${commit.hash} --no-commit`));
	async function successfullyCommits() {
		try {
			await git(`commit -m "${commitMessage}"`, { verbose: true });
			return true;
		} catch (stderr) {
			return stderr.includes("nothing to commit, working tree clean");
		}
	}
	while (!(await successfullyCommits())) {
		await inquirer.prompt({
			message: chalk.default.yellow`Press any key to retry...`,
			name: "value"
		});
	}

	if (stashed) {
		await git(`stash pop`, { verbose: true });
	}
}

function generateUpdateCommitMessage(commit: Commit) {
	return `🔄 ${commit.hash}: ${commit.message}`;
}
