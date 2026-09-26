/**
 * Two palettes that live together: the clinic's own colours (used across the
 * patient app) and Duhita AI's teal, kept for her chat screen.
 */
export const colors = {
  bg: '#f4f9fb',
  surface: '#ffffff',
  text: '#0f2a36',
  muted: '#5d7682',
  border: '#dbe8ee',
  primary: '#0e9aa7',
  primaryDark: '#0b7d88',
  accent: '#58c4dc',
  userBubble: '#0e9aa7',
  botBubble: '#ffffff',
  danger: '#e5484d',
  dangerBg: '#fdecec',
  stageTop: '#d9f3f7',
  stageBottom: '#eef8fb',
};

/** Duhita Dental's website palette, so the app and the website feel like one brand. */
export const clinic = {
  ivory: '#f3efec',
  ivoryDeep: '#e9e3de',
  slate: '#4c5b70',
  slateDeep: '#3c4859',
  mist: '#cfe0ea',
  stone: '#8a857f',
  ink: '#2b2f36',
  body: '#666666',
  line: '#e2dcd7',
  surface: '#ffffff',
  danger: '#b42318',
  dangerBg: '#fdecec',
  success: '#127a4b',
  successBg: '#e7f5ee',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };
export const space = { xs: 6, sm: 10, md: 16, lg: 22, xl: 32 };

export const shadow = {
  card: {
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  bar: {
    shadowColor: '#101828',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
};

export const type = {
  h1: { fontSize: 26, fontWeight: '700' as const, color: clinic.ink },
  h2: { fontSize: 20, fontWeight: '700' as const, color: clinic.ink },
  h3: { fontSize: 16.5, fontWeight: '700' as const, color: clinic.ink },
  body: { fontSize: 15, lineHeight: 22, color: clinic.body },
  small: { fontSize: 13, color: clinic.body },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: clinic.stone,
  },
};
