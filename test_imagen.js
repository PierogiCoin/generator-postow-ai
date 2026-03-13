const apiKey = process.env.VITE_API_KEY || 'AIzaSyALQDBI-rOm7u8I-kzCK3twzEUYh6XlJaM';
fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instances: [{ prompt: "A dog in space" }],
    parameters: { sampleCount: 1, aspectRatio: "1:1", outputOptions: { mimeType: "image/jpeg" } }
  })
}).then(r => r.json()).then(console.log).catch(console.error);
