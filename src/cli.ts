import * as inquirer from 'inquirer';

import { addRemote, applyUpdate, getUpdates, removeRemote } from './git';

(async function main(remoteUrl?: string): Promise<number> {
	const remoteName = "upstream-template";
	if (!remoteUrl) {
		console.error("Please provide an upstream-url");
		return 1;
	}

	await removeRemote(remoteName);
	if (await addRemote(remoteName, remoteUrl)) {
		const updates = await getUpdates(`${remoteName}/master`);
		const { selection } = await inquirer.prompt({
			choices: updates.map(commit => ({
				name: commit.message,
				value: commit
			})),
			name: "selection",
			type: "checkbox"
		});
		for (const update of selection) {
			await applyUpdate(update);
		}
	} else {
		console.log(`Unable to add remote repository with url: ${remoteUrl}`);
		await removeRemote(remoteName);
		return 1;
	}

	await removeRemote(remoteName);
	return 0;
})(...process.argv.slice(2)).then(process.exit);
