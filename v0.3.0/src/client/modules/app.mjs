/* globals Howl, */
// Import dependencies

import * as PIXI from './lib/pixi.mjs';
import helpers from './clientHelpers.mjs';
import { /* Token, */ Soldier } from '../viewModels/tokens.mjs';
import { Layer, /* Background,*/ /* AnchorPoint */ } from '../viewModels/tiles.mjs';

import { initUI } from './ui.mjs';
import { canvasZoom, panView } from './pixiUI.mjs';

window.PIXI = PIXI;
window.pixiHelpers = helpers;

// Loader at top level
const loader = PIXI.Loader.shared;
const textures = {};

const Game = {
	House: {},
  LocalHub: null,
	Players: {},
	Game: {},
	Layers: {},
	Utils: {},
	// Client: client,
	CONFIG: {},
}
window.Game = Game;
let renHub, rlog;

const initListeners = (async () => { //eslint-disable-line

  // Initialise hub & any dynamic imports
	import('./lib/howler.js');
  import('./rendererHub.mjs').then(imp => rlog = imp.rlog);
  await helpers.watchCondition(() => Game.LocalHub?.name, `Hub online.`);
  renHub = Game.LocalHub;

  // Request initial game data
	renHub.trigger('main/requestHtml', {req: 'canvas'});
	renHub.trigger('main/requestHtml', {req: 'ui'});
	renHub.trigger('main/requestHtml', {req: 'mainmenu'});
  renHub.trigger('main/requestConfig');

	// Pixi handlers
	renHub.on('responseInitGameState', initCanvasSetup);

  // Await required states before starting Pixi
	// Add any more required loads to Promise.all
	const loadTimeout = 10000;
	let awaitLoad = await Promise.race([
		Promise.all([
			helpers.watchCondition(() => document.querySelector('#chat'), 'HBS loaded.'),
			helpers.watchCondition(() => window.Game?.CONFIG?.userSettings, 'userSettings loaded.'),
			helpers.watchCondition(() => Howl, 'Howler.js ready to beep & toot!')
		]),
		helpers.timeout(loadTimeout)
	]);
	if (awaitLoad) {
		startApp();
		initUI();
		await helpers.timeout(100);
		renHub.trigger('main/htmlLoaded');
		audioTest();
	} else console.error(`Failed loading page or settings, aborting.`);

})();

// TODO: list for Howler
// Extend Howl class => Music, Sound, BackgroundSound to enable global volume groups
// Create Class for sound asset loading, run alongside Pixi Texture Loader on start
const audioTest = () => {
	const audioPath = `${window.Game?.CONFIG?.PATH?.ROOT}/assets/audio`;
	let titleMusic = new Howl({
		src: `${audioPath}/music/prophecyTheme.mp4`,
		preload: true
	});
	let gameReady = new Howl({
		src: `${audioPath}/sounds/droningShaiHulud.mp3`,
	});
	renHub.on('playMusic', ({ name }) => {
		if (name === 'titleMusic') titleMusic.play();
	});
	renHub.on('playSound', ({ name }) => {
		if (name === 'sgameReady') gameReady.play();
	});
}

const startApp = () => {
// Start PIXI experiments
	// Get window size & initialize PIXI app
	let windowSize = {width: window.innerWidth, height: window.innerHeight};
	let pixiApp = new PIXI.Application({
		width: windowSize.width,
		height: windowSize.height,
		backgroundColor: 0xb4b4b4
	});
	document.querySelector('#canvas').append(pixiApp.view);

	// Load required assets
	let assetPath = `${Game.CONFIG.PATH.ROOT}/assets`;
	let assets = {
		lagertha: `${assetPath}/tokens/lagertha.png`,
		hando: `${assetPath}/tokens/hando.png`,
		meg: `${assetPath}/tokens/meg.png`,
	};
	Object.entries(assets).forEach(kv => loader.add(kv[0], kv[1]));

	loader.load((ldr, content) => {
		rlog(content);
		for (let asset in content) {
			textures[asset] = new PIXI.Texture.from(content[asset].texture.baseTexture);
		}
	});

	loader.onComplete.add(() => {
		// Object.assign(Game.Layers.Stage, pixiApp.stage);
		Game.Layers.Stage = pixiApp.stage;

		// SET UP LAYERS
		let backgroundLayer = new Layer(pixiApp.stage, 'Background');
		let tokenLayer = new Layer(pixiApp.stage, 'Token');
		tokenLayer.sortableChildren = true;
		backgroundLayer.filters = [new PIXI.filters.BlurFilter(2)];

		// UI functions
		canvasZoom(document.querySelector('#canvas'));
		panView(document.querySelector('#canvas'));
	});
}
const initCanvasSetup = ({ hid, gameState }) => {
	const { Ticker } = PIXI;
		rlog([`Received gameState for ${hid}: `, gameState], 'info');
		Object.assign(window.Game.House, gameState);
	let startingSoldiers = gameState?.tokens?.soldiers?.hand,
			soldiers = [];
	for (let i = 1; i <= startingSoldiers; i++) {
		soldiers.push(new Soldier(textures.meg, {name: `atriedesSoldier_${i.toFixed(3)}`, position: {x: 150 + (i*20) , y: 300}}));
	}
	Game.Layers.Token.addChild(...soldiers);	
	// Silly animation to make a meg snake
	let tickCount = 0;
	Ticker.shared.add(() => {
		tickCount += 0.01;
		for (let i=0; i < soldiers.length; i++) {
			let s = soldiers[i];
			s.position.y = s.position.y + Math.sin(tickCount + (i/8));
		}
	});
	renHub.trigger('initCanvasReady');
}