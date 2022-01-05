import { createServer } from 'http';
import helpers from './serverHelpers.mjs';
import * as socketio from 'socket.io';
const Server = socketio.Server;

export class SocketServer {

	#maxUpgradeAttempts = 10;
	#logAttempts = {};
	#blackList = [];
	#debug = 1;

	#playerList = {};
	#houseList = {}

  constructor(serverOptions) {
		this.name = `serverOptions.name`
    let options = {
			port: serverOptions.hostPort || 8080,
			path: serverOptions.path || '/',
			password: serverOptions.password || null,
			dedicated: serverOptions.dedicated || false,
    };
		this.host = {
			playerName: serverOptions.playerName,
			cleanIp: serverOptions.hostIp.replace(/\./g, '_'),
			playerId: serverOptions.playerId,
			pid: serverOptions.playerId
		}

    const httpServer = createServer();
    this.io = new Server(httpServer, {
      path: options.path,
      connectTimeout: 5000,
    });

		// Don't upgrade connection if not from a Dune client
		const verifyUpgrade = async (socket, next) => {
			if (!socket.handshake || !socket.handshake.headers) return;
			let cleanIp = socket.handshake.address.replace(/\./g, '_').replace(/[^\d_]/g, '');
			if (this.#blackList[cleanIp] && this.#blackList[cleanIp] > this.#maxUpgradeAttempts) return this.#slog(`Blacklisted cunt was told to fuck off: ${cleanIp}`)
			this.#slog(`===UPGRADE REQUEST FROM ${cleanIp}===`);
			if (!socket.handshake.headers.game === 'dune' || !socket.handshake.auth || !socket.handshake.auth.playerName) {
				socket.disconnect(true);
				this.#slog(`Connection from ${cleanIp} was rejected.`);
				this.#addLogAttempt(cleanIp);
			} else {
				next();
			}
		}
		this.io.use(verifyUpgrade);

		// Authenticate player after socket upgrade
		this.io.on('connection', async (socket) => {
			let cleanIp = socket.handshake.address.replace(/\./g, '_').replace(/[^\d_]/g, '');
			this.#slog(`===UPGRADED CONNECTION FROM ${socket.handshake.address} ===`);
			let player = socket.handshake.auth;
			this.#slog(player);
			// Second round of auth if required
			// TODO: Check if player/ip already connected
			try {
				if (options.password && options.password !== player.password) throw new Error('Incorrect password!');
				if (!player.shortName || !player.playerName) throw new Error(`Bad player setup`);
			} catch(e) {
				this.#slog(e, 'error');
				socket.emit('auth', { err: e })
				return;
			}
			let playerData = {
				playerName: player.playerName,
				playerId: player.playerId,
				pid: player.playerId,
				ip: cleanIp
			}
			// Check if player is reconnecting
			let playerExists = await this.#checkPlayerIsAlive(playerData);
			if (playerExists !== undefined) { // 'undefined' means player is not even in playerList
				this.#slog(`Player exists`);
				if (playerExists) { // 'truthy' means player was found && responded to ack request
					return this.#slog(`Player is already connected!`);
				} else {
					let deadPlayer = this.#playerList[playerData.pid];
					this.#slog([`Player was connected but socket is dead. Killing socket`, playerData]);
					if (deadPlayer === -1) return this.#slog(`Error: could not find old socket to disconnect.`);
					else await this.#destroyPlayer(deadPlayer, `New socket req, no ack received on old socket.`);
				}
			}
			socket.emit('auth', playerData.pid);
			this.#slog(`Player added to game: ${playerData.playerName}`);
			this.triggerHub('playerJoined',socket.id);
			playerData.isHost = this.playerIsHost(playerData);
			playerData.socket = socket;
			this.#playerList[playerData.pid] = playerData;
			this.#slog(`${this.io.engine.clientsCount} player(s) active`);
			socket.on('disconnect', (err) => this.#slog(err));
			// Start listening for client messages
			socket.on('message', (event, data={}) => {
				try { Object.assign(data, {sid: socket.id}) }
				catch(e) { console.warn(`serverOnSocketMessage: received non-object, could not attach sid`, data) }
				this.#receiveFromClient(event, data);
			});
		});

		// Connection & error handling
		this.io.engine.on('connection_error', (err) => this.#slog(err));

		// Listen up, cunt
		httpServer.listen(options.port);
		this.#slog(`Listening on port ${options.port}...`);
  }

/* SERVER DEBUGGING */
	// TODO run through cyclic reference removal, or STOP SENDING SOCKET THROUGH SOCKET DICKHEAD
	#slog = (msgs, style='log') => {
		if (this.#debug && console[style]) {
			msgs = Array.isArray(msgs) ? msgs : [msgs];
			console[style](...msgs);
			// Reroute this to serverHub, only send back through sockets on subscription?
			this.sendToClient('serverLog', {targets: 0, msgs: msgs, style: style});
		}
	};
	// Turn the cunt off and on - probably obselete, use rendererHub debug switches instead?
	debugToggle() { this.#debug = (1 - this.#debug); console.log(`Server debugging is now ${this.#debug ? 'on' : 'off'}.`); }

/* SERVER MAINTENANCE */
	#debugHeartbeat = 0;
	#beatloop;
	#flatlineLog = {};
	// Testing only, delete later
	// Currently broken, do not turn on
	#debugHeartbeatToggle = async (off, failLimit=3, beat=4000) => {
		if (!off && this.#debugHeartbeat) return;
		const clearBeat = () => { clearInterval(this.#beatloop); this.#debugHeartbeat = 0; }
		if (off) { clearBeat(); return; }
		else {
			this.#beatloop = setInterval(async () => {
				if (this.#playerList.length < 1) {
					this.#slog(`No clients active, aborting heartbeat`);
					clearBeat();
					return;
				}	else {
					this.#slog(this.#flatlineLog);
					for (let id in this.#flatlineLog) {
						if (this.#flatlineLog[id] >= failLimit) {
							this.#slog(`Booting ${id}`);
							await this.#destroyPlayer(id, `Failed ${failLimit} heartbeat acks`).then(() => this.#slog('Player removed.'));
						}
					}
				}
			}, beat);
		}
	}
	// Blacklist an ip after too many failures to verify/upgrade connection
	#addLogAttempt = (cleanIp) => {
		this.#logAttempts[cleanIp] ?
		this.#logAttempts[cleanIp] > this.#maxUpgradeAttempts ?
			this.#blackList.push(cleanIp)
			: this.#logAttempts[cleanIp] ++
		: this.#logAttempts[cleanIp] = 0;
		this.#slog(`${cleanIp} has tried to log in ${this.#logAttempts[cleanIp]} time(s).`);
	}
	// Self-explanatory. Supply socket id or index in playerlist
	#destroyPlayer = async (pid, reasonForDestroy) => {
		if (!this.#playerList[pid]) return this.#slog(`destroyPlayer: bad id "${pid}"`);
		if (this.#playerList[pid].socket) {
			this.#playerList[pid].socket.send('deathnote', { msg: reasonForDestroy }||`Just because you're a cunt.`);
			this.#playerList[pid].socket.disconnect(true);
		}
		delete this.#playerList[pid];
		/* TODO: Scrub player reference from this.#houseList */
	}
	// Check connections are still active.
	// Supply playerData to check specific player, otherwise all players are checked
	#healthCheckAck = async (socket) => new Promise(res => socket.emit('healthCheck', (ack) => res(ack)));
	// Check if player exists/is alive. If player is not in playerList, return undefined, if player socket is dead return null
	#checkPlayerIsAlive = async (playerData) => {
		if (!this.#playerList[playerData.pid]) return undefined;
		this.#slog(`Checking client connection for ${playerData.playerName}...`);
		const ackTimeout = 5000;
		return await Promise.race([
			helpers.timeout(ackTimeout),
			this.#healthCheckAck(this.#playerList[playerData.pid].socket)
		]);
	}
	
/* MESSAGING & EVENTS */
	// Link to event hub
	#eventHub = [];
	registerEventHub(hubLink) { if (typeof(hubLink) === 'function') this.#eventHub.push(hubLink) }
	// Send triggered events to hub
	async triggerHub(event, data, ...args) {
		this.#eventHub.forEach(async (hubLink) => {
			// this.#slog([`triggerHub: Event: ${event}, origin: ${origin}`, ...args]);
			hubLink(event, data, ...args);
		});
	}
	// Send messages to client(s)
	// Can use playerId (pid) or houseId (hid) or socketId (sid)
	async sendToClient(event, data={}, ...args) {
		let clientsById = data.targets;
		// console.log(`Sending ${event} to ${clientsById || 'all clients'}`, data, ...args);
		if (!clientsById) {
			this.io.send(event, data, ...args);
		}
		else {
			/* TODO: Make more efficient? Assume houseId (hid), attempt to send to 'hid' before running regex checks? Should be faster */
			clientsById = Array.isArray(clientsById) ? clientsById : [clientsById];
			let target = /^[A-Za-z]_/.test(clientsById[0]) ? this.#playerList
				: /^[A-Za-z]{2}_/.test(clientsById[0]) ? this.#houseList
				: /[A-Za-z0-9_-]{20}/.test(clientsById[0]) ? 'socket'
				: null;
			if (!target) return console.warn(`server sendToClient error: bad ID supplied: ${clientsById.join('')}`);
			clientsById.forEach(client => {
				if (target === 'socket') {
					for (let player in this.#playerList) { if (this.#playerList[player].socket.id === player) this.#playerList[player].socket.send(event, data, ...args); }
				}	else {
					// console.log(`Sending to player or house:`, Object.keys(target)?.[0]);
					if (target[client]?.currentPlayer?.socket) target[client]?.currentPlayer?.socket.send(event, data, ...args);
					else console.warn('Socket not found');
				}
			});
		}
	}
	async #receiveFromClient(event, origin, ...args) { this.triggerHub(event, origin, ...args);	}

/* UTILITIES */
	// Promisified server destruction, the best kind of destruction
	async destroy() {
		return new Promise(res => {
			for (let player in this.#playerList) this.#playerList[player].socket?.disconnect(true);
			this.io.send('youCanAllGoGetFucked');
			this.io.close(() => res());
		});
	}

	// Grab player id from socket id
	getPlayerId(socketId) {
		for (let player in this.#playerList) { if (this.#playerList[player].socket?.id === socketId) return this.#playerList[player].pid }
	}

	// Return a clean player list
	getPlayerList() {
		let output = {};
		for (let player in this.#playerList) {
			let p = this.#playerList[player];
			output[player] = { playerName: p.playerName, pid: player, playerId: player, house: p.house||'' }
		}
		return output;
	}

	// Build a House list when game starts.
	// Use this as primary means of events, as players & ids can change, but Houses are static after creation.
	// Player is attached as #houseList[id].currentPlayer
	// Therefore socket can be found at #houseList[id].currentPlayer.socket
	// Can send messages from GameState without knowing any more than the House ID
	initHouseList(houseData) {
		Object.assign(this.#houseList, houseData);
		for (let house in this.#houseList) {
			if (!this.#houseList[house].currentPlayer) {
				for (let player in this.#playerList) {
					if (this.#playerList[player].pid === this.#houseList[house].pid) this.#houseList[house].currentPlayer = this.#playerList[player];
				}
			}
		}
		this.#slog(Object.keys(this.#houseList));
		// Do some error checking to make sure each house has a player assigned???
	}
	
	updateHouseList() {
		// for updating a house when loading a game - new player or new player ID may drop in to existing gamestate
		// player details will need to be updated in houseList, but houseId and HouseState remain the same
	}

	playerIsHost(playerId) { return this.host.pid === playerId }
}