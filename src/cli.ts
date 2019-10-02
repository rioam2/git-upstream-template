#!/usr/bin/env node
import * as inquirer from 'inquirer';

import { addRemote, applyUpdate, Commit, getUpdates, removeRemote } from './git';

(async function main(remoteUrl?: string): Promise<number> {
	const remoteName = "upstream-template";
	if (!remoteUrl) {
		console.error("Please provide an upstream-url");
		return 1;
	}
	await removeRemote(remoteName);
	if (await addRemote(remoteName, remoteUrl)) {
		const updates = await getUpdates(`${remoteName}/master`);
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
		return 1;
	}
	await removeRemote(remoteName);
	return 0;
})(...process.argv.slice(2))
	.then(process.exit)
	.catch(console.error);
