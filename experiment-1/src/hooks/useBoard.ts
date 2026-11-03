import { useEffect, useReducer, useRef, useState } from 'react';
import { boardReducer } from '../model/boardReducer';
import { loadBoard, saveBoard } from '../model/storage';

/** Board state backed by localStorage: loaded once, saved after every change. */
export function useBoard(onSaveError: () => void) {
  const [initial] = useState(loadBoard);
  const [state, dispatch] = useReducer(boardReducer, initial.state);
  const first = useRef(true);
  const onSaveErrorRef = useRef(onSaveError);
  onSaveErrorRef.current = onSaveError;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!saveBoard(state)) onSaveErrorRef.current();
  }, [state]);

  return { state, dispatch, loadError: initial.error };
}
