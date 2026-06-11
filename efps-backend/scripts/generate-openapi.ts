import { buildApp } from '../src/app.js';
import fs from 'node:fs';
import path from 'node:path';

async function generateOpenApi() {
  const app = await buildApp();

  await app.ready();

  const swaggerContent = app.swagger();
  const outputPath = path.join(process.cwd(), 'openapi.json');

  fs.writeFileSync(outputPath, JSON.stringify(swaggerContent, null, 2));
  console.log(`OpenAPI spec generated at ${outputPath}`);

  await app.close();
}

generateOpenApi().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
