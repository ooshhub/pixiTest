/* globals $ */
// Import dependencies

import * as PIXI from './lib/pixi.mjs';
import helpers from './clientHelpers.mjs';
import { Token, Soldier } from '../../models/tokens.mjs';
import { Layer, /* Background,*/ AnchorPoint } from '../../models/tiles.mjs';

import { initUI } from './ui.mjs';
// import { client }  from './client.mjs';
import { canvasZoom, panView } from './pixiUI.mjs';

window.PIXI = PIXI;
window.pixiHelpers = helpers;

// Loader at top level
const loader = PIXI.Loader.shared;
const textures = {};

const Game = {
  LocalHub: null,
	Players: {},
	Game: {},
	Layers: {},
	Utils: {},
	// Client: client,
	CONFIG: {},
}
window.Game = Game;
let hub;

const initListeners = (async () => { //eslint-disable-line

  // Initialise rendererHub
  await import('./rendererHub.mjs');
  await helpers.watchCondition(() => Game.LocalHub);
  hub = Game.LocalHub;

  // Request initial game data
  hub.trigger('main/requestConfig');
  hub.trigger('main/requestHtml', {req: 'canvas'});

  // Await required states before starting Pixi
	// Add any more required loads to Promise.all
	const loadTimeout = 10000;
	let awaitLoad = await Promise.race([
		Promise.all([
			helpers.watchCondition(() => $('#chat').length, 'HTML loaded!'),
			helpers.watchCondition(() => window.Game?.CONFIG?.userSettings, 'Settings loaded!')
		]),
		helpers.timeout(loadTimeout)
	]);
	if (awaitLoad) {
		startApp();
		initUI();
	} else console.error(`Failed loading page or settings, aborting.`);

})();

const startApp = () => {
// Start PIXI experiments
	// Get window size & initialize PIXI app
	let windowSize = {width: window.innerWidth, height: window.innerHeight};
	let pixiApp = new PIXI.Application({
		width: windowSize.width,
		height: windowSize.height,
		backgroundColor: 0xb4b4b4
	});
	$('#canvas').append(pixiApp.view);

	// Load required assets
	let assetPath = `${Game.CONFIG?.PATH?.ROOT}/assets`;
	let assets = {
		meg: `${assetPath}/tokens/meg.png`,
		lagertha: `${assetPath}/tokens/lagertha.png`,
		hando: `${assetPath}/tokens/hando token.png`,
	};
	Object.entries(assets).forEach(kv => loader.add(kv[0], kv[1]));

	loader.load((ldr, content) => {
		console.log(content);
		for (let asset in content) {
			textures[asset] = new PIXI.Texture.from(content[asset].texture.baseTexture);
		}
	});

	loader.onComplete.add(() => {
		Object.assign(Game.Layers, {Stage: pixiApp.stage});

		// LAYERS
		let backgroundLayer = new Layer(pixiApp.stage, 'Background');
		let tokenLayer = new Layer(pixiApp.stage, 'Token');
		backgroundLayer.filters = [new PIXI.filters.BlurFilter(2)]

		// TODO: Leader subClass
		let spriteOne = new Token(textures.meg, {
			type: 'leader',
			interactive: true,
			flags: {draggable: true, stackable: false},
			x: (0 + textures.meg.width)/2,
			y: (0 + textures.meg.height)/2,
			width: 150,
			height: 150,
		});

		// Test Soldier class
		let soldierOne = new Soldier(textures.hando, {name: 's1', position: {x: 200, y: 200}});
		let soldierTwo = new Soldier(textures.hando, {name: 's2', position: {x: 200, y: 300}});
		let soldierThree = new Soldier(textures.hando, {name: 's3', position: {x: 200, y: 400}});

		tokenLayer.sortableChildren = true;
		tokenLayer.addChild(spriteOne);
		tokenLayer.addChild(soldierOne, soldierThree, soldierTwo);

		new AnchorPoint({attachTo: backgroundLayer,
			eventTarget: tokenLayer,
			position: {x: 385, y: 505},
			accepts: ['Soldier'],
			snap: 200
		});


		// UI functions
		canvasZoom(document.querySelector('#canvas'));

		panView(document.querySelector('#canvas'));
	

	});
}