# Disruption Cycle: Capital Markets. Facilitator guide

Live market game for the "Financing of innovation" session. Every student invests individually, every trade moves prices for the whole class in real time, and nothing needs a rented server.

## How it works technically
- One HTML file. The facilitator's browser is the market maker (it holds the rules, prices and every portfolio).
- Students' phones and laptops talk to it through a free public MQTT relay over secure WebSocket (default: EMQX public broker; fallbacks: HiveMQ public, Mosquitto test). The setup screen tests the relays and picks one that works from your network.
- The relay is public. Anyone who knows the 5-letter room code could read the traffic, so never put anything sensitive in the game. Names are visible to the class by design.
- The host tab must stay open and in the foreground (use a separate window on the projector laptop). If it is closed by accident, reopen the same address: the console offers "Resume previous session" and students reconnect on their own.

## Before class (15 minutes)
1. Put the file on any free static web host so phones can open it. Netlify Drop works without an account, but an unclaimed drop is password-protected until you claim it with a free account, so claim it first. Put the file in a folder as `index.html` and drop the folder. GitHub Pages and Cloudflare Pages also work.
2. Open the address, choose "Set up the market", run the relay test. Rehearse once with your phone plus a laptop (choose the same relay).
3. Check that the university Wi-Fi allows secure WebSockets. If the test fails on Wi-Fi, students can use mobile data, or use your own broker (free private tiers exist, for example HiveMQ Cloud Serverless, advertised with up to 100 free connections; check current terms and WebSocket support).

## Settings (setup screen)
- Years (ticks) and seconds per year: 14 years x 75 s is about 18 minutes of trading. For a 60-minute slot use 12 x 60 s.
- Market bots: add 6 to 10 if fewer than 20 students attend, so the market stays liquid. They are labelled "(bot)".
- Scheduled market news: leave on. Four events fire at fixed times: deep-tech frenzy, an acquisition rumour (true half the time), funding winter, core disruption. You can also trigger them by hand under Controls.
- Wait until everyone has joined before pressing Start: market depth and project burn rates scale with the number of investors at the start.

## Run of show (90 minutes)
| Min | Step |
|---|---|
| 0-10 | Brief. Project the QR code. Rules in one slide: 12 projects, 3 gates each, EUR 100,000, 40% concentration limit, 0.5% fee, due-diligence reports cost EUR 1,500. |
| 10-12 | Lobby check. Everybody sees their name. Press Start. |
| 12-32 | Play. Project the Market board. At years 3, 6 and 9 read one headline aloud and ask: what does this do to projects you hold? |
| 32-47 | Debrief on the Debrief tab (prompts below). |
| 47-70 | Optional second round with a new seed (a new room). Ask students to change one decision rule first. |
| 70-90 | Link to the lecture: stages of financing, who funds which horizon, valuation under uncertainty. |

## What students see and can do
- Market: price, change this year, net money flowing in, runway in years, next gate, their own position.
- Project page: price history, treasury and burn, traction readings with the consensus quality score, pass odds per gate, market depth, value per share at the last round.
- Valuation helper: set your own quality estimate and see the model value against the price.
- Due-diligence report: a private, sharper quality score (error about 10 points), different for each student, so students who share findings pool information.
- Buy and sell tickets showing impact on the price and fees before they confirm. Portfolio, headlines, a live trade feed from the whole class, a leaderboard.

## How the economy works
- Price = fundamental anchor x trading pressure. Your trades push the price immediately (cost of a 10% move is shown on each project). Pressure fades by 30% a year, news and gates move the anchor.
- Staged financing: three gates per project. A pass raises the valuation (step-up); a fail wipes out about 95% of the value. Breakthrough projects have low pass odds, large step-ups and high sensitivity to team quality. Core projects are safe and dull.
- Reflexivity: part of every euro that flows into a project goes into its treasury. A project that runs dry before a gate is somewhat less likely to pass it.
- Settlement: after the last year every survivor is valued at its realised valuation, so bubbles deflate. Net worth is marked at market price during the game.
- Expected extra return is built in for risk: roughly +9% core, +18% adjacent, +32% breakthrough over the game, with much larger variance on the breakthrough side. Information (reports, pooled readings) and diversification are the edge.

## Visibility and participation
- Class tab: online status, trades, reports bought, number of projects held and net worth per student. Amber means no trade after year 2.
- The trade feed shows names (switch off under Controls to anonymise).

## Debrief prompts (generated from the run, shown on the Debrief tab and on every student's Leaderboard tab at the end)
1. Bubble and crash: peak versus final price of breakthrough projects. Who sold near the top, and what did they know?
2. Staged financing: how many projects failed a gate, and how much class money was in them. Who paid for the option, who spread it?
3. Information: returns of investors who bought 2 or more reports against those who bought none.
4. Diversification: correlation between number of projects held and return, and the spread from worst to best.
5. Portfolio balance: class capital by horizon against the 70-20-10 rule, plus the concentration index.
6. Reflexivity: compare treasury cover at each gate with the outcome in the small charts.

## What was and was not tested
- Tested: rules engine (thousands of simulated classes with five strategy types), live sync with 45 simulated students trading about 27 times per second through a local relay (median confirmation 146 ms, 95th percentile 255 ms), page reloads, host reload with resume, relay restart, late joiners, phone and desktop layouts, light and dark themes.
- Not tested: the real public relays from my environment (they are not reachable from it), and your university network. Run the relay test and a two-device rehearsal in the room you will teach in.
- I have not seen your financing-of-innovation slides, so the debrief mapping is generic. Share the deck and I will align names and examples.


## Version 2 changes (live prices, practice phase, results)

- **Prices update every second.** Each price shows an arrow, the amount and the percent change versus a second ago, plus the change since the market opened.
- **Candlestick charts** replace line charts: "Live" (one candle per 5 seconds) and "By year". Green = rose, red = fell. Dashed lines mark funding rounds and the IPO (green passed, red failed). Portfolio value is also shown as yearly candles.
- **Plain stock-market words:** price, change, volume, net buying, portfolio value, profit / loss, liquidity, Series A / Series B / IPO, analyst report. A "How to play" tab has a short glossary.
- **Company news:** very short headlines appear all game in a ticker and the News tab. Before each funding round and IPO there are heads-up headlines (round planned, cash running low or well funded, insiders upbeat or doubtful). Market-wide events (deep-tech frenzy, higher rates, disruptor) get a warning headline first. Takeover rumours are only rumours.
- **Practice phase:** when the lobby opens, students see the frozen market with a private practice account (trades there never reach the real market). Each presses **I'm ready**; the host sees "x of y ready" and presses Start.
- **Final results:** all investors ranked with final value, profit / loss, return and a tap-to-open full portfolio. The host can download the table as CSV.
- Seconds per year is rounded to a multiple of 5 (candle length).

## Version 3 changes

- **Planning break:** tick "Planning break at the end of every year" (and the length in seconds) on the setup screen, or change it live under Controls. At each year end prices freeze and trading closes, students see a countdown banner, and the next year starts automatically. "Start next year now" ends a break early. No break follows the final year.
- **Livelier prices:** news now moves prices in typical market shapes: an immediate spike that partly fades back (overshoot), part of the move staying, volatility clustering after big headlines, short trending runs, a gap and spike on a successful IPO or round, and a crash-then-slide on a failure. Market-wide events hit high-risk stocks hardest.
- **Phone layout:** bottom navigation is always visible and highlighted, the company view no longer hides the header, wide numbers stack so nothing is cut off, and panels have more padding.
