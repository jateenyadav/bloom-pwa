/**
 * The living cartoon world behind the whole app.
 *
 * A single fixed, decorative SVG layer: sky gradient, drifting clouds, a sleepy
 * sun (or moon), rolling hills, and birds that fly past now and then. It reacts to
 * the actual time of day, so the app looks different in the morning than at night.
 *
 * Everything here is `aria-hidden` and pointer-events-none — it's scenery, never
 * content. All animation is skipped under prefers-reduced-motion.
 */
import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/** Sky palettes by time of day. */
const SKIES = {
  dawn: { top: '#ffd9c0', bottom: '#ffeede', sun: '#ffb37a', glow: '#ffd0a8', hills: ['#8fd39a', '#69bd80', '#4fa06a'] },
  day: { top: '#a8e0f7', bottom: '#e9f7fd', sun: '#ffd93d', glow: '#ffe9a8', hills: ['#8fd39a', '#69bd80', '#4fa06a'] },
  dusk: { top: '#f7b6c2', bottom: '#ffe4d6', sun: '#ff9a6c', glow: '#ffc4a0', hills: ['#7cbf94', '#5aa377', '#428a64'] },
  night: { top: '#2f3d6b', bottom: '#5b6ea8', sun: '#fdf6dc', glow: '#c9d6ff', hills: ['#3f6b5c', '#33574c', '#28453d'] },
}

export function skyForHour(hour) {
  if (hour < 6) return 'night'
  if (hour < 9) return 'dawn'
  if (hour < 17) return 'day'
  if (hour < 20) return 'dusk'
  return 'night'
}

/**
 * A fluffy cartoon cloud.
 *
 * Drawn as ONE outlined silhouette path rather than a pile of stroked ellipses:
 * overlapping stroked ellipses would show their internal edges, and a white cloud
 * with no outline disappears entirely against the pale sky wash.
 */
function Cloud({ scale = 1, opacity = 0.95 }) {
  return (
    <g opacity={opacity} transform={`scale(${scale})`}>
      <path
        d="M-34 12
           a13 13 0 0 1 1 -25
           a17 17 0 0 1 22 -13
           a15 15 0 0 1 26 4
           a14 14 0 0 1 21 15
           a12 12 0 0 1 -6 19 Z"
        fill="white"
        stroke="#3a3129"
        strokeWidth={2.6 / scale}
        strokeLinejoin="round"
      />
    </g>
  )
}

/**
 * A classic two-stroke cartoon bird.
 *
 * The flap is a scaleY squash on a static path, NOT an animated `d`: framer-motion
 * can't read an SVG path `d` attribute as a starting keyframe, so a `d` keyframe
 * array resolves its first frame to "undefined" and the browser rejects the path.
 */
function Bird({ delay = 0, reduceMotion }) {
  return (
    <motion.g
      initial={{ x: -60 }}
      animate={reduceMotion ? { x: 120 } : { x: 520 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 18, delay, repeat: Infinity, repeatDelay: 14, ease: 'linear' }
      }
    >
      <motion.g
        animate={reduceMotion ? undefined : { scaleY: [1, -0.55, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
        /* fill-box, not a px origin — see the note on Butterfly. */
        style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}
      >
        <path
          d="M0 0 Q6 -7 12 0 Q18 -7 24 0"
          stroke="#3a3129"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
      </motion.g>
    </motion.g>
  )
}

/**
 * A butterfly that loops a lazy figure-of-eight over the hills.
 *
 * Each wing flaps by squashing toward the body. That needs `transformBox: 'fill-box'`
 * with a keyword origin: inside an SVG, a px `transformOrigin` is resolved against
 * the viewBox origin, not the element, so the wings would scale around the top-left
 * of the whole scene and fly off their own body.
 */
function Butterfly({ delay = 0, hue = '#ff7fbf', reduceMotion }) {
  return (
    <motion.g
      animate={
        reduceMotion
          ? { x: 200, y: 0 }
          : { x: [40, 150, 250, 340, 40], y: [0, -26, 14, -18, 0] }
      }
      transition={
        reduceMotion ? { duration: 0 } : { duration: 26, delay, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      {[-1, 1].map((side) => (
        <motion.ellipse
          key={side}
          cx={side * 7}
          cy={0}
          rx="7"
          ry="9"
          fill={hue}
          stroke="#3a3129"
          strokeWidth="2"
          /* Flap bottoms out at 0.45, not near-zero: a wing that fully collapses
             reads as a sliver rather than a butterfly in most captured frames. */
          animate={reduceMotion ? undefined : { scaleX: [1, 0.45, 1] }}
          transition={{ duration: 0.62, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            transformBox: 'fill-box',
            transformOrigin: side === -1 ? 'right center' : 'left center',
          }}
        />
      ))}
      <ellipse cx="0" cy="0" rx="2" ry="7.5" fill="#3a3129" />
      {/* Antennae */}
      <path d="M-1 -7 q-3 -5 -5 -6" stroke="#3a3129" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M1 -7 q3 -5 5 -6" stroke="#3a3129" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </motion.g>
  )
}

/** Little tufts of grass and flowers along a hill ridge. */
function HillFlowers({ reduceMotion }) {
  const blooms = [
    { x: 34, y: 726, c: '#ff9aa8' },
    { x: 96, y: 712, c: '#ffc94d' },
    { x: 168, y: 742, c: '#a98cf0' },
    { x: 246, y: 752, c: '#ff7fbf' },
    { x: 318, y: 738, c: '#7cc4e8' },
    { x: 372, y: 722, c: '#ffc94d' },
  ]
  return (
    <g>
      {blooms.map((b, i) => (
        <motion.g
          key={i}
          animate={reduceMotion ? undefined : { rotate: [-5, 5, -5] }}
          transition={{ duration: 3.6 + (i % 3) * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
          style={{ transformOrigin: `${b.x}px ${b.y + 14}px` }}
        >
          <path
            d={`M${b.x} ${b.y + 14} L${b.x} ${b.y}`}
            stroke="#3f8a53"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx={b.x} cy={b.y} r="4.4" fill={b.c} stroke="#3a3129" strokeWidth="1.8" />
          <circle cx={b.x} cy={b.y} r="1.4" fill="#fff8e0" />
        </motion.g>
      ))}
    </g>
  )
}

export default function WorldBackground() {
  const reduceMotion = useReducedMotion()

  // Picked once per mount — the scene shouldn't reshuffle mid-session.
  const { sky, clouds } = useMemo(() => {
    const hour = new Date().getHours()
    return {
      sky: SKIES[skyForHour(hour)],
      // `from` staggers each cloud's starting x so the sky is populated immediately
      // and stays populated, instead of all three marching across in convoy and
      // leaving the sky empty between laps.
      clouds: [
        { y: 70, scale: 1, duration: 62, from: -80, opacity: 0.95 },
        { y: 132, scale: 0.72, duration: 84, from: 120, opacity: 0.85 },
        { y: 44, scale: 0.55, duration: 104, from: 300, opacity: 0.75 },
      ],
    }
  }, [])

  const isNight = sky === SKIES.night

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full"
        viewBox="0 0 400 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sky.top} />
            <stop offset="100%" stopColor={sky.bottom} />
          </linearGradient>
          <radialGradient id="sunGlow">
            <stop offset="0%" stopColor={sky.glow} stopOpacity="0.75" />
            <stop offset="100%" stopColor={sky.glow} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="400" height="800" fill="url(#sky)" />

        {/* Stars, night only */}
        {isNight &&
          Array.from({ length: 26 }).map((_, i) => {
            // Deterministic scatter — no Math.random, so it's stable across renders.
            const x = ((i * 97) % 380) + 10
            const y = ((i * 53) % 300) + 20
            const r = 1 + (i % 3) * 0.5
            return (
              <motion.circle
                key={i}
                cx={x}
                cy={y}
                r={r}
                fill="white"
                animate={reduceMotion ? { opacity: 0.8 } : { opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 2.5 + (i % 5) * 0.7, repeat: Infinity, delay: i * 0.2 }}
              />
            )
          })}

        {/* Sun / moon with a soft glow and a slow bob */}
        <motion.g
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle cx="312" cy="96" r="72" fill="url(#sunGlow)" />
          <circle cx="312" cy="96" r="30" fill={isNight ? '#fdf6dc' : sky.sun} stroke="#3a3129" strokeWidth="3" />
          {isNight ? (
            // Craters, so the moon reads as a moon.
            <>
              <circle cx="304" cy="88" r="6" fill="#e4dcc0" />
              <circle cx="320" cy="103" r="4.5" fill="#e4dcc0" />
              <circle cx="306" cy="106" r="3" fill="#e4dcc0" />
            </>
          ) : (
            // Sleepy sun face.
            <>
              <path d="M301 92 q4 -4 8 0" stroke="#3a3129" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <path d="M317 92 q4 -4 8 0" stroke="#3a3129" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <path d="M305 103 q7 6 14 0" stroke="#3a3129" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </>
          )}
        </motion.g>

        {/* Drifting clouds — each loops across the full width from its own offset. */}
        {clouds.map((cloud, i) => (
          <motion.g
            key={i}
            initial={{ x: cloud.from }}
            animate={reduceMotion ? { x: cloud.from } : { x: [cloud.from, 500, -90, cloud.from] }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: cloud.duration,
                    repeat: Infinity,
                    ease: 'linear',
                    // Wrap instantly at the edge instead of easing back visibly.
                    times: [0, (500 - cloud.from) / 590, (500 - cloud.from) / 590, 1],
                  }
            }
            style={{ y: cloud.y }}
          >
            <Cloud scale={cloud.scale} opacity={cloud.opacity} />
          </motion.g>
        ))}

        {/* Birds, high up */}
        <g transform="translate(0 190)">
          <Bird delay={3} reduceMotion={reduceMotion} />
        </g>
        <g transform="translate(0 215)">
          <Bird delay={5.5} reduceMotion={reduceMotion} />
        </g>

        {/* A balloon drifting slowly up and off the top. */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? { y: -200 } : { y: [820, -160] }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 46, repeat: Infinity, repeatDelay: 26, ease: 'linear' }
          }
        >
          <g transform="translate(64 0)">
            <path d="M0 0 q-3 8 0 14" stroke="#3a3129" strokeWidth="1.4" fill="none" />
            <path d="M0 -1 L-3 -6 L3 -6 Z" fill="#ffc94d" stroke="#3a3129" strokeWidth="1.4" />
            <ellipse cx="0" cy="-19" rx="13" ry="16" fill="#ff7fbf" stroke="#3a3129" strokeWidth="2.4" />
            <ellipse cx="-4.5" cy="-24" rx="3" ry="4.5" fill="#fff" opacity="0.55" />
          </g>
        </motion.g>

        {/* Rolling hills at the bottom — three layers for depth, each outlined so the
            ridge lines survive the readability wash. */}
        <g stroke="#3a3129" strokeWidth="3" strokeLinejoin="round">
          <path d="M-20 640 Q80 560 200 620 Q320 680 420 600 L420 820 L-20 820 Z" fill={sky.hills[0]} />
          <path d="M-20 700 Q110 630 230 690 Q330 740 420 675 L420 820 L-20 820 Z" fill={sky.hills[1]} />
          <path d="M-20 760 Q120 700 250 755 Q350 795 420 745 L420 820 L-20 820 Z" fill={sky.hills[2]} />
        </g>

        <HillFlowers reduceMotion={reduceMotion} />

        {/* Butterflies down among the hills, where the app's content doesn't sit
            on top of them. */}
        <g transform="translate(0 716)">
          <Butterfly delay={0} hue="#ff7fbf" reduceMotion={reduceMotion} />
        </g>
        <g transform="translate(0 776)">
          <Butterfly delay={9} hue="#ffc94d" reduceMotion={reduceMotion} />
        </g>
      </svg>

      {/*
       * Wash over the scenery so text on top stays readable.
       *
       * Kept light in daylight: the app's text is near-black ink on a pale sky, so a
       * heavy wash buys no legibility and just greys out the whole cartoon. Night
       * needs more, because a dark sky and dark text genuinely do fight.
       */}
      <div
        className="absolute inset-0"
        style={{
          background: isNight
            ? 'linear-gradient(to bottom, rgb(253 246 236 / 0.6), rgb(253 246 236 / 0.86))'
            : 'linear-gradient(to bottom, rgb(253 246 236 / 0.22), rgb(253 246 236 / 0.5))',
        }}
      />
    </div>
  )
}
