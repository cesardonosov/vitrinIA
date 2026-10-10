/**
 * Buyer text cleaning (threat model orders O21). The buyer controls every character, and the
 * result lands in a WhatsApp message the seller reads: one-line fields must stay one line and
 * cannot hide or reorder text.
 */

// Control characters (C0, DEL, C1), line/paragraph separators and format characters, which
// include zero-width and bidirectional marks (RLO, LRI, ...).
const LINE_BREAKERS = /[\p{Cc}\p{Zl}\p{Zp}]/gu;
const HIDDEN = /\p{Cf}/gu;
const NOT_NOTE_SAFE = /[^\P{Cc}\n]|\p{Zl}|\p{Zp}|\p{Cf}/gu;

/** One line: NFC, control and format characters removed, spaces collapsed. */
export function cleanLine(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(LINE_BREAKERS, " ")
    .replace(HIDDEN, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Free note: keeps line breaks, drops every other control or format character. */
export function cleanNote(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(NOT_NOTE_SAFE, "")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
