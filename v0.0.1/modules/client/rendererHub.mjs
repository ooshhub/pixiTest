/* globals Game, $, rendererToHub */

import { eventHub } from '../eventHub.mjs';
import { client } from './client.mjs';
import helpers from './clientHelpers.mjs';

const hub = new eventHub('rendererHub');
window.Game.LocalHub = hub;

const init = async () => {
  // Primary passthroughs for rendererHub <> mainHub messaging
  rendererToHub.receive('sendToRenderer', (event, data) => {
    // if (!event) console.warn(`Bad event received: ${event}`);
    hub.trigger(event, data);
  });
  hub.for('main', (event, ...args) => {
    // console.log('Sending to main...', event);
    window.rendererToHub.send('sendToMain', event, ...args);
  });

  hub.on('responseHtml', insertHtml);
  hub.on('responseConfig', updateConfig);
  hub.on('joinServer', joinServer); // Debounce ???
}


// FUNCTIONS
// Game
const joinServer = async (serverOptions) => {
  // Listen for server response
  let serverConnection = null;
  hub.once('joinSuccess', () => serverConnection = true);
  hub.once('joinReject', () => serverConnection = false);
  // Send connect data
  serverOptions.url = `ws://${serverOptions.hostIp}:${serverOptions.hostPort}`;
  try { client.connect(serverOptions) } catch(e) { return console.log(e) }
  // Await connection result
  let connectAttempt = await Promise.race([
    helpers.watchCondition(() => serverConnection === true),
    helpers.watchCondition(() => serverConnection === false),
    helpers.timeout(3000)
  ]);
  console.log('...');
  if (connectAttempt) {
    console.info(`Connection successful!`);
    loadCanvas();
  } else if (connectAttempt === false) {
    console.warn(`Connection refused by server`);
  } else {
    console.warn('Connection timed out.');
  }
}

const loadCanvas = async () => {
  // TODO: get current state from server here
  document.querySelector('main#mainmenu').classList.add('fadeout');
  await helpers.timeout(1000);
  document.querySelector('main#mainmenu').style.display = 'none';
  document.querySelector('main#game').classList.add('fadein');
}


// Insert rendered HTML to game view
const insertHtml = (data) => {
  if (data.html) {
    if (data.req === 'canvas') $('#game').append(data.html);
    else if (data.req === 'mainmenu') $('#settingsmenu').append(data.html);
  } else console.error(data.err||`Unknown Error from "${data.html}" request.`);
};

// Update CONFIG in browser window
const updateConfig = (data) => {
  console.log(`Received game data: `, data);
  Game.CONFIG = data;
}

init();