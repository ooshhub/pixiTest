/* globals */

import * as electron from 'electron';
import helpers from './main/mainHelpers.mjs';
import * as http from 'http';
import { EventHub } from './common/EventHub.mjs';
import { newLogger } from './common/debug.mjs';

// Move to CONFIG file(s) later
export const Dune = {
  EventHub: new EventHub('mainHub'),
  GameServer: {},
  electronApp: electron,
};
export const CONFIG = {
  DEBUG: 1,
  NET: {},
};
const mainHub = Dune.EventHub;

export const mlog = newLogger('main', Dune.EventHub, 1, CONFIG.DEBUG);
mlog('===Dependencies loaded===');

electron.app.setName('DuneTest');
const rootPath = electron.app.getAppPath();

CONFIG.PATH = {
	USERDATA: `${electron.app.getPath('userData')}`,
	ROOT: rootPath,
  HTML: `${rootPath}/client/templates/html`,
}

// Retrieve user settings
const getGameSettings = async () => { 
	let settingsPath = `${CONFIG.PATH.USERDATA}/userSettings.json`,
      err;
  try {
    let settings = await helpers.getFile(settingsPath);
    if (!settings?.player) {
      settings = await helpers.getFile(`${CONFIG.PATH.ROOT}/config/defaultUserSettings.json`);
      await helpers.saveFile(settingsPath, JSON.stringify(settings));
    }
		if (!/^[A-Za-z]_/.test(`${settings?.player?.id}`)) {
			settings.player.id = helpers.generatePlayerId(process?.env?.USERNAME);
			mlog(`New player ID generated: ${settings.player.id}`);
		}
    CONFIG.userSettings = settings;
  } catch(e) { err=e; console.error(e) }
  return (err) ? false : true;
};
// Grab public IP
const getPublicIp = async () => {
  return new Promise((res, rej) => {
		let ipGrab = http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, (response, err) => {
			if (err) throw new Error(err);
			response.on('data', ip => {
				CONFIG.NET.PUBLIC_IP = ip.toString();
				res(true);
			});
		});
		ipGrab.on('error', (e) => { console.log('getPublicIp error: ', e); rej(null) });
    setTimeout(() => rej(false), 5000);
  }).catch(e => console.log(e));
};
// Register the mainHub
const registerEventHandlers = async () => {
  await import(`./main/mainHub.mjs`);
  return true;
};

// Initialize, then start Electron. TODO: This still needs to handle a failed load of any Promise.
const init = (async () => { // eslint-disable-line no-unused-vars
  const timer = 10000;
  let loadComplete = await Promise.race([
    helpers.timeout(timer),
    Promise.all([
      await getGameSettings(),
      await getPublicIp(),
      await registerEventHandlers(),
      await electron.app.whenReady(),
    ]).catch((e) => { console.log(e); return false })
  ]);
  if (loadComplete?.length) startElectron();
})();

const startElectron = async () => {

  // Prepare the main browser window
  const newWindow = async (data) => {
    const frame = new electron.BrowserWindow({
      title: 'pixiTest v0.0.x',
      titleBarOverlay: {
        color: '#201900',
        symbolColor: '#74b1be'
      },
      opacity: 0.0,
      show: false,
      webPreferences: {
        preload: data.preload,
      },
			backgroundColor: '#201900',
      icon: `${CONFIG.PATH.ROOT}/assets/icons/iconAlpha.ico`,
    });
    frame.maximize();
    frame.loadFile(data.htmlPath);
    if (data.dev) frame.webContents.openDevTools();
    return frame;
  };

  const clientWindow = await newWindow({
    width: 1400,
    height: 900,
    dev: true,
    htmlPath: `./client/templates/html/layout.html`,
		preload: `${CONFIG.PATH.ROOT}/client/modules/preload.cjs`
  });
  Dune.Window = clientWindow;
	electron.nativeTheme.themeSource = 'dark';

	// Fallback to make window visible on crash
	clientWindow.webContents.on('did-stop-loading', async () => {
		await helpers.timeout(6000);
		if (!clientWindow.isVisible()) {
			clientWindow.show();
			clientWindow.setOpacity(1.0);
		}
	});

	const finishedLoadingClientModules = async () => {
		return await Promise.all([
			new Promise(res => mainHub.once('menuLoaded', () => res('Main menu done.'))),
			new Promise(res => mainHub.once('htmlLoaded', () => res('Canvas done.'))),
		]);
	}

  clientWindow.once('ready-to-show', async () => {
		await finishedLoadingClientModules().then(v => mlog(`HTML & Module load complete: ${v.join(', ')}.`));
		Dune.EventHub.trigger('renderer/playMusic', { name: 'titleMusic' });
		clientWindow.focus();
    let opacity = 0.0;
    let fadeIn = setInterval(() => {
      if (opacity >= 1.0) {
        clearInterval(fadeIn);
      }
      else clientWindow.setOpacity(opacity += 0.01);
    }, 10);
  });
}