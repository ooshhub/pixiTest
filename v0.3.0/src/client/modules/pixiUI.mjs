/* globals Game */

export const canvasZoom = (element) => {
	let scale = 1;
	const frame = Game.Layers.Stage;
	element.addEventListener('wheel', ev => {
		ev.preventDefault();
		scale = scale -= (ev.deltaY/2500);
		console.log(scale);
		frame.scale = {x: scale, y: scale}
		let centerOffset = {
			x: (window.innerWidth/2) - ev.clientX,
			y: (window.innerHeight/2) - ev.clientY,
		}
		let shuntingFactor = scale/10;
		frame.position = {x: frame.x + centerOffset.x*shuntingFactor, y: frame.y + centerOffset.y*shuntingFactor}
	});
}

export const panView = (element) => {
	const frame = Game.Layers.Stage;
	element.addEventListener('mousedown', ev => {
		if (ev.button === 2) {
			let pos = {x: ev.clientX, y: ev.clientY};

			const panView = (ev) => {
				let delta = {x: (ev.clientX - pos.x)/1, y: (ev.clientY - pos.y)/1};
				frame.position.x = frame.position.x + delta.x;
				frame.position.y = frame.position.y + delta.y;
				pos = {x: ev.clientX, y: ev.clientY};
			}

			element.addEventListener('mousemove', panView);

			element.addEventListener('mouseup', () => {
				element.removeEventListener('mousemove', panView);
			});
	}
	});
}
