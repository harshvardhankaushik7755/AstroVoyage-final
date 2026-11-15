/**
 * Plays the game in a headless browser and checks it really works.
 *
 * It is not a unit test — it is the thing that catches what unit tests cannot:
 * a screen that scrolls on a laptop, text too small to read, a challenge card
 * off the edge of the map, a console error, or a white screen.
 *
 *   npm run measure              1366x650, the size that has to fit
 *   npm run measure -- 1920 1080
 *   npm run measure -- 390 844   a phone
 *
 * Saves one PNG per screen into screenshots/ and exits non-zero if anything
 * is wrong, so it can gate a commit.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const WIDTH = Number(process.argv[2] ?? 1366);
const HEIGHT = Number(process.argv[3] ?? 650);
const URL = process.env.MEASURE_URL ?? "http://localhost:5173/";
const OUT = "screenshots";

/**
 * Under 800px every screen stacks into one column, so of course it scrolls.
 * What matters on a phone is that nothing overflows sideways and the text
 * stays readable.
 */
const PHONE = WIDTH < 800;

const problems = [];
const notes = [];

function problem(message) {
  problems.push(message);
  console.log(`  FAIL  ${message}`);
}

function note(message) {
  notes.push(message);
  console.log(`  ok    ${message}`);
}

/**
 * Does anything need to scroll? The page itself is a fixed 100vh frame, so the
 * honest question is whether the screen's own container overflows inside it.
 */
async function pageHeight(page) {
  return page.evaluate(() => {
    const screen = document.querySelector(".screen");
    return {
      // The window frame must never scroll, on any screen.
      pageScroll: document.documentElement.scrollHeight,
      pageView: window.innerHeight,
      // The screen's content, and the room it has.
      scroll: screen ? screen.scrollHeight : 0,
      view: screen ? screen.clientHeight : 0,
    };
  });
}

/** The smallest font size actually rendered in visible text. */
async function smallestText(page) {
  return page.evaluate(() => {
    let smallest = 99;
    for (const element of document.querySelectorAll("body *")) {
      if (!element.textContent?.trim()) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const size = parseFloat(getComputedStyle(element).fontSize);
      if (size > 0 && size < smallest) smallest = size;
    }
    return smallest;
  });
}

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function checkScreen(page, name, { mayScroll = false } = {}) {
  const { scroll, view, pageScroll, pageView } = await pageHeight(page);

  // On a desktop the window is a fixed frame and only a screen scrolls inside
  // it. On a phone the page scrolling is what people expect, so it is fine.
  if (!PHONE && pageScroll > pageView + 2) {
    problem(`${name}: the window itself scrolls (${pageScroll}px in ${pageView}px)`);
  }

  if (!mayScroll && !PHONE && scroll > view + 2) {
    problem(`${name}: scrolls — ${scroll}px of content in a ${view}px screen`);
  } else {
    note(`${name}: fits (${scroll}px in ${view}px)`);
  }

  const size = await smallestText(page);
  if (size < 11) problem(`${name}: text down to ${size}px, too small to read`);

  /* ---- nothing may hang off the side, at any width */
  const overflow = await page.evaluate(() => {
    const wide = [];
    for (const element of document.querySelectorAll("body *")) {
      // Shapes inside an <svg> are clipped by its viewBox, so one drawn wider
      // than the picture — the Milky Way band is — is not an overflow.
      if (element.ownerSVGElement) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0) continue;
      if (box.right > window.innerWidth + 2 || box.left < -2) {
        wide.push(`${element.tagName.toLowerCase()}.${element.className || "?"}`);
      }
    }
    return wide.slice(0, 3);
  });
  if (overflow.length > 0) {
    problem(`${name}: hangs off the side — ${overflow.join(", ")}`);
  }

  await shoot(page, name);
}

const run = async () => {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  /* ---- a console error or an unhandled rejection is a failure, always */
  page.on("console", (message) => {
    if (message.type() === "error") problem(`console error: ${message.text()}`);
  });
  page.on("pageerror", (error) => problem(`page error: ${error.message}`));

  console.log(`\nAstroVoyage — measuring at ${WIDTH}x${HEIGHT}\n`);

  await page.goto(URL, { waitUntil: "networkidle" });

  /* ---- did it mount at all? */
  const mounted = await page.locator("h1").first().textContent();
  if (!mounted) problem("nothing rendered — the page is blank");
  else note(`mounted: "${mounted}"`);

  await checkScreen(page, "01-home");

  /* ---- the team screen: four seats, each with a role and a name box */
  await page.getByRole("button", { name: /Play as a team/ }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /^4 players$/ }).click();
  await page.waitForTimeout(150);
  const seats = await page.locator(".team-card").count();
  const roleNames = await page.locator(".team-role").count();
  if (seats !== 4 || roleNames !== 4) {
    problem(`team: ${seats} seats and ${roleNames} roles at four players, expected 4 and 4`);
  } else {
    note("team: four seats, each with a role");
  }
  await checkScreen(page, "01b-team");
  await page.getByRole("button", { name: /Back/ }).first().click();
  await page.waitForTimeout(200);

  /* ---- Home -> Choose mission */
  await page.getByRole("button", { name: /Start a mission/ }).click();
  await page.waitForTimeout(150);
  const missions = await page.locator(".mission").count();
  if (missions !== 3) problem(`choose mission: ${missions} missions shown, expected 3`);
  else note("choose mission: all three missions shown");

  /* Every card offers real goals, and starts with one of them chosen. A goal
     names an instrument the launch checks look for, so an unlit card would
     send the player into the Design Lab with nothing to aim at. */
  const goals = await page.locator(".mission .goal-pill").count();
  if (goals < 8) problem(`choose mission: ${goals} goals across the cards, expected 8`);
  else note(`choose mission: ${goals} goals to pick from`);

  const lit = await page.locator('.mission .goal-pill[aria-pressed="true"]').count();
  if (lit !== 3) problem(`choose mission: ${lit} cards have a goal lit, expected 3`);
  else note("choose mission: every card starts with a goal chosen");

  await checkScreen(page, "02-choose");

  /* ---- Design Lab: load the tested design so the checks pass */
  await page
    .locator(".mission")
    .nth(1)
    .getByRole("button", { name: /Design this mission/ })
    .click(); // Mars
  await page.waitForTimeout(150);
  // The opening design fails every check, and five failing checks each need a
  // full sentence the player has to read. That one state is allowed to scroll;
  // the design they actually work with is not.
  await checkScreen(page, "03-design-lab", { mayScroll: true });

  await page.getByRole("button", { name: /Load a design that works/ }).click();
  await page.waitForTimeout(200);

  const goToLaunch = page.getByRole("button", { name: /Go to launch/ });
  if ((await goToLaunch.count()) === 0) {
    problem("design lab: the tested design does not pass the launch checks");
    await shoot(page, "03b-design-lab-failing");
  } else {
    note("design lab: the tested design passes all five checks");
    await checkScreen(page, "03b-design-lab-ready");

    /* ---- the 3D view. It has no library behind it, so if the maths ever goes
       wrong it fails silently as an empty box rather than an error. */
    await page.getByRole("button", { name: /See it in 3D/ }).first().click();
    await page.waitForTimeout(500);
    const polygons = await page.locator(".ship3d-stage polygon").count();
    if (polygons < 20) problem(`3D view: only ${polygons} faces drawn, expected a spacecraft`);
    else note(`3D view: ${polygons} faces drawn`);

    const before = await page.locator(".ship3d-stage polygon").first().getAttribute("points");
    await page.waitForTimeout(700);
    const after = await page.locator(".ship3d-stage polygon").first().getAttribute("points");
    if (before === after) problem("3D view: it is not turning");
    else note("3D view: it turns");

    await shoot(page, "03c-ship-3d");
    await page.getByRole("button", { name: "Close" }).first().click();
    await page.waitForTimeout(200);

    await goToLaunch.click();
  }

  /* ---- Launch */
  await page.waitForTimeout(200);
  const windows = await page.locator(".cal--open").count();
  if (windows < 1) problem("launch: no launch window shown on the calendar");
  else note(`launch: ${windows} launch window(s) on the calendar`);
  await checkScreen(page, "04-launch");

  const launchButton = page.getByRole("button", { name: /^Launch/ });
  if ((await launchButton.count()) === 0) {
    problem("launch: the Launch button is missing or disabled");
  } else {
    await launchButton.click();
  }

  /* ---- Mission Control */
  await page.waitForTimeout(600);
  const clock = await page.locator(".clock").textContent().catch(() => null);
  if (!clock || !/Day \d+ of \d+/.test(clock)) problem(`mission control: clock reads "${clock}"`);
  else note(`mission control: clock reads "${clock}"`);

  const gauges = await page.locator(".gauge").count();
  if (gauges !== 6) problem(`mission control: ${gauges} gauges, expected 6`);
  else note("mission control: all six gauges present");

  const svgElements = await page.locator(".mapwrap svg *").count();
  note(`mission control: ${svgElements} elements drawn on the map`);

  await checkScreen(page, "05-mission-control");

  /* ---- the 3D flight view. Like the ship viewer, a mistake in the camera
     maths shows up as an empty box rather than as an error, so it has to be
     looked at rather than trusted. */
  await page.getByRole("button", { name: /3D$/ }).click();
  await page.waitForTimeout(400);
  if ((await page.locator(".map3d-stage").count()) === 0) {
    problem("3D flight view: it did not open");
  } else {
    for (const mode of ["Orbit", "Track", "Follow"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      await page.waitForTimeout(350);
      const drawn = await page.locator(".map3d-stage *").count();
      const paths = await page.locator(".map3d-stage polyline").count();
      if (drawn < 50 || paths < 4) {
        problem(`3D flight view: ${mode} drew ${drawn} elements and ${paths} paths`);
      } else {
        note(`3D flight view: ${mode} drew ${drawn} elements`);
      }
    }

    await page.getByRole("button", { name: "Orbit", exact: true }).click();
    const before = await page.locator(".map3d-stage polyline").first().getAttribute("points");
    await page.waitForTimeout(900);
    const after = await page.locator(".map3d-stage polyline").first().getAttribute("points");
    if (before === after) problem("3D flight view: the camera is not moving on its own");
    else note("3D flight view: the camera swings round on its own");

    await shoot(page, "05b-flight-3d");
    await page.getByRole("button", { name: /Flat map/ }).click();
    await page.waitForTimeout(300);
  }

  /* ---- run the cruise at 4x so the whole flight fits in a sensible wait */
  const fast = page.getByRole("button", { name: "4x" });
  if ((await fast.count()) > 0 && (await fast.isEnabled())) await fast.click();

  /* ---- wait for a challenge, and answer the first one with the keyboard only.
     The cruise is ~75s of real time, so the loop has to outlast it. */
  let answered = 0;
  for (let i = 0; i < 220; i += 1) {
    const card = page.locator(".event");
    if (await card.count()) {
      // Skip the beat if it is still running, then check the card is on screen.
      // On a phone the card deliberately covers the whole viewport instead.
      const box = PHONE ? null : await card.boundingBox();
      const map = await page.locator(".mapwrap").boundingBox();
      if (box && map) {
        const inside =
          box.x >= map.x - 2 &&
          box.y >= map.y - 2 &&
          box.x + box.width <= map.x + map.width + 2 &&
          box.y + box.height <= map.y + map.height + 2;
        if (!inside) problem("challenge card is drawn outside the map");
      }

      const chips = await page.locator(".event .option-chips .chip").count();
      if (chips === 0) problem("challenge card has no chips saying what the options cost");

      /* Every option must be visible without scrolling the card. A card that
         hides its third option hides a choice the player is entitled to. */
      const cardFit = await page.evaluate(() => {
        const card = document.querySelector(".event");
        if (!card) return null;
        const options = card.querySelectorAll(".option");
        const last = options[options.length - 1];
        return {
          scrolls: card.scrollHeight > card.clientHeight + 2,
          name: card.querySelector(".event-head strong")?.textContent ?? "?",
          over: card.scrollHeight - card.clientHeight,
          options: options.length,
          lastVisible: last
            ? last.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom + 2
            : false,
        };
      });
      if (cardFit?.scrolls || !cardFit?.lastVisible) {
        problem(
          `"${cardFit?.name}" hides options: ${cardFit?.options} options, ${cardFit?.over}px too tall`,
        );
      }

      if (answered === 0) {
        await shoot(page, "06-challenge");
        // The card must take focus so a keyboard player can answer it.
        const focused = await page.evaluate(
          () => document.activeElement?.className ?? "",
        );
        if (!focused.includes("option")) {
          problem(`challenge card did not take keyboard focus (focus was on "${focused}")`);
        } else {
          note("challenge card takes keyboard focus when it opens");
        }
        await page.keyboard.press("Enter");
      } else {
        await page.locator(".event .option").first().click();
      }
      answered += 1;
      await page.waitForTimeout(120);
      // Answering restarts the clock at 1x, so ask for 4x again.
      if ((await fast.count()) > 0 && (await fast.isEnabled())) await fast.click();
    }
    if (await page.getByRole("button", { name: /See the results/ }).count()) break;
    await page.waitForTimeout(300);
  }

  if (answered === 0) problem("no challenge arrived in the whole cruise");
  else note(`answered ${answered} challenge(s) during the cruise`);

  /* ---- the mission has to end */
  const results = page.getByRole("button", { name: /See the results/ });
  if ((await results.count()) === 0) {
    problem("the mission never finished");
    await shoot(page, "06b-stuck");
  } else {
    note("the mission reached an end");
    await shoot(page, "07-arrival");
    await results.click();
  }

  /* ---- Results. This is the one screen allowed to scroll. */
  await page.waitForTimeout(300);
  const score = await page.locator(".score-big").textContent().catch(() => null);
  if (score === null) problem("results: no score shown");
  else note(`results: scored ${score}`);

  const bubble = await page.locator(".bubble").textContent().catch(() => null);
  if (!bubble || bubble.length < 40) problem("results: the Flight Director said nothing useful");
  else note(`results: the Flight Director wrote ${bubble.length} characters`);

  await checkScreen(page, "08-results", { mayScroll: true });

  /* ---- the NASA sources panel, which is what earns the resource marks */
  const sources = page.getByRole("button", { name: /Where the numbers come from/ }).first();
  if ((await sources.count()) === 0) {
    problem("results: no 'Where the numbers come from' footnote");
  } else {
    await sources.click();
    await page.waitForTimeout(200);
    const links = await page.locator(".dialog a[href*='nasa.gov']").count();
    if (links < 5) problem(`sources panel: only ${links} NASA links`);
    else note(`sources panel: ${links} NASA links`);
    await shoot(page, "09-nasa-sources");
  }

  await browser.close();

  /* ---------------------------------------------------------------- verdict */
  console.log(`\n${notes.length} checks passed.`);
  if (problems.length > 0) {
    console.log(`\n${problems.length} PROBLEM(S):`);
    for (const message of problems) console.log(`  - ${message}`);
    process.exit(1);
  }
  console.log(`Screenshots in ${OUT}/. No problems found.\n`);
};

run().catch((error) => {
  console.error("\nmeasure crashed:", error.message);
  process.exit(1);
});
