/**
 * The NASA resources behind the game.
 *
 * Every other screen tries to hide the machinery. This one opens it up: which
 * NASA tool, dataset or paper each part of the game is built on, what we took
 * from it, and the file where that lives, so a claim can be checked rather than
 * believed. The four that do real work lead; the rest follow.
 *
 * A dumb screen. Everything here is read from nasaResources.json and
 * mdlPolicy.json.
 */
import { mdlPolicy, nasaResources } from "../data/game";
import type { NasaResource } from "../data/game";
import Starfield from "../components/Starfield";
import { useGame } from "../store/gameStore";

const KIND_LABEL: Record<NasaResource["kind"], string> = {
  tool: "Software",
  data: "Data",
  paper: "Research paper",
  report: "Report",
  process: "How NASA works",
  standard: "Standard",
  education: "Teaching",
};

function ResourceCard({ resource, big }: { resource: NasaResource; big: boolean }) {
  return (
    <div className={`panel res${big ? " res--big" : ""}`}>
      <div className="res-head">
        <span className={`chip res-kind res-kind--${resource.kind}`}>
          {KIND_LABEL[resource.kind]}
        </span>
        <h3 className="res-name">{resource.name}</h3>
        <p className="res-org">{resource.org}</p>
      </div>

      <p className="res-what">{resource.whatItIs}</p>

      <div className="res-used">
        <span className="res-used-label">What we used it for</span>
        <p>{resource.usedFor}</p>
      </div>

      <div className="res-foot">
        <code className="mono res-where">{resource.where}</code>
        <span className="topbar-spacer" />
        <a className="btn btn--small" href={resource.url} target="_blank" rel="noreferrer">
          Open at NASA ↗
        </a>
      </div>
    </div>
  );
}

export default function Resources() {
  const go = useGame((state) => state.go);
  const headline = nasaResources.filter((resource) => resource.headline);
  const rest = nasaResources.filter((resource) => !resource.headline);

  return (
    <div className="screen resources">
      <svg
        className="home-stars"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <Starfield width={1200} height={700} idPrefix="res-sky" />
      </svg>

      <div className="choose-head">
        <p className="eyebrow">NASA Space Apps Challenge 2026</p>
        <h2>The NASA resources behind this game</h2>
        <p className="lead">
          This game is not a guess about how missions are designed. It runs on NASA's own formulas,
          NASA's own measurements, and the review process NASA's Mission Design Lab actually uses.
          Here is every resource, what we took from it, and the file it lives in — so you can check
          us.
        </p>
      </div>

      {/* ---- the four doing real work */}
      <div className="res-grid res-grid--big">
        {headline.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} big />
        ))}
      </div>

      {/* ---- the method the Design Review is built on, in plain words */}
      <div className="panel res-method">
        <p className="eyebrow">How NASA decides a design is real</p>
        <h3>Three numbers, and the gap between them</h3>
        <p className="lead">
          NASA's {mdlPolicy.lab} never signs off the first number an engineer writes down. Every
          number gets a safety margin added, and then the design has to still fit. That is what the
          Design Review in the Design Lab does to your spacecraft.
        </p>

        <div className="deflist">
          {mdlPolicy.definitions.map((entry) => (
            <div className="def" key={entry.term}>
              <div className="def-term">
                {entry.term} — {entry.name}
              </div>
              <div className="def-meaning">
                <strong>{entry.plain}</strong> {entry.detail}
              </div>
            </div>
          ))}
        </div>

        <p className="eyebrow res-sub">What NASA adds, subsystem by subsystem</p>
        <div className="res-cont">
          {mdlPolicy.contingencies.map((entry) => (
            <div className="res-cont-row" key={entry.id}>
              <span className="res-cont-pct">+{Math.round(entry.percent * 100)}%</span>
              <span className="res-cont-body">
                <strong>{entry.label}</strong> <span className="tiny">· {entry.subsystem}</span>
                <br />
                {entry.plain}
                <br />
                <span className="res-quote">“{entry.quote}”</span>
              </span>
            </div>
          ))}
        </div>

        <div className="res-pileup">
          <h4>{mdlPolicy.pileUp.title}</h4>
          <p>{mdlPolicy.pileUp.plain}</p>
          <p className="res-example">{mdlPolicy.pileUp.example}</p>
          <p className="tiny res-quote">“{mdlPolicy.pileUp.quote}”</p>
        </div>
      </div>

      {/* ---- everything else */}
      <p className="eyebrow res-sub">And the rest of what we drew on</p>
      <div className="res-grid">
        {rest.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} big={false} />
        ))}
      </div>

      <div className="row res-actions">
        <button className="btn btn--primary btn--big" onClick={() => go("choose")}>
          Start a mission
        </button>
        <button className="btn btn--big" onClick={() => go("home")}>
          Back to the start
        </button>
      </div>

      <p className="tiny home-foot">
        Where a number is ours rather than NASA's, the game says so. Look for “Where the numbers
        come from” on the Design Lab, Launch and Result screens.
      </p>
    </div>
  );
}
