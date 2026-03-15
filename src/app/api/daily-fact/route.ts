import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const studyFacts = [
  'Studying in short sessions improves memory retention.',
  'Teaching someone else what you learned improves understanding.',
  'Sleep helps your brain convert short-term memory into long-term memory.',
  'Active recall is one of the most effective study techniques.',
  'Taking short breaks improves concentration and productivity.',
  'Writing notes by hand improves comprehension compared to typing.',
  'Spaced repetition helps retain information longer.',
];

function pickRandomFact() {
  const fact = studyFacts[Math.floor(Math.random() * studyFacts.length)];
  return {
    day: new Date().toISOString().slice(0, 10),
    topic: 'Study Tip',
    fact,
  };
}

export async function GET() {
  return NextResponse.json(pickRandomFact());
}
