import { Modal } from './Modal';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  return (
    <Modal open={request !== null} title={request?.title ?? ''} onClose={onClose} className="modal-confirm">
      {request && (
        <>
          <p className="modal-message">{request.message}</p>
          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose} autoFocus>
              Cancel
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                request.onConfirm();
                onClose();
              }}
            >
              {request.confirmLabel}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
