import { HistoryItem } from '../types';

const STORAGE_KEY = 'educational_docs_history';

export const saveToHistory = (item: Omit<HistoryItem, 'id' | 'date'>): HistoryItem => {
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  
  const updatedHistory = [newItem, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  console.log('Document saved to history:', newItem.title);
  return newItem;
};

export const updateHistoryItem = (id: string, updates: Partial<HistoryItem>): void => {
  const history = getHistory();
  const index = history.findIndex(item => item.id === id);
  if (index !== -1) {
    history[index] = { ...history[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    console.log('History item updated:', id);
  }
};

export const getHistory = (): HistoryItem[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Error parsing history', e);
    return [];
  }
};

export const deleteFromHistory = (id: string): void => {
  const history = getHistory();
  const updatedHistory = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
