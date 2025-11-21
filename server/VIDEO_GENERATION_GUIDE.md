# 🎬 Smart Video Generation System

## Overview

The system intelligently routes video generation requests between two providers based on format requirements and quality needs:

- **Luma Dream Machine** (Premium) - High quality, supports vertical format, ~$0.40/video
- **Replicate Zeroscope** (Budget) - Good quality, horizontal only, ~$0.02/video

## Decision Logic

### When LUMA is used:
1. **Vertical Format Required** (9:16)
   - TikTok
   - Instagram Reels
   - YouTube Shorts
   - Reason: Zeroscope only supports 16:9, looks bad when cropped

2. **Audio/Premium Quality** 
   - `needsAudio: true` flag set
   - User requests premium generation

### When REPLICATE is used:
- **Horizontal Format** (16:9)
- **No audio requirement**
- Cost-effective option for standard videos

## API Endpoint

```
POST /api/generate-video-story
```

### Request Body

```json
{
  "postText": "Amazing sunset over mountains",
  "platform": "YouTube",
  "style": "cinematic",
  "needsAudio": false,
  "prompt": "Optional custom prompt"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postText` | string | Yes | Content description |
| `platform` | string | Yes | Target platform (YouTube, TikTok, Instagram, etc.) |
| `style` | string | No | Visual style (cinematic, modern, minimal, etc.) |
| `needsAudio` | boolean | No | Force Luma for audio support (default: false) |
| `prompt` | string | No | Custom video prompt (overrides AI generation) |

### Response

```json
{
  "url": "https://supabase-url/generated_videos/...",
  "videoUrl": "https://supabase-url/generated_videos/...",
  "thumbnail": "https://...",
  "provider": "Luma AI (Premium)" | "Replicate (Standard)",
  "cost_tier": "high" | "low",
  "duration": 5,
  "prompt": "Generated visual prompt..."
}
```

## Cost Comparison

| Provider | Cost/Video | Duration | Quality | Formats | Audio |
|----------|-----------|----------|---------|---------|-------|
| **Luma AI** | ~$0.40 | 5s | Excellent | 16:9, 9:16 | Future support |
| **Replicate** | ~$0.02 | 3s | Good | 16:9 only | No |

**Savings**: Using smart routing saves ~95% on horizontal videos without audio requirements!

## Setup

### 1. Get API Keys

#### Luma AI
1. Visit https://lumalabs.ai/dream-machine
2. Sign up and navigate to API settings
3. Generate API key
4. Add to `.env`: `LUMA_API_KEY=luma-...`

#### Replicate
1. Visit https://replicate.com/account/api-tokens
2. Create new token
3. Add to `.env`: `REPLICATE_API_TOKEN=r8_...`

### 2. Environment Variables

```bash
# Required for smart video routing
LUMA_API_KEY=luma-your-key-here
REPLICATE_API_TOKEN=r8_your-token-here

# Also required (for prompt generation)
GOOGLE_API_KEY=your-gemini-key
```

### 3. Supabase Storage

Ensure you have a bucket named `generated_content` in Supabase Storage:

```sql
-- Create bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated_content', 'generated_content', true);
```

## Examples

### Example 1: TikTok Video (Vertical)
```javascript
// Automatically uses Luma (vertical format)
const response = await fetch('/api/generate-video-story', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postText: 'Quick recipe tutorial',
    platform: 'TikTok',
    style: 'modern'
  })
});
// Result: Luma AI (9:16)
```

### Example 2: YouTube Video (Horizontal, Budget)
```javascript
// Automatically uses Replicate (cost-effective)
const response = await fetch('/api/generate-video-story', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postText: 'Tech product review background',
    platform: 'YouTube',
    style: 'professional',
    needsAudio: false
  })
});
// Result: Replicate (16:9, saves $0.38!)
```

### Example 3: Premium Quality (Force Luma)
```javascript
// Forces Luma even for horizontal
const response = await fetch('/api/generate-video-story', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postText: 'Brand showcase video',
    platform: 'LinkedIn',
    style: 'cinematic',
    needsAudio: true // Forces premium
  })
});
// Result: Luma AI (premium quality)
```

## Performance

- **Luma**: ~60-180 seconds generation time
- **Replicate**: ~30-90 seconds generation time

Both providers use polling to wait for completion.

## Troubleshooting

### "Luma API key not configured"
- Ensure `LUMA_API_KEY` is in `.env`
- Check API key is valid at https://lumalabs.ai/

### "Replicate API token not configured"
- Ensure `REPLICATE_API_TOKEN` is in `.env`
- Verify token at https://replicate.com/account

### Video generation timeout
- Luma: Max 3 minutes wait time
- Increase `maxAttempts` if needed
- Check API status pages for service issues

### Poor video quality with Replicate
- Consider using `needsAudio: true` to force Luma
- Replicate is optimized for backgrounds, not complex scenes

## Best Practices

1. **Use Replicate for**:
   - Background videos
   - Scenery/environment shots
   - Horizontal format content
   - High-volume generation

2. **Use Luma for**:
   - Vertical content (TikTok, Reels, Shorts)
   - Complex scenes requiring high detail
   - Brand/marketing videos
   - When audio will be added later

3. **Prompt Engineering**:
   - Keep prompts under 40 words
   - Be specific about visual elements
   - Avoid mentioning text/overlays
   - Use style keywords: cinematic, modern, minimal, vibrant

## Monitoring

Check server logs for routing decisions:

```
[Smart Router] Platform: TikTok (Vertical: true), Audio: false
👉 Decision: LUMA (Reason: Vertical format 9:16 required)
```

## Future Enhancements

- [ ] Audio generation integration
- [ ] Custom duration support
- [ ] Video-to-video transformations
- [ ] Batch generation
- [ ] Cost tracking per user
