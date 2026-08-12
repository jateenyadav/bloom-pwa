/**
 * The experience pool — the single registry the rotation engine reads.
 *
 * To add an experience: build the component, then add one entry here. Nothing else
 * needs to change; the menu is generated from this list too.
 *
 *   id        stable string; persisted in localStorage, so don't rename casually
 *   type      loose category, for future filtering
 *   component the React component to render
 *   weight    >0. Biases position within a cycle; for `special` entries it's also
 *             the probability of being admitted to a cycle at all (0.25 ≈ 1 in 4)
 *   tags      'common' | 'special' | 'birthday' (+ any descriptive tags you like).
 *             'birthday' entries never appear in the normal rotation.
 *   title     short label shown in the app header
 *   glyph     emoji shown on the menu tile
 *   blurb     one line describing it, for the menu
 *   saves     optional. Names the store key this experience remembers, plus how to
 *             count and label it, so the menu can show what's saved without knowing
 *             anything about how the experience works. `count` receives the whole
 *             persisted state; `one` is the singular label ("1 wish", not "1 wishes").
 *             Two experiences may share a `key` — the menu's summary counts it once.
 */
import ComplimentSlotMachine from './ComplimentSlotMachine.jsx'
import GratitudePrompt from './GratitudePrompt.jsx'
import DoodlePad from './DoodlePad.jsx'
import MemoryWall from './MemoryWall.jsx'
import WishJar from './WishJar.jsx'
import MoodGarden from './MoodGarden.jsx'
import TimeCapsule from './TimeCapsule.jsx'
import FortuneCookie from './FortuneCookie.jsx'
import HugButton from './HugButton.jsx'
import BubbleWrap from './BubbleWrap.jsx'
import ScratchCard from './ScratchCard.jsx'
import StarCatcher from './StarCatcher.jsx'
import StickerBook from './StickerBook.jsx'
import { STICKERS } from './stickers.js'

export const experiencePool = [
  {
    id: 'compliment-slot-machine',
    type: 'game',
    component: ComplimentSlotMachine,
    weight: 1.2,
    tags: ['common', 'words'],
    title: 'A reminder',
    glyph: '🎰',
    blurb: 'Pull the lever for something true about you.',
  },
  {
    id: 'gratitude-prompt',
    type: 'reflection',
    component: GratitudePrompt,
    weight: 1,
    tags: ['common', 'writing'],
    title: 'One small thing',
    glyph: '🫙',
    blurb: 'One good thing about today, kept in a jar.',
    saves: { key: 'gratitude', label: 'good things', one: 'good thing', count: (state) => state.gratitude.length },
  },
  {
    id: 'doodle-pad',
    type: 'toy',
    component: DoodlePad,
    weight: 1,
    tags: ['common', 'play'],
    title: 'Doodle pad',
    glyph: '🖍️',
    blurb: 'Scribble with crayons and stamp stickers.',
  },
  {
    id: 'memory-wall',
    type: 'gallery',
    component: MemoryWall,
    weight: 0.9,
    tags: ['common', 'memory'],
    title: 'Memory wall',
    glyph: '📸',
    blurb: 'Your own photos, taped up like polaroids.',
    // Photos live in IndexedDB, not the zustand store, so the menu reads their
    // count asynchronously instead of through `count`.
    saves: { key: 'photos', label: 'photos', one: 'photo', async: true },
  },
  {
    id: 'wish-jar',
    type: 'reflection',
    component: WishJar,
    weight: 1,
    tags: ['common', 'writing'],
    title: 'Wish jar',
    glyph: '⭐️',
    blurb: 'Write a wish on a star and drop it in.',
    saves: { key: 'wishes', label: 'wishes', one: 'wish', count: (state) => state.wishes.length },
  },
  {
    id: 'mood-garden',
    type: 'reflection',
    component: MoodGarden,
    weight: 1.1,
    tags: ['common', 'memory'],
    title: 'Mood garden',
    glyph: '🌷',
    blurb: 'Plant how today feels. Every mood gets a flower.',
    saves: { key: 'moods', label: 'days planted', one: 'day planted', count: (state) => state.moods.length },
  },
  {
    id: 'time-capsule',
    type: 'reflection',
    component: TimeCapsule,
    weight: 0.85,
    tags: ['common', 'writing'],
    title: 'Time capsule',
    glyph: '💌',
    blurb: 'A note to yourself, sealed until later.',
    saves: { key: 'capsules', label: 'capsules sealed', one: 'capsule sealed', count: (state) => state.capsules.length },
  },
  {
    id: 'fortune-cookie',
    type: 'game',
    component: FortuneCookie,
    weight: 1,
    tags: ['common', 'words'],
    title: 'Fortune cookie',
    glyph: '🥠',
    blurb: 'Crack it open and see what it says.',
  },
  {
    id: 'hug-button',
    type: 'toy',
    component: HugButton,
    weight: 1,
    tags: ['common', 'comfort'],
    title: 'Need a hug?',
    glyph: '🤗',
    blurb: 'One big button. Press it and get squeezed.',
    saves: { key: 'hugs', label: 'hugs', one: 'hug', count: (state) => state.hugs },
  },
  {
    id: 'bubble-wrap',
    type: 'toy',
    component: BubbleWrap,
    weight: 1,
    tags: ['common', 'play'],
    title: 'Bubble wrap',
    glyph: '🫧',
    blurb: 'A whole sheet to pop. With the sound.',
    saves: { key: 'bubblesPopped', label: 'bubbles popped', one: 'bubble popped', count: (state) => state.bubblesPopped },
  },
  {
    id: 'scratch-card',
    type: 'game',
    component: ScratchCard,
    weight: 1,
    tags: ['common', 'words'],
    title: 'Scratch card',
    glyph: '🎟️',
    blurb: 'Scratch the foil off to find the message.',
  },
  {
    id: 'star-catcher',
    type: 'game',
    component: StarCatcher,
    weight: 1,
    tags: ['common', 'play'],
    title: 'Star catcher',
    glyph: '🌟',
    blurb: 'Catch falling stars. Nothing to lose.',
    saves: { key: 'stickers', label: 'stickers', one: 'sticker', count: (state) => state.stickers.length },
  },
  {
    id: 'sticker-book',
    type: 'gallery',
    component: StickerBook,
    // Lower weight: it's the payoff for Star Catcher, so it lands less often and
    // has more to show when it does.
    weight: 0.7,
    tags: ['common', 'memory'],
    title: 'Sticker book',
    glyph: '📖',
    blurb: 'Every sticker you have found so far.',
    saves: {
      key: 'stickers',
      label: `of ${STICKERS.length} found`,
      count: (state) => state.stickers.length,
    },
  },
]

export default experiencePool
