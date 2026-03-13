const apiKey = 'AIzaSyD_thn3-2rG6Q8Gusgpe-ShbPQiAu0K5vY';
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(r => r.json())
  .then(data => {
    if (data.models) {
      console.log(data.models.map(m => m.name).filter(m => m.includes('gemini')));
    } else {
      console.log(data);
    }
  })
  .catch(console.error);
