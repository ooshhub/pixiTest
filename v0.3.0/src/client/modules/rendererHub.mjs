/* globals Game, $ */

import { EventHub } from '../../common/EventHub.mjs';
import { SocketClient } from './SocketClient.mjs';
import helpers from './clientHelpers.mjs';
import { newLogger, newDebugReceiver } from '../../common/debug.mjs';

const renHub = new EventHub('rendererHub');
window.Game.LocalHub = renHub;
window.Game.DuneClient = {};

// Register debugging
export const rlog = newLogger('renderer', renHub, 0, Game.CONFIG.DEBUG);
newDebugReceiver(renHub, {
	main: 1,
	server: 1,
	socket: 1,
	renderer: 1,
	// TODO: subscribe to debug logs from other connected players
})();


const init = async () => {
  // Main process event route
  window.rendererToHub.receive('sendToRenderer', async (event, data) => renHub.trigger(event, data));
  renHub.for('main', async (event, ...args) => window.rendererToHub.send('sendToMain', event, ...args));
	// Server event route
	renHub.for('server', (event, ...args) => Game.DuneClient.sendToServer?.(event, ...args));
	// Self-routing in case event is sent with "renderer/" routing from within window
	renHub.for('renderer', (event, ...args) => renHub.trigger(event, ...args));
	// Game Init listeners
  renHub.on('responseHtml', insertHtml);
  renHub.on('responseConfig', updateConfig);
	renHub.on('initCanvasReady', async () => {
		await changePage('mainmenu', ['gamecanvas', 'gameui'], 'gamecanvas');
		renHub.trigger('server/playerGameReady', { hid: Game.House.hid });
	});
	renHub.on('gameIsStarting', () => renHub.trigger('playSound', { name: 'gameReady' }));

	// Sockets / Server / Client
  renHub.on('joinServer', joinServer); // Debounce ???
	renHub.on('serverKick', ({ msg }) => rlog(`Kicked from server: ${msg}`));
	renHub.on('updatePlayerList', ({ players }) => { window.Game.Players = players; rlog('Updated player list'); });
	renHub.on('hostKilledServer', () => renHub.trigger('killSocket'));
	renHub.on('killSocket', () => {
		if (window.Game.DuneClient?.socket) {
			rlog('Killing client socket...');
			try { window.Game.DuneClient.socket.disconnect(true) } catch(e) { rlog(e, 'error') } }
		// delete window.Game.DuneClient;
	});

	// HTML / CSS
	renHub.on('changePage', changePage);
	window.addEventListener('DOMContentLoaded', getActivePageOnLoad());

}

// FUNCTIONS
// Game
const joinServer = async ({ serverOptions }) => {
	// Set up socket.io client
	const DuneClient = new SocketClient(serverOptions);
	window.Game.DuneClient = DuneClient;
	// Server return event route
	DuneClient.registerEventHub((event, ...args) => renHub.trigger(event, ...args));
  // Try connect
  let serverConnection;
  renHub.once('authSuccess', () => serverConnection = true);
  renHub.once('authReject', () => serverConnection = false);
	DuneClient.connectToGame();
  let connectAttempt = await Promise.race([
    helpers.watchCondition(() => serverConnection === true),
    helpers.watchCondition(() => serverConnection === false),
    helpers.timeout(3000)
  ]);
  if (connectAttempt) {
    rlog(`Connection successful!`, 'info');

		// This is where players will join a lobby, skipping for now

		renHub.trigger('server/playerReady');
		await helpers.timeout(500);
		// Host grabs list of player ID's and assigned houses, ruleset, game name etc. from lobby
		const hostOptions = {
			name: 'blah',
			ruleSet: 'defaultSet',
			houses: {
				// get player houses & ids from lobby menu
				[Game.CONFIG.userSettings.player.id]: {
					houseId: 'atreidesHouse_default',
					houseName: 'Atreides'
				}
			}
		}
		renHub.trigger('server/requestGameStart', { gameSetup: hostOptions });
  }
	else if (connectAttempt === false) rlog(`Connection refused by server`, 'warn');
  else rlog('Connection timed out.', 'warn');
}

////// UI FUNCTIONS
// JS Fade for changing page
// Supply single or multiple frames to fade
const changePage = async (from, to, setActive) => {
	from = helpers.toArray(from), to = helpers.toArray(to);
	rlog(`Switching from ${from.join('/')} to ${to.join('/')} page.`);
	if (from) await Promise.all[from.map(async (fr) => fade(fr, 'out'))];
	if (setActive) await setAndStoreActivePage(setActive);
	await Promise.all[to.map(async (t) => fade(t, 'in'))];
	rlog(`Page change completed.`);
}
const fade = async (page, direction, length=2000) => {
	rlog(`Fading ${direction} ${page}...`);
	let targetEl = document.querySelector(`main#${page}`);
	if (!targetEl) rlog(`Bad page supplied to HTML fade: ${page}`, 'warn');
	targetEl.style.opacity = direction === 'out' ? 1 : 0;
	return new Promise(res => {
		let fade = setInterval(() => {
			if ((direction === 'out' && targetEl.style.opacity <= 0) ||
					(direction === 'in' && targetEl.style.opacity >= 1)) {
				clearInterval(fade);
				res();
			} else {
				if (direction === 'out') targetEl.style.opacity = parseFloat(targetEl.style.opacity) - 10/length;
				else targetEl.style.opacity = parseFloat(targetEl.style.opacity) + 10/length;
			}
		}, 10);
	});
}
// Handle page reload
const getActivePageOnLoad = async () => {
	let pageAttr = document.querySelector('input[name="activePage"]');
	if (window.sessionStorage?.activePage) {
		pageAttr.value = window.sessionStorage.activePage;
		let hid = Game.House?.hid;
		rlog(`Requesting gameState update with id: ${hid}`);
		// Fake state update, just run the megSnake function in app.js for now:
		renHub.trigger('responseInitGameState');
	} else pageAttr.value = 'mainmenu';
}
// Save the browserWindow state to session storage in case of user refresh
const setAndStoreActivePage = async (page) => {
	let attr = document.querySelector('input[name="activePage"]');
	attr.value = page;
	window.sessionStorage.setItem('activePage', page);
	rlog(`Stored active page: ${page}`);
}

// Insert rendered HTML to game view
const insertHtml = (data) => {
  if (data.html) {
    if (data.req === 'canvas') document.querySelector('main#gamecanvas').innerHTML = (data.html);
		else if (data.req === 'ui') document.querySelector('main#gameui').innerHTML = (data.html);
    else if (data.req === 'mainmenu') document.querySelector('main#mainmenu').innerHTML = (data.html);
		else if (data.req === 'ingamemenu') document.querySelector('section#ingamemenu').innerHTML = (data.html);
  } else rlog(data.err||`Unknown Error from "${data.html}" request.`, 'error');
};

// Update CONFIG in browser window
const updateConfig = ({ CONFIG }) => {
  rlog([`Received game data: `, CONFIG]);
  Game.CONFIG = CONFIG;
}

init();