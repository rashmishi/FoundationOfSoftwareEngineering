import { useAnnouncer } from '../state/AnnouncerContext';
import { useRequestFocus } from '../state/FocusContext';

/**
 * Moves focus to an invalid field after it has re-rendered with aria-invalid and
 * its error description, so the error is read with the field. If the field
 * already has focus, moving focus would announce nothing, so the error goes to
 * the alert region instead (one announcement per event, FR-G.2).
 */
export function useFieldErrorFocus() {
  const requestFocus = useRequestFocus();
  const { announceError } = useAnnouncer();
  return (fieldId: string, message: string) => {
    if (document.activeElement?.id === fieldId) announceError(message);
    else requestFocus(fieldId);
  };
}
