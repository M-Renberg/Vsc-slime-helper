import * as vscode from 'vscode'; //Imports
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STATUS_FILE = path.join(os.tmpdir(), 'slime_status.txt'); //hard setting
const NET_VERSION = 'net10.0-windows';
const EXE_NAME = 'SlimeHelper.exe';

let workStartTime = Date.now(); //hard coded times 
let breakIntervalTime = 1000 * 60 * 55;
let lastActiveTime = Date.now();
const afkThreshold = 1000 * 60 * 6;

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
	"I was a bug!.. Just kidding",
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
//random phrases
function pickRandom(arr: string[]) {
	return arr[Math.floor(Math.random() * arr.length)];
}

//main software
export function activate(context: vscode.ExtensionContext) {
	console.log('--- START: Extension "vsc-helper" is now running! ---');

	startSlime(context);

	updateSlime('IDLE', 'Slime is waking up...');

	vscode.workspace.onDidChangeTextDocument(() => {
		lastActiveTime = Date.now();
	});

	vscode.window.onDidChangeTextEditorSelection(() => {
		lastActiveTime = Date.now();
	})

	const fastInterval = setInterval(() => {
		checkDiagnostics();
	}, 1000 * 5);

	const slowInterval = setInterval(() => {
		checkGitStatus();
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
		else if (currentLine.includes('//') || currentLine.includes('/*') || currentLine.includes('<--')) {
			triggerReaction('FUNNY', pickRandom(commentResponses));
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

	let idleTalkTimer: NodeJS.Timeout | undefined;

	vscode.workspace.onDidChangeTextDocument(() => {
		if (idleTalkTimer) clearTimeout(idleTalkTimer);

		idleTalkTimer = setTimeout(() => {
			if (diagState.status === 'OK' && breakState.status === 'OK') {
				const thought = pickRandom(idleThoughts);
				updateSlime('IDLE', thought);
			}
		}, 1000 * 45);
	});

}
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
	const allDiagnostics = vscode.languages.getDiagnostics();

	for (const [uri, diagnostics] of allDiagnostics) {
		if (uri.fsPath.includes('node_modules')) continue;

		diagnostics.forEach(diag => {
			if (diag.severity === vscode.DiagnosticSeverity.Error) errorCount++;
			else if (diag.severity === vscode.DiagnosticSeverity.Warning) warningCount++;
		});
	}

	if (errorCount === 1) {
		diagState = { status: 'ERROR', message: `You have ${errorCount} error!` };
	}
	else if (errorCount > 1) {
		diagState = { status: 'ERROR', message: `You have ${errorCount} errors!` };
		streakMinutes = 0;
	}
	else if (warningCount === 1) {
		diagState = { status: 'WARNING', message: `You have ${warningCount} warning` };
	}
	else if (warningCount > 1) {
		diagState = { status: 'WARNING', message: `You have ${warningCount} warnings` };
	}
	else {
		diagState = { status: 'OK', message: '' };
	}

	refreshSlime();
}
//check git
function checkGitStatus() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return;
	const rootPath = workspaceFolders[0].uri.fsPath;

	cp.exec('git status --porcelain', { cwd: rootPath }, (err, stdout, stderr) => {
		if (err) {

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
//code when dev
// function startSlime(context: vscode.ExtensionContext) {

// 	const exePath = path.join(
// 		context.extensionPath,
// 		'../SlimeHelper/bin/Debug',
// 		NET_VERSION,
// 		EXE_NAME
// 	);

// 	console.log('Looking for slime:', exePath);

// 	if (!fs.existsSync(exePath)) {
// 		vscode.window.showErrorMessage('Could not find the slime');
// 		return;
// 	}

// 	cp.exec(`taskkill /IM ${EXE_NAME} /F`, (err) => {

// 		console.log('Starting Slime...');

// 		slimeProcess = cp.spawn(exePath, [], {
// 			cwd: path.dirname(exePath),
// 			detached: true
// 		});

// 		slimeProcess.unref();
// 	});
// }

//code when publishing
function startSlime(context: vscode.ExtensionContext) {

	const config = vscode.workspace.getConfiguration('slime');
	let slimePath = config.get<string>('exePath');

	if (!slimePath || slimePath === "") {
		slimePath = path.join(context.extensionPath, 'slime-app', 'SlimeHelper.exe');
	}

	console.log(`Starting Slime from: ${slimePath}`);

	const fs = require('fs');
	if (fs.existsSync(slimePath)) {
		const child = require('child_process').spawn(slimePath, [], {
			detached: true,
			stdio: 'ignore'
		});
		child.unref();
	} else {
		vscode.window.showErrorMessage(`Could not find Slime Helper at: ${slimePath}`);
	}
}

//kills the software
function stopSlime() {
	if (slimeProcess) {
		process.kill(slimeProcess.pid!);
	}

	cp.exec(`taskkill /IM ${EXE_NAME} /F`);
}
//when quiting
export function deactivate() {
	console.log('Slime is going to sleep');
	stopSlime();
}

