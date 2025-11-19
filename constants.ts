export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 600;

export const BUILDING_COLORS = ['#AAAAAA', '#AA0000', '#00AA00', '#55FFFF'];
export const SUN_COLOR = '#FFFF55';
export const SKY_COLOR = '#0000AA'; // Fallback/Default

export const WINDOW_LIT_COLOR = '#FFFF55';
export const WINDOW_DARK_COLOR = '#111111';

export const GORILLA_WIDTH = 40;
export const GORILLA_HEIGHT = 40;
export const BANANA_SIZE = 6;

export const EXPLOSION_RADIUS = 45; // Increased slightly for better AOE feel

// Physics scaling
export const VELOCITY_SCALE = 0.55; // Reduced significantly to slow down the banana
export const GRAVITY = 9.8 * 0.06; // Adjusted for new velocity scale
export const WIND_SCALE = 0.03;
export const PHYSICS_SUBSTEPS = 8; // Number of calculations per frame to prevent tunneling

export const MAX_WIND = 100;
export const MAX_VELOCITY = 120; // Cap for player input