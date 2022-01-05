// server logging
export const newLogger = (source, eventHub, toConsole, debugFlag) => {
	return async (msgs, style='log') => {
		if (!console[style] || debugFlag === 0) return;
		msgs = Array.isArray(msgs) ? msgs : [msgs];
		eventHub.trigger(`renderer/${source}Log`, {msgs: msgs, style: style});
		if (toConsole) console[style](...msgs);
	};
}

// register with eventhub to receive debug logs from any source
export const newDebugReceiver = (eventHub, sources = {}) => {
	const debugStyles = {
		main: 'background: yellow; color: black; padding:1px 5px 1px 5px; border-radius: 3px',
		server: 'background: purple; color: white; padding:1px 5px 1px 5px; border-radius: 3px',
		socket: 'background: darkblue; color: white; padding:1px 5px 1px 5px; border-radius: 3px',
		clientSockets: 'background: green; color: black; padding:1px 5px 1px 5px; border-radius: 3px', 
		renderer: 'background: orange; color: black; padding:1px 5px 1px 5px; border-radius: 3px',
		default: 'background: darkgreen; color: black; padding:1px 5px 1px 5px; border-radius: 3px',
	}
	return () => { //eslint-disable-line no-unused-vars
		for (let logSource in sources) {
			if (sources[logSource] === 1) {
				eventHub.on(`${logSource}Log`, ({ msgs, style }) => {
					if (!Array.isArray(msgs)) console.log(`Received non-arrayed msgs: `, msgs);
					else (console[style]||console.log)(`%cFrom ${logSource}:`, debugStyles[logSource]||debugStyles.default||'', ...msgs);
				});
			}
		}
	}
};