import { createContext, useContext } from 'react';

// Holds { state, today, filters, actions, drag } for the whole tree.
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
