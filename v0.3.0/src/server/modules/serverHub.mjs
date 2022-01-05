import { EventHub } from '../../common/EventHub.mjs';
import { SocketServer } from './SocketServer.mjs';
import helpers from './serverHelpers.mjs';
import { ruleSets } from './gameData/rulesets.mjs';
import { GameState } from '../models/GameState.mjs';
import { newLogger } from '../../common/debug.mjs';

export const serverHub = new EventHub('serverHub');
export const Core = {
	GameServer: {},
	GameState: {}
};
const DEBUG = 1;
export const slog = newLogger('server', serverHub, 1, DEBUG);

export const startLocalServer = async (serverOptions) => {
	Core.GameServer = new SocketServer(serverOptions);
	Core.GameServer.registerEventHub(hubLink);
	// init();
	return Core.GameServer;
}

const hubLink = (event, data, ...args) => {
	// console.log(`hubLink: ${event} received from ${data.sid}`);
	serverHub.trigger(event, data, ...args)
}

const init = () => {
	// SocketHost passthroughs
	// Client renderers
	serverHub.for('renderer', (event, data, ...args) => {
		// let targets = data?.targets||0;
		// console.log(`Sending data to targets: ${targets || 'all clients'}`);
		Core.GameServer.sendToClient(event, data, ...args);
	});
	// Client main process goes via renderer hub, not directly
	serverHub.for('main', (event, data, ...args) => Core.GameServer.sendToClient(`main/${event}`, data, ...args));
	
	// Game Init phase
	serverHub.on('playerJoined', broadcastPlayerList);
	serverHub.on('requestGameStart', initGameState)
	serverHub.on('playerGameReady', ({ hid }) => updateHouseState(hid, 'ready'));
	serverHub.on('allPlayersReady', () => {
		slog(`GAME CAN NOW BEGIN!`);
		serverHub.trigger('renderer/gameIsStarting');
	});

	// Client requests
	serverHub.on('requestGameState', fetchGameStateForPlayer);
}

////// GAME DATA
// Update player with gameState on request
const fetchGameStateForPlayer = ({ hid }) => {
	slog(`Requested gameState: ${hid}`);
	// do useful things
}
// Update player list in all clients
const broadcastPlayerList = () => {
	let players = Core.GameServer.getPlayerList();
	serverHub.trigger('renderer/updatePlayerList', { targets: 0, players: players });
}

// Game startup functions. Can be moved to a Class later.

const initGameState = async ({ sid, gameSetup }) => {
	slog([`Received host options from ${sid}`, gameSetup]);
	let playerId = Core.GameServer.getPlayerId(sid);
	let rules = ruleSets[gameSetup.ruleSet];
	slog(`Picked ${gameSetup.ruleSet} from ${Object.keys(ruleSets)}`);
	if (!Core.GameServer.playerIsHost(playerId)) return slog(`Only the host can start the game`, 'error');
	slog([`Server received player init data:`, gameSetup], 'info');
	if (!gameSetup.ruleSet || !gameSetup.houses || !rules) return slog(`Bad gameSetup data`, 'error');
	// init game state 
	slog(`Fetching ruleset & creating gameState...`);
	// Pretend to wait for stuff to load
	await helpers.timeout(2000);
	// Set up House list on server
	let houseList = createHouseList(gameSetup.houses);
	Core.GameServer.initHouseList(houseList);
	// Create a new game state from the selected ruleset
	let coreData = {
		name: gameSetup.name,
		ruleSet: rules,
		houses: houseList
	}
	// Need to validate coreData before creating GameState... make sure all
	// 	houses exist, etc.
	Core.GameState = new GameState(coreData);
	// grab example data and send back to client
	for (let house in Core.GameState.houses) {
		serverHub.trigger('renderer/responseInitGameState', { hid: house, gameState: Core.GameState.houses[house] });
	}
}
// Currently only 'loading' and 'ready', move to Class within GameState later.
// Can also cover 'paused', 'active', 'passive' etc. for in-game states
const updateHouseState = (hid, state) => {
	let status = Core.GameState.houseChangeState(hid, state);
	let ready = Object.values(status).reduce((a,v) => {
		return (v === 'ready') ? a + 1 : a;
	}, 0);
	slog(`${ready} players are ready`);
	if (ready === Core.GameState.playerCount) serverHub.trigger('allPlayersReady'); // This should update a state field in GameState
}
// Goes wherever initGameState goes.
const createHouseList = (assignedHouses) => {
	let output = {},
			players = Core.GameServer.getPlayerList();
	slog(players);
	for (let player in assignedHouses) {
		slog(`createHouseList: processing ${player}...`);
		let houseId = helpers.generateHouseId(player, assignedHouses[player].houseName),
				playerData = players[player];
		if (playerData && houseId) {
			output[houseId] = {
				houseName: assignedHouses[player].houseName,
				houseRuleSetId: assignedHouses[player].houseId,
				pid: player,
				playerId: player,
				playerName: playerData.playerName,
			}
		} else slog([`createHouseList: bad input`, houseId, playerData], 'warn');
	}
	slog([`Built house list:`, output]);
	return output;
}

init();