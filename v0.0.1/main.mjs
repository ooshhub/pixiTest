/* globals */

import * as electron from 'electron';
import helpers from './modules/helpers.mjs';
import * as http from 'http';
// import { socketHost }  from './modules/server/server.mjs';
import { eventHub } from './modules/eventHub.mjs';
// import { chatChannel, gameChannel } from './modules/server/channels.mjs';

// Move to CONFIG file(s) later
export const Dune = {
  EventHub: new eventHub('duneHub'),
  GameServer: {},
  electronApp: electron,
};
export const CONFIG = {
  NET: {},
};

console.log('===Dependencies loaded===');

electron.app.setName('DuneTest');
const rootPath = electron.app.getAppPath();

CONFIG.PATH = {
	USERDATA: `${electron.app.getPath('userData')}`,
	ROOT: rootPath,
	MODULES: `${rootPath}/modules`,
  HTML: `${rootPath}/templates`,
}

// Retrieve user settings
const getGameSettings = async () => { 
	let settingsPath = `${CONFIG.PATH.USERDATA}\\userSettings.json`,
      err;
  try {
    let settings = await helpers.getFile(settingsPath);
    if (!settings) {
      settings = await helpers.getFile(`${CONFIG.PATH.ROOT}\\data\\config\\defaultUserSettings.json`);
      await helpers.saveFile(settingsPath, JSON.stringify(settings));
    }
    CONFIG.userSettings = settings;
  } catch(e) { err=e; console.error(e) }
  return (err) ? false : true;
};
// Grab public IP
const getPublicIp = async () => {
  return new Promise((res, rej) => {
    http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, response => {
      response.on('data', ip => {
        console.log("My public IP address is: " + ip);
        CONFIG.NET.PUBLIC_IP = ip.toString();
        res(true);
      });
    });
    setTimeout(() => rej(false), 5000);
  });
};
// Register the mainHub
const registerEventHandlers = async () => {
  await import(`${CONFIG.PATH.MODULES}/mainHub.mjs`);
  return true;
};
// Initialize, then start Electron
const init = (async () => { // eslint-disable-line no-unused-vars
  const timer = 10000;
  let loadComplete = await Promise.race([
    helpers.timeout(timer),
    Promise.all([
      await getGameSettings(),
      await getPublicIp(),
      await registerEventHandlers(),
      await electron.app.whenReady(),
    ]).catch(() => false)
  ]);
  if (loadComplete.length) startElectron();
})();

const startElectron = async () => {
  // String check for Node server testing mode - skips Electron load
  // const execMode = (process.execPath.match(/(\w+)\.exe/)||[])[1]||'';
  // if (!/electron/i.test(execMode)) return;
  // Basic Electron window creation, include preload.js for main proc to renderer messaging

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
      icon: `${CONFIG.PATH.HTML}/assets/iconAlpha.ico`,
    });
    frame.maximize();
    frame.loadFile(data.htmlPath);
    if (data.dev) frame.webContents.openDevTools();
    return frame;
  };
  const mainFrame = await newWindow({
    width: 1400,
    height: 900,
    dev: true,
    preload: `${CONFIG.PATH.MODULES}\\server\\preload.cjs`,
    htmlPath: `${CONFIG.PATH.HTML}/hbs/layout.html`
  });
  Dune.Window = mainFrame;

  // Fade window in when ready
  mainFrame.once('ready-to-show', () => {
    let opacity = 0.0;
    let fadeIn = setInterval(() => {
      if (opacity >= 1.0) {
        clearInterval(fadeIn);
      }
      else mainFrame.setOpacity(opacity += 0.01);
    }, 10);
  });

}