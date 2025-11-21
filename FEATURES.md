# 🚀 Nowe Funkcje - AI Video Stories & Multi-Platform Optimizer

## 📋 Spis Treści
1. [AI Video Stories z Veo 2](#ai-video-stories-z-veo-2)
2. [Multi-Platform Optimizer](#multi-platform-optimizer)
3. [Instalacja i Konfiguracja](#instalacja-i-konfiguracja)
4. [Użycie](#użycie)

---

## 🎬 AI Video Stories z Veo 2

### Co to jest?
Automatyczne generowanie krótkich video stories z twoich postów przy użyciu Google Veo 2.

### Dostępne Style Video:

#### 1. **Instagram Story** 📱
- Format: 9:16 (vertical)
- Czas: 15 sekund
- Cechy: Dynamiczne przejścia, nowoczesna estetyka, animowane teksty

#### 2. **TikTok Vertical** 🎵
- Format: 9:16 (vertical)
- Czas: 30 sekund
- Cechy: Szybkie cięcia, trendy efekty, energetyczna atmosfera

#### 3. **Animated Quote** 💭
- Format: 1:1 (square)
- Czas: 10 sekund
- Cechy: Elegancka typografia, minimalistyczne tło

#### 4. **Kinetic Typography** ⚡
- Format: 16:9 (landscape)
- Czas: 20 sekund
- Cechy: Dynamiczny tekst z efektami 3D, rotacje

#### 5. **Carousel Slides** 📊
- Format: 1:1 (square)
- Czas: 25 sekund
- Cechy: Seria slajdów, kluczowe punkty

### Jak używać?
1. Wygeneruj post
2. Kliknij przycisk **"Video Story"** (fioletowy gradient)
3. Wybierz styl wideo
4. Kliknij **"Generuj Video"**
5. Pobierz lub udostępnij gotowe wideo

### API Endpoint
```typescript
POST /api/generate-video-story
Body: {
  postText: string,
  platform: string,
  style: VideoStoryStyle,
  hashtags?: string[],
  tone?: string
}
```

---

## 🚀 Multi-Platform Optimizer

### Co to jest?
Automatyczna optymalizacja jednego posta dla wielu platform mediów społecznościowych jednocześnie.

### Obsługiwane Platformy:

| Platforma | Limit znaków | Optymalne hashtagi | Cechy |
|-----------|--------------|-------------------|-------|
| **X (Twitter)** | 280 | 1-3 | Krótko, zwięźle, emoji |
| **LinkedIn** | 3000 | 3-5 | Profesjonalny, storytelling |
| **Instagram** | 2200 | 5-30 | Hashtagi na końcu, CTA |
| **Facebook** | 63206 | 2-5 | Pierwsze 3 linijki kluczowe |
| **TikTok** | 2200 | 3-5 | Trendy hashtagi, slang |
| **YouTube** | 5000 | 3-15 | Timestamps, keywords, SEO |

### Funkcje:

#### 1. **Automatyczna Optymalizacja**
- Dostosowanie długości tekstu do limitu platformy
- Generowanie odpowiednich hashtagów
- Dostosowanie tonu do platformy

#### 2. **Prognoza Zaangażowania**
Dla każdej platformy:
- Wynik procentowy (0-100%)
- Analiza elementów (pytania, emoji, CTA)
- Rekomendacje ulepszenia

#### 3. **Wskazówki Best Practices**
- Specificzne dla każdej platformy
- Oparte na aktualnych trendach
- Praktyczne porady

#### 4. **A/B Testing**
Generowanie wariantów:
- **Wariant A**: Emocjonalny, storytelling
- **Wariant B**: Dane/fakty, bezpośredni CTA

### Jak używać?
1. Wygeneruj post
2. Przewiń w dół do sekcji **"Multi-Platform Optimizer"**
3. Zaznacz platformy docelowe
4. Kliknij **"Optymalizuj dla X platform"**
5. Kopiuj zoptymalizowane posty dla każdej platformy

### API Endpoint
```typescript
POST /api/optimize-multi-platform
Body: {
  originalText: string,
  originalPlatform: Platform,
  targetPlatforms: Platform[],
  tone: Tone,
  hashtags?: string[]
}
```

---

## ⚙️ Instalacja i Konfiguracja

### 1. Frontend
Komponenty już zintegrowane w projekcie:
```typescript
// Nowe komponenty
- components/VideoStoryModal.tsx
- components/MultiPlatformOptimizer.tsx

// Nowe serwisy
- services/videoStoryService.ts
- services/multiPlatformService.ts
```

### 2. Backend
Endpointy dodane w `server/index.ts`:
- `/api/generate-video-story` - Generowanie video
- `/api/optimize-multi-platform` - Optymalizacja multi-platform
- `/api/generate-ab-variants` - A/B testing

### 3. Zmienne środowiskowe
Upewnij się, że masz:
```env
GEMINI_API_KEY=your_key_here
VITE_API_BASE_URL=http://localhost:3001
```

---

## 🎯 Użycie

### Przykład 1: Video Story
```typescript
import { generateVideoStory } from './services/videoStoryService';

const video = await generateVideoStory(
  generatedPost,
  'instagram-story',
  userId
);

console.log(video.videoUrl); // URL do wideo
console.log(video.thumbnail); // URL miniaturki
```

### Przykład 2: Multi-Platform
```typescript
import { optimizeForPlatforms } from './services/multiPlatformService';

const optimizations = await optimizeForPlatforms({
  originalText: "Mój post...",
  originalPlatform: Platform.LinkedIn,
  targetPlatforms: [Platform.X, Platform.Instagram],
  tone: Tone.Professional,
  hashtags: ['#ai', '#tech']
}, userId);

optimizations.forEach(opt => {
  console.log(`${opt.platform}: ${opt.text}`);
  console.log(`Engagement: ${opt.engagement.score}%`);
});
```

### Przykład 3: A/B Testing
```typescript
import { generateABTestVariants } from './services/multiPlatformService';

const variants = await generateABTestVariants(
  "Original post text",
  Platform.LinkedIn,
  Tone.Professional,
  userId
);

console.log("Variant A:", variants.variantA);
console.log("Variant B:", variants.variantB);
```

---

## 📊 Analytics & Scoring

### Engagement Score Formula:
```typescript
Base Score: 50 points

+ Character optimization (0-15 pts)
+ Hashtag optimization (0-10 pts)
+ Has question (8 pts)
+ Has emoji (7 pts)
+ Has CTA (10 pts)
+ Line breaks (0-5 pts)

Final: 0-100%
```

### Score Interpretation:
- **80-100%**: Doskonały potencjał virala
- **60-79%**: Dobry engagement spodziewany
- **40-59%**: Średni, wymaga poprawek
- **0-39%**: Wymaga znacznej optymalizacji

---

## 🔮 Przyszłe Rozszerzenia

### W przygotowaniu:
- [ ] Prawdziwa integracja z Veo 2 API (obecnie mock)
- [ ] Export wideo w różnych formatach
- [ ] Automatyczne dodawanie napisów do wideo
- [ ] Harmonogram publikacji dla wszystkich platform
- [ ] Tracking rzeczywistego engagement'u
- [ ] Machine learning na podstawie historii performance

---

## 🐛 Troubleshooting

### Problem: Video nie generuje się
**Rozwiązanie**: Obecnie używamy mock API. W produkcji należy podłączyć prawdziwe Veo 2 API.

### Problem: Optymalizacja trwa zbyt długo
**Rozwiązanie**: Backend używa AI - może trwać 10-30 sekund. Rozważ caching częstych optymalizacji.

### Problem: Błąd "API Key Invalid"
**Rozwiązanie**: Sprawdź `GEMINI_API_KEY` w pliku `.env`.

---

## 📝 Licencja
MIT License - możesz swobodnie używać w komercyjnych projektach.

## 🤝 Wsparcie
Pytania? Issues? Otwórz issue na GitHubie!

---

**Stworzono z ❤️ przy użyciu Google Gemini 2.0 & Veo 2**
