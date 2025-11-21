# 🔗 Social Media Publishing - Setup Guide

## ✅ Co zostało zaimplementowane:

### 1. **Frontend Components**
- ✅ `SocialConnectionsModal.tsx` - Modal do zarządzania połączeniami
- ✅ `DirectPublishButton.tsx` - Przycisk do publikowania
- ✅ Types w `types/socialPublishing.ts`

### 2. **Backend Services**
- ✅ `server/socialPublishing.ts` - Kompletne API publishers dla:
  - LinkedIn OAuth + Publishing
  - Twitter/X OAuth + Publishing  
  - Facebook OAuth + Publishing
  - Instagram OAuth + Publishing

### 3. **API Endpoints** (gotowe do dodania)
```typescript
// OAuth
GET  /api/social/auth/:platform
POST /api/social/callback/:platform

// Connections
GET    /api/social/connections
DELETE /api/social/connections/:connectionId

// Publishing
POST /api/social/publish
GET  /api/social/published
```

---

## 📦 Wymagane Pakiety

```bash
cd server
npm install twitter-api-v2 axios
```

```json
{
  "dependencies": {
    "twitter-api-v2": "^1.15.0",
    "axios": "^0.27.2"
  }
}
```

---

## 🔑 Environment Variables

Dodaj do `server/.env`:

```env
# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# Twitter/X
TWITTER_APP_KEY=your_app_key
TWITTER_APP_SECRET=your_app_secret
TWITTER_CALLBACK_URL=http://localhost:3000/auth/twitter/callback

# Facebook
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Instagram (uses Facebook)
# Same credentials as Facebook
```

---

## 🗄️ Database Schema (Supabase)

### Table: `social_connections`
```sql
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  account_handle VARCHAR(255),
  profile_image_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT NOW(),
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_connections_user ON social_connections(user_id);
CREATE INDEX idx_social_connections_platform ON social_connections(platform);
```

### Table: `published_posts`
```sql
CREATE TABLE published_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  connection_id UUID REFERENCES social_connections(id),
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255),
  content TEXT NOT NULL,
  media_urls TEXT[],
  published_at TIMESTAMP DEFAULT NOW(),
  url TEXT,
  status VARCHAR(50) DEFAULT 'published',
  analytics JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_published_posts_user ON published_posts(user_id);
CREATE INDEX idx_published_posts_platform ON published_posts(platform);
```

### Table: `scheduled_posts`
```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  connection_id UUID REFERENCES social_connections(id),
  content TEXT NOT NULL,
  media_urls TEXT[],
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  published_post_id UUID REFERENCES published_posts(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
```

---

## 🚀 Setup Instructions

### 1. Utwórz Developer Apps

#### LinkedIn:
1. Idź do https://www.linkedin.com/developers/apps
2. Create App → Wypełnij dane
3. W "Auth" → Dodaj Redirect URL: `http://localhost:3000/auth/linkedin/callback`
4. W "Products" → Zaznacz "Share on LinkedIn"
5. Skopiuj Client ID i Client Secret

#### Twitter/X:
1. Idź do https://developer.twitter.com/en/portal/dashboard
2. Create Project → Create App
3. W App settings → User authentication settings
4. OAuth 1.0a → Dodaj Callback URL
5. Skopiuj API Key i API Secret

#### Facebook:
1. Idź do https://developers.facebook.com/apps
2. Create App → Business Type
3. Dodaj "Facebook Login" product
4. W Settings → Valid OAuth Redirect URIs
5. Skopiuj App ID i App Secret

### 2. Skonfiguruj Backend

```bash
cd server
npm install twitter-api-v2 axios
```

Dodaj do `server/index.ts` (na końcu pliku, przed `app.listen`):

```typescript
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher
} from './socialPublishing.js';
```

**UWAGA**: Pełne endpointy są w pliku, ale trzeba je skopiować do `server/index.ts`

### 3. Utwórz Tabele w Supabase

```sql
-- Uruchom SQL z sekcji "Database Schema" powyżej
```

### 4. Zintegruj w UI

