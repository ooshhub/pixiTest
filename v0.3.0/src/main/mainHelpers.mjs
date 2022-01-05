/* globals  */

import * as handlebars from 'handlebars';
import fs from 'fs/promises';

const helpers = (() => {
  //////
	// GENERAL FUNCTIONS
	const timeout = async (ms) => new Promise(res => setTimeout(() => res(null), ms));

  // TODO: Set max loops?
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
  // FILE FUNCTIONS
  const getFile = async (filePath, json=true) => { // move to helpers later
    let output = null;
    let file = await fs.readFile(filePath, 'utf-8')
      .catch(() => console.warn(`File not found ${filePath}`));
    if (file && json) {
      try { output = JSON.parse(file) } catch(e) { console.error(`Couldn't read file.`)}
    } else output = file;
    return output;
  }
  const saveFile = async (filePath, data, timer=10000) => {
    let result = await Promise.race([
      fs.writeFile(filePath, data),
      timeout(timer)
    ]);
    return result===undefined ? true : false;
  }

  //////
	// DATA FUNCTIONS
  // Generate a player ID
	// Format is 
	//  -first letter of process.env.USERNAME (or random letter if not found)
	//  -underscore
	//  -18 alphanumeric characters made from username (or random) and Date.now()
	// is usable as object key name, and distinct from socket.io which doesn't use underscore
	const generatePlayerId = (pName) => {
		const randLetter = () => String.fromCharCode(Math.random() > 0.3 ? Math.ceil(Math.random()*26) + 64 : Math.ceil(Math.random()*26) + 96);
		pName = pName || '';
		if (!pName) {
			for (let i = Math.ceil(Math.random()*3) + 4; i > 0; i--) {
				pName += randLetter();
			}
		}
		let name = pName.split('').reduce((a,v) => a += v.charCodeAt(0), '');
		name = parseInt(name).toString(36).replace(/0*$/, '');
		let time = (Math.floor(Date.now())).toString(16);
		let pid = `${time}${name}`;
		if (pid.length > 20) pid = pid.slice(0,20);
		else if (pid.length < 20) { for(let i = (20 - pid.length); i > 0; i--) { pid += randLetter() } }
		pid = `${pName[0]}_${pid.slice(2)}`;
		return pid;
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
          if (createPath) m[v] = {};
          else return null;
        }
				return m[v];}, baseObject)
			: baseObject;
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

  //////
	// HTML / JQ / CSS / UI FUNCTIONS
  // Handlebars compiler
  const compileHbs = async (inputFile, data) => {
    let file = await getFile(inputFile, false);
    if (file && /<.+>/.test(file)) {
      let compiledHtml = handlebars.compile(file)(data);
      return compiledHtml;
    } else return null;
  }


	return {
    getFile, saveFile,
    timeout, watchCondition,
    generatePlayerId, cloneObj, getObjectPath, stringifyCyclic,
    compileHbs
  }

})();
export { helpers as default }