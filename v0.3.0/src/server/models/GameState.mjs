import { slog } from '../modules/serverHub.mjs';

export class GameState {
	constructor(data={}) {
		this.name = data.name || 'newDuneGame';
		this.created = Date.now();
		this.playerCount = Object.keys(data.houses).length??0,
		this.ruleSet = data.ruleSet;
		this.houses = {};
		this.decks = {};
		this.map = data.ruleSet?.map;
		this.#setupHouses(data.houses);
		this.#setupDecks();
	}
	#houseStates = {};
	#setupHouses(houseData) { // Split to own class?
		for (let house in houseData) {
			this.#houseStates[house] = 'loading';
			let houseSetup = this.ruleSet.houses.find(h => h.id === houseData[house].houseRuleSetId);
			this.houses[house] = {
				hid: house,
				houseId: house,
				attributes: {
					name: houseSetup.name,
					houseRuleSetId: houseSetup.id,
					ruler: houseSetup.ruler
				},
				player: {
					playerName: houseData[house].playerName,
					playerId: houseData[house].playerId,
				},
				tokens: {
					soldiers: {
						hand: houseSetup.soldiers??0,
						tanks: 0,
						map: [],
					},
					eliteSoldiers: {
						hand: houseSetup.eliteSoldiers??0,
						tanks: 0,
						map: [],
					}
				},
				leaders: {
					hand: houseSetup.leaders.map(l => { return { id: l.id, power: l.attributes.power } }),
					tanks: [],
				},
				treacheryCards: [],
				spice: houseSetup.startingSpice ?? 0
			}
		}
	}
	houseChangeState(hid, state) {
		if (hid && state != null && this.#houseStates[hid]) this.#houseStates[hid] = state;
		else slog([`GameState: could not update houseState from parameters:`, hid, state], 'warn');
		return this.#houseStates;
	}

	#setupDecks() {
		let deckData = this.ruleSet.decks;
		slog(deckData);
	}
	
}