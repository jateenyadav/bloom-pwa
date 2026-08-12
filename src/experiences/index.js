/**
 * The experience pool — the single registry the rotation engine reads.
 *
 * To add an experience: build the component, then add one entry here. Nothing else
 * needs to change.
 *
 *   id        stable string; persisted in localStorage, so don't rename casually
 *   type      loose category, for future filtering
 *   component the React component to render
 *   weight    >0. Biases position within a cycle; for `special` entries it's also
 *             the probability of being admitted to a cycle at all (0.25 ≈ 1 in 4)
 *   tags      'common' | 'special' | 'birthday' (+ any descriptive tags you like).
 *             'birthday' entries never appear in the normal rotation.
 *   title     short label shown in the app header
 */
import ComplimentSlotMachine from './ComplimentSlotMachine.jsx'
import GratitudePrompt from './GratitudePrompt.jsx'
import DoodlePad from './DoodlePad.jsx'
import MemoryWall from './MemoryWall.jsx'

export const experiencePool = [
  {
    id: 'compliment-slot-machine',
    type: 'game',
    component: ComplimentSlotMachine,
    weight: 1.2,
    tags: ['common', 'words'],
    title: 'A reminder',
  },
  {
    id: 'gratitude-prompt',
    type: 'reflection',
    component: GratitudePrompt,
    weight: 1,
    tags: ['common', 'writing'],
    title: 'One small thing',
  },
  {
    id: 'doodle-pad',
    type: 'toy',
    component: DoodlePad,
    weight: 1,
    tags: ['common', 'play'],
    title: 'Doodle pad',
  },
  {
    id: 'memory-wall',
    type: 'gallery',
    component: MemoryWall,
    weight: 0.9,
    tags: ['common', 'memory'],
    title: 'Memory wall',
  },
]

export default experiencePool
