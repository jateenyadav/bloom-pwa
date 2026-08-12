/**
 * App shell.
 *
 * A living cartoon world, a companion character, today's experience from the
 * rotation engine, and the always-present Calm Toolkit button.
 *
 * The Calm Toolkit is mounted here at the root — outside the experience subtree —
 * so it is reachable in one tap no matter which experience is on screen or what
 * that experience is doing.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import CalmToolkit from './components/calm/CalmToolkit.jsx'
import Companion from './components/Companion.jsx'
import WorldBackground from './components/world/WorldBackground.jsx'
import { useDailyExperience } from './hooks/useDailyExperience.js'
import { usePetName } from './hooks/usePetName.js'
import { capitalize } from './engine/petNames.js'
import { config, isPersonalized } from './config/index.js'

function timeGreeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Morning!'
  if (hour < 17) return 'Afternoon!'
  if (hour < 22) return 'Evening!'
  return 'Late one!'
}

/** Playful line under the greeting, so the header isn't the same every open. */
const TEASERS = [
  "here's something small for today",
  'i picked this one just for you',
  'ooh, this one is fun',
  'something new today!',
  'fresh out of the ground',
]

export default function App() {
  const reduceMotion = useReducedMotion()
  const { experience, isBirthday } = useDailyExperience()
  const petName = usePetName()

  const Experience = experience?.component
  // Tie the teaser to the experience id so it's stable for this visit.
  const teaser = TEASERS[(experience?.id?.length ?? 0) % TEASERS.length]

  return (
    <div className="relative flex min-h-full flex-col">
      <WorldBackground />

      <header className="px-6 pt-6">
        <motion.div
          className="mx-auto flex w-full max-w-md flex-col items-center"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <Companion petName={petName} />

          {/*
            The greeting is split in two lines so the pet name can be the star: the
            time-of-day line is small and steady, the nickname lands big and bouncy.
            A different name every open is the whole point of the feature, so it gets
            the visual weight.
          */}
          <motion.p
            className="mt-1 font-display text-lg font-bold text-ink-soft"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {config.greeting || timeGreeting()}
          </motion.p>

          <motion.h1
            className="font-display text-5xl font-extrabold text-ink"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 340, damping: 12, delay: 0.22 }}
          >
            {petName ? (
              <>
                {capitalize(petName)}
                {/* The heart pops in after the name settles. */}
                <motion.span
                  className="ml-1 inline-block"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                  animate={
                    reduceMotion
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 1, scale: [0, 1.4, 1] }
                  }
                  transition={{ delay: 0.55, duration: reduceMotion ? 0 : 0.45 }}
                  aria-hidden
                >
                  💛
                </motion.span>
              </>
            ) : (
              config.personName
            )}
          </motion.h1>

          <motion.p
            className="mt-1 text-sm font-semibold text-ink-soft"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isBirthday
              ? // Phase 2 replaces this with the full Birthday Mode sequence.
                '🎂 something tells me today is a special one'
              : teaser}
          </motion.p>
        </motion.div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pb-32 pt-6">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {Experience ? (
              <motion.section
                key={experience.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
                aria-label={experience.title}
              >
                <Experience />
              </motion.section>
            ) : (
              <p className="text-center text-sm text-ink-soft">
                No experiences are registered yet.
              </p>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* First-run hint for someone who just forked the repo. Never shown once
          a personal.json exists, so the real user never sees setup chatter. */}
      {!isPersonalized && (
        <motion.p
          className="mx-auto max-w-[17rem] px-6 pb-8 text-center text-[0.7rem] leading-relaxed text-ink-soft/70 sm:max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          Running on placeholder content — copy{' '}
          <code className="text-[0.68rem]">src/config/personal.example.json</code> to{' '}
          <code className="text-[0.68rem]">personal.json</code> to make it yours.
        </motion.p>
      )}

      <CalmToolkit />
    </div>
  )
}
