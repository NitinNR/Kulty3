import { useEffect, useRef } from 'react';

const GOLD = '#f59e0b';
const BORDER = 'rgba(255,255,255,0.08)';
const BORDER_FILLED = 'rgba(245,158,11,0.4)';
const BORDER_FOCUS = 'rgba(245,158,11,0.6)';

/**
 * A row of single-digit boxes for entering an OTP. Supports auto-advance,
 * backspace navigation, arrow keys, and pasting a full code.
 *
 * @param {object} props
 * @param {string} props.value          current OTP string
 * @param {number} [props.length]       number of digits (default 6)
 * @param {(v: string) => void} props.onChange
 * @param {(v: string) => void} [props.onComplete]  called with the code when all digits are filled
 * @param {boolean} [props.disabled]
 */
export const OtpInput = ({ value = '', length = 6, onChange, onComplete, disabled = false }) => {
  const refs = useRef([]);
  const digits = value.split('');

  useEffect(() => {
    if (!disabled) refs.current[0]?.focus();
  }, [disabled]);

  const commit = (next) => {
    const joined = next.join('').slice(0, length);
    onChange?.(joined);
    return joined;
  };

  const maybeComplete = (joined) => {
    if (joined.length === length && onComplete) onComplete(joined);
  };

  const handleChange = (idx, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const next = value.split('');
    next[idx] = digit;
    const joined = commit(next);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
    maybeComplete(joined);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = value.split('');
      if (next[idx]) {
        next[idx] = '';
        commit(next);
      } else if (idx > 0) {
        next[idx - 1] = '';
        commit(next);
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (idx, e) => {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const next = value.split('');
    for (let i = 0; i < text.length && idx + i < length; i += 1) {
      next[idx + i] = text[i];
    }
    const joined = commit(next);
    refs.current[Math.min(idx + text.length, length - 1)]?.focus();
    maybeComplete(joined);
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => {
            e.target.select();
            e.currentTarget.style.borderColor = BORDER_FOCUS;
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = digits[i] ? BORDER_FILLED : BORDER;
            e.currentTarget.style.boxShadow = 'none';
          }}
          className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl outline-none transition disabled:opacity-50"
          style={{
            backgroundColor: '#1c1c1c',
            border: `1.5px solid ${digits[i] ? BORDER_FILLED : BORDER}`,
            color: 'rgba(255,255,255,0.92)',
            caretColor: GOLD,
          }}
        />
      ))}
    </div>
  );
};
