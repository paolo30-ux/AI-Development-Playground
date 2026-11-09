// Flappy Bird sample design system for the Figma Plugin API.
// Open the target Figma file before running this in a plugin/Scripter context.
// The script creates styles in the document and adds a guide frame to the current page.

const DESIGN_SYSTEM = {
  color: {
    sky: { start: '#4ec0ca', end: '#c9ecf0', canvas: '#70c5ce' },
    pipe: { fill: '#5cb85c', outline: '#2d6a2d' },
    ground: { soil: '#ded895', grass: '#73bf2e', grassStripe: '#5aa023', soilLine: '#c9b95f' },
    bird: { body: '#f7d046', outline: '#a77d00', wing: '#f0a500', beak: '#ef6c1a' },
    text: { primary: '#ffffff', ink: '#000000', display: '#facc15', muted: '#543847', danger: '#ff6b4a' },
    panel: { fill: '#ded895', outline: '#543847', overlay: 'rgba(0, 0, 0, 0.45)' },
  },
  typography: {
    sourceFamily: 'system-ui, sans-serif',
    weight: 700,
    size: { score: 52, title: 44, modalTitle: 42, value: 38, label: 20, prompt: 20, restart: 18 },
  },
  spacing: { unit: 4, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  radius: { panel: 12 },
  border: { bird: 2, pipe: 3, panel: 4 },
  shadow: { panel: 'rgba(0, 0, 0, 0.22)', blur: 12, offsetY: 5 },
};

const GUIDE_NAME = 'Design System / Style Guide';
const FONT_FAMILY = 'Inter'; // Figma representation of the CSS system sans stack.
const FONT_STYLE = 'Bold';
const PAGE = figma.currentPage;
const COLOR_STYLES = [];

function rgba(hexOrRgba) {
  const rgbaMatch = hexOrRgba.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((part) => Number(part.trim()));
    return {
      color: { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255 },
      opacity: parts.length > 3 ? parts[3] : 1,
      label: `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${parts.length > 3 ? parts[3] : 1})`,
    };
  }

  const hex = hexOrRgba.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
  const integer = parseInt(normalized, 16);
  return {
    color: {
      r: ((integer >> 16) & 255) / 255,
      g: ((integer >> 8) & 255) / 255,
      b: (integer & 255) / 255,
    },
    opacity: 1,
    label: `#${normalized.toUpperCase()}`,
  };
}

function paintFor(value) {
  const parsed = rgba(value);
  return { type: 'SOLID', color: parsed.color, opacity: parsed.opacity };
}

function getOrCreatePaintStyle(name, value) {
  const style = figma.getLocalPaintStyles().find((item) => item.name === name) || figma.createPaintStyle();
  style.name = name;
  style.paints = [paintFor(value)];
  COLOR_STYLES.push({ name, value });
  return style;
}

function getOrCreateTextStyle(name, size, lineHeight) {
  const style = figma.getLocalTextStyles().find((item) => item.name === name) || figma.createTextStyle();
  style.name = name;
  style.fontName = { family: FONT_FAMILY, style: FONT_STYLE };
  style.fontSize = size;
  if (lineHeight) style.lineHeight = { unit: 'PIXELS', value: lineHeight };
  else style.lineHeight = { unit: 'AUTO' };
  style.letterSpacing = { unit: 'PIXELS', value: 0 };
  return style;
}

function getOrCreateEffectStyle(name, effects) {
  const style = figma.getLocalEffectStyles().find((item) => item.name === name) || figma.createEffectStyle();
  style.name = name;
  style.effects = effects;
  return style;
}

function createTextNode(parent, content, x, y, size, color, options = {}) {
  const node = figma.createText();
  node.name = options.name || content.slice(0, 40);
  node.fontName = { family: FONT_FAMILY, style: FONT_STYLE };
  node.characters = content;
  node.fontSize = size;
  node.fills = [{ type: 'SOLID', color: rgba(color).color, opacity: rgba(color).opacity }];
  if (options.lineHeight) node.lineHeight = { unit: 'PIXELS', value: options.lineHeight };
  node.x = x;
  node.y = y;
  if (options.width) {
    node.textAutoResize = 'HEIGHT';
    node.resize(options.width, Math.max(size * 1.4, 1));
  }
  parent.appendChild(node);
  return node;
}

