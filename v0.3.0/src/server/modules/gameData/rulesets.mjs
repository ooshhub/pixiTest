export const ruleSets = {

	defaultSet: {

		map: 'arrakis_default',

		houses: [
			{
				name: 'Atreides',
				id: 'atreidesHouse_default',
				ruler: 'Paul Atreides',
				soldiers: 20,
				eliteSoldiers: 0,
				startingSpice: 5,
				reviveMax: 3,
				reviveCost: 1,
				abilities: [
					{
						name: 'Prescience',
						effect: null, // Link to effects.mjs for game logic? Unsure how to handle
						description: 'Peek at treachery cards during Bidding Round',
					}
				],
				leaders: [
					{
						name: 'Thufir Hawat',
						id: 'atreidesLeader_1',
						attributes: {
							power: 5
						},
						avatar: 'thufir.png',
						description: 'Racist',
					},
					{
						name: 'Lady Jessica',
						id: 'atreidesLeader_2',
						attributes: {
							power: 5
						},
						avatar: 'jessica.png',
						description: 'Slapper',
					},
				]
			},
			{
				name: 'Harkonnen',
				id: 'harkonnenHouse_default',
				ruler: 'Baron Harkonnen',
				soldiers: 20,
				eliteSoldiers: 0,
				abilities: [
					{
						name: 'Treachery',
						effect: null, // Link to effects.mjs for game logic? Unsure how to handle
						description: 'Keep all leader tokens as traitors.',
					}
				],
				leaders: [
					{
						name: 'Feyd-Rautha',
						id: 'harkonnenLeader_1',
						attributes: {
							power: 6
						},
						avatar: 'feyd.png',
						description: 'Cunt',
					},
					{
						name: 'Beast Rabban',
						id: 'harkonnenLeader_2',
						attributes: {
							power: 4
						},
						avatar: 'rabban.png',
						description: 'Fat cunt',
					},
				]
			}
		],

		decks: [
			{
				name: 'Spice Deck',
				id: 'spiceDeck_default',
				cards: [
					// All the spice
				]
			},
			{
				name: 'Treachery Deck',
				id: 'treacheryDeck_default',
				cards: [
					// All the treachery
				]
			}
		],
	}
}