import { Client } from '@notionhq/client';
import { convertNotionToAstro } from './converter';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
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

async function main() {
  try {
    // Fetch pages from Notion database
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
    });

    for (const page of response.results) {
      try {
        // Convert each page to Astro markdown
        const markdown = await convertNotionToAstro(notion, page);

        // Generate filename from title or use page ID if title is not available
        let filename = 'untitled';
        if ('properties' in page && page.properties.title?.type === 'title') {
          const titleText = page.properties.title.title
            .map(t => t.plain_text)
            .join('')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
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

main();
