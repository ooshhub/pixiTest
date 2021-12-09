import { handleChat } from './ui.mjs';

export const client = (() => { //eslint-no-unused-vars

	let wsock,
			authId,
			shortName,
      playerName;

	const connect = (serverOptions) => {
    let options = {
      playerName: serverOptions.playerName || `newPlayer_${Math.floor(Math.random()*99)}`,
      url: serverOptions.url || 'ws://localhost:8080',
      secret: serverOptions.secret || 'dune',
    }
    playerName = options.playerName;
    shortName = options.playerName.replace(/\s/g, '_').replace(/[^\w]/g, '').toLowerCase();
		if (wsock) wsock.close();//return console.warn(`Already connected!`, wsock);
		let queryString = options.playerName ? `?name=${shortName}` : '';
    console.info(`Attempting to log in with: ${options.url}/${queryString}, ${options.secret}`);
		try { wsock = new WebSocket(`${options.url}/${queryString}`, options.secret); } catch(e) { return console.error(e) }
		// Primary channel listener
		wsock.addEventListener('message', (msg) => {
			console.log('Message received...');
			let msgData = {};
			try { msgData = JSON.parse(msg.data); } catch(e) { msgData = msg.data; console.warn(`Non-object received.`) }
			// handle Auth request
			switch(msgData.channel) {
				case 'auth':
					switch(msgData.type) {
						case 'login':
							send({
								channel: 'auth',
								type: 'login',
								player: {
									shortName: shortName,
									displayName: playerName,
									gameVer: '0.0.1',
								}
							});
							console.info(`Sent auth info to game server.`);
							break;
						case 'success':
							authId = msgData.id;
							console.info(`${playerName}'s id is: "${authId}"`);
							window.Game.currentPlayer = {
								shortName: shortName,
								displayName: playerName,
								id: authId,
							}
							window.localStorage.setItem(`prevConnection`, window.Game.currentPlayer.shortName);
              window.Game.LocalHub.trigger('joinSuccess', window.Game.currentPlayer);
							break;
						case 'reject':
							console.error(msgData);
							window.alert(msgData.msg||'Connection rejected by server.');
              window.Game.LocalHub.trigger('joinReject', window.Game.currentPlayer);
							break;
						default:
							console.warn(`Unrecognised auth data received from server`, msgData);
					}
					break;
				case 'game':
					console.info(`Game data received`, msgData);
					if (msgData.type === 'clients') window.Game.Players = msgData.content;
					break;
				case 'chat':
					console.info(`Chat data received`, msgData);
					handleChat.fromServer(msgData);
					break;
				case 'heartbeat':
					console.log(`Sending heartbeat to server`);
					send({channel:'heartbeat', pulse:shortName});
					break;
				default:
					console.warn(`Data received, channel unrecognised`, msgData);
			}
		});
		// Heartbeat
	}
	const send = (msg) => {
		msg = typeof(msg) === 'object' ? JSON.stringify(msg) : msg;
		wsock?.send(msg);
	}
	const chat = (msg) => {
		if (!authId) return console.warn('Cannot chat until authenticated!');
		msg = `${msg}`.trim();
		let parts;
		if (/^\/w\s+/.test(msg)) {
			parts = msg.match(/^\/w\s+"([^"]+?)"\s*(.+)/) || msg.match(/^\/w\s+(\w+)\s*(.*)/);
		}
		let msgData = {
			channel: 'chat',
			id: authId,
			who: playerName,
			target: parts ? parts[1] : null,
			content: parts ? parts[2] : msg,
		}
		send(msgData);
	}
	return { connect, send, chat }
})();