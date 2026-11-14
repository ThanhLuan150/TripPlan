// Prints a Vitest json-summary coverage report as a Markdown table, for
// $GITHUB_STEP_SUMMARY:  node coverage-summary.mjs <title> <coverage-summary.json>
import {readFileSync} from 'node:fs';

const [title, file] = process.argv.slice(2);
const {total} = JSON.parse(readFileSync(file, 'utf8'));

const row = key => {
  const {pct, covered, total: all} = total[key];
  return `| ${key} | ${pct}% | ${covered} / ${all} |`;
};

console.log(
  [
    `### ${title} coverage`,
    '',
    '| Metric | % | Covered |',
    '| --- | --- | --- |',
    ...['statements', 'branches', 'functions', 'lines'].map(row),
    '',
  ].join('\n'),
);
