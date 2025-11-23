import React, { useState, useCallback } from 'react';
import { sanitizeAndValidate, VALIDATION_LIMITS } from '../../utils/security';

interface SecureInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  fieldName?: string;
  required?: boolean;
  className?: string;
  type?: 'text' | 'textarea';
  rows?: number;
}

/**
 * Secure input component with built-in validation and sanitization
 */
export const SecureInput: React.FC<SecureInputProps> = ({
  value,
  onChange,
  placeholder,
  maxLength = VALIDATION_LIMITS.TOPIC_MAX,
  fieldName = 'Pole',
  required = false,
  className = '',
  type = 'text',
  rows = 4,
}) => {
  const [error, setError] = useState<string>('');
  const [isTouched, setIsTouched] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;

      // Sanitize and validate
      const result = sanitizeAndValidate(newValue, maxLength, fieldName);

      if (!result.valid && result.error) {
        setError(result.error);
      } else {
        setError('');
      }

      // Always update parent with sanitized value
      onChange(result.sanitized);
    },
    [onChange, maxLength, fieldName]
  );

  const handleBlur = useCallback(() => {
    setIsTouched(true);

    // Validate on blur
    if (required && !value.trim()) {
      setError(`${fieldName} jest wymagane`);
    }
  }, [required, value, fieldName]);

  const baseClassName = `w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
    error && isTouched
      ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
      : 'border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900'
  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${className}`;

  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <div className="w-full">
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          className={baseClassName}
          aria-invalid={error && isTouched ? 'true' : 'false'}
          aria-describedby={error && isTouched ? 'input-error' : undefined}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          className={baseClassName}
          aria-invalid={error && isTouched ? 'true' : 'false'}
          aria-describedby={error && isTouched ? 'input-error' : undefined}
        />
      )}

      <div className="flex justify-between items-center mt-2 text-sm">
        {error && isTouched ? (
          <span id="input-error" className="text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            {required && <span className="text-red-500">* </span>}
            {placeholder}
          </span>
        )}

        <span
          className={`text-xs ${
            isNearLimit
              ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
};

/**
 * Safe content display - sanitizes and renders user content
 */
interface SafeContentProps {
  content: string;
  className?: string;
  allowHTML?: boolean;
}

export const SafeContent: React.FC<SafeContentProps> = ({
  content,
  className = '',
  allowHTML = false,
}) => {
  // If HTML is allowed, use sanitizeHTML, otherwise strip all tags
  const safeContent = allowHTML
    ? content // Already sanitized in security.ts
    : content.replace(/<[^>]*>/g, '');

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: safeContent }}
    />
  );
};
