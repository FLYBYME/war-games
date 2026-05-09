
import { profiles } from '../dump/data/profiles.js';
import { weaponProfiles } from '../dump/data/weapons.js';
import { scenarios } from '../dump/data/scenarios.js';

console.log(`Loaded ${Object.keys(profiles).length} profiles`);
console.log(`Loaded ${weaponProfiles.length} weapons`);
console.log(`Loaded ${scenarios.length} scenarios`);
