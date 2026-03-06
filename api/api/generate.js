export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { teacher, name, level, theme, vocab, grammar, types } = await req.json();
    const sections = [];

    if (types.includes('reading')) {
      sections.push(`## READING TEXT
Write a short engaging text (3-4 paragraphs) about "${theme}" for a ${level} level English learner named ${name}.
- Naturally use ALL these vocabulary words: ${vocab.join(', ')}
- Write like a real article or blog post — not a textbook
- Do NOT list the words separately — weave them into the text naturally`);
    }

    if (types.includes('comprehension')) {
      sections.push(`## COMPREHENSION QUESTIONS
Write 3 questions about the reading text above.
Format exactly:
Q1: [question]
A1: [model answer in 1-2 sentences]
Q2: [question]
A2: [model answer]
Q3: [question]
A3: [model answer]`);
    }

    if (types.includes('open') && grammar) {
      sections.push(`## OPEN QUESTIONS
Write 3 personal open-ended questions requiring ${grammar}.
Questions should relate to "${theme}".
Format exactly:
Q1: [question]
H1: [grammar hint]
Q2: [question]
H2: [grammar hint]
Q3: [question]
H3: [grammar hint]`);
    }

    if (types.includes('grammar') && grammar) {
      sections.push(`## GRAMMAR PRACTICE
Write 4 multiple choice questions testing "${grammar}" for ${level} level.
Format exactly:
Q1: [question]
a) [option] b) [option] c) [option] d) [option]
CORRECT: [letter]
Q2: [question]
a) [option] b) [option] c) [option] d) [option]
CORRECT: [letter]
Q3: [question]
a) [option] b) [option] c) [option] d) [option]
CORRECT: [letter]
Q4: [question]
a) [option] b) [option] c) [option] d) [option]
CORRECT: [letter]`);
    }

    if (types.includes('fill')) {
      const fillWords = vocab.slice(0, 5);
      sections.push(`## FILL IN THE BLANKS
Write exactly ${fillWords.length} sentences, one for each word: ${fillWords.join(', ')}
Rules:
- Each sentence MUST use exactly one word from the list
- Use each word exactly once
- Give enough context so the student can guess the word
- Place ___ where the word goes (NOT at the beginning)
Format exactly:
1. [sentence with ___] | ANSWER: [word]
2. [sentence with ___] | ANSWER: [word]`);
    }

    const prompt = `Create an English practice worksheet for ${name} (${level} level).
Teacher: ${teacher} | Theme: ${theme}
Vocabulary: ${vocab.join(', ')}
${grammar ? `Grammar focus: ${grammar}` : ''}

${sections.join('\n\n')}

Keep language natural and appropriate for ${level} level.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
