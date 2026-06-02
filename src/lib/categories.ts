// The 15 layers of the AI / semiconductor value chain, top (raw inputs) to
// bottom (end demand). Stored on Company.category as the stable `id`.

export type Category = {
  id: string;
  short: string; // compact label for badges / table headers
  label: string; // full label
};

export const CATEGORIES: Category[] = [
  { id: "raw-materials", short: "Raw materials & rare earths", label: "Raw materials, wafers, chemicals, rare earths" },
  { id: "semi-equipment", short: "Semiconductor equipment", label: "Semiconductor equipment" },
  { id: "chip-designers", short: "Chip designers", label: "Chip designers (GPUs, CPUs, ASICs, networking silicon)" },
  { id: "foundries-memory", short: "Foundries & memory", label: "Foundries & memory" },
  { id: "ai-hardware-oem", short: "AI servers & hardware OEMs", label: "AI server & hardware OEMs" },
  { id: "networking", short: "Networking", label: "Networking (switches, optical, interconnect)" },
  { id: "storage", short: "Storage", label: "Storage" },
  { id: "data-centers", short: "Data centers & REITs", label: "Data centers, colocation, REITs, neoclouds" },
  { id: "cooling-power", short: "Cooling & DC power", label: "Cooling & data-center power infrastructure" },
  { id: "cloud-western", short: "Hyperscaler cloud (Western)", label: "Hyperscaler cloud (Western)" },
  { id: "cloud-asia", short: "Hyperscaler cloud & AI (Asia)", label: "Hyperscaler cloud & AI (China/Asia)" },
  { id: "ai-software", short: "AI software & data", label: "AI software, data, MLOps, vector DBs, security" },
  { id: "foundation-models", short: "Foundation models", label: "Foundation model companies" },
  { id: "end-applications", short: "End applications", label: "End applications (consumer, enterprise, vertical AI)" },
  { id: "energy", short: "Energy, utilities & grid", label: "Energy, utilities, nuclear, grid" },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Look up a category by id (null/unknown → undefined). */
export function getCategory(id: string | null | undefined): Category | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** True if the id is one of the known categories. */
export function isValidCategory(id: string): boolean {
  return BY_ID.has(id);
}

/** Sort index for value-chain ordering; unknown/uncategorized sorts last. */
export function categoryOrder(id: string | null | undefined): number {
  const i = CATEGORIES.findIndex((c) => c.id === id);
  return i === -1 ? CATEGORIES.length : i;
}
