export function segmentQuestions(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let current = [];
  lines.forEach(line => {
    const startsQuestion = /^(\(?\d+\)?\.|\bQ\s?\d+[:.)])/.test(line);
    if (startsQuestion && current.length) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  });
  if (current.length) blocks.push(current.join('\n'));
  return blocks.length ? blocks : [rawText];
}

export function classifyICSE(questionText) {
  const t = questionText.toLowerCase();
  if (t.includes('composition') || t.includes('story')) return 'Composition';
  if (t.includes('letter')) return 'Letter Writing';
  if (t.includes('notice') || t.includes('email')) return 'Functional Writing';
  if (t.includes('read the passage') || t.includes('comprehension')) return 'Comprehension';
  if (t.includes('fill in') || t.includes('grammar')) return 'Grammar';
  return 'Unknown';
}
