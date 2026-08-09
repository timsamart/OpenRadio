import { useEffect, useRef } from 'react';

/**
 * The tuning ritual.
 *
 * Rory Sutherland's point, made a dozen ways (Eurostar mirrors, elevator
 * mirrors, Uber's moving-car map): people rarely mind waiting, they mind
 * waiting for no visible reason. A silent spinner reads as "the app might be
 * broken." A sweeping dial reads as "the radio is doing exactly what a radio
 * has always done — finding the station." The wait itself is unchanged:
 * audio.play() has already fired (engine.ts), and this only ever appears
 * after the existing 400ms delay, same as the plain "Connecting…" text it
 * sits beside. It's the same wait, given back its native ritual.
 */
export function TuningDial({ active }: { active: boolean }) {
  const fired = useRef(false);

  useEffect(() => {
    if (active && !fired.current) {
      fired.current = true;
      try {
        // A soft double-tick, like a hand finding a station on an analog
        // dial. Unsupported on iOS Safari — that's a silent no-op, not a bug.
        navigator.vibrate?.([8, 40, 8]);
      } catch {
        /* Vibration API unavailable — silence is a fine fallback. */
      }
    }
    if (!active) fired.current = false;
  }, [active]);

  if (!active) return null;

  return (
    <span className="tuning" aria-hidden="true">
      <span className="tuning__track">
        {Array.from({ length: 13 }, (_, i) => (
          <span key={i} className={`tuning__tick${i % 4 === 0 ? ' is-major' : ''}`} />
        ))}
      </span>
      <span className="tuning__needle" />
    </span>
  );
}
