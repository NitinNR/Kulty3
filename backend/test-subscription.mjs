import {
  isSubscriptionLive,
  nextTermStart,
  addYears,
  daysUntilExpiry,
} from './src/utils/subscription.js';

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
};

const now = new Date('2026-06-01T00:00:00Z');
const inDays = (n) => new Date(now.getTime() + n * 86400000);

console.log('\n--- isSubscriptionLive ---');
eq('active + future endDate -> live',            isSubscriptionLive({ status: 'active', endDate: inDays(30) }, now), true);
eq('active + past endDate -> NOT live',          isSubscriptionLive({ status: 'active', endDate: inDays(-1) }, now), false);
eq('active + no endDate -> live (legacy safe)',  isSubscriptionLive({ status: 'active' }, now), true);
eq('pending -> NOT live',                        isSubscriptionLive({ status: 'pending', endDate: inDays(30) }, now), false);
eq('inactive -> NOT live',                       isSubscriptionLive({ status: 'inactive', endDate: inDays(30) }, now), false);
eq('undefined subscription -> NOT live',         isSubscriptionLive(undefined, now), false);
eq('exact boundary endDate == now -> NOT live',   isSubscriptionLive({ status: 'active', endDate: now }, now), false);

console.log('\n--- nextTermStart (renewal must not destroy paid days) ---');
eq('lapsed sub restarts today',
   nextTermStart({ status: 'active', endDate: inDays(-10) }, now).toISOString(), now.toISOString());
eq('never-paid sub starts today',
   nextTermStart({ status: 'inactive' }, now).toISOString(), now.toISOString());
eq('LIVE sub extends from existing endDate (+30d), NOT today',
   nextTermStart({ status: 'active', endDate: inDays(30) }, now).toISOString(), inDays(30).toISOString());

console.log('\n--- addYears (1-year term) ---');
eq('start today  -> +1yr',  addYears(now, 1).toISOString(), '2027-06-01T00:00:00.000Z');
eq('renewal chain preserves length',
   addYears(nextTermStart({ status: 'active', endDate: inDays(30) }, now), 1).toISOString(),
   '2027-07-01T00:00:00.000Z');

console.log('\n--- daysUntilExpiry ---');
eq('30 days -> 30', daysUntilExpiry({ endDate: inDays(30) }, now), 30);
eq('lapsed -> 0 (never negative)', daysUntilExpiry({ endDate: inDays(-5) }, now), 0);
eq('no endDate -> null', daysUntilExpiry({}, now), null);

console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);