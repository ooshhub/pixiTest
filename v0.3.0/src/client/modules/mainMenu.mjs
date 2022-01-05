/* globals Game */

import helpers from './clientHelpers.mjs';
import { newLogger } from '../../common/debug.mjs'; 

const mainMenu = (() => {  //eslint-disable-line no-unused-vars

  let hub, log;

  const debug = 1;
  // const log = newLogger('renderer', hub, 0, debug);

  const toggleMenuItem = (ev) => {
    let itemId = (ev.target.id?.match(/-(\w+)$/)||[])[1];
    if (!itemId) return log([`Bad button press from menu item`, ev], 'warn');
    let toggles = Array.from(document.querySelectorAll('input.toggle'));
    toggles.forEach(t => t.value = t.name.indexOf(itemId) > -1 ? 1-t.value : 0);
  };

  const launchGame = (ev) => {
    let type = (ev.target.id?.match(/-(\w+)$/)||[])[1],
        options = {}, path, msg, cancelAction;
    if (type === 'host') {
      options = {
        // TODO: save player name properly in CONFIG. Add to common {options} above
        playerName: document.querySelector('[name="playerName"]').value,
				playerId: document.querySelector('[name="playerId"]').value,
        gameName: document.querySelector('[name="gameName"]').value,
        hostPort: document.querySelector('[name="hostPort"]').value,
        hostIp: window.Game?.CONFIG?.NET?.PUBLIC_IP || '127.0.0.1',
        isHost: true
      }
      msg = `Starting game server "${options.gameName}" on port ${options.hostPort}`;
			cancelAction = 'main/killServer|killSocket';
      path = 'main/startServer';
    } else if (type === 'join') {
      options = {
        playerName: document.querySelector('[name="playername"]').value,
				playerId: document.querySelector('[name="playerId"]').value,
        hostIp: document.querySelector('[name="ip"]').value,
        hostPort: document.querySelector('[name="portjoin"]').value,
      };
      msg = `Attempting to join server ${options.hostIp} on port ${options.hostPort}`;
			cancelAction = 'killSocket';
      path = 'joinServer';
    }
    modalUp(msg, cancelAction);
    hub.trigger(path, { serverOptions: options });
  };

  const modalUp = async (msg, buttonEvents, blurMain=true) => {
    document.querySelector('input[name="modalup"]').value = 1;
    if (blurMain) document.querySelector('main#mainmenu').classList.add('disabled-blur');
    document.querySelector('#loading-modal .launch-message').innerHTML = msg||'Launching...';
		document.querySelector('#loading-modal .modal-button').dataset.events = buttonEvents;
  }
  const modalDown = async () => {
		let actions = document.querySelector('#loading-modal .modal-button').dataset?.events;
		if (actions) {
			actions = actions.split('|');
			actions.forEach(ev => hub.trigger(ev));
		}
    document.querySelector('main#mainmenu').classList.remove('disabled-blur');
    document.querySelector('input[name="modalup"]').value = 0;
  }

  const init = async () => { //eslint-disable-line no-unused-vars
    let hubStatus = await Promise.race([
      await helpers.watchCondition(() => Game.LocalHub?.name),
      await helpers.timeout(5000)
    ]);
    if (!hubStatus) return console.error(`Couldn't find event hub`);
    hub = Game.LocalHub;
		log = newLogger('renderer', hub, 0, debug);
    document.querySelectorAll('button.expandable').forEach(b => b.addEventListener('click', toggleMenuItem));
    document.querySelectorAll('input.toggle').forEach(t => t.value = 0);
    document.querySelectorAll('button.launch').forEach(b => b.onclick = launchGame);
    document.querySelector('.modal-button').addEventListener('click', modalDown);
    document.querySelector('#menu-quit')?.addEventListener('click', () => hub.trigger('main/exitGame'));
    hub.on('mainMenuModalDown', modalDown);
		// Save to Config when input modified, key is setting name, value is path in config object
		const configKeys = {
			gameName: 'host',
			hostPort: 'host',
			playerName: 'player',
		};
		for (let input in configKeys) {
			document.querySelector(`input[name="${input}"]`).addEventListener('change', (ev) => {
				// log(ev.target.value);
				hub.trigger('main/writeConfig', { path: `userSettings/${configKeys[input]}`, data: {[input]: ev.target.value||'', options: { createPath: true } } });
			});
		}
		log('Menu loaded...');
		hub.trigger('main/menuLoaded');
  };
  window.onload = () => {
    // log('window loaded...');
    init();
  };

  return { modalUp, modalDown }

})();