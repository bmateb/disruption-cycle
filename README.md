# Disruption Cycle: Capital Markets

A live classroom market for innovation projects, built for a lecture on financing innovation. Each student invests individually; every trade moves prices for the whole class in real time. No server is rented: the facilitator's browser runs the market and students connect through a free public MQTT relay.

`index.html` is the whole game (one self-contained file). `GUIDE.md` is the facilitator guide.

## Run it in class
1. Publish `index.html` with GitHub Pages (Settings, Pages, deploy from branch `main`, folder `/`). The address is `https://<user>.github.io/<repo>/`.
2. Open that address, choose **Set up the market**, run the relay test, open the lobby.
3. Students scan the QR code or type the join code, enter a name, and trade.

## Develop
- Source is in `src/`; `python3 build.py` rebuilds `index.html` (libraries in `vendor/` are inlined).
- `node tests/sim.js 40 60` runs 60 simulated classes with five bot strategies.
- Browser tests (`tests/t1.js` ...) need `npm install` and a local relay: run `node tests/srv.js` (MQTT over WebSocket on 8083, page on 8099).

## Notes
- The public relay is shared and unauthenticated. Do not put anything sensitive in the game.
- Third-party code in `vendor/`: [MQTT.js](https://github.com/mqttjs/MQTT.js) (MIT) and [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT).
