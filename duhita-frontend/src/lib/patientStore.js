/**
 * Temporary client-side store for the review build.
 * Replace these functions with API calls when the backend is ready.
 */
const KEY = 'duhita.patients';

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

const write = (data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — registration still shows the ID */
  }
};

export function registerPatient(details) {
  const all = read();
  const yymm = new Date().toISOString().slice(2, 7).replace('-', '');
  let id;
  do id = `DD${yymm}-${Math.floor(1000 + Math.random() * 9000)}`;
  while (all[id]);
  all[id] = { ...details, id, registeredAt: new Date().toISOString() };
  write(all);
  return id;
}

export const findPatient = (id) => read()[id?.trim().toUpperCase()] || null;
