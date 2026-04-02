import fetch from 'node-fetch';

async function test() {
  const url = 'http://127.0.0.1:11434/v1/chat/completions';
  console.log('Testing reachability to:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3:latest',
        messages: [{ role: 'user', content: 'hi' }]
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data).slice(0, 100));
  } catch (err) {
    console.error('Fetch failed specifically with:', err.message);
    if (err.cause) console.error('Cause:', err.cause.message);
  }
}

test();
