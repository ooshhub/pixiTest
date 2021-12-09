import ws from 'ws';
import * as http from 'http';
import helpers from '../helpers.mjs';

export class socketHost {
	constructor(serverOptions) {
    let options = {
			port: serverOptions.hostPort || 8080,
			path: serverOptions.path || '/',
			secret: serverOptions.secret || 'dune',
    }

		this.httpServer = http.createServer();
		this.httpServer.listen(options.port);

		this.server = new ws.WebSocketServer({ 
			server: this.httpServer,
			verifyClient: (getInfo) => {
				console.log(`===Incoming connection from ${getInfo.req.socket.remoteAddress}===`);
				let query = (getInfo.req.url.match(/=(.*)/)||[])[1];
				let remoteIp = `${getInfo.req.socket.remoteAddress}`.replace(/[^\d.]/g, ''),
						cleanIp = `_${remoteIp.replace(/\./g, '_')}`;

				// Add to attempts, check blacklist
				const maxLogins = 10;
				if (this.#blackList.includes(cleanIp)) { console.warn(`Blacklisted cunt rejected`); return false; }
				if (this.#logAttempts[cleanIp]) {
					if (this.#logAttempts[cleanIp] > maxLogins) this.#blackList.push(cleanIp);
					else this.#logAttempts[cleanIp] ++;
				}	else this.#logAttempts[cleanIp] = 1;
				console.log(this.#logAttempts);
        // TODO: Reset client logAttempts on successful authentication

				let protocol = getInfo.req.headers['sec-websocket-protocol'];
				console.log(`=== Incoming upgrade request: ${query} /  ${protocol} / ${remoteIp} ===`);
				this.tempCache({shortName: query, ip: remoteIp}, this.clientsConnecting, 10000);
				return protocol === options.secret ? true : false;
			}
		});
	}

	// Client & connections cache
	#logAttempts = {};
	#blackList = [];
	heartbeatLog = [];
	clientsConnecting = [];
	clientList = [];
	playerList() {
		this.garbageCollection();
		return this.clientList.map(c => {
			let output = {};
			for (let key in c) { if (key !== 'socket') output[key] = c[key]; }
			return output;
		});
	}

	// Server maintenance
	async tempCache(data, targetCache=this.heartbeatLog, lifespan=5000) {
		if (!data) return;
		targetCache.push(data);
		await helpers.timeout(lifespan);
		targetCache = targetCache.filter(e => e !== data);
	}
	garbageCollection() {
		this.clientList = this.clientList.filter(c => {
			if (c.id && !c.dead) return 1;
			else {
				console.warn(`Dropping client ${c.shortName}: ${c.id}`);
				if (c.socket) c.socket.terminate();
			}
		});
	}

	// Initialise primary server functions
	initListeners(options = {
			channels: {/* { channelName: channelHandler } */},
			badChannel: null}) { // handler function for non-existent channel
		

		this.server.on('connection', (client, req) => {

			console.log(`New connection, checking client list...`);
			let shortName = (`${req.url}`.match(/=(.*)/)||[])[1];

			const authTimer = 10000;
			let remoteIp = req.socket.remoteAddress.replace(/[^\d.]/g, ''),
					keepConnection = false;

			// Check if client matches a recently upgraded connection, or if they already exist
			// Clear dead connections if reconnecting player
			if (!this.checkIsConnecting(remoteIp, shortName)) {
				console.log(`Unverified connection attempt from ${remoteIp}, terminating`);
				client.terminate();
			}
			let activeClient = this.checkActiveClient(remoteIp, shortName);
			if (activeClient)	{
				console.log(`${remoteIp}:${shortName} is already actively connected.`);
				client.send(JSON.stringify({channel: 'auth', type: 'reject', msg: `IP & Name already in active use`}));
			} else {
				console.log(`Requesting login info from client`);
				setTimeout(() => client.send(JSON.stringify({channel: 'auth', type: 'login'})), 1);
			}

			// Setup messaging channels & handle player Auth
			client.on('message', (msg) => {
				let msgData = {};
				try { msgData = JSON.parse(msg.toString()) } catch(e) { msgData = msg; console.warn(`Message was not an object!`) }
				// Player Auth channel
				console.log(msgData);
				if (msgData.channel === 'auth' && msgData.type === 'login') {
					if (msgData.player.shortName === shortName) {
						let newPlayer = msgData.player,
								newId = helpers.generatePID(shortName);
						Object.assign(newPlayer, {socket: client, id: newId, ip: remoteIp});
						keepConnection = true;
						client.send(JSON.stringify({channel: 'auth', type: 'success', id: newId}));
						this.clientList.push(newPlayer);
						this.push('all', {channel: 'game', type: 'clients', content: this.playerList()});
					} else console.warn(`shortName mismatch from ${msgData.player.shortName}, auth rejected`);
				}
				// Client maintenance channel
				else if (msgData.channel === 'heartbeat') {
					console.log(`Heartbeat: ${msgData.pulse}`);
					this.tempCache(msgData.pulse, this.heartbeatLog);
				}
				// Instance defined channels
				else if (options.channels[msgData.channel]) options.channels[msgData.channel](msgData);
				else if (options.badChannel) options.badChannel(msgData);
			});

			// Terminate connection attempt on timeout
			setTimeout(() => {
				if (!keepConnection) {
					client.terminate();
					console.warn(`Player could not be validated and was disconnected.`);
				}
			}, authTimer);

		});
	}

	checkIsConnecting(ip, shortName) {
		return this.clientsConnecting.filter(c=>c.ip === ip && c.shortName === shortName).length;
	}
	checkActiveClient(ip, shortName) {
		let existingClients = this.clientList.filter(c=>c.ip === ip && c.shortName === shortName);
		let activeClients = existingClients.map(cl => {
			console.warn('IP/Name is already connected! Checking previous connection...');
			if (cl.socket) {
				let active = false;
				cl.socket.send(JSON.stringify({channel: 'heartbeat'}));
				let checkPulse = setInterval(() => {
					let timeout = 1000;
					if (this.heartbeatLog.includes(shortName)) {
						active = true;
						clearInterval(checkPulse);
					} else timeout -= 100;
					if (timeout < 100) clearInterval(checkPulse);
				}, 100);
				if (!active) cl.dead = true;
				else return true;
			} else cl.dead = true;
		}).filter(v=>v);
		console.log(activeClients);
		this.garbageCollection();
		return activeClients.length;
	}

	async push(targetIds, data) {
		targetIds = 'all' === targetIds ? this.clientList.map(c=>c.id)
			: Array.isArray(targetIds) ? targetIds
			: [targetIds];
		// console.log(`Pushing to these ids:`, targetIds);
		let payload = helpers.stringifyCyclic(data);
		this.clientList.forEach(client => {
			if (!client.id || !client.socket) return; // TODO: garbage collection to clean up corrupted or dead sockets
			// console.log(`Pushing message to ${client.id}`);
			if (targetIds.includes(client.id)) {
				console.log(`Sending message to ${client.id}`);
				client.socket.send(payload);
			} else console.log(`Couldn't find ${client.id} in ${targetIds.join(' ')}`);
		});
	}

  destroy() {
    if (this.httpServer) this.httpServer.close();
    this.server.clients.forEach(socket => socket.terminate());
    this.server.close();
  }
}