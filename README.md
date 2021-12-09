# pixiTest
experimental framework for Dune game - static updates only

## No live updates
repo is not linked to active development. An archive to provide comedy value in a few months' time.

# === INITIAL PROJECT (this one) ===
## Not live

### Pre-prototype:

Goals:
--Handle a sample game round with multiple players in server
--Finalise general framework for prototype

Tasks:
- rewrite server with socket.io
- remove channels.mjs, replace with server eventHub
- integrate Tailwind because the C in CSS stands for Cancer, I'm sure of it
- integrate Howler (or other audio library?)
- integrate Debug
- move to event-based debugging - e.g. client window should be able to subscribe to server logging
- write sample game round e.g. bidding round, event driven and handled by serverHub
- dump jQuery



# === NEW PROJECT ===
## Live on git

### Prototype:

Goals:
-- Rewrite with all above learnings in mind. Need to leave option open to move Server to cloud as separate npm build
-- Handle selected rounds - probably just Bidding, Movement, Combat
-- Allow for multiple rulesets for different version of the board game, but only use 1 for now
-- Leave option open for customised rulesets/modding (not a high priority, just needs to be possible)
-- Polish client UI/UX
-- Use decent assets, at least 2 functional Houses to choose from (Oosh C's work if done, otherwise board-game scan placeholders)
-- All required Models / ViewModels should be in place at this stage
-- Save/Load gamestate should be possible, and autosave each round. Allow non-hosts to save, like Gloomhaven???
-- When this slice of game is playable by 4+ players without crashy-crash, move to Alpha


### Alpha:

Goals:
--All game Rounds playable, full Turn tracking
--4+ functional Houses with assets
--Another pass on UI elements
--Another pass on Chat - emote system, maybe allow animated GIFs
--Major pass on audio / music (Drew?)
--When game is stable from start to finish, move to Beta


### Beta:
Goals:
--All content available in game - Houses/rule variants etc.
--Start finalising artwork, no more placeholders
--Start finalising audio
--Look at stat-tracking. Try to leave appropriate space for future work on AI opponents. (Neil?)
