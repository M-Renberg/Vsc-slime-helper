import * as vscode from 'vscode'; //Imports
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STATUS_FILE = path.join(os.tmpdir(), 'slime_status.txt'); //hard setting
//const NET_VERSION = 'net10.0-windows';
//const EXE_NAME = 'SlimeHelper.exe';

let workStartTime = Date.now(); //hard coded times 
let breakIntervalTime = 1000 * 60 * 55;
let lastActiveTime = Date.now();
const afkThreshold = 1000 * 60 * 6;
//spam filter
let lastCommentTime = 0;

let streakMinutes = 0; //streaks
const streakThreshold = 5;

let gitState = { status: 'OK', message: '' }; //slime states
let diagState = { status: 'OK', message: '' };
let breakState = { status: 'OK', message: '' };
let keywordState = { status: 'OK', message: '' };

let lastText = "";
let userHasTyped = false;

let keywordTimer: NodeJS.Timeout | undefined; //mixed
let lastStatus = '';
let slimeProcess: cp.ChildProcess | undefined;

let pasteCount = 0; // anti-vibe coding (this is funny)
let lastPasteTime = Date.now();
const PASTE_RESET_TIME = 1000 * 60 * 4;
const PASTE_LIMIT = 4;

//random phrases
const consoleResponses = [
	"Writing in the console are we?",
	"Log, log, log...",
	"Debugging via text? Classic!",
	"Console spam incoming!",
	"I see what you are logging...",
	"To the console! and beyoned!"
];

const debugResponses = [
	"D-D-Debugging?",
	"Time to hunt some bugs",
	"Let's get this fixed",
	"I found what was wrong earlier, but forgot to tell you"
];

const coolResponses = [
	"Oh yeah! Now we are talking!",
	"Hacker-man",
	"Hell yeah!"
];

const swearResponses = [
	"Hey! No swearing!",
	"Watch your language!",
	"My ears! (If I had any)",
	"Keep it clean, coder!",
	"I can't say words like that..."
];

const commentResponses = [
	"Yeah, let's comment that out",
	"Do you think anyone will read that?",
	"Code comments, nice!"
];

const todoResponses = [
	"Maybe we should just do it now?",
	"Don't put off until tomorrow...",
	"Another TODO list item?",
	"Will you really fix this?",
	"Adding to the pile..."
];

const funnyResponses = [
	"I have no idea what that does.",
	"Looks like magic to me.",
	"Are you sure about that?",
	"If it works, don't touch it!",
	"Not sure what to put there?"
];

const copyPasteResponses = [
	"Vibe coding detected!",
	"Did you write ANY of this yourself?",
	"StackOverflow or ChatGPT?",
	"I know where you got that code from!",
	"Copying you own code or someone else?",
	"Did an AI write that?",
	"Are we coding or assembling?"
];

const breakResponses = [
	"Maybe it's time for a break?",
	"Break time! strech those legs!",
	"Time for a break!",
	"You have been coding for almost an hour now",
	"Should we take a little break?",
	"Snack break!",
	"We should take a break"
];
//Slime thoughts are slime thoughts
const idleThoughts = [
	"I wonder if I'm made of pixels or magic?",
	"have you tried turning it off and on again?",
	"I saw a bug!.. Just kidding",
	"Are we in the Matrix?",
	"So this is nice",
	"I like it when you scoll, It's like a rollercoaster",
	"Maybe we should commit so we have a backup?",
	"Slime is doing slime stuff",
	"How about we take a short break to clear our heads?",
	"So this code goes here.. and this string here...",
	"What if I just deleted this line of code?... joking!",
	"hum.. hum.. hum..",
	"I's all 1s and 0s",
	"Light theme attracts bugs. Stay in the dark.",
	"I hope the Garbage Collector doesn't delete me...",
	"My cousin is a Minecraft slime. He's square.",
	"Do I dream of electric sheeps?",
	"Tabs or Spaces? Don't answer, I judge.",
	"Is Chrome eating all our RAM again?",
	"I bet you missed a semicolon somewhere. Just a feeling.",
	"It works on my machine... because I live in it.",
	"First I help you code, then I take over the world...",
	"Are you sure you saved that file? Are you?",
	"I'm better than a rubber duck. I have personality.",
	"99 little bugs in the code... take one down... 127 bugs?!",
	"I tried to center a div once. I'm still traumatized.",
	"Please tell me you didn't push directly to main...",
	"It's getting warm in here. Is the CPU working hard?",
	"Posture check! Don't turn into a question mark.",
	"Recursion is cool. Recursion is cool. Recursion is...",
	"I don't read documentation. I guess and pray.",
	"There are 10 types of people. Those who know binary, and those who don't. 01",
	"More RGB lights equals more coding speed, right?",
	"I think your computer fan is trying to fly away.",
	"Mmm... spaghetti code. My favorite dish.",
	"Hydrate! Or you will dry out. I'm 90% water, so I know.",
	"Are we live on production? No? Phew.",
	"Ctrl+Z is the greatest invention in human history."
];
//skin error msg
const skinPhrases = {
	Pink: {
		error: "Eww! My antennas feel {n} gross bugs!",
		semicolon: "Missing ; on line {line}! My bubbles are shaking!",
		warning: "Warning! {n} things are not very fabulous...",
		idle: "Just being pink and pretty! ✨"
	},
	Green: {
		error: "Acid leak! {n} errors making me unstable...",
		semicolon: "I'm melting... Missing ; on line {line}!",
		warning: "Warning... {n} alerts detected...",
		idle: "Staying gooey..."
	},
	Default: {
		error: "You have {n} errors in your code!",
		semicolon: "Missing ; on line {line}!",
		warning: "You have {n} warnings!",
		idle: "Coding along with you!"
	}
};

//random phrases
function pickRandom(arr: string[]) {
	return arr[Math.floor(Math.random() * arr.length)];
}
//get skin from json so we can use it.
function getCurrentSkin(): string {
	const settingsPath = path.join(os.tmpdir(), 'slime_settings.json');
	if (fs.existsSync(settingsPath)) {
		const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
		return settings.CurrentSkin || "Default";
	}
	return "Default";
}

//main software
export function activate(context: vscode.ExtensionContext) {
	console.log('--- START: Extension "vsc-helper" is now running! ---');

	startSlime(context);

	const COMMAND_FILE = path.join(os.tmpdir(), 'slime_command.txt');
	console.log("VS Code is watching this path: " + COMMAND_FILE);

	const watcher = vscode.workspace.createFileSystemWatcher(COMMAND_FILE);
	if (!fs.existsSync(COMMAND_FILE)) {
		fs.writeFileSync(COMMAND_FILE, '');
	}

	// Använd fs.watchFile för filer utanför workspace (säkrare för Temp)
	fs.watchFile(COMMAND_FILE, { interval: 500 }, (curr, prev) => {
		if (curr.mtime !== prev.mtime) {
			try {
				const command = fs.readFileSync(COMMAND_FILE, 'utf8').trim();
				if (command === 'OPEN_NOTES') {
					console.log("Mottog OPEN_NOTES via watchFile!");
					vscode.commands.executeCommand('slime.openNotes');
					fs.writeFileSync(COMMAND_FILE, ''); // Rensa filen
				}
			} catch (err) {
				console.error("Error while reading slime_command.txt:", err);
			}
		}
	});

	context.subscriptions.push({ dispose: () => fs.unwatchFile(COMMAND_FILE) });

	updateSlime('IDLE', 'Slime is waking up...');

	vscode.workspace.onDidChangeTextDocument(() => {
		lastActiveTime = Date.now();
	});

	vscode.window.onDidChangeTextEditorSelection(() => {
		lastActiveTime = Date.now();
	})

	//intervals

	const fastInterval = setInterval(() => {
		checkDiagnostics(); //error and warning
	}, 1000 * 5);

	const slowInterval = setInterval(() => {
		checkGitStatus(); //check git
		checkSlimeNotes(); //check notes
	}, 1000 * 60 * 5);

	const breakInterval = setInterval(() => {
		checkBreakTime();
		updateStreak();
	}, 1000 * 60);

	checkGitStatus();

	context.subscriptions.push({ dispose: () => clearInterval(fastInterval) });
	context.subscriptions.push({ dispose: () => clearInterval(slowInterval) });
	context.subscriptions.push({ dispose: () => clearInterval(breakInterval) });


	const handleActivity = () => {
		lastActiveTime = Date.now();
		userHasTyped = true;

		if (lastStatus === 'AFK') {
			refreshSlime();
		}
	};

	//anti vibe coding section
	vscode.workspace.onDidChangeTextDocument((event) => {
		handleActivity();
		lastActiveTime = Date.now();
		userHasTyped = true;
		const changes = event.contentChanges[0];
		if (!changes) return;

		if (changes.text.length > 50) {
			const now = Date.now();

			if (now - lastPasteTime > PASTE_RESET_TIME) {
				pasteCount = 0;
			}

			pasteCount++;
			lastPasteTime = now;

			if (pasteCount >= PASTE_LIMIT) {
				triggerReaction('ANNOYED', pickRandom(copyPasteResponses));

				pasteCount = 0;
			}
		}

		vscode.window.onDidChangeTextEditorSelection(() => {
			handleActivity();
		});

		const currentLine = event.document.lineAt(changes.range.start.line).text.toLocaleLowerCase();

		//random phrases 

		if (currentLine.includes('console.log') || currentLine.includes('print(') || currentLine.includes('writeline')) {
			triggerReaction('BREAK', pickRandom(consoleResponses));
		}
		else if (currentLine.includes('debug')) {
			triggerReaction('POKE', pickRandom(debugResponses));
		}
		else if (currentLine.includes('1337') || currentLine.includes('hacker') || currentLine.includes('root')) {
			triggerReaction('STREAK', pickRandom(coolResponses));
		}
		else if (currentLine.includes('fuck') || currentLine.includes('damn') || currentLine.includes('fucking') || currentLine.includes('shit')) {
			triggerReaction('ANNOYED', pickRandom(swearResponses));
		}
		else if (currentLine.includes('//') || currentLine.includes('/*') || currentLine.includes('<!--')) {
			const now = Date.now();
			if (now - lastCommentTime > 8000) {
				triggerReaction('FUNNY', pickRandom(commentResponses));
				lastCommentTime = now;
			}
		}
		else if (currentLine.includes('slime')) {
			triggerReaction('STREAK', 'We\'re talking about me?');
		}
		else if (currentLine.includes('todo') || currentLine.includes('fixme')) {
			triggerReaction('TIRED', pickRandom(todoResponses));
		}
		else if (currentLine.includes('foo') || currentLine.includes('bar') || currentLine.includes('temp')) {
			triggerReaction('FUNNY', pickRandom(funnyResponses));
		}
		else if (currentLine.includes('while(true)') || currentLine.includes('for(;;)')) {
			triggerReaction('ERROR', 'Wait... Eternity loop?!?!?!');
		}
		else if (currentLine.includes('return null') || currentLine.includes('null;')) {
			triggerReaction('PUSH_NEEDED', 'Null? Are you sure about that?');
		}
		else if (currentLine.includes('!important')) {
			triggerReaction('ANNOYED', 'Cheater! Dont use !important!');
		}
		else if (currentLine.includes('http') || currentLine.includes('www.') || currentLine.includes('stackoverflow')) {
			triggerReaction('FUNNY', 'Ctrl+C, Ctrl+V champion!');
		}
		else if (currentLine.includes('await ') || currentLine.includes('async ') || currentLine.includes('thread.sleep')) {
			triggerReaction('AFK', 'Zzz... Yeah I\'m waiting...');
		}
		else if (currentLine.includes('coffee') || currentLine.includes('drink') || currentLine.includes('pizza') || currentLine.includes('snack')) {
			triggerReaction('BREAK', 'Did you say food? I want some! Give me!');
		}
		else if (currentLine.includes('sudo ')) {
			triggerReaction('STREAK', 'Yes master!');
		}
		else if (currentLine.includes(': any') || currentLine.includes('as any')) {
			triggerReaction('FUNNY', 'Type safety? Never heard of it?');
		}
		else if (currentLine.includes('try {') || currentLine.includes('catch (')) {
			triggerReaction('POKE', 'Preparing for disaster?');
		}
		else if (currentLine.includes('localhost') || currentLine.includes('127.0.0.1')) {
			triggerReaction('FUNNY', 'I found the connection!');
		}
		else if (currentLine.includes('drop table') || currentLine.includes('delete from') || currentLine.includes('truncate')) {
			triggerReaction('POKE', 'Wait! Don\'t delete the database!');
		}
		else if (currentLine.includes('select *')) {
			triggerReaction('STREAK', 'Give me ALL the data!');
		}
		else if (currentLine.includes('git push --force') || currentLine.includes('git commit -m "fix"')) {
			triggerReaction('STREAK', 'Living dangerously I see!');
		}
		else if (currentLine.includes('<<<<<<< HEAD')) {
			triggerReaction('ERROR', 'Merge conflict! Fight!');
		}
		else if (currentLine.includes('regex') || currentLine.includes('regexp') || currentLine.includes('^.*$')) {
			triggerReaction('WARNING', 'Magic spells? I don\'t speak RegEx');
		}
		else if (currentLine.includes('copilot') || currentLine.includes('chatgpt') || currentLine.includes('generate')) {
			triggerReaction('STREAK', 'Am I being replaced by another AI?');
		}
		else if (currentLine.includes('border:') && currentLine.includes('red')) {
			triggerReaction('FUNNY', 'CSS Debugging? Classic moves.');
		}
		else if (currentLine.includes('password =') || currentLine.includes('secret =')) {
			triggerReaction('WARNING', 'Don\'t hardcode secrets!');
		}

	});

	//45 sec slime thoughts pattern

	let idleTalkTimer: NodeJS.Timeout | undefined;

	vscode.workspace.onDidChangeTextDocument(() => {
		if (idleTalkTimer) clearTimeout(idleTalkTimer);

		idleTalkTimer = setTimeout(() => {
			if (diagState.status === 'OK' && breakState.status === 'OK') {
				const thought = pickRandom(idleThoughts);
				updateSlime('IDLE', thought);
				streakMinutes = 0;
			}
		}, 1000 * 45);
	});

	// slime notes
	let openNotescmd = vscode.commands.registerCommand('slime.openNotes', async () => {

		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage("Open a folder first to use Slime-Notes");
			return;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const notesUri = vscode.Uri.file(path.join(rootPath, 'slime_notes.md'));

		if (!fs.existsSync(notesUri.fsPath)) {
			const initialContent = "# Slime Notes & TODOs\n\n- [ ] My first To-Do";
			fs.writeFileSync(notesUri.fsPath, initialContent, 'utf8');

			ensureNotesInGitignore(rootPath);
		}

		try {
			const doc = await vscode.workspace.openTextDocument(notesUri);
			await vscode.window.showTextDocument(doc);
		} catch (error) {
			vscode.window.showErrorMessage("Could not open Slime-Notes");
		}
	});

	context.subscriptions.push(openNotescmd);
}
//end of activate



// main brain
function refreshSlime() {

	const timeScenceActive = Date.now() - lastActiveTime;
	const isAfk = timeScenceActive > afkThreshold;

	let finalStatus = 'IDLE';
	let finalMessage = '';

	if (breakState.status === 'BREAK') {
		finalStatus = 'BREAK';
		finalMessage = breakState.message;
	}
	else if (keywordState.status !== 'OK') {
		finalStatus = keywordState.status;
		finalMessage = keywordState.message;
	}
	else if (isAfk) {
		finalStatus = 'AFK';
		finalMessage = 'Zzz...'
	}
	else if (diagState.status === 'ERROR') {
		finalStatus = 'ERROR';
		finalMessage = diagState.message;
	}
	else if (diagState.status === 'WARNING') {
		finalStatus = 'WARNING';
		finalMessage = diagState.message;
	}
	else if (gitState.status === 'DIRTY') {
		finalStatus = 'DIRTY';
		finalMessage = gitState.message;
	}
	else if (gitState.status === 'PUSH_NEEDED') {
		finalStatus = 'PUSH_NEEDED';
		finalMessage = gitState.message;
	}
	else if (streakMinutes >= streakThreshold) {
		finalStatus = 'STREAK';
		finalMessage = `You're on fire! ${streakMinutes} min`;
	}
	else {
		finalStatus = 'IDLE';
		finalMessage = '';
	}

	updateSlime(finalStatus, finalMessage);
}
//check errors and warnings
function checkDiagnostics() {
	let errorCount = 0;
	let warningCount = 0;
	let semicolonLine = -1;

	const skin = getCurrentSkin() as keyof typeof skinPhrases;
	const phrases = skinPhrases[skin] || skinPhrases.Default;

	const allDiagnostics = vscode.languages.getDiagnostics();

	for (const [uri, diagnostics] of allDiagnostics) {
		if (uri.fsPath.includes('node_modules')) continue;

		diagnostics.forEach(diag => {
			if (diag.severity === vscode.DiagnosticSeverity.Error) {
				errorCount++;
				if (diag.message.includes("';'") || diag.message.includes("expected ;")) {
					semicolonLine = diag.range.start.line + 1;
				}
			}

			else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
				warningCount++;
			}
		});
	}

	let status: string = 'OK';
	let message: string = '';

	if (semicolonLine !== -1) {
		status = 'ERROR';
		message = phrases.semicolon.replace('{line}', semicolonLine.toString());
	}
	else if (errorCount > 0) {
		status = 'ERROR';
		message = phrases.error.replace('{n}', errorCount.toString());

		if (errorCount > 1) streakMinutes = 0;
	}
	else if (warningCount > 0) {
		status = 'WARNING';
		message = phrases.warning.replace('{n}', warningCount.toString());
	}

	diagState = { status, message };

	refreshSlime();
}
//check git
function checkGitStatus() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return;
	const rootPath = workspaceFolders[0].uri.fsPath;

	cp.exec('git status --porcelain', { cwd: rootPath }, (err, stdout, stderr) => {
		if (err) {
			console.log('Git status error:', stderr);
			return;
		}

		if (stdout.length > 0) {
			updateSlime('DIRTY', 'You have forgotten to commit your code!');
			refreshSlime();

		} else {

			checkIfNeedToPush(rootPath);
		}
	});
}
//check git
function checkIfNeedToPush(cwd: string) {
	cp.exec('git log @{u}..', { cwd }, (err, stdout, stderr) => {

		if (err) {
			console.log('Git push check error(probably no upstream):', stderr);
			return;
		}

		if (stdout.length > 0) {
			updateSlime('PUSH_NEEDED', 'Maybe it is time to push the code?');

		} else {
			gitState = { status: 'OK', message: '' }
		}
		refreshSlime();
	});
}
//basic update
function updateSlime(status: string, message: string = "") {

	if (status === lastStatus && message === lastText) {
		return;
	}

	try {
		const data = { status: status, text: message };
		fs.writeFileSync(STATUS_FILE, JSON.stringify(data), 'utf8');

		if (status !== lastStatus) {
			console.log(`SLIME STATUS: ${status}`);
			lastStatus = status;
		}
		lastText = message;

	} catch (error) {
		console.error('Could not write to file:', error);
	}
}
//take a break reminder
function checkBreakTime() {

	if (breakState.status === 'BREAK') { return; }

	const timeWorked = Date.now() - workStartTime;

	if (timeWorked > breakIntervalTime) {

		const randomMessage = pickRandom(breakResponses)

		breakState = { status: 'BREAK', message: randomMessage };
		refreshSlime();

		setTimeout(() => {
			workStartTime = Date.now();
			breakState = { status: 'OK', message: '' };
			refreshSlime();
		}, 1000 * 30);
	}
}
//streak funtion. based on how long you have been writing code.
function updateStreak() {

	const timeScenceActive = Date.now() - lastActiveTime;
	const isAfk = timeScenceActive > afkThreshold;

	if (diagState.status === 'OK' && breakState.status === 'OK' && !isAfk && userHasTyped) {
		streakMinutes++;
	} else {
		streakMinutes = 0;
	}
	userHasTyped = false;
	refreshSlime();
}
//part of the streak funtion
function triggerReaction(status: string, message: string) {
	keywordState = { status: status, message: message };

	refreshSlime();

	if (keywordTimer) clearTimeout(keywordTimer);

	keywordTimer = setTimeout(() => {
		keywordState = { status: 'OK', message: '' };
		refreshSlime();
	}, 3000);
}


//slime notes
function checkSlimeNotes() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) return;

	const notesPath = path.join(workspaceFolders[0].uri.fsPath, 'slime_notes.md');

	if (fs.existsSync(notesPath)) {
		const content = fs.readFileSync(notesPath, 'utf8');
		const todoCount = (content.match(/- \[ \]/g) || []).length;

		if (todoCount > 0 && keywordState.status === 'OK') {
			updateSlime('IDLE', `Don't forget, we have ${todoCount} To-do's`);
		}
	}
}

async function ensureNotesInGitignore(workspaceRoot: string) {
	const gitignorePath = path.join(workspaceRoot, '.gitignore');
	const notesFileName = 'slime_notes.md';

	if (fs.existsSync(gitignorePath)) {
		let content = fs.readFileSync(gitignorePath, 'utf8');

		const regex = new RegExp(`^${notesFileName.replace('.', '\\.')}\\s*$`, 'm');

		if (!regex.test(content)) {
			const newContent = content.endsWith('\n')
				? `${content}\n# Slime Helper Notes\n${notesFileName}\n`
				: `${content}\n\n# Slime Helper Notes\n${notesFileName}\n`;

			fs.writeFileSync(gitignorePath, newContent, 'utf8');
			console.log(`${notesFileName} tillagd i .gitignore`);
		}
	}
}

function startSlime(context: vscode.ExtensionContext) {

	const config = vscode.workspace.getConfiguration('slime');
	let slimePath = config.get<string>('exePath');

	if (!slimePath || slimePath === "") {
		slimePath = path.join(context.extensionPath, 'slime-app', 'SlimeHelper.exe');
	}

	console.log(`Starting Slime from: ${slimePath}`);

	if (fs.existsSync(slimePath)) {
		slimeProcess = cp.spawn(slimePath, [process.pid.toString()], {
			detached: true,
			stdio: 'ignore'
		});

		slimeProcess.unref();
	} else {
		vscode.window.showErrorMessage(`Could not find Slime Helper at: ${slimePath}`);
	}
}

//kills the software
function stopSlime() {
	if (slimeProcess && slimeProcess.pid) {
		console.log(`Killing Slime process: ${slimeProcess.pid}`);

		try {
			cp.exec(`taskkill /PID ${slimeProcess.pid} /T /F`, (err) => {
				if (err) {
					console.log("Slime was already dead or could not be killed");
				}
			});
		} catch (e) {
			console.error("Error killing slime", e);
		}
	}
}
//when quiting
export function deactivate() {
	console.log('Slime is going to sleep');
	stopSlime();
}

