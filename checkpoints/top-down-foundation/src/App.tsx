import { useEffect, useMemo, useRef, useState } from "react";
import {
  createGame,
  destroyGame,
  PRESETS,
  type GameConfig,
  type GameHudState,
} from "./game";

const DEMO_NOTICE =
  "Demo mode only: custom AI generation is not connected yet. Your prompt is not sent to a model. Use an example game to load a playable Phaser preset.";

const STATUS_LABEL: Record<GameHudState["status"], string> = {
  playing: "In progress",
  unlocked: "Exit unlocked",
  won: "You escaped",
  lost: "You were caught",
};

const initialHud = (config: GameConfig): GameHudState => ({
  title: config.title,
  objective: config.objective,
  controls: config.controls,
  health: config.player.health,
  maxHealth: config.player.health,
  collected: 0,
  required: config.win.requiredPickups,
  status: "playing",
});

export default function App() {
  const [prompt, setPrompt] = useState(
    "Create a space station escape game with aliens and oxygen pickups.",
  );
  const [followUp, setFollowUp] = useState(
    "Make the enemies faster and add more oxygen.",
  );
  const [activeId, setActiveId] = useState(PRESETS[0].id);
  const [session, setSession] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const config = useMemo(
    () => PRESETS.find((preset) => preset.id === activeId) ?? PRESETS[0],
    [activeId],
  );
  const [hud, setHud] = useState<GameHudState>(() => initialHud(config));
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setHud(initialHud(config));
    const game = createGame(host, config, setHud);

    const blockScroll = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
          event.key,
        )
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", blockScroll, { passive: false });

    return () => {
      window.removeEventListener("keydown", blockScroll);
      destroyGame(game);
      host.replaceChildren();
    };
  }, [config, session]);

  const loadPreset = (id: string) => {
    setNotice(null);
    setActiveId(id);
    setSession((value) => value + 1);
  };

  const showDemoNotice = (source: "generate" | "revise") => {
    const extra =
      source === "revise"
        ? " Follow-up edits will rewrite the live GameConfig after a model is wired in."
        : " Generation will build a new GameConfig from plain English after a model is wired in.";
    setNotice(DEMO_NOTICE + extra);
  };

  return (
    <div className="studio">
      <aside className="panel">
        <div className="brand">
          <h1>GameForge</h1>
          <p>
            Describe a game, play it, then revise it. This first milestone is a
            playable Phaser engine with preset configurations.
          </p>
        </div>

        <div className="demo-banner">
          AI generation is not connected yet. Example buttons load authored
          presets. Typed prompts are not interpreted.
        </div>

        <div className="field">
          <label htmlFor="prompt">Game description</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the game you want to play"
          />
        </div>

        <button
          className="primary"
          type="button"
          onClick={() => showDemoNotice("generate")}
        >
          Generate (demo mode)
        </button>

        <div className="field">
          <label htmlFor="follow-up">Follow-up change</label>
          <textarea
            id="follow-up"
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
            placeholder="Describe a change to the current game"
          />
        </div>

        <button
          className="ghost"
          type="button"
          onClick={() => showDemoNotice("revise")}
        >
          Apply change (demo mode)
        </button>

        {notice ? <div className="notice">{notice}</div> : null}

        <div className="examples">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={preset.id === activeId ? "example active" : "example"}
              type="button"
              onClick={() => loadPreset(preset.id)}
            >
              {preset.title}
              <small>{preset.description}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="stage">
        <div className="hud">
          <div>
            <h2>{hud.title}</h2>
            <p>{hud.objective}</p>
          </div>
          <div className="meters">
            <dl>
              <dt>Controls</dt>
              <dd>{hud.controls}</dd>
              <dt>Status</dt>
              <dd className={`status ${hud.status}`}>
                {STATUS_LABEL[hud.status]}
              </dd>
              <dt>Health</dt>
              <dd>
                {hud.health} / {hud.maxHealth}
              </dd>
              <dt>Items</dt>
              <dd>
                {hud.collected} / {hud.required}
              </dd>
            </dl>
            <div className="bar" aria-hidden="true">
              <span
                style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
              />
            </div>
          </div>
          <button
            className="restart"
            type="button"
            onClick={() => setSession((value) => value + 1)}
          >
            Restart
          </button>
        </div>
        <div className="game-frame" ref={hostRef} />
      </section>
    </div>
  );
}
