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

export default function AgentToolsSection() {
  return (
    <section className="py-16 bg-slate-950 text-slate-100" aria-labelledby="webmcp-heading" data-testid="webmcp-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="webmcp-heading" className="text-3xl font-bold text-white">
          Shop with a browser agent
        </h2>
        <p className="mt-3 max-w-3xl text-slate-300">
          Every page registers WebMCP tools on <code className="text-brand-300">document.modelContext</code>. A
          browser agent can search the catalog, update the cart, sign in, and place a test order. Checkout asks the
          browser to confirm before it runs.
        </p>
        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="WebMCP shopping tools">
          {customerToolNames.map((name) => (
            <li key={name} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3" data-testid={`webmcp-tool-${name}`}>
              <p className="font-mono text-sm text-brand-300">{name}</p>
              <p className="mt-1 text-sm text-slate-300">{toolSummaries[name]}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-slate-400" data-testid="webmcp-admin-note">
          Admin tools {adminToolNames.join(', ')} are registered after an admin signs in.
        </p>
      </div>
    </section>
  );
}
