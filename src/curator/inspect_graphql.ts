import { getContext } from './auth';
import fs from 'fs';
import path from 'path';

async function inspect() {
  const { context, browser } = await getContext();
  const page = await context.newPage();
  const handle = 'instagram'; // Use a public profile that likely has posts

  console.log(`Navigating to ${handle}...`);
  
  // Setup listener
  page.on('response', async (response) => {
    const url = response.url();
    // Identifier for the graphQL endpoint. 
    // It often looks like https://www.instagram.com/graphql/query/?query_hash=... or /api/v1/feed/user/...
    // The user mentioned: data > xdt_api__v1__feed__user_timeline_graphql_connection > edges
    
    // Let's capture anything that looks like a graphql query or api call returning JSON
    if (url.includes('/graphql/query') || url.includes('/api/v1/feed/user/')) {
        try {
            const json = await response.json();
            // Check if it has the structure we want
            if (JSON.stringify(json).includes('xdt_api__v1__feed__user_timeline_graphql_connection')) {
                console.log('Found target GraphQL response!');
                const outPath = path.join(process.cwd(), 'data', 'sample_graphql.json');
                fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
                console.log(`Saved to ${outPath}`);
            }
        } catch (e) {
            // ignore non-json
        }
    }
  });

  await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle' });
  
  console.log('Done. Closing.');
  await browser.close();
}

inspect();
