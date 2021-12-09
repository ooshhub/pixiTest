/* globals */
import * as PIXI from '../modules/client/lib/pixi.mjs';

const defaultTexture = new PIXI.Texture.from(`./assets/tokens/meg.png`);

export class Token extends PIXI.Sprite {
	constructor(texture, data={}) {
		super(texture??defaultTexture);
		let tokenData = {
			name: data.name||'newToken',
			type: data.type||'general',
			owner: data.owner||'', // GET CURRENT PLAYER HELPER?
			interactive: data.interactive??true,
			flags: {
				stackable: data.flags?.stackable??true,
				draggable: data.flags?.draggable??true,
			},
			cursor: data.cursor||'pointer',
			anchor: {x: data.anchor?.x??0.5, y: data.anchor?.y??0.5},
			width: data.width??100,
			height: data.height??100,
			position: {x: data.x??data.position?.x??50,	y: data.y??data.position?.y??50},
		}
		Object.assign(this, tokenData);
		if (this.flags.draggable) this.constructor.draggable(this);
		return this;
	}
	static draggable(token, bringToTop=true) {
		let stackTargets = [],
				stackJoin,
				tintTarget;
		const drag = (ev) => {
			let newPointer = ev.data.getLocalPosition(token.parent);
			let mousePos = ev.data.global;
			token.position = {x: newPointer.x, y: newPointer.y};
			// Stackable section
			if (token.flags.stackable) {
				stackTargets.forEach(target => {
					let stackTintTarget = target.lastChild()??target;
					if (target.containsPoint(mousePos)) {
						if(!target.flags.isStackTarget) {
							stackTintTarget.tint = 0x00c3ff;
							target.flags.isStackTarget = 1;
							stackJoin = target;
						}
					} else if (target.flags.isStackTarget) {
						target.flags.isStackTarget = 0;
						stackTintTarget.tint = 0xffffff;
						stackJoin = null;
					}
				});
			}
		}
		const startDrag = () => {
			console.log(`Starting drag on ${token.name}...`);
			tintTarget = token.lastChild()??token;
			tintTarget.tint = 0xb4b4b4;
			token.parent.emit('tokenDragStart', {data: token});
			token.on('mousemove', (ev) => drag(ev));
			if (bringToTop) {
				let zValues = token.parent?.children.map(c => c.zIndex);
				let zTarget = Math.max(...zValues);
				token.zIndex = zTarget+1;
				// Create list of stackable targets for drag movement
				if (token.flags.stackable) stackTargets = token.parent?.children.filter(c => c !== token && c.type === token.type && c.flags?.stackable);
				console.log(stackTargets.map(t=>t.name));
			}
		}
		const endDrag = () => {
			tintTarget.tint = 0xffffff;
			token.off('mousemove');
			token.parent.emit('tokenDragEnd', {data: token});
			stackTargets.forEach(target => {
				target.tint = 0xffffff;
			});
			if (stackJoin) {
				token.addToStack(stackJoin);
			}
		}
		token.on('mousedown', (ev, forceDrag) => {
			console.log(ev);
			console.log(`Forcedrag: ${forceDrag}`);
			if (!forceDrag && ev.data?.originalEvent?.altKey) token.startSplit(ev);
			else startDrag();
		});
		token.on('mouseup', endDrag);
		token.on('rightclick', (ev) => console.log(ev));
	}
	lastChild() {
		return this.children?.length ? this.children[this.children.length-1] : null;
	}
	addToStack(stack) {
		stack.lastChild()?.removeChildren();
		console.info(`${this.name} adding to ${stack.name} stack...`);
		stack.addChild(this);
		let stackHeight = stack.children.length||1;
		Object.assign(this, {
			position: {x: 0, y: -10*stackHeight},
			interactive: false,
			scale: {x:1, y:1},
		});
		let currentCount = new StackMarker(stackHeight+1);
		stack.lastChild().addChild(currentCount);
	}
	startSplit(ev) {
		if (!this.children.length) return console.log(`Not stacked, aborting split`);
		let splitTarget = this.lastChild(),
				mousePos = ev.data.getLocalPosition(this.parent);
		splitTarget.removeChildren();
		Object.assign(splitTarget, {
			position: mousePos,
			interactive: true,
			scale: {x:0.57, y:0.57}
		});
		splitTarget.setParent(this.parent);
		console.log(`Starting split on ${this.name}...`);
		splitTarget.emit('mousedown', (true));
		if (this.lastChild()) {
			let currentCount = new StackMarker(this.children.length+1);
			this.lastChild().addChild(currentCount);
		}
	}
	removeFromStack() {
		let stack = this.parent;
		console.log(`Removing ${this.name} from ${stack.name}...`);
	}
  // destroy() {
  //   super.destroy();
  // }
}

// Change this to GET player's chosen colour
export class StackMarker {
	constructor(text) {
		let circle = new PIXI.Graphics();
		circle.lineStyle({width: 5, alignment: 1, color: 0x0202f8})
			.beginFill(0xffffff)
			.drawCircle(0,0,25)
			.endFill();
		circle.position = {x:-50, y: -50};
		let counter = new PIXI.Text(`${text}`,{
			fontFamily : 'Arial',
			fontSize: 42,
			fill : 0x0202f8
		});
		circle.addChild(counter);
		Object.assign(counter, {
			position: {x: 0, y: 0},
			anchor: {x:0.5,y:0.5},
			align: 'center'
		});
		return circle;
	}
}

export class Soldier extends Token {
	constructor(texture, data={}) {
		super(texture, {
			type: 'soldier',
			flags: {draggable: true, stackable: true}
		});
		Object.assign(this, data, {stats: {
			battles: 0,
			kills: 0,
			leaderKills: 0,
			wins: 0,
			losses: 0,
		}});
		return this;
	}
}

export class EliteSoldier extends Soldier {
	constructor(texture, data={}) {
		super(texture, {
			type: 'eliteSoldier',
		});
		Object.assign(this, data);
		return this;
	}	
}