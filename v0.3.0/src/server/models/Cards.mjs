/* globals */
import * as PIXI from '../modules/client/lib/pixi.mjs';
import { Token, /* StackMarker */ } from './tokens.mjs';

const defaultTexture = '../assets/cards/default.png';
const defaultTextureBack = '../assets/cards/defaultBack.png';
// const defaultTexturePile = '../assets/cards/defaultPile.png';

export class Card extends Token {
	constructor(data = {}) {
		super(data.textureBack||defaultTexture, {
			width: 200,
			height: 300,
			flags: {
				draggable: true,
				stackable: false,
			}
		});
		Object.assign(this, {
			name: data.name||'newCard',
			cardId: data.cardId||'',
			type: data.type||'card',
			owner: null,
			textureFront: data.textureFront||defaultTexture,
			textureBack: data.textureBack||defaultTextureBack,
			texture: data.textureBack,
			interactive: false,
			parentDeck: data.parentDeck || null,
      position: {
        x: data.position?.x ?? 100,
        y: data.position?.y ?? 100,
      },
			cardData: {}, // Reference link to card logic
		});
		// this.flags.visibility = [];
	}
	toHand(house) {
		Object.assign(this, {
			owner: house,
			interactive: true
		});
    // addChild to player tokens container
	}
	toDeck() {
    // Play animation
    // Notify event hub of discard
    this.destroy();
	}
}

export class CardPile extends PIXI.Container {

  #pileMarker = new PIXI.Graphic();

  constructor(data = {}) {
    super();
    Object.assign(this, {
      name: data.name||'newCardPile',
      type: data.type||'CardPile',
      deckId: data.deckId||'newCardDeck',
      position: {
        x: data.position?.x ?? 250,
        y: data.position?.y ?? 250,
      },
      count: {
        available: data.count.available || 0,
        discarded: data.count.discarded || 0,
      },
      textureBack: data.textureBack || defaultTextureBack,
      textureDiscard: data.textureDiscard || data.textureBack || defaultTextureBack,
      pile: {
        width: data.pile?.width ?? 300,
        height: data.pile?.height ?? 250,
        maxCards: data.pile?.maxCards ?? 6,
        spread: data.pile?.spread ?? 5,
      },
    });
    this.#pileMarker.drawRoundedRect(this.position.x, this.position.y, this.pile.width, this.pile.height);
    this.addChild(this.#pileMarker);
  }

  lastChild() {
		return this.children?.length ? this.children[this.children.length-1] : null;
	}

  updateStack(newCount) {
    console.log(`Updating card pile...`);
    if (isNaN(newCount.available) || isNaN(newCount.discarded)) return console.error(`Bad data passed to updateStack on CardPiple`, newCount);
    this.count = newCount;
    let cardsNeeded = Math.min(this.pile.maxCards, newCount.available),
        cardsCurrent = this.children.filter(c => c.name === 'pileCard').length,
        cardsDiff = cardsNeeded - cardsCurrent;
    if (cardsDiff > 0) {
      console.log(`Adding ${cardsDiff} cards to pile...`);
      for (let i = 0; i < cardsDiff; i++) {
        let pileCard = new Card({
          name: 'pileCard',
          position: {
            x: (cardsCurrent + i) * this.pile.spread,
            y: 150,
          },
        });
        this.add(pileCard);
      }
    } else if (cardsDiff < 0) {
      let minIndex = this.children.filter(c => c.name !== 'pileCard').length;
      this.removeChildren(Math.max(minIndex, cardsDiff));
    }
  }
  updateCounters() {
    // create an available and discarded counter, apply to container
  }
}

export class CardDeck {
	constructor(data={}) {
		Object.assign(this, {
			name: data.name||'newCardDeck',
			type: data.type||'CardDeck',
      cardData: data.cardData||null,
			available: [],
			loaned: [],
			discarded: [],
      owners: {},
      autoShuffle: data.autoShuffle ?? true,
			allCards: () => this.available.concat(this.loaned.concat(this.discarded)),
		});
		if (data.cards.length) this.addCards(data.cards); 
	}
  // Add cards to deck logic. Default is to add to the end of the available cards
  // options.shuffleIn to add to a random place in the available cards
  // options.discarded to add the card to the discarded stack instead of available
	addCards(newCards, options = {shuffleIn: false, discarded: false}) {
    newCards = Array.isArray(this.addCards) ? newCards : [newCards];
    newCards.forEach(newCard => {
      if (this.cardData && !this.cardData.includes(newCard)) console.warn(`Card ${newCard} does not exist in linked ruleset.`);
      else {
        let existingCards = this.allCards().filter(c => c.name === newCard.name),
            newIndex = `${existingCards.length + 1}`.padStart(3,'0');
        let newCardId = `${newCard}_${newIndex}`;
        let targetArray = options.shuffleIn ? this.available : this.discarded;
        let targetIndex = options.shuffleIn ? Math.floor(Math.random()*this.available.length)
                          : this.discarded.length;
        targetArray.splice(targetIndex, newCardId);
      }
    });
    this.updateStack();
	}
  // Remove card by name or ID. Supplying name will remove all cards of that name, supplying ID will remove one card
	removeCard(cardOut, /* options = {} */) {
		let cardFilter = /_\d+$/.test(cardOut)
        ? (c) => c.cardId !== cardOut
        : (c) => c.name !== cardOut;
    [this.available, this.loaned, this.discarded] = [this.available, this.loaned, this.discarded].filter(cardFilter);
    // TODO: Need to send message to clients to destroy any card that was just removed if it was loaned
    // Or the logic can happen when the card is accessed by the user, that would catch more errors
    // ... or disallow removing cards from play if they're in hand???
    this.updateStack();
	}
	burn(numberOfCards=1) {
    numberOfCards = Math.min(this.available.length, numberOfCards)
		for (let i=numberOfCards; i>0; i--) {
			this.discarded.push(this.available.shift());
		}
    this.updateStack();
	}
  // Shuffle deck.
  // options.availableOnly to NOT shuffle the discard pile in
  // options.shuffles to loop the random sort more times
	shuffle(options = {shuffles: 3, availableOnly: false}) {
    let shuffles = Math.max(options.shuffles, 1);
    if (!options.availableOnly) this.available.push(this.discarded.splice(0));
    for (shuffles; shuffles > 0; shuffles - 1) {
      this.available = this.available.sort(() => 0.5 - Math.random());
    }
    this.updateStack();
	}
  loanCard(cardId, owner) {
    let cardIndex = this.available.findIndex(c => c === cardId);
    if (!cardIndex > -1) return console.warn(`Tried to loan card: "${cardId}" but card is not available from ${this.name}.`);
    // Notify event hub of new owner
    this.loaned.push(this.available.splice(cardIndex, 1));
    this.owners[cardId] = owner;
    this.updateStack();
  }
  receiveCard(cardId, owner, options = {returnAvailable: false}) {
    let loanedIndex = this.loaned.findIndex(c => c === `${cardId}`);
    if (!loanedIndex) return console.warn(`Tried to receive card: "${cardId}" but card is not currently loaned.`);
    let targetArray = options.returnAvailable ? this.available : this.discarded;
    targetArray.push(this.loaned.splice(loanedIndex, 1));
    this.owners[cardId] = null;
  }
  // Forcibly recall loaned cards. Use 'all' to recall all loaned cards to deck.
  recallCards(cardIds) {
    cardIds = Array.isArray ? cardIds : cardIds === 'all' ? this.loaned : [cardIds];
    cardIds.forEach(id => {
      let owner = this.owners[id];
      if (owner) {
        // notify event hub of card recall
        // triggers "toDeck" method on the card in the client app
        // "toDeck" then notifies "receiveCard"
      }
    });
    for (let card in this.owners) this.owners[card] === null;
    setTimeout(() => {
      if (this.loaned.length > 0) console.warn(`WARNING: Not all clients reported cards destroyed.`, this.loaned);
      this.updateStack();
    }, 2000);
  }
  updateStack() {
    let count = {
      total: this.allCards().length,
      discarded: this.discarded.length,
      loaned: this.loaned.length,
      available: this.available.length
    }
    console.log(count);
    // Notify event hub of count, to be sent to all clients
  }
}