# Live Store Report App

A Shopify embedded app that provides real-time store analytics via live ShopifyQL synchronization. This app replaces the legacy CSV-upload workflow with on-demand, real-time data refresh from your Shopify store.

## Features

- **Live Analytics**: Query store data on-demand using ShopifyQL without manual CSV uploads
- **Single-Tenant**: Designed to sync one store's analytics at a time
- **On-Demand Refresh**: Fetch the latest data whenever you need it
- **Embedded Experience**: Seamlessly integrated into the Shopify Admin
- **No External Storage Required**: Eliminates dependency on Google Drive or manual CSV parsing

## Prerequisites

Before you begin, ensure you have:

1. [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started) installed
2. Node.js 18+ with npm, yarn, or pnpm
3. A Shopify Partner account and a development store

## Getting Started

### Local Development

Start the development server:

```bash
shopify app dev
```

This command:
- Logs into your Shopify Partner account
- Connects to your development store
- Provides required environment variables
- Creates a secure tunnel for local testing
- Watches for file changes and auto-reloads

Press **P** in the terminal to open your app in the browser. Once you click "Install," you can begin development.

### Project Structure

```
app/
├── routes/          # React Router pages and API routes
├── components/      # Reusable React components
└── shopify.server.ts # Shopify app configuration

prisma/
├── schema.prisma    # Database schema (session storage)
└── migrations/      # Database migrations

shopify.app.toml     # App configuration, permissions, and webhooks
```

## Building for Production

Build the production bundle:

```bash
npm run build
```

Or with yarn/pnpm:

```bash
yarn build
# or
pnpm build
```

## Deployment

For deployment instructions and production setup, see the deployment documentation (Task 13 — coming soon). This includes:

- Environment variable configuration
- Production database setup
- Hosting options (Google Cloud Run, Fly.io, Render, etc.)
- Secrets management

## Adding a New Store

To add another store without code changes:

1. Use the **Custom Distribution** install link to distribute the app to additional stores
2. Merchants click the link and authorize the app
3. Each store's data is synced independently via the live ShopifyQL connection

No code modifications are needed — just distribute the app to new stores using Shopify's Custom Distribution feature.

## Database & Session Storage

This app uses [Prisma](https://www.prisma.io/) for session storage, configured with SQLite by default. For production, you may want to switch to a more robust database:

- **PostgreSQL**: [Digital Ocean](https://www.digitalocean.com/products/managed-databases-postgresql), [Amazon Aurora](https://aws.amazon.com/rds/aurora/)
- **MySQL**: [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mysql), [PlanetScale](https://planetscale.com/)
- **MongoDB**: [MongoDB Atlas](https://www.mongodb.com/atlas/database)

Update the `datasource` in `prisma/schema.prisma` to use your chosen provider.

## Troubleshooting

### Database tables don't exist

If you see an error like:

```
The table `main.Session` does not exist in the current database.
```

Run the setup script:

```bash
npm run setup
```

### Prisma engine issues on Windows

If you encounter `query_engine-windows.dll.node` errors, set:

```bash
set PRISMA_CLIENT_ENGINE_TYPE=binary
```

### Embedded app navigation issues

When working with embedded apps:

- Use `Link` from React Router or Polaris (avoid `<a>` tags)
- Use `redirect` from `authenticate.admin` (not React Router's redirect)
- Use `useSubmit` from React Router for forms

## API Reference

### Authentication

Use the `shopify` export from `/app/shopify.server.ts` to authenticate:

```ts
import { shopify } from '~/shopify.server';

export async function loader({ request }) {
  const { admin } = await shopify.authenticate.admin(request);
  // Use admin to query the GraphQL API
}
```

### GraphQL Queries

Run GraphQL queries against the Admin API:

```ts
const response = await admin.graphql(`
  query {
    products(first: 25) {
      nodes {
        id
        title
      }
    }
  }
`);

const data = await response.json();
```

### Webhooks

Declare app webhooks in `shopify.app.toml`. They are automatically registered and kept in sync.

## Resources

- [Shopify App Docs](https://shopify.dev/docs/apps)
- [Shopify Admin API](https://shopify.dev/docs/api/admin)
- [React Router Documentation](https://reactrouter.com/)
- [Polaris Design System](https://polaris.shopify.com/)
- [Shopify CLI Reference](https://shopify.dev/docs/apps/tools/cli)

## License

This project is part of the Live Store Report ecosystem.
