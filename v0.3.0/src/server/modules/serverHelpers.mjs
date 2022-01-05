/* globals  */

import * as handlebars from 'handlebars';
import fs from 'fs/promises';

const helpers = (() => {
  //////
	// GENERAL FUNCTIONS
	const timeout = async (ms) => new Promise(res => setTimeout(() => res(null), ms));

  // TODO: Set max loops
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
    }
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
  // Generate a house ID
	const generateHouseId = (pid, house) => {
		const randLetter = () => String.fromCharCode(Math.random() > 0.5 ? Math.ceil(Math.random()*26) + 64 : Math.ceil(Math.random()*26) + 96);
		house =  /^[A-Za-z]/.test(house) ? house : randLetter();
		let newPrefix = `${house[0]}${pid[0]}_`;
		let newStamp = (Math.floor(Date.now())).toString(16);
		let hid = `${newPrefix}${newStamp}`;
		for (let i = hid.length; i < 20; i++) hid += pid[i] || randLetter();
		return hid;
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

  //////
	// HTML / JQ / CSS / UI FUNCTIONS
  // Handlebars compiler
  const compileHbs = async (inputFile, data) => {
    let file = await fs.readFile(inputFile, 'utf-8');
    if (file && /<.+>/.test(file)) {
      let compiledHtml = handlebars.compile(file)(data);
      return compiledHtml;
    } else return null;
  }


	return {
    getFile, saveFile,
    timeout, watchCondition,
    generateHouseId, cloneObj, getObjectPath, stringifyCyclic,
    compileHbs
  }

})();
export { helpers as default }