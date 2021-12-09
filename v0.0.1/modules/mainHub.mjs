import { Dune, CONFIG } from "../main.mjs";
import { socketHost } from './server/server.mjs';
import helpers from "./helpers.mjs";

const hub = Dune.EventHub;

const init = () => {
  // First round of event handlers
  hub.on('requestHtml', renderHtml);
  hub.on('requestConfig', getConfig);
  hub.on('writeConfig', modifyConfig);

  // Handlers which need Browser Window to exist
  const waitForBrowserWindow = (async () => { //eslint-disable-line no-unused-vars
    await helpers.watchCondition(() => Dune.Window);
    // TODO: Need Race timer here - maybe build in to watchCondition function

    // Register passthroughs for rendererHub <> mainHub messaging
    Dune.EventHub.for('renderer', (event, ...args) => {
      // console.log(`${event} triggered, sending to renderer...`);
      Dune.Window.webContents.send('sendToRenderer', event, ...args);
    });
    Dune.electronApp.ipcMain.on('receiveFromRenderer', async ( _ , event, ...args ) => {
      // console.log(event, ...args);
      Dune.EventHub.trigger(event, ...args);
    });

    // Other functions
    hub.on('startServer', startServer);
    // hub.on('joinServer', joinServer)
    hub.on('exitGame', exitAndSave);
    Dune.electronApp.app.on('before-quit', (ev) => {
        ev.preventDefault();
        exitAndSave();
    });
  })();
};

//////
// FUNCTIONS

// Game
const startServer = async (serverOptions) => {
  let err;
  // Kill old server if still there
  if (Dune.GameServer.server) {
    console.warn('Server is already up');
    try { Dune.GameServer.destroy() } catch(e) { console.error(e) }
    Dune.GameServer = null;
  }
  console.log(`Starting server with options`, serverOptions);
  try {
    Dune.GameServer = new socketHost(serverOptions);
    let channels = await import('./server/channels.mjs');
    Dune.GameServer.initListeners({
      channels: {
        chat: channels.chatChannel,
        game: channels.gameChannel,
      }
    });
  } catch(e) { err = e; }
  if (err) { console.error(err); return false }
  console.log(`Server started on ${serverOptions.hostPort||8080}...`);
  await helpers.timeout(1000);
  // Once server is started, join game
  console.log(`Sending join request to rendererHub...`);
  hub.trigger('renderer/joinServer', serverOptions);
}

// Html
const renderHtml = async ({req}) => {
  // console.log(`HTML was requested`, req);
  let resHtml;
  if (req === 'canvas') {
    resHtml = await helpers.compileHbs(`${CONFIG.PATH.HTML}/hbs/testlab.hbs`, {title: 'pixi.js test lab'});
  }
  else if (req === 'settingsMenu') {
    let playerData = CONFIG.userSettings;
    resHtml = await helpers.compileHbs(`${CONFIG.PATH.HTML}/hbs/mainMenu.hbs`, {player: playerData});
  }
  if (resHtml) hub.trigger('renderer/responseHtml', {req: req, html: resHtml});
}

// config files
const modifyConfig = async (req) => {
  console.log('modifying config...', req);
  let target = helpers.getObjectPath(CONFIG, req.path);
  Object.assign(target, req.data);
}
const getConfig = async () => hub.trigger('renderer/responseConfig', CONFIG);

// UI
const exitAndSave = async () => {
  await helpers.saveFile(`${CONFIG.PATH.USERDATA}/userSettings.json`, JSON.stringify(CONFIG.userSettings||CONFIG.USERSETTINGS));
  console.log(`Saved settings.`);
  Dune.electronApp.app.exit();
}

init();