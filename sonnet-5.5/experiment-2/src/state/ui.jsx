import { createContext, useContext } from 'react';

/** Lets cards and columns open the app's dialogs: edit a note, confirm a delete, rename a column. */
export const UiContext = createContext(null);

export function useUi() {
  return useContext(UiContext);
}
