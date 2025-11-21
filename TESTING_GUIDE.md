# 🧪 Przewodnik Testowania Nowych Funkcji

## Szybki Start

### 1. Uruchom projekt
```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend
npm install
npm run dev
```

### 2. Otwórz aplikację
```
http://localhost:3000
```

---

## ✅ Test 1: AI Video Stories

### Kroki:
1. Zaloguj się do aplikacji
2. Przejdź do **Generator**
3. Wygeneruj dowolny post (np. temat: "AI w marketingu")
4. Po wygenerowaniu, kliknij przycisk **"Video Story"** (fioletowy z ikoną filmu)
5. W modalu wybierz styl (np. "Instagram Story")
6. Kliknij **"Generuj Video"**
7. Sprawdź pasek postępu
8. Po wygenerowaniu sprawdź preview wideo
9. Przetestuj przyciski "Pobierz" i "Udostępnij"

### Oczekiwany rezultat:
✅ Modal otwiera się płynnie
✅ Wszystkie 5 stylów są widoczne i klikalne
✅ Przycisk "Generuj" jest aktywny po wyborze stylu
✅ Progress bar pokazuje postęp (0-100%)
✅ Video pojawia się po ~30 sekundach
✅ Controls video działają (play/pause)

### Przypadki błędów do sprawdzenia:
- Kliknięcie "Generuj" bez wybranego stylu → Przycisk disabled
- Zamknięcie modala podczas generowania → Proces się przerywa
- Ponowne otwarcie modala → Stan się resetuje

---

## ✅ Test 2: Multi-Platform Optimizer

### Kroki:
1. Wygeneruj post (jak w Test 1)
2. Przewiń w dół poniżej ResultCard
3. Zobacz sekcję **"Multi-Platform Optimizer"**
4. Zaznacz kilka platform (np. X, LinkedIn, Instagram)
5. Kliknij **"Optymalizuj dla 3 platform"**
6. Poczekaj na rezultaty
7. Rozwiń każdą platformę (kliknij strzałkę w dół)
8. Sprawdź:
   - Zoptymalizowany tekst
   - Hashtagi
   - Wskazówki
   - Prognozę engagement
9. Kliknij "Kopiuj" przy jednej z platform
10. Sprawdź schowek (Ctrl+V gdziekolwiek)

### Oczekiwany rezultat:
✅ Sekcja pojawia się TYLKO gdy post jest wygenerowany
✅ Można zaznaczyć/odznaczyć platformy
✅ Przycisk "Zaznacz wszystkie" działa
✅ Optymalizacja trwa 10-30 sekund
✅ Każda platforma ma unikalny tekst i hashtagi
✅ Engagement score: 0-100%
✅ Progress bar (zielony/żółty/czerwony) odpowiada % znaków
✅ Kopiowanie działa, pokazuje ✓ na 2 sekundy

### Test długości tekstu:
- X: Tekst powinien być ≤280 znaków
- LinkedIn: 1000-2000 znaków (optymalne)
- Instagram: 500-1500 znaków (optymalne)

---

## ✅ Test 3: A/B Testing (Backend)

### Test API bezpośrednio:
```bash
curl -X POST http://localhost:3001/api/generate-ab-variants \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "originalText": "Sztuczna inteligencja rewolucjonizuje marketing",
    "platform": "LinkedIn",
    "tone": "Professional"
  }'
```

### Oczekiwany rezultat:
```json
{
  "variantA": "...emocjonalny wariant...",
  "variantB": "...faktyczny wariant z CTA..."
}
```

---

## 🔍 Test Integracyjny

### Scenariusz: Pełny workflow
1. Wygeneruj post dla LinkedIn (temat: "Przyszłość AI")
2. Otwórz Video Story Modal
3. Wybierz "Kinetic Typography"
4. Wygeneruj video
5. Zamknij modal
6. Przewiń do Multi-Platform Optimizer
7. Wybierz: X, Instagram, Facebook
8. Optymalizuj
9. Skopiuj wersję dla X
10. Dodaj post do ulubionych (przycisk ⭐)
11. Zaplanuj publikację (przycisk 📅)

### Oczekiwany rezultat:
✅ Wszystkie kroki działają bez błędów
✅ Stan UI jest konsystentny
✅ Dane nie gubią się między akcjami
✅ Toast notifications pokazują sukces/błąd
✅ Performance jest płynne (<2s response time)

---

## 📊 Metryki do Sprawdzenia

### Performance:
- [ ] Video Story Modal otwiera się <500ms
- [ ] Multi-Platform Optimizer renderuje <300ms
- [ ] Optymalizacja 3 platform: 15-30 sekund
- [ ] Generowanie video (mock): 5-10 sekund

### UI/UX:
- [ ] Responsive design (sprawdź mobile/tablet)
- [ ] Dark mode działa poprawnie
- [ ] Animacje są płynne (60fps)
- [ ] Przyciski mają hover states
- [ ] Loading states są widoczne

### Backend:
- [ ] Wszystkie endpointy zwracają 200 OK
- [ ] Błędy są obsługiwane (500 → error message)
- [ ] Logi w konsoli są czytelne
- [ ] CORS działa poprawnie

---

## 🐛 Known Issues (do poprawienia w przyszłości)

1. **Video Generation**: Używa mock URL - należy podłączyć prawdziwe Veo 2 API
2. **Rate Limiting**: Brak ograniczeń na requests - może być problem z kosztami API
3. **Caching**: Brak cachingu optymalizacji - za każdym razem nowe API call
4. **Error Recovery**: Jeśli API się wywali w trakcie, trzeba odświeżyć stronę

---

## 📝 Checklist przed Deployem

- [ ] Wszystkie testy przechodzą
- [ ] Nie ma błędów w konsoli przeglądarki
- [ ] Nie ma błędów w konsoli backendu
- [ ] TypeScript kompiluje się bez błędów: `npm run build`
- [ ] Variables środowiskowe są ustawione
- [ ] README.md jest zaktualizowane
- [ ] Git commit z opisem zmian
- [ ] Pull Request review (jeśli team)

---

## 🎉 Gotowe!

Jeśli wszystkie testy przeszły - funkcje działają poprawnie! 🚀

Pytania? Sprawdź:
- `FEATURES.md` - Szczegółowa dokumentacja
- `README.md` - Setup guide
- Issues na GitHub

**Happy Testing! 🧪✨**
