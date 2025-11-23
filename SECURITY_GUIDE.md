# 🔐 Security Guide

## Implemented Security Measures

### 1. XSS Protection

#### DOMPurify Integration
```typescript
import { sanitizeHTML, sanitizeText } from '../utils/security';

// Sanitize user HTML
const safeHTML = sanitizeHTML(userInput);

// Strip all HTML tags
const plainText = sanitizeText(userInput);
```

#### Safe Content Rendering
```tsx
import { SafeContent } from '../components/ui/SecureInput';

// Safely render user content
<SafeContent content={userGeneratedText} />
```

### 2. Input Validation

#### Validation Limits
```typescript
export const VALIDATION_LIMITS = {
  TOPIC_MIN: 3,
  TOPIC_MAX: 200,
  KEYWORDS_MAX: 100,
  HASHTAG_MAX: 30,
  BRAND_NAME_MAX: 50,
  BRAND_DESCRIPTION_MAX: 500,
  POST_TEXT_MAX: 5000,
  COMMENT_MAX: 1000,
};
```

#### Validate User Input
```typescript
import { validateTopic, validateKeywords, sanitizeAndValidate } from '../utils/security';

// Validate topic
const topicResult = validateTopic(userTopic);
if (!topicResult.valid) {
  showError(topicResult.error);
  return;
}

// Sanitize and validate any input
const result = sanitizeAndValidate(input, 200, 'Topic');
if (!result.valid) {
  showError(result.error);
  return;
}
```

#### Secure Input Component
```tsx
import { SecureInput } from '../components/ui/SecureInput';

<SecureInput
  value={topic}
  onChange={setTopic}
  placeholder="Enter topic..."
  maxLength={200}
  fieldName="Topic"
  required
  type="textarea"
/>
```

### 3. Rate Limiting (Frontend)

#### useRateLimiter Hook
```typescript
import { useRateLimiter } from '../hooks/useRateLimiter';

const rateLimiter = useRateLimiter(
  5,      // maxCalls
  60000,  // windowMs (1 minute)
  2000    // cooldownMs (2 seconds)
);

const handleGenerate = async () => {
  // Check rate limit
  if (!rateLimiter.canProceed()) {
    return; // Shows warning toast automatically
  }

  rateLimiter.recordCall();
  
  // Proceed with API call
  await generateContent();
};
```

#### Execute with Rate Limiting
```typescript
const handleAction = async () => {
  const result = await rateLimiter.execute(async () => {
    return await apiCall();
  });
  
  if (result === null) {
    // Rate limited
    return;
  }
  
  // Process result
};
```

#### Debounce & Throttle
```typescript
import { useDebounce, useThrottle } from '../hooks/useRateLimiter';

// Debounce (wait for user to stop typing)
const debouncedSearch = useDebounce((query) => {
  performSearch(query);
}, 500);

// Throttle (limit execution rate)
const throttledSave = useThrottle((data) => {
  saveData(data);
}, 1000);
```

### 4. Content Security Policy (CSP)

Added to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com ...;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  connect-src 'self' https://*.supabase.co https://*.railway.app ...;
  frame-src 'none';
  object-src 'none';
">
```

### 5. Suspicious Pattern Detection

Automatically detects and blocks:
- `<script>` tags
- `javascript:` URLs
- Event handlers (`onclick=`, `onerror=`, etc.)
- `eval()` and `expression()`
- `<iframe>`, `<object>`, `<embed>`
- SQL injection patterns (`;--`, `DROP`, `UNION SELECT`)

## Best Practices

### Always Validate User Input
```typescript
// ❌ BAD
const saveData = (input: string) => {
  api.save({ text: input }); // No validation!
};

// ✅ GOOD
const saveData = (input: string) => {
  const result = sanitizeAndValidate(input, 500, 'Data');
  if (!result.valid) {
    showError(result.error);
    return;
  }
  api.save({ text: result.sanitized });
};
```

### Never Trust User Input
```typescript
// ❌ BAD
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ GOOD
<SafeContent content={userContent} />
// or
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userContent) }} />
```

### Rate Limit All Actions
```typescript
// ❌ BAD
<button onClick={handleGenerate}>Generate</button>

// ✅ GOOD
const rateLimiter = useRateLimiter();

<button 
  onClick={() => rateLimiter.execute(handleGenerate)}
  disabled={rateLimiter.isLimited}
>
  Generate
</button>
```

### Validate on Both Client and Server
```typescript
// Client-side validation (UX)
const clientValidation = validateTopic(topic);
if (!clientValidation.valid) {
  showError(clientValidation.error);
  return;
}

// Server-side validation (Security)
// Backend MUST also validate all inputs!
```

## Security Checklist

- [x] XSS Protection (DOMPurify)
- [x] Input Validation (lengths, patterns)
- [x] Output Sanitization
- [x] Rate Limiting (frontend)
- [x] Content Security Policy
- [x] Suspicious Pattern Detection
- [x] SQL Injection Prevention
- [x] Secure Input Components
- [x] Safe Content Rendering
- [ ] Backend Rate Limiting (already implemented)
- [ ] CSRF Protection (Supabase handles this)
- [ ] SQL Injection Prevention (Supabase ORM safe)

## Testing Security

### Test XSS Protection
```typescript
// Try these inputs - they should be sanitized
const xssAttempts = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  'javascript:alert(1)',
  '<iframe src="evil.com"></iframe>',
];

xssAttempts.forEach(attempt => {
  const safe = sanitizeHTML(attempt);
  console.log('Input:', attempt);
  console.log('Sanitized:', safe);
  // Should be empty or stripped of dangerous content
});
```

### Test Rate Limiting
```typescript
// Rapidly click button - should show warning after 5 clicks
for (let i = 0; i < 10; i++) {
  handleGenerate();
}
// Expected: First 5 succeed, rest show "Limit osiągnięty"
```

## Reporting Security Issues

If you find a security vulnerability:
1. **DO NOT** create a public GitHub issue
2. Contact the security team privately
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
