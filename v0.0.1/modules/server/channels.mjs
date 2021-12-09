import { Dune } from '../../main.mjs';
const { GameServer } = Dune;

const saveLogs = false;
const chatLog = [];

const getPlayerIds = () => {
	return (GameServer) ? GameServer.clientList.map(c => c.id) : [];
}

// Player chat
export const chatChannel = async (msgData) => {
	if (!GameServer.server) return;
	if (saveLogs) chatLog.push(msgData);
	let targets = msgData.target || getPlayerIds();
  console.log(GameServer);
	if (targets) GameServer.push(targets, msgData);
	// Push message back to server
}

export const gameChannel = async (msgData) => {
	if (!GameServer) return console.error('No server running!');
	console.log(`gameChannel: received message.`, msgData);
	GameServer.push(getPlayerIds(), msgData);
}
