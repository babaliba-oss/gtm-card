// Weekly card update: reads brain/*.md + card.json, asks Claude for an updated card.json,
// checks the shape, writes it. The workflow then opens a pull request. Nothing merges on its own.
// Needs ANTHROPIC_API_KEY. Optional: ANTHROPIC_MODEL.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) { console.log('No ANTHROPIC_API_KEY secret set, skipping.'); process.exit(0); }
const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const card = JSON.parse(readFileSync('card.json', 'utf8'));
const brain = readdirSync('brain').filter((f) => f.endsWith('.md') && f !== 'README.md')
  .map((f) => `--- brain/${f} ---\n${readFileSync(`brain/${f}`, 'utf8')}`).join('\n\n');
// Skip if the brain is still the empty template: every bullet or table row is a TODO.
const filled = brain.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l, i, all) => {
  const t = l.trim();
  if (!(t.startsWith('- ') || t.startsWith('|'))) return false;
  if (/^\|[\s|:-]+\|$/.test(t)) return false;                       // table separator
  if (all[i + 1] && /^\|[\s|:-]+\|$/.test(all[i + 1].trim())) return false; // table header
  return !/TODO/.test(t);
});
if (!filled.length) { console.log('Brain is still empty, skipping.'); process.exit(0); }
const today = new Date().toISOString().slice(0, 10);

const system = `You update a person's GTM card (card.json) from their own notes (brain/*.md).
Rules:
- Use only facts stated in the notes. Never invent tools, numbers, employers or builds.
- If the notes don't support a change, keep the current value.
- Only include things that are fine to make public.
- Same JSON shape as the current card. Keep "avatar", "links" and "accent" unless the notes clearly change them.
- "focus": 4 to 8 short items. "stack": up to 8 groups of {label, items}. "nums": exactly 6 of {b, t}, t under 10 words. "builds": up to 4 of {name, what}, one line each.
- Plain words, no buzzwords, no em dashes.
- Set "updated" to "${today}".
Return only the JSON object, nothing else.`;

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({
    model, max_tokens: 2000, system,
    messages: [{ role: 'user', content: `Current card.json:\n${JSON.stringify(card, null, 2)}\n\nNotes:\n${brain}` }],
  }),
});
if (!res.ok) { console.error('API error', res.status, await res.text()); process.exit(1); }
const data = await res.json();
const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);

let next;
try { next = JSON.parse(json); } catch { console.error('Model did not return valid JSON:\n', text); process.exit(1); }

// Shape check. Anything off and we keep the old card.
const problems = [];
const str = (v) => typeof v === 'string' && v.length > 0;
if (!str(next.name)) problems.push('name');
if (!Array.isArray(next.stack) || next.stack.length > 8 || !next.stack.every((g) => str(g.label) && Array.isArray(g.items))) problems.push('stack');
if (!Array.isArray(next.nums) || next.nums.length !== 6 || !next.nums.every((n) => str(n.b) && str(n.t))) problems.push('nums');
if (next.builds && (!Array.isArray(next.builds) || next.builds.length > 4)) problems.push('builds');
if (problems.length) { console.error('New card failed checks:', problems.join(', ')); process.exit(1); }

const clean = JSON.parse(JSON.stringify(next).replace(/\s*—\s*/g, ', '));
const strip = (c) => JSON.stringify({ ...c, updated: undefined });
if (strip(clean) === strip(card)) { console.log('No changes.'); process.exit(0); }

writeFileSync('card.json', JSON.stringify(clean, null, 2) + '\n');
console.log('card.json updated.');
