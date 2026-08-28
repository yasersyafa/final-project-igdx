// Font families. Loaded via Google Fonts in index.html; game start waits for them
// (see main.js) so canvas text renders in the right face, not a fallback.
export const FONTS = {
  display: '"Knewave", system-ui, sans-serif',       // titles + button text
  body: '"Darumadrop One", system-ui, sans-serif',    // normal text
};

// Knewave letter-spacing: 19% of font size, per Phaser's numeric letterSpacing style.
export const letterSpacing = (fontSizePx) => Math.round(fontSizePx * 0.19);

export default FONTS;
