import featured from "./featured.json";
import type { Take } from "./take";

// The "Made with Take One" gallery: real takes, copied by scripts/feature.mjs. It is
// curated on purpose. An open gallery that anonymous visitors post to would need moderation.
export const FEATURED = featured as Take[];