function createRect(parent, name, x, y, width, height, fill, radius = 0, stroke, strokeWidth = 0) {
  const node = figma.createRectangle();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(width, height);
  node.fills = [{ type: 'SOLID', color: rgba(fill).color, opacity: rgba(fill).opacity }];
  node.cornerRadius = radius;
  if (stroke) {
    node.strokes = [{ type: 'SOLID', color: rgba(stroke).color, opacity: rgba(stroke).opacity }];
    node.strokeWeight = strokeWidth;
  }
  parent.appendChild(node);
  return node;
}

function addColorToken(path, value, x, y, parent) {
  const tokenName = `Color/${path}`;
  const colorStyle = getOrCreatePaintStyle(tokenName, value);
  const parsed = rgba(value);
  const card = figma.createFrame();
  card.name = `Color · ${path}`;
  card.x = x;
  card.y = y;
  card.resize(296, 92);
  card.cornerRadius = 10;
  card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  card.strokes = [{ type: 'SOLID', color: { r: 0.87, g: 0.89, b: 0.91 } }];
  card.strokeWeight = 1;
  card.clipsContent = true;
  parent.appendChild(card);

  const swatch = figma.createRectangle();
  swatch.name = `${path} swatch`;
  swatch.x = 12;
  swatch.y = 12;
  swatch.resize(68, 68);
  swatch.cornerRadius = 8;
  swatch.fills = [paintFor(value)];
  swatch.fillStyleId = colorStyle.id;
  swatch.strokes = [{ type: 'SOLID', color: { r: 0.82, g: 0.84, b: 0.86 } }];
  swatch.strokeWeight = 1;
  card.appendChild(swatch);

  createTextNode(card, path, 92, 20, 14, '#202631', { name: `${path} token name` });
  createTextNode(card, parsed.label, 92, 46, 12, '#687384', { name: `${path} hex value` });
}

function addSectionTitle(parent, title, x, y) {
  createTextNode(parent, title, x, y, 22, '#202631', { name: `${title} section title` });
}

function addColorCards(parent) {
  addSectionTitle(parent, 'Color styles', 64, 116);
  const entries = [
    ['sky/start', DESIGN_SYSTEM.color.sky.start],
    ['sky/end', DESIGN_SYSTEM.color.sky.end],
    ['sky/canvas', DESIGN_SYSTEM.color.sky.canvas],
    ['panel/fill', DESIGN_SYSTEM.color.panel.fill],
    ['pipe/fill', DESIGN_SYSTEM.color.pipe.fill],
    ['pipe/outline', DESIGN_SYSTEM.color.pipe.outline],
    ['ground/soil', DESIGN_SYSTEM.color.ground.soil],
    ['ground/grass', DESIGN_SYSTEM.color.ground.grass],
    ['ground/grass-stripe', DESIGN_SYSTEM.color.ground.grassStripe],
    ['ground/soil-line', DESIGN_SYSTEM.color.ground.soilLine],
    ['bird/body', DESIGN_SYSTEM.color.bird.body],
    ['bird/outline', DESIGN_SYSTEM.color.bird.outline],
    ['bird/wing', DESIGN_SYSTEM.color.bird.wing],
    ['bird/beak', DESIGN_SYSTEM.color.bird.beak],
    ['text/primary', DESIGN_SYSTEM.color.text.primary],
    ['text/ink', DESIGN_SYSTEM.color.text.ink],
    ['text/display', DESIGN_SYSTEM.color.text.display],
    ['text/muted', DESIGN_SYSTEM.color.text.muted],
    ['text/danger', DESIGN_SYSTEM.color.text.danger],
    ['panel/outline', DESIGN_SYSTEM.color.panel.outline],
    ['panel/overlay', DESIGN_SYSTEM.color.panel.overlay],
  ];
  const cardWidth = 296;
  const gapX = 16;
  const gapY = 12;
  const columns = 4;
  const startX = 64;
  const startY = 156;
  entries.forEach(([path, value], index) => {
    const x = startX + (index % columns) * (cardWidth + gapX);
    const y = startY + Math.floor(index / columns) * (92 + gapY);
    addColorToken(path, value, x, y, parent);
  });
}

function addTypography(parent) {
  const top = 790;
  addSectionTitle(parent, 'Typography', 64, top);
  createTextNode(parent, `Source font: ${DESIGN_SYSTEM.typography.sourceFamily} · Weight ${DESIGN_SYSTEM.typography.weight} · Figma uses Inter Bold`, 64, top + 34, 14, '#687384');
  const samples = [
    ['Title', 'Flappy Bird', DESIGN_SYSTEM.typography.size.title, DESIGN_SYSTEM.color.text.display],
    ['Score', '012', DESIGN_SYSTEM.typography.size.score, DESIGN_SYSTEM.color.text.ink],
    ['Modal title', 'Game Over', DESIGN_SYSTEM.typography.size.modalTitle, DESIGN_SYSTEM.color.text.danger],
    ['Value', '42', DESIGN_SYSTEM.typography.size.value, DESIGN_SYSTEM.color.text.ink],
    ['Label', 'SCORE', DESIGN_SYSTEM.typography.size.label, DESIGN_SYSTEM.color.text.muted],
    ['Prompt', 'Press Space or tap to start', DESIGN_SYSTEM.typography.size.prompt, DESIGN_SYSTEM.color.text.muted],
    ['Restart', 'Press Enter or tap to restart', DESIGN_SYSTEM.typography.size.restart, DESIGN_SYSTEM.color.text.muted],
  ];
  const cardWidth = 296;
  samples.forEach(([label, sample, size, color], index) => {
    const x = 64 + (index % 4) * (cardWidth + 16);
    const y = top + 72 + Math.floor(index / 4) * 120;
    const styleName = `Type/${label.replaceAll(' ', '-')}`;
    const style = getOrCreateTextStyle(styleName, size);
    const card = figma.createFrame();
    card.name = `Typography · ${label}`;
    card.x = x;
    card.y = y;
    card.resize(cardWidth, 104);
    card.cornerRadius = 10;
    card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    card.strokes = [{ type: 'SOLID', color: { r: 0.87, g: 0.89, b: 0.91 } }];
    card.strokeWeight = 1;
    parent.appendChild(card);
    createTextNode(card, label, 14, 12, 11, '#687384', { name: `${label} label` });
    const example = createTextNode(card, sample, 14, 39, size, color, { name: `${label} sample`, width: 268 });
    example.textStyleId = style.id;
  });
}

function addButton(parent, name, label, x, y, fill, textColor, outline) {
  const button = figma.createFrame();
  button.name = name;
  button.x = x;
  button.y = y;
  button.resize(194, 52);
  button.cornerRadius = DESIGN_SYSTEM.radius.panel;
  button.fills = [{ type: 'SOLID', color: rgba(fill).color, opacity: rgba(fill).opacity }];
  if (outline) {
    button.strokes = [{ type: 'SOLID', color: rgba(outline).color }];
    button.strokeWeight = DESIGN_SYSTEM.border.bird;
  }
  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisAlignItems = 'CENTER';
  button.counterAxisAlignItems = 'CENTER';
  button.paddingLeft = DESIGN_SYSTEM.spacing.lg;
  button.paddingRight = DESIGN_SYSTEM.spacing.lg;
  button.paddingTop = DESIGN_SYSTEM.spacing.sm;
  button.paddingBottom = DESIGN_SYSTEM.spacing.sm;
  parent.appendChild(button);
  createTextNode(button, label, 0, 16, 16, textColor, { name: `${name} label` });
  return button;
}

function addComponents(parent) {
  const top = 1100;
  addSectionTitle(parent, 'Components', 64, top);

  addButton(parent, 'Button / Primary', 'Start game', 64, top + 46, DESIGN_SYSTEM.color.text.display, DESIGN_SYSTEM.color.text.muted);
  addButton(parent, 'Button / Secondary', 'Restart', 276, top + 46, DESIGN_SYSTEM.color.panel.fill, DESIGN_SYSTEM.color.text.muted, DESIGN_SYSTEM.color.panel.outline);

  const score = figma.createFrame();
  score.name = 'Badge / Score';
  score.x = 504;
  score.y = top + 46;
  score.resize(124, 56);
  score.cornerRadius = DESIGN_SYSTEM.radius.panel;
  score.fills = [{ type: 'SOLID', color: rgba(DESIGN_SYSTEM.color.pipe.fill).color }];
  score.strokes = [{ type: 'SOLID', color: rgba(DESIGN_SYSTEM.color.pipe.outline).color }];
  score.strokeWeight = DESIGN_SYSTEM.border.pipe;
  parent.appendChild(score);
  const scoreText = createTextNode(score, '012', 0, 0, DESIGN_SYSTEM.typography.size.value, DESIGN_SYSTEM.color.text.primary, { name: 'Score value', width: 124 });
  scoreText.textAlignHorizontal = 'CENTER';
  scoreText.textAutoResize = 'HEIGHT';
  scoreText.y = 4;

  const panelX = 664;
  const panelY = top + 42;
  const panel = figma.createFrame();
  panel.name = 'Card / Game Over';
  panel.x = panelX;
  panel.y = panelY;
  panel.resize(336, 202);
  panel.cornerRadius = DESIGN_SYSTEM.radius.panel;
  panel.fills = [{ type: 'SOLID', color: rgba(DESIGN_SYSTEM.color.panel.fill).color }];
  panel.strokes = [{ type: 'SOLID', color: rgba(DESIGN_SYSTEM.color.panel.outline).color }];
  panel.strokeWeight = DESIGN_SYSTEM.border.panel;
  panel.effects = [{
    type: 'DROP_SHADOW',
    color: rgba(DESIGN_SYSTEM.shadow.panel).color,
    opacity: rgba(DESIGN_SYSTEM.shadow.panel).opacity,
    offset: { x: 0, y: DESIGN_SYSTEM.shadow.offsetY },
    radius: DESIGN_SYSTEM.shadow.blur,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];
  parent.appendChild(panel);
  getOrCreateEffectStyle('Effect/Panel shadow', panel.effects);
  createTextNode(panel, 'Game Over', 20, 16, DESIGN_SYSTEM.typography.size.modalTitle, DESIGN_SYSTEM.color.text.danger, { width: 292 });
  const scoreLabel = createTextNode(panel, 'SCORE', 24, 78, DESIGN_SYSTEM.typography.size.label, DESIGN_SYSTEM.color.text.muted, { width: 128 });
  scoreLabel.textAlignHorizontal = 'CENTER';
  const bestLabel = createTextNode(panel, 'BEST', 184, 78, DESIGN_SYSTEM.typography.size.label, DESIGN_SYSTEM.color.text.muted, { width: 128 });
  bestLabel.textAlignHorizontal = 'CENTER';
  const scoreValue = createTextNode(panel, '12', 24, 112, DESIGN_SYSTEM.typography.size.value, DESIGN_SYSTEM.color.text.ink, { width: 128 });
  scoreValue.textAlignHorizontal = 'CENTER';
  const bestValue = createTextNode(panel, '42', 184, 112, DESIGN_SYSTEM.typography.size.value, DESIGN_SYSTEM.color.text.ink, { width: 128 });
  bestValue.textAlignHorizontal = 'CENTER';
  createTextNode(panel, 'Press Enter or tap to restart', 24, 166, DESIGN_SYSTEM.typography.size.restart, DESIGN_SYSTEM.color.text.muted, { width: 280 });
}

async function main() {
  const font = { family: FONT_FAMILY, style: FONT_STYLE };
  await figma.loadFontAsync(font);

  // Re-running the script refreshes its guide frame instead of stacking duplicates.
  for (const node of [...PAGE.children]) {
    if (node.name === GUIDE_NAME) node.remove();
  }

  // Create/update every color token as a local Figma Paint Style.
  for (const [group, values] of Object.entries(DESIGN_SYSTEM.color)) {
    for (const [token, value] of Object.entries(values)) {
      getOrCreatePaintStyle(`Color/${group}/${token}`, value);
    }
  }

  getOrCreateEffectStyle('Effect/Panel shadow', [{
    type: 'DROP_SHADOW',
    color: rgba(DESIGN_SYSTEM.shadow.panel).color,
    opacity: rgba(DESIGN_SYSTEM.shadow.panel).opacity,
    offset: { x: 0, y: DESIGN_SYSTEM.shadow.offsetY },
    radius: DESIGN_SYSTEM.shadow.blur,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }]);

  const guide = figma.createFrame();
  guide.name = GUIDE_NAME;
  guide.resize(1408, 1390);
  guide.x = 40;
  guide.y = 40;
  guide.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.97, b: 0.98 } }];
  guide.clipsContent = true;
  guide.layoutMode = 'NONE';
  PAGE.appendChild(guide);

  createTextNode(guide, 'Flappy Bird · Design System', 64, 42, 32, '#202631', { name: 'Style guide title' });
  createTextNode(guide, 'Canvas visual tokens · Sample system based on game.js', 64, 84, 15, '#687384', { name: 'Style guide subtitle' });
  addColorCards(guide);
  addTypography(guide);
  addComponents(guide);

  figma.viewport.scrollAndZoomIntoView([guide]);
  figma.notify(`Created ${GUIDE_NAME} with ${COLOR_STYLES.length} named color tokens.`);
  figma.closePlugin();
}

main().catch((error) => {
  console.error(error);
  figma.notify(`Design system script failed: ${error.message}`);
  figma.closePlugin();
});
