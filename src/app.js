(() => {
  "use strict";
  const core = globalThis.StonesCore;
  if (!core) throw new Error("Missing game-core.js");
  const STORE = "noodleshopfm-stepping-stones-v3";
  const $ = (selector) => document.querySelector(selector);
  const fmt = (value) => Number(value).toLocaleString("en-US");
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const usd = (tokens) => (tokens * 99 / 630).toLocaleString("en-US", {style:"currency",currency:"USD"});
  const resultLabel = (steps) => steps === 8 ? "Set Skin" : steps >= 6 ? "+1% Skin" : `Tile ${steps}`;
  const elements = {
    world: $("#world"), bridge: $("#bridge"), message: $("#message"),
    progress: $("#progress"), runCounter: $("#run-counter"),
    wallet: $("#wallet"), walletLabel: $("#wallet-label"), packs: $("#packs"),
    auto: $("#auto"), histogram: $("#histogram"),
    dialog: $("#auto-dialog"), autoDescription: $("#auto-description"),
    autoStats: $("#auto-stats"), autoClose: $("#auto-close")
  };
  let state;
  try {
    const saved = localStorage.getItem(STORE);
    state = saved ? core.restoreState(JSON.parse(saved)) : core.freshState();
  } catch (error) {
    console.warn("Could not restore saved game:", error);
    state = core.freshState();
  }
  let replaying = false;
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (error) { console.warn("Progress could not be saved:", error); }
  };
  function say(headline, detail = "") {
    elements.message.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = headline;
    const small = document.createElement("span");
    small.textContent = detail;
    elements.message.append(heading, small);
  }
  function showBoard(attempt = state.current, isReplay = false) {
    elements.bridge.replaceChildren();
    const ended = attempt.status === "won" || attempt.status === "lost";
    elements.world.classList.toggle("finished", !isReplay && ended && core.canStart(state));
    if (!isReplay && ended && core.canStart(state)) elements.world.tabIndex = 0;
    else elements.world.removeAttribute("tabindex");
    for (let i = 0; i < core.STEPS; i++) {
      const pair = document.createElement("div");
      pair.className = "pair";
      const result = attempt.choices[i];
      for (const side of ["top", "bottom"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stone";
        button.setAttribute("aria-label", `Pair ${i + 1}, ${side} stone`);
        const selected = result?.side === side;
        if (result) {
          button.classList.add(selected && !result.safe ? "failed" : "safe");
          if (selected) {
            button.textContent = result.safe ? "✓" : "✕";
            if (result.safe && i === attempt.step - 1) {
              button.textContent = "👣";
              button.setAttribute("aria-label", `Player at pair ${i + 1}, ${side}`);
            }
          }
        } else if (!isReplay && attempt.status === "active" && i === attempt.step) {
          button.classList.add("current");
        } else if (!isReplay && attempt.status === "ready" && core.canStart(state) && i === 0) {
          button.classList.add("current");
        }
        const finished = attempt.status === "won" || attempt.status === "lost";
        button.disabled = isReplay || replaying || (finished && !core.canStart(state))
          || (!finished && (attempt.status !== "ready" && attempt.status !== "active"
          || !core.canStart(state) && attempt.status === "ready" || i !== attempt.step));
        // All stones are clickable for restart after a finished attempt.
        // Stop propagation so the final click cannot trigger an immediate restart.
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (replaying) return;
          if (finished) {
            if (core.restart(state)) { save(); render(); }
            return;
          }
          const result = core.choose(state, i, side);
          if (!result.ok) return;
          save();
          render();
        });
        pair.append(button);
      }
      elements.bridge.append(pair);
    }
  }
  function renderStats() {
    $("#hammers").textContent = fmt(state.bank.hammers);
    $("#coins").textContent = fmt(state.bank.coins);
    $("#basic").textContent = fmt(state.bank.basic);
    $("#set").textContent = fmt(state.bank.set);
    $("#bank-attempts").textContent = `${fmt(state.spent)} tokens used`;
    $("#bank-steps").textContent = `Average steps per token: ${state.completed ? (state.steps/state.completed).toFixed(2) : "0.00"}`;
    $("#estimated-spending").textContent = `Estimated spending: ${usd(state.spent)}`;
    $("#total-spent").textContent = fmt(state.spent);
    $("#total-steps").textContent = state.completed ? (state.steps / state.completed).toFixed(2) : "0.00";
    $("#total-wins").textContent = fmt(state.outcomeCounts[8]);
    elements.runCounter.textContent = `${fmt(state.spent)} tokens used`;
    const peak = Math.max(1, ...state.outcomeCounts);
    elements.histogram.replaceChildren();
    state.outcomeCounts.forEach((count, step) => {
      const col = document.createElement("div");
      col.className = "hist-col";
      col.setAttribute("title", `${count} attempts finished at step ${step}`);
      const number = document.createElement("span");
      number.className = "hist-count";
      number.textContent = fmt(count);
      const bar = document.createElement("div");
      bar.className = "hist-bar";
      bar.style.height = `${Math.max(2, Math.round(count / peak * 65))}px`;
      const label = document.createElement("span");
      label.className = "hist-label";
      label.textContent = step;
      col.append(number, bar, label);
      elements.histogram.append(col);
    });
  }
  function renderControls() {
    elements.walletLabel.textContent = state.unlimited ? "Unlimited mode · tokens used" : "Remaining tokens";
    elements.wallet.textContent = fmt(state.unlimited ? state.spent : state.wallet);
    const locked = replaying || state.current.status === "active";
    for (const pack of elements.packs.querySelectorAll("button")) {
      pack.disabled = locked;
      const infinite = pack.hasAttribute("data-infinite");
      pack.classList.toggle("active", infinite && state.unlimited);
      if (infinite) pack.setAttribute("aria-pressed", String(state.unlimited));
    }
    elements.auto.disabled = locked || !state.unlimited && state.wallet < 20;
    elements.auto.textContent = replaying ? "Playing 20 runs…" : "▶ Auto ×20";
  }
  function renderMessage() {
    const a = state.current;
    elements.progress.textContent = `${a.step} / 8 steps`;
    if (a.status === "active") {
      say(`Choose pair ${a.step + 1}`, "Tap the upper or lower highlighted stone.");
    } else if (a.status === "won") {
      say("🎉 All eight stones crossed!", core.canStart(state) ? "Tap anywhere in the bridge to try again." : "No tokens left. Add a pack to continue.");
    } else if (a.status === "lost") {
      say("💥 The stone broke!", core.canStart(state) ? `${a.step} successful steps. Tap anywhere in the bridge to restart.` : "No tokens left. Add a pack to continue.");
    } else if (core.canStart(state)) {
      say("Choose your first stone", "Each selected stone has a 50% chance of breaking.");
    } else {
      say("Out of tokens", "Choose a pack or enable unlimited mode to play.");
    }
  }
  function render() {
    renderControls();
    showBoard();
    renderMessage();
    renderStats();
  }
  elements.packs.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || replaying) return;
    const pack = Number(button.dataset.pack);
    const changed = button.hasAttribute("data-infinite")
      ? core.toggleInfinite(state) : core.addTokens(state, pack);
    if (changed) { save(); render(); }
  });
  elements.world.addEventListener("click", (event) => {
    if (replaying || event.target.closest("button")) return;
    if (core.restart(state)) { save(); render(); }
  });
  elements.world.addEventListener("keydown", (event) => {
    if (event.target !== elements.world || !["Enter"," "].includes(event.key) || replaying) return;
    event.preventDefault();
    if (core.restart(state)) { save(); render(); }
  });
  $("#reset-all").addEventListener("click", () => {
    if (replaying) return;
    if (!window.confirm("Reset ALL progress? This clears your wallet, rewards, attempts, and statistics. This cannot be undone.")) return;
    state = core.freshState();
    save();
    render();
  });
  async function autoPlay() {
    if (replaying) return;
    const result = core.autoTwenty(state);
    if (!result.ok) return;
    // Commit the results first. Refreshing during replay cannot duplicate the payout.
    save();
    replaying = true;
    renderControls();
    for (let i = 0; i < result.runs.length; i++) {
      const run = result.runs[i];
      const pseudoAttempt = {
        status: run.won ? "won" : "lost",
        step: run.steps,
        choices: run.choices
      };
      elements.progress.textContent = `Auto-play ${i + 1} / 20`;
      say(run.won ? "🎉 Full crossing!" : `${run.steps} successful steps`, "Simulating 20 independent attempts…");
      showBoard(pseudoAttempt, true);
      await sleep(150);
    }
    replaying = false;
    render();
    elements.autoDescription.textContent = "Results in play order";
    elements.autoStats.replaceChildren();
    result.runs.forEach((run, index) => {
      const box = document.createElement("div");
      box.className = "auto-cell";
      if (run.steps === 8) box.classList.add("set-skin");
      else if (run.steps >= 6) box.classList.add("special");
      const number = document.createElement("span");
      number.textContent = `${index + 1}.`;
      const label = document.createElement("strong");
      label.textContent = resultLabel(run.steps);
      box.append(number, label);
      elements.autoStats.append(box);
    });
    elements.dialog.hidden = false;
    elements.autoClose.focus();
  }
  elements.auto.addEventListener("click", autoPlay);
  elements.autoClose.addEventListener("click", () => { elements.dialog.hidden = true; elements.auto.focus(); });
  render();
})();
