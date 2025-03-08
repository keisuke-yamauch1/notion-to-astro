import { Client } from '@notionhq/client';
import { convertNotionToAstro } from './converter.js';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function isFullPage(page: any): page is PageObjectResponse {
  return 'properties' in page && page.object === 'page';
}

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID as string;
const OUTPUT_DIR = process.env.OUTPUT_DIR || 'src/content/blog';

if (!NOTION_TOKEN || !DATABASE_ID) {
  throw new Error('Please set NOTION_TOKEN and NOTION_DATABASE_ID in .env file');
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const notion = new Client({
  auth: NOTION_TOKEN,
});

export async function main() {
  try {
    // Fetch pages from Notion database
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        and: [
          {
            property: 'published',
            checkbox: {
              equals: false
            }
          },
          {
            property: 'done',
            checkbox: {
              equals: true
            }
          }
        ]
      }
    });

    for (const page of response.results) {
      try {
        // Skip if not a full page
        if (!isFullPage(page)) {
          console.warn(`Skipping page ${page.id}: not a full page object`);
          continue;
        }

        // Skip if published property is not true
        const publishedProperty = page.properties.published;
        if (!publishedProperty || publishedProperty.type !== 'checkbox' || publishedProperty.checkbox) {
          console.warn(`Skipping page ${page.id}: not published`);
          continue;
        }

        // Skip if done property is not true
        const doneProperty = page.properties.done;
        if (!doneProperty || doneProperty.type !== 'checkbox' || !doneProperty.checkbox) {
          console.warn(`Skipping page ${page.id}: not done`);
          continue;
        }

        // Convert each page to Astro markdown
        const markdown = await convertNotionToAstro(notion, page);

        // Generate filename from title or use page ID if title is not available
        let filename = 'untitled';
        if ('properties' in page && page.properties.title?.type === 'title') {
          const titleText = page.properties.title.title
            .map(t => t.plain_text)
            .join('')
            .replace(/[<>:"/\\|?*]+/g, '-') // Replace invalid filename characters
            .replace(/^-+|-+$/g, '');       // Remove leading/trailing hyphens
          if (titleText) {
            filename = titleText;
          }
        }

        // Save the markdown file
        const filePath = path.join(OUTPUT_DIR, `${filename}.md`);
        fs.writeFileSync(filePath, markdown, 'utf8');

        console.log(`Converted page "${filename}" (${page.id})`);
      } catch (error) {
        console.error(`Error converting page ${page.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Only run when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