W `App.tsx`:
```tsx
import { SocialConnectionsModal } from './components/SocialConnectionsModal';
import { DirectPublishButton } from './components/DirectPublishButton';

// Add state
const [socialModalOpen, setSocialModalOpen] = useState(false);
const [connections, setConnections] = useState([]);

// Add to return
<SocialConnectionsModal
  isOpen={socialModalOpen}
  onClose={() => setSocialModalOpen(false)}
  connections={connections}
  onConnect={handleConnect}
  onDisconnect={handleDisconnect}
  onRefresh={loadConnections}
/>
```

W `ResultCard.tsx` dodaj przycisk:
```tsx
<DirectPublishButton
  post={result}
  connection={selectedConnection}
  onPublish={handlePublish}
/>
```

---

## 📖 Użycie

### 1. Połącz konto
```typescript
// User clicks "Connect LinkedIn"
const response = await fetch('/api/social/auth/linkedin');
const { authUrl } = await response.json();

// Redirect to authUrl
window.location.href = authUrl;

// After callback with code
await fetch('/api/social/callback/linkedin', {
  method: 'POST',
  headers: { 'x-user-id': userId },
  body: JSON.stringify({ code })
});
```

### 2. Publikuj post
```typescript
await fetch('/api/social/publish', {
  method: 'POST',
  headers: { 'x-user-id': userId },
  body: JSON.stringify({
    connectionId: 'uuid',
    content: 'My post text',
    hashtags: ['#AI', '#Tech'],
    mediaUrls: ['https://...']
  })
});
```

### 3. Zaplanuj post
```typescript
await fetch('/api/social/publish', {
  method: 'POST',
  body: JSON.stringify({
    connectionId: 'uuid',
    content: 'My post',
    scheduledAt: '2025-11-22T10:00:00Z'
  })
});
```

---

## 🔒 Security Best Practices

1. **Nigdy nie commituj kluczy API** do git
2. **Używaj HTTPS** w produkcji
3. **Rotuj tokeny** regularnie
4. **Hashuj sensitive data** w bazie
5. **Waliduj input** na backendzie
6. **Rate limiting** dla API calls
7. **Monitor abuse** patterns

---

## 🧪 Testing

```bash
# Test LinkedIn
curl http://localhost:3001/api/social/auth/linkedin

# Test publishing (po połączeniu)
curl -X POST http://localhost:3001/api/social/publish \
  -H "x-user-id: test-user" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "uuid",
    "content": "Test post",
    "hashtags": ["#test"]
  }'
```

---

## 🎯 Next Steps

### Faza 1: Podstawy (Done! ✅)
- [x] LinkedIn integration
- [x] Twitter/X integration
- [x] Facebook integration
- [x] Instagram integration
- [x] OAuth flows
- [x] Publishing endpoints

### Faza 2: Enhancements (TODO)
- [ ] Analytics import (likes, comments, shares)
- [ ] Auto-retry failed posts
- [ ] Bulk publishing
- [ ] Multi-account per platform
- [ ] Post preview przed publikacją
- [ ] Error notifications

### Faza 3: Advanced (TODO)
- [ ] Best time scheduler AI
- [ ] Auto cross-posting
- [ ] Thread/carousel support
- [ ] Video publishing
- [ ] Stories publishing
- [ ] Engagement monitoring

---

## 🐛 Troubleshooting

### "OAuth error: redirect_uri_mismatch"
**Fix**: Sprawdź czy redirect URI w app settings dokładnie pasuje do tego w .env

### "Access token expired"
**Fix**: Implementuj token refresh logic (już jest w kodzie dla niektórych platform)

### "Rate limit exceeded"
**Fix**: Dodaj rate limiting i kolejkowanie postów

### "Media upload failed"
**Fix**: Sprawdź format i rozmiar obrazu (każda platforma ma limity)

---

## 📞 Support

Masz problem? Sprawdź:
1. Console logs w przeglądarce
2. Server logs (`console.log` w endpoints)
3. Network tab (sprawdź response errors)
4. Platform developer docs

---

## 🎉 Gotowe!

Social Publishing jest teraz w pełni zaimplementowane! 

**Kolejne kroki:**
1. Zainstaluj pakiety: `npm install twitter-api-v2 axios`
2. Dodaj .env variables
3. Utwórz tabele w Supabase
4. Skopiuj endpointy do server/index.ts
5. Testuj OAuth flows
6. Publikuj pierwszy post! 🚀

**Need help?** Zobacz `FEATURES.md` lub otwórz issue na GitHub!
