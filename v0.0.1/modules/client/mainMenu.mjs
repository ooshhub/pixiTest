/* globals Game */

import helpers from './clientHelpers.mjs';

const mainMenu = (() => {  //eslint-disable-line no-unused-vars

  let hub;
  // TODO: loop until hub detected

  const debug = 1;
  const log = (msgs, type='log') => {
    if (!debug) return;
    msgs = Array.isArray(msgs) ? msgs : [msgs];
    console[type]?.(...msgs);
  };

  const toggleMenuItem = (ev) => {
    let itemId = (ev.target.id?.match(/-(\w+)$/)||[])[1];
    if (!itemId) return log([`Bad button press from menu item`, ev], 'warn');
    let toggles = Array.from(document.querySelectorAll('input.toggle'));
    toggles.forEach(t => t.value = t.name.indexOf(itemId) > -1 ? 1-t.value : 0);
  };

  const launchGame = (ev) => {
    let type = (ev.target.id?.match(/-(\w+)$/)||[])[1],
        options = {}, path, msg;
    if (type === 'host') {
      options = {
        // TODO: save player name properly in CONFIG. Add to common {options} above
        playerName: document.querySelector('[name="playername"]').value,
        gameName: document.querySelector('[name="gamename"]').value,
        hostPort: document.querySelector('[name="porthost"]').value,
        hostIp: window.Game?.CONFIG?.NET?.PUBLIC_IP || '127.0.0.1',
        isHost: true
      }
      msg = `Starting game server "${options.gameName}" on port ${options.hostPort}`;
      path = 'main/startServer';
    } else if (type === 'join') {
      options = {
        playerName: document.querySelector('[name="playername"]').value,
        hostIp: document.querySelector('[name="ip"]').value,
        hostPort: document.querySelector('[name="portjoin"]').value,
      };
      msg = `Attempting to join server ${options.hostIp} on port ${options.hostPort}`;
      path = 'joinServer';
    }
    modalUp(msg);
    hub.trigger(path, options);
  };

  const modalUp = async (msg, blurMain=true) => {
    document.querySelector('input[name="modalup"]').value = 1;
    if (blurMain) document.querySelector('section#menu').classList.add('disabled-blur');
    document.querySelector('#loading-modal .launch-message').innerHTML = msg||'Launching...';
  }
  const modalDown = async () => {
    document.querySelector('section#menu').classList.remove('disabled-blur');
    document.querySelector('input[name="modalup"]').value = 0;
  }

  const init = async () => { //eslint-disable-line no-unused-vars
    let hubStatus = await Promise.race([
      await helpers.watchCondition(() => Game.LocalHub),
      await helpers.timeout(2000)
    ]);
    if (!hubStatus) return console.error(`Couldn't find event hub`);
    hub = Game.LocalHub;
    document.querySelectorAll('button.expandable').forEach(b => b.addEventListener('click', toggleMenuItem));
    document.querySelectorAll('input.toggle').forEach(t => t.value = 0);
    document.querySelectorAll('button.launch').forEach(b => b.onclick = launchGame);
    document.querySelector('.modal-button').addEventListener('click', modalDown);
    document.querySelector('#menu-quit').addEventListener('click', () => hub.trigger('main/exitGame'));
    hub.on('mainMenuModalDown', modalDown);
  };
  window.onload = () => {
    log('window loaded...');
    init();
  };

  return { modalUp, modalDown }

})();