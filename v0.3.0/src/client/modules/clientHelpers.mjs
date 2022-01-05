/* globals  */

const helpers = (() => {
  //////
	// GENERAL FUNCTIONS
	const timeout = async (ms) => new Promise(res => setTimeout(() => res(null), ms));

	const watchCondition = async (func, message, timer=100) => {
		return new Promise(res => {
			let loop = setInterval(() => {
				if (func()) {
					clearInterval(loop);
					res(1);
					if (message) console.log(message);
				}
			}, timer)
		});
	}

  //////
	// DATA FUNCTIONS
	// to Array
	const toArray = (inp) => Array.isArray(inp) ? inp : [inp];
  // Generate a player ID
	const generatePID = (pName) => {
		let nameDigits = pName.split('').reduce((a,v) => a += v.charCodeAt(0), 0);
		let time = (Math.floor(Date.now()/1000)).toString(36);
		let rand = Math.floor(Math.random()*65536).toString(36);
		return `${nameDigits}-${rand}${time}`;
	}
	const cloneObj = (inputObj) => {
		let output = null;
		if (typeof(inputObj) === 'object') {
			try { output = JSON.parse(JSON.stringify(inputObj)) }
			catch(e) { console.error(e) }
		}
		return output;
	}
  // Convert a string path to a nested object reference
  // e.g. getObjectPath(myObj, 'config/player/playerName) returns myObj.config.player.playerName
  // Set createPath to false to disabled creating missing keys. Will return null if path not found
	const getObjectPath = (baseObject, pathString, createPath=true) => {
		let parts = pathString.split(/\/+/g);
		let objRef = (pathString) 
			? parts.reduce((m,v) => {
        if (!m) return;
				if (!m[v]) {
          if (createPath) Object.assign(m, {[v]: {}});
          else return null;
        }
				return m[v];}, baseObject)
			: baseObject;
		console.log(objRef);
		return objRef;
	}
  // Stringify an object with cyclic references
	const stringifyCyclic = (inputObj) => {
		const getCircularReplacer = () => {
			const seen = new WeakSet();
			return (key, value) => {
				if (typeof value === "object" && value !== null) {
					if (seen.has(value)) {
						return;
					}
					seen.add(value);
				}
				return value;
			};
		};
		let output;
		try { output = JSON.stringify(inputObj, getCircularReplacer()) } catch(e) { console.error(e); return null }
		return output;
	}

	return {
    timeout, watchCondition,
    generatePID, cloneObj, getObjectPath, stringifyCyclic, toArray,
  }


})();
export { helpers as default }