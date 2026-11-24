import { mountTweakPanel, type Control, type ControlKit } from "./panel";
import { ANIMAL_KEYS, ANIMALS, AnimalEngine, SHARED_CONTROLS, type AnimalKey, type KnobSpec, type Tuning } from "./src";
import { mountChoices, mountComposer, mountGreeting } from "./ui";
import { mountFavourites } from "./favourites";
import { mountBookmarks } from "./bookmarks";

const STORE = "ascii-animals:";

const params = new URLSearchParams(location.search);

const count = Number(params.get("count")) || undefined;
const isAnimal = (key: string | null): key is AnimalKey => key !== null && key in ANIMALS;

let saved: string | null = null;
try {
  saved = localStorage.getItem(STORE + "animal");
} catch {
  // Storage unavailable.
}

let animal: AnimalKey = isAnimal(params.get("animal"))
  ? (params.get("animal") as AnimalKey)
  : isAnimal(saved)
    ? saved
    : "butterflies";

const engine = new AnimalEngine(
  document.querySelector("canvas")!,
  { animal, count, theme: "dark" }
);

const storageKey = (key: AnimalKey) => `${STORE}tweaks:${key}`;

function controlsFor(key: AnimalKey) {
  const a = ANIMALS[key];
  const hidden = new Set<string>(a.hide ?? []);

  return (kit: ControlKit<Tuning>): [string, Control[]][] => {
    const build = (spec: KnobSpec): Control => {
      if ("toggle" in spec) {
        return kit.toggle(spec.key, spec.label, spec.hint);
      }

      const knob = kit.knob(
        spec.key,
        spec.label,
        spec.min,
        spec.max,
        spec.step,
        spec.hint
      );

      const when = spec.disabledWhen;
      return when
        ? { ...knob, disabled: () => Boolean(engine.tuning[when]) }
        : knob;
    };

    const keep = (specs: KnobSpec[]) =>
      specs.filter((s) => !hidden.has(s.key)).map(build);

    return [
      ["Movement", keep(SHARED_CONTROLS.movement)],
      ...a.controls.map(([title, specs]): [string, Control[]] => [
        title,
        specs.map(build)
      ]),
      ["Look", keep(SHARED_CONTROLS.look)]
    ];
  };
}

let tweaks = mountTweakPanel(
  engine,
  ANIMALS[animal].defaults,
  controlsFor(animal),
  { storageKey: storageKey(animal) }
);

window.addEventListener("storage", (e) => {
  if (e.key === storageKey(animal)) location.reload();
});

mountChoices(
  document.querySelector<HTMLElement>(".choices")!,
  ANIMAL_KEYS.map((key) => ({
    value: key,
    label: ANIMALS[key].label,
    swatch: `rgb(${ANIMALS[key].swatch.join(",")})`
  })),
  animal,
  (value) => {
    animal = value as AnimalKey;
    engine.setAnimal(animal);
    tweaks.destroy();

    tweaks = mountTweakPanel(
      engine,
      ANIMALS[animal].defaults,
      controlsFor(animal),
      { storageKey: storageKey(animal) }
    );

    try {
      localStorage.setItem(STORE + "animal", animal);
    } catch {
      // Not remembered across visits.
    }
  }
);

const animalDock = document.querySelector<HTMLElement>(".top-bar");
const animalDockToggle = document.querySelector<HTMLButtonElement>(".animal-dock-toggle");
if (animalDock && animalDockToggle) {
  const dockKey = "nextab:animal-bar-expanded";
  const animalChoices = document.querySelector<HTMLElement>("#animal-choices");
  const setDockOpen = (open: boolean) => {
    animalDock.classList.toggle("is-open", open);
    if (animalChoices) animalChoices.inert = !open;
    animalDockToggle.setAttribute("aria-expanded", String(open));
    animalDockToggle.setAttribute("aria-label", open ? "Hide animal controls" : "Show animal controls");
    animalDockToggle.title = open ? "Hide animal controls" : "Show animal controls";
    try { localStorage.setItem(dockKey, open ? "1" : "0"); } catch { /* Storage may be unavailable. */ }
  };

  let dockOpen = true;
  try { dockOpen = localStorage.getItem(dockKey) !== "0"; } catch { /* Use the default. */ }
  setDockOpen(dockOpen);
  animalDockToggle.addEventListener("click", () => {
    setDockOpen(!animalDock.classList.contains("is-open"));
  });
}

mountComposer();
let userName: string | undefined;
try {
  userName = localStorage.getItem("nextab:username") || undefined;
} catch {}
mountGreeting(userName);
mountFavourites();
mountBookmarks();
