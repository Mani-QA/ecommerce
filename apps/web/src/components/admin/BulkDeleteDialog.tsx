import { useEffect, useRef, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/components/ui/Button';

interface BulkDeleteDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BulkDeleteDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  isLoading,
  onCancel,
  onConfirm,
}: BulkDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isLoading, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <DeleteConfirmation
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          isLoading={isLoading}
          cancelRef={cancelRef}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </AnimatePresence>
  );
}

function DeleteConfirmation({
  title,
  description,
  confirmLabel,
  isLoading,
  cancelRef,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  isLoading: boolean;
  cancelRef: RefObject<HTMLButtonElement>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <motion.button
        type="button"
        aria-label="Close delete confirmation"
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isLoading ? undefined : onCancel}
        data-testid="bulk-delete-backdrop"
      />
      <DialogPanel
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        isLoading={isLoading}
        cancelRef={cancelRef}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </div>
  );
}

function DialogPanel({
  title,
  description,
  confirmLabel,
  isLoading,
  cancelRef,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  isLoading: boolean;
  cancelRef: RefObject<HTMLButtonElement>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-title"
      aria-describedby="bulk-delete-description"
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      data-testid="bulk-delete-dialog"
    >
      <h2 id="bulk-delete-title" className="text-xl font-bold text-slate-900">{title}</h2>
      <p id="bulk-delete-description" className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <DialogActions
        confirmLabel={confirmLabel}
        isLoading={isLoading}
        cancelRef={cancelRef}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </motion.div>
  );
}

function DialogActions({
  confirmLabel,
  isLoading,
  cancelRef,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  isLoading: boolean;
  cancelRef: RefObject<HTMLButtonElement>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <Button ref={cancelRef} variant="secondary" size="sm" onClick={onCancel} disabled={isLoading} data-testid="admin-product-cancel-delete">
        Cancel
      </Button>
      <Button variant="danger" size="sm" onClick={onConfirm} isLoading={isLoading} data-testid="admin-product-confirm-delete">
        {confirmLabel}
      </Button>
    </div>
  );
}
