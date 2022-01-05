import { Dune, CONFIG, mlog } from "../main.mjs";
import { startLocalServer } from '../server/modules/serverHub.mjs';
import helpers from "./mainHelpers.mjs";
import { getMenuItems } from '../client/templates/html/menuItems.mjs';

const mainHub = Dune.EventHub;
// mlog([`User Settings:`, CONFIG.userSettings], 'info');

const init = () => {
  // First round of event handlers
  mainHub.on('requestHtml', renderHtml);
  mainHub.on('requestConfig', getConfig);
  mainHub.on('writeConfig', modifyConfig);

  // Handlers which need Browser Window to exist
  const waitForBrowserWindow = (async () => { //eslint-disable-line no-unused-vars
    await helpers.watchCondition(() => Dune.Window);
    // Register passthroughs for rendererHub <> mainHub messaging
    Dune.EventHub.for('renderer', (event, ...args) => {
      Dune.Window.webContents.send('sendToRenderer', event, ...args);
    });
    Dune.electronApp.ipcMain.on('receiveFromRenderer', async ( _ , event, ...args ) => {
      // console.log(event, ...args);
      Dune.EventHub.trigger(event, ...args);
    });

    // Other functions
    mainHub.on('startServer', startServer);
		mainHub.on('killServer', killServer);
    mainHub.on('exitGame', exitAndSave);
    Dune.electronApp.app.on('before-quit', (ev) => {
        ev.preventDefault();
        exitAndSave();
    });

  })();
};

//////
// FUNCTIONS
// Move to separate files later

// GAME
const startServer = async ({ serverOptions }) => {
  let err;
  // Kill old server if still there
  if (Dune.GameServer?.host) {
    mlog('Server is already up', 'warn');
		mainHub.trigger('rendererHub/killSocket');
		await killServer();
		helpers.timeout(500);
  }
  mlog([`Starting server with options`, serverOptions], 'info');
  try {
		Dune.GameServer = await startLocalServer(serverOptions);
		if (!Dune.GameServer) throw new Error(`Server shit the bed!`);
  } catch(e) { err = e; }
  if (err) { console.error(err); return false }
  console.log(`Server started on ${serverOptions.hostPort}...`);
  await helpers.timeout(1000);
  // Once server is started, join game
  console.log(`Sending join request to rendererHub...`);
//// Use localhost for testing ////
	serverOptions.hostIp = 'localhost';
  mainHub.trigger('renderer/joinServer', { serverOptions: serverOptions });
}

const killServer = async () => {
	mlog(`Destroying server...`);
	try { await Dune.GameServer.destroy() } catch(e) { mlog(e, 'error') }
	Dune.GameServer = null;
}

//////
// Html
const renderHtml = async ({req}) => {
  mlog(`HTML was requested`, req);
  let hbsPath = '', hbsData = {};
  if (req === 'canvas') hbsPath = `${CONFIG.PATH.HTML}/gameCanvas.hbs`;
	else if (req === 'mainmenu') hbsPath = `${CONFIG.PATH.HTML}/menuBody.hbs`, hbsData = { config: CONFIG.userSettings, menuItems: getMenuItems(CONFIG.userSettings) }
	else if (req === 'ui') hbsPath = `${CONFIG.PATH.HTML}/gameUi.hbs`;
	else if (req === 'ingamemenu') hbsPath = `${CONFIG.PATH.HTML}/inGameMenu.hbs`, hbsData = { player: CONFIG.userSettings }
	let resHtml = await helpers.compileHbs(hbsPath, hbsData);
  if (resHtml) mainHub.trigger('renderer/responseHtml', {req: req, html: resHtml});
	else mlog([`Error loading HTML`, resHtml], 'error');
}

//////
// UI
const exitAndSave = async () => { // erm.... saveAndExit would be a more sensible name
  await saveConfig();
  console.log(`Saved settings.`);
  Dune.electronApp.app.exit();
}

//////
// CONFIG
const modifyConfig = async ({ path, data, options } ) => {
	if (!data || !path) return mlog(`modifyConfig: no data received with request`, data);
	console.log(`modifying config for key ${path}...`);
	let target = helpers.getObjectPath(CONFIG, path, options?.createPath||true);
	Object.assign(target, data);
	mlog(CONFIG.userSettings);
	if (!options?.noSave) saveConfig();
}
const getConfig = async () => mainHub.trigger('renderer/responseConfig', { CONFIG });
const saveConfig = async () => helpers.saveFile(`${CONFIG.PATH.USERDATA}/userSettings.json`, JSON.stringify(CONFIG.userSettings||CONFIG.USERSETTINGS));

init();