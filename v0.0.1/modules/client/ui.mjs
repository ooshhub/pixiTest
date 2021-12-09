/* globals $, Game */
import { client } from './client.mjs';

const chatLimit = 80;

export const initUI = (async () => {
/* CHAT BAR */
	// chat window restore size
	let chatSize = window.Game.CONFIG.userSettings.chatWindow;
	$('#chat').css({width: chatSize.x||300, height: chatSize.y||200});
	// chat bar input
	$('#chatinput').on('keydown', (ev) => {
		if (/enter/i.test(ev.key) && !ev.shiftKey) {
			ev.preventDefault();
			handleChat.fromPlayer(ev.target.value);
			$('#chatinput').val('');
		}
	});
	// chat area resize
	document.querySelector('#chat .resize-handle').addEventListener('mousedown', (ev) => {
		const frame = document.querySelector('#chat');
		const posi = { x: ev.clientX, y: ev.clientY };
		let sizeChanged = false;
		$(frame).css({'pointer-events': 'none'});
		const resizeFrame = (ev) => {
			let xChange = posi.x - ev.clientX,
					yChange = posi.y - ev.clientY,
					newWidth = frame.offsetWidth + xChange,
					newHeight = frame.offsetHeight + yChange;
			$(frame).css({width: newWidth, height: newHeight});
			Object.assign(posi, { x: ev.clientX, y: ev.clientY });
			sizeChanged = true;
		};
		document.addEventListener('mousemove', resizeFrame);
		document.addEventListener('mouseup', () => {
			document.removeEventListener('mousemove', resizeFrame);
			$(frame).css({'pointer-events': 'auto'});
			if (sizeChanged) Game.LocalHub.trigger('main/writeConfig', {path: `userSettings/chatWindow`, data: {x:frame.offsetWidth, y:frame.offsetHeight}});
			sizeChanged = false;
		});
	});
/* UI COMPONENTS */
	// buttons
	$('#connect').on('click', () => window.Game.Client.connect());
	// menus
	document.addEventListener('keyup', (ev) => {
		if (/esc/i.test(ev.key)) {
			$('#mainmenu').toggleClass('show');
			if ($('#mainmenu').children()?.length) $('#mainmenu').empty();
			else Game.LocalHub.trigger('main/requestHtml', {req: 'settingsMenu'});
		}
	});	
});



export const handleChat = (() => {

	class ChatHtml {
		constructor(msg) {
			this.message = `<div class="chat-message"><span class="chat-who">${msg.who||'???'}</span>:<span class="chat-content">${msg.content}</span>`;
		}
		post() {
			let count = $('#chat .log').children().length;
			if (count > chatLimit) {
				$('#chat .log').children().slice(0, count - chatLimit).remove();
			}
			$('#chat .log').append(this.message);
			$('#chat .log').scrollTop($('#chat .log').prop('scrollHeight'));
		}
	}

	class ChatObject {
		constructor(msgString) {
			let msg = `${msgString}`.trim();
			let parts;
			if (/^\/w\s+/.test(msg)) {
				parts = msg.match(/^\/w\s+"([^"]+?)"\s*(.+)/) || msg.match(/^\/w\s+(\w+)\s*(.*)/);
			}
			let data = {
				channel: 'chat',
				who: window.Game.currentPlayer.displayName,
				id: window.Game.currentPlayer.id,
				target: parts ? parts[1] : null,
				content: parts ? parts[2] : msg,
			}
			Object.assign(this, data);
		}
	}

	const fromPlayer = (input) => {
		if (!window.Game?.currentPlayer?.id) return console.warn('Cannot chat until authenticated!');
		if (!input.trim()) return;
		console.log(`Turning player input into message object.`, input);
		let messageData = new ChatObject(input);
		client.send(messageData);
	}

	const fromServer = (msgData) => {
		let html = new ChatHtml(msgData);
		html.post();
	}

	return { fromPlayer, fromServer }

})();
