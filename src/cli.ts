#!/usr/bin/env node
import * as inquirer from 'inquirer';
import { program } from 'commander';

import { addRemote, applyUpdate, Commit, getUpdates, removeRemote } from './git';

async function main(remoteUrl: string, branch: string, options: { exclude?: string}) {
	const remoteName = "upstream-template";

	await removeRemote(remoteName);
	if (await addRemote(remoteName, remoteUrl)) {
		const updates = await getUpdates(`${remoteName}/${branch}`, String(options.exclude));
		if (updates.length) {
			const { selection } = await inquirer.prompt<{ selection: Commit[] }>({
				choices: [
					new inquirer.Separator(),
					...updates.map(commit => ({
						name: commit.message,
						value: commit
					}))
				],
				name: "selection",
				type: "checkbox"
			});
			const updateSet = selection.sort((commitA, commitB) => commitA.timestamp - commitB.timestamp);
			for (const update of updateSet) {
				await applyUpdate(update);
			}
		} else {
			console.log(`There are no new updates from upstream template repository`);
		}
	} else {
		console.log(`Unable to add remote repository with url: ${remoteUrl}`);
		await removeRemote(remoteName);
	}
	await removeRemote(remoteName);
}

program
  .version('0.1.0')
  .argument('<remoteUrl>', 'Url of source template repo')
  .argument('[branch]', 'branch of template repo to use', 'master')
  .option('-e, --exclude <regex>', 'regular expression for excluding commits from list of updates based on their commit message')
  .action(main);

(async () => await program.parseAsync(process.argv))();
