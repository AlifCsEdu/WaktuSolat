import fs from 'fs';

const content = fs.readFileSync('src/translations.ts', 'utf-8');

// A very naive regex to extract keys, assuming format `key: "value",`
const msMatch = content.match(/ms:\s*\{([\s\S]*?)\},\s*en:/);
const enMatch = content.match(/en:\s*\{([\s\S]*?)\}\s*};/);

if (!msMatch || !enMatch) {
  console.log("Could not parse ms or en blocks");
  process.exit(1);
}

const extractKeys = (block) => {
  const keys = new Set();
  const lines = block.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
};

const msKeys = extractKeys(msMatch[1]);
const enKeys = extractKeys(enMatch[1]);

console.log("Keys in ms but not in en:");
for (const key of msKeys) {
  if (!enKeys.has(key)) {
    console.log(`- ${key}`);
  }
}

console.log("\nKeys in en but not in ms:");
for (const key of enKeys) {
  if (!msKeys.has(key)) {
    console.log(`- ${key}`);
  }
}
