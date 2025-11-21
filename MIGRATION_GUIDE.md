# 🔄 Migration Guide - Przewodnik Migracji

Przewodnik jak stopniowo migrować istniejące komponenty do nowego design system.

## 📋 Spis Treści
1. [Przyciski](#przyciski)
2. [Karty](#karty)
3. [Formularze](#formularze)
4. [Animacje](#animacje)
5. [Layout](#layout)

---

## 🔘 Przyciski

### PRZED (Stary sposób)
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  Kliknij
</button>
```

### PO (Nowy sposób)
```tsx
import { ModernButton } from './components/ui';

<ModernButton variant="primary" size="md">
  Kliknij
</ModernButton>
```

### Mapowanie wariantów
| Stary | Nowy |
|-------|------|
| `bg-blue-600` | `variant="primary"` |
| `bg-slate-200` | `variant="secondary"` |
| `border` | `variant="outline"` |
| `bg-transparent` | `variant="ghost"` |
| `bg-gradient-to-r from-purple-500 to-blue-500` | `variant="gradient"` |

### Z ikoną
```tsx
// PRZED
<button className="flex items-center gap-2 ...">
  <SparklesIcon className="w-5 h-5" />
  Tekst
</button>

// PO
<ModernButton 
  variant="gradient" 
  icon={<SparklesIcon className="w-5 h-5" />}
>
  Tekst
</ModernButton>
```

### Loading state
```tsx
// PRZED
<button disabled={isLoading}>
  {isLoading ? <Spinner /> : 'Zapisz'}
</button>

// PO
<ModernButton loading={isLoading}>
  Zapisz
</ModernButton>
```

---

## 🎴 Karty

### PRZED
```tsx
<div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition">
  Treść
</div>
```

### PO
```tsx
import { ModernCard } from './components/ui';

<ModernCard hover padding="lg">
  Treść
</ModernCard>
```

### Z Glassmorphism
```tsx
// PRZED (musisz ręcznie)
<div className="bg-white/70 backdrop-blur-lg p-6 rounded-xl border border-white/30">
  Treść
</div>

// PO (automatyczne)
<ModernCard glass padding="lg">
  Treść
</ModernCard>
```

### Interaktywna karta
```tsx
<ModernCard 
  hover 
  onClick={() => console.log('Clicked')}
  className="cursor-pointer"
>
  Klikalna karta
</ModernCard>
```

---

## 📝 Formularze

### PRZED
```tsx
<div>
  <label className="block text-sm font-medium mb-2">Email</label>
  <input
    type="email"
    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
    placeholder="twoj@email.com"
  />
</div>
```

### PO
```tsx
import { ModernInput } from './components/ui';

<ModernInput
  label="Email"
  type="email"
  placeholder="twoj@email.com"
  fullWidth
/>
```

### Z ikoną
```tsx
<ModernInput
  label="Email"
  type="email"
  icon={<MailIcon className="w-5 h-5" />}
  placeholder="twoj@email.com"
/>
```

### Z walidacją
```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

<ModernInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={error}
  fullWidth
/>
```

---

## ✨ Animacje

### Dodaj animacje do istniejących komponentów

#### Fade In
```tsx
// PRZED
<div className="...">Treść</div>

// PO
<div className="animate-fade-in ...">Treść</div>
```

#### Slide In (z kierunkami)
```tsx
<div className="animate-slide-in-left">Z lewej</div>
<div className="animate-slide-in-right">Z prawej</div>
<div className="animate-fade-in-down">Z góry</div>
<div className="animate-fade-in-up">Z dołu</div>
```

#### Float (dla badge'y, ikony)
```tsx
<div className="animate-float">
  <SparklesIcon className="w-8 h-8" />
</div>
```

#### Staggered Animation (lista)
```tsx
{items.map((item, i) => (
  <div 
    key={i}
    className="animate-scale-in"
    style={{ animationDelay: `${i * 100}ms` }}
  >
    {item}
  </div>
))}
```

### Hover Effects

#### Card Hover
```tsx
// PRZED
<div className="transition-transform hover:scale-105">
  Karta
</div>

// PO
<div className="card-hover">
  Karta
</div>
```

---

## 🎨 Stylowanie

### Gradient Text
```tsx
// PRZED
<h1 className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500">
  Tytuł
</h1>

// PO
<h1 className="gradient-text">
  Tytuł
</h1>
```

### Glassmorphism
```tsx
// PRZED
<div className="bg-white/70 backdrop-blur-lg border border-white/30">
  Treść
</div>

// PO
<div className="glass">
  Treść
</div>
```

### Shimmer Effect (loading)
```tsx
<div className="h-4 bg-slate-200 rounded shimmer" />
```

---

## 📐 Layout

### Container z padding
```tsx
// PRZED
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  Treść
</div>

// PO (bez zmian, ale dodaj animacje)
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
  Treść
</div>
```

### Grid z animacjami
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {items.map((item, i) => (
    <ModernCard 
      key={i}
      glass
      hover
      className="animate-scale-in"
      style={{ animationDelay: `${i * 100}ms` }}
    >
      {item.content}
    </ModernCard>
  ))}
</div>
```

---

## 🔧 Tips & Best Practices

### 1. **Stopniowa Migracja**
Nie musisz wszystkiego zmieniać od razu:
```tsx
// Krok 1: Zamień najbardziej używane buttony
<ModernButton>...</ModernButton>

// Krok 2: Dodaj animacje do hero
<div className="animate-fade-in-down">...</div>

// Krok 3: Glassmorphism dla modali
<ModernCard glass>...</ModernCard>

// Krok 4: Reszta komponentów
```

### 2. **Kombinuj stare i nowe**
Możesz używać nowych komponentów razem ze starymi:
```tsx
<div className="bg-white p-4 rounded-xl">
  <ModernButton variant="gradient">
    Nowy przycisk w starym containerze
  </ModernButton>
</div>
```

### 3. **Dodaj className dla customizacji**
```tsx
<ModernButton 
  variant="primary"
  className="mt-4 w-full"
>
  Custom styling
</ModernButton>
```

### 4. **Wykorzystaj animacje selektywnie**
Nie wszystko musi być animowane:
- ✅ Hero sections
- ✅ Cards on page load
- ✅ Modals & drawers
- ✅ Success states
- ❌ Menu items
- ❌ Repeated elements
- ❌ Background elements

---

## 📝 Checklist Migracji Komponent

```
[ ] Zamień <button> → <ModernButton>
[ ] Zamień <div className="card"> → <ModernCard>
[ ] Zamień <input> → <ModernInput>
[ ] Dodaj animacje do nowych sekcji
[ ] Użyj .glass dla modali
[ ] Dodaj gradient-text do nagłówków
[ ] Użyj card-hover dla interaktywnych kart
[ ] Test na mobile
[ ] Test dark mode
[ ] Performance check
```

---

## 🎯 Priorytet Migracji

### High Priority (Największy impact)
1. Główne CTA buttons → `ModernButton variant="gradient"`
2. Hero section → animacje + gradient text
3. Modals → `ModernCard glass`
4. Bottom navigation → glassmorphism

### Medium Priority
1. Dashboard cards → `ModernCard hover`
2. Forms → `ModernInput`
3. List items → staggered animations

### Low Priority (Nice to have)
1. Icon badges
2. Tooltips
3. Secondary buttons

---

## 💡 Przykłady Before/After

### Dashboard Card
```tsx
// PRZED
<div className="bg-white dark:bg-slate-800 p-6 rounded-xl border">
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 bg-blue-600 rounded-lg">
      <Icon />
    </div>
    <div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </div>
</div>

// PO
<ModernCard glass hover className="animate-scale-in">
  <div className="flex items-center gap-4">
    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg">
      <Icon className="w-7 h-7 text-white" />
    </div>
    <div>
      <p className="text-4xl font-bold gradient-text">{value}</p>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  </div>
</ModernCard>
```

### Form Submit Button
```tsx
// PRZED
<button
  disabled={isLoading}
  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
>
  {isLoading ? 'Wysyłanie...' : 'Wyślij'}
</button>

// PO
<ModernButton
  variant="gradient"
  size="lg"
  loading={isLoading}
  fullWidth
  icon={<SparklesIcon className="w-5 h-5" />}
>
  Wyślij
</ModernButton>
```

---

**Pytania?** Sprawdź:
- `DESIGN_SYSTEM.md` - Pełna dokumentacja
- `UI_EXAMPLES.tsx` - Gotowe przykłady
- `components/ui/` - Kod źródłowy komponentów
