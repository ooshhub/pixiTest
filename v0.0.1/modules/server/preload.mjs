import * as electron from 'electron';
const { contextBridge, ipcRenderer } = electron;

const channels = {
  send: ['sendToMain', 'receiveFromRenderer'],
  receive: ['sendToRenderer']
};

contextBridge.exposeInMainWorld('rendererToHub', {
  send: (channel, event, ...args) => {
		if (channels.send.includes(channel)) ipcRenderer.send('receiveFromRenderer', event, ...args);
		else console.warn(`Message from renderer was rejected: "${channel}" is not a valid token`);
	},
	receive: (channel, evHandler) => {
		if (channels.receive.includes(channel)) ipcRenderer.on(channel, (ipcEvent, event, ...args) => {
			console.log(`message on channel ${channel}...`);
			evHandler(event, ...args);
		});
		else console.warn(`Message from main process was rejected: "${channel}" is not a valid token`);
	}
});