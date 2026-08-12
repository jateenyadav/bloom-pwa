/**
 * The sticker set.
 *
 * Its own module because two experiences share it: Star Catcher hands stickers out,
 * Sticker Book displays them. Only ids are persisted, so this list is free to gain
 * new entries — a saved id that no longer exists is simply skipped, and a new one
 * shows as not-yet-found.
 *
 * Glyphs rather than image files: nothing to load, nothing to precache, works
 * offline by construction.
 */
export const STICKERS = [
  { id: 'star', glyph: '⭐️', name: 'Lucky star', note: 'The first one always counts most.' },
  { id: 'rainbow', glyph: '🌈', name: 'Rainbow', note: 'Turned up after the rain, as they do.' },
  { id: 'butterfly', glyph: '🦋', name: 'Butterfly', note: 'Landed on you specifically.' },
  { id: 'strawberry', glyph: '🍓', name: 'Strawberry', note: 'The good kind, from the middle of the punnet.' },
  { id: 'moon', glyph: '🌙', name: 'Little moon', note: 'For the late nights.' },
  { id: 'sunflower', glyph: '🌻', name: 'Sunflower', note: 'Faces the light without being told.' },
  { id: 'cloud', glyph: '☁️', name: 'Soft cloud', note: 'Naps are a legitimate activity.' },
  { id: 'cake', glyph: '🍰', name: 'Slice of cake', note: 'No occasion needed.' },
  { id: 'chick', glyph: '🐣', name: 'Small bird', note: 'Brand new at everything, doing fine.' },
  { id: 'heart', glyph: '💛', name: 'Yellow heart', note: 'You know who this one is from.' },
  { id: 'shell', glyph: '🐚', name: 'Sea shell', note: 'Hold it up and you can hear the whole sea.' },
  { id: 'sparkles', glyph: '✨', name: 'Sparkles', note: 'The rare one. Suits you.' },
]

export const stickerById = Object.fromEntries(STICKERS.map((sticker) => [sticker.id, sticker]))

export default STICKERS
