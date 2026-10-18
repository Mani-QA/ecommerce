import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import { adminToolNames, customerToolNames } from '@/webmcp/StoreAgentTools';

const toolSummaries: Record<(typeof customerToolNames)[number], string> = {
  search_products: 'Find products by keyword, price, and stock.',
  get_product: 'Load one product by id, slug, or name.',
  get_cart: 'Read the current cart and total.',
  add_to_cart: 'Add a product to the cart.',
  set_cart_quantity: 'Change a cart quantity, or remove a line with 0.',
  clear_cart: 'Empty the cart.',
  get_session: 'See who is signed in.',
  sign_in: 'Sign in with a username and password.',
  sign_out: 'Sign out of the current account.',
  create_account: 'Create an account and sign in.',
  list_orders: 'List orders for the signed-in shopper.',
  get_order: 'Load one order, including items and status.',
  place_order: 'Check out the cart with a shipping address and test card.',
  open_page: 'Open a store page for the shopper.',
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function AgentToolsSection() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <>
      <Button
        ref={triggerRef}
        variant="secondary"
        size="lg"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={titleId}
        onClick={() => setIsOpen(true)}
        data-testid="webmcp-button"
      >
        WebMCP
      </Button>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <WebMCPDialog
              dialogRef={dialogRef}
              titleId={titleId}
              descriptionId={descriptionId}
              onClose={() => setIsOpen(false)}
              returnFocusRef={triggerRef}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

function WebMCPDialog({
  dialogRef,
  titleId,
  descriptionId,
  onClose,
  returnFocusRef,
}: {
  dialogRef: RefObject<HTMLDivElement>;
  titleId: string;
  descriptionId: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (node) => !node.hasAttribute('disabled') && node.tabIndex !== -1,
      );
      if (nodes.length === 0) {
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [dialogRef, onClose, returnFocusRef]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="presentation">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        data-testid="webmcp-backdrop"
      />
      <motion.div
        ref={dialogRef}
        id={titleId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-heading`}
        aria-describedby={descriptionId}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative flex max-h-[min(85vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-950 text-slate-100 shadow-2xl"
        data-testid="webmcp-section"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <h2 id={`${titleId}-heading`} className="text-2xl font-bold text-white">
              Shop with a browser agent
            </h2>
            <p id={descriptionId} className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Every page registers WebMCP tools on <code className="text-brand-300">document.modelContext</code>. A
              browser agent can search the catalog, update the cart, sign in, and place a test order. Checkout asks the
              browser to confirm before it runs.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            aria-label="Close WebMCP details"
            data-testid="webmcp-close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="WebMCP shopping tools">
            {customerToolNames.map((name) => (
              <li
                key={name}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
                data-testid={`webmcp-tool-${name}`}
              >
                <p className="font-mono text-sm text-brand-300">{name}</p>
                <p className="mt-1 text-sm text-slate-300">{toolSummaries[name]}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-slate-400" data-testid="webmcp-admin-note">
            Admin tools {adminToolNames.join(', ')} are registered after an admin signs in.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
