/* globals */
import * as PIXI from '../modules/lib/pixi.mjs';

export class Layer extends PIXI.Container {
	constructor(stageLayer, name, allowEvents) {
		let newLayer = super();
		Object.assign(newLayer, {
			width: window.innerWidth, 
			height: window.innerHeight,
			interactive: allowEvents,
			hitArea: allowEvents ? new PIXI.Rectangle(0, 0, window.innerWidth, window.innerHeight) : null
		});
		Object.assign(this, newLayer);
		stageLayer.addChild(this);
		window.Game.Layers[name] = this;
	}
}

export class Background extends PIXI.Sprite {
	constructor(texture, attachTo) {
		super(texture);
		Object.assign(this, {
			x: 0,
			y: 0,
			interactive: false,
		});
		if (attachTo) attachTo.addChild(this);
	}
}

export class AnchorPoint extends PIXI.Sprite {
	constructor(data = {attachTo: null, eventTarget: null, position: {}, accepts: [], snap: null}) {
		super();
		Object.assign(this, {
			x: data.position.x??0,
			y: data.position.y??0,
			tint: 0x646464,
			anchor: {x: 0.5, y: 0.5},
			alpha: 0.5
		});
		if (data.attachTo) data.attachTo.addChild(this);
		if (data.accepts.length && data.eventTarget) this.addHandlers(data.eventTarget, data.accepts, data.snap);
		else console.warn(`Did not add Handlers to AnchorPoint - bad parameters!`);
	}

	addHandlers(evTarget, accepts=[], snap=200) {
		evTarget.on('tokenDragStart', startEv => {
			let snapTo = null,
					hyp;
			if (!accepts.includes(startEv.data.constructor?.name)) return console.log(`Drag event ignored, wrong Class`);

			const checkDistance = (ev) => {
				let mousePos = ev.data.getLocalPosition(this.parent),
						delta = {x: mousePos.x - this.x, y: mousePos.y - this.y};
				hyp = Math.sqrt(delta.x**2 + delta.y**2);
				if (hyp < snap) {
					this.texture = startEv.data.texture;
					this.scale = startEv.data.scale;
					snapTo = this;
				} else {
					this.texture = null;
					snapTo = null;
				}
			}

			startEv.data.on('mousemove', checkDistance);

			let debounce = 0;
			startEv.data.on('mouseup', ev => {
				ev.stopPropagation();
				startEv.data.off('mousemove', checkDistance);
				if (debounce===1) return;
				debounce = 1;
				if (snapTo) {
					let relativePos = ev.data.getLocalPosition(startEv.data.parent, undefined, this.position);
					startEv.data.position = {x: relativePos.x, y: relativePos.y};
				}
			})
		});
	}
}