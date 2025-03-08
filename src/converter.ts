import { Client } from '@notionhq/client';
import type { 
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse
} from '@notionhq/client/build/src/api-endpoints.js';

type NotionProperty = PageObjectResponse['properties'][string];

export async function convertNotionToAstro(notion: Client, page: PageObjectResponse): Promise<string> {
  const blocks = await fetchAllBlocks(notion, page.id);
  const metadata = await extractMetadata(page);

  let markdown = generateFrontMatter(metadata);
  markdown += await convertBlocksToMarkdown(blocks);

  return markdown;
}

async function fetchAllBlocks(notion: Client, blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor || undefined,
    });

    blocks.push(...response.results as BlockObjectResponse[]);

    if (!response.has_more) break;
    cursor = response.next_cursor || undefined;
  }

  return blocks;
}

async function extractMetadata(page: PageObjectResponse) {
  const metadata: Record<string, any> = {
    title: '',
    date: new Date().toISOString().split('T')[0],
    draft: false,
  };

  if ('properties' in page) {
    const properties = page.properties;
    for (const [key, value] of Object.entries(properties)) {
      const property = value as NotionProperty;
      if (property.type === 'title' && property.title.length > 0) {
        metadata.title = property.title.map((t: RichTextItemResponse) => t.plain_text).join('');
      }
    }
  }

  return metadata;
}

function generateFrontMatter(metadata: Record<string, any>): string {
  let frontMatter = '---\n';
  for (const [key, value] of Object.entries(metadata)) {
    frontMatter += `${key}: ${JSON.stringify(value)}\n`;
  }
  frontMatter += '---\n\n';
  return frontMatter;
}

async function convertBlocksToMarkdown(blocks: BlockObjectResponse[]): Promise<string> {
  let markdown = '';

  for (const block of blocks) {
    markdown += convertBlockToMarkdown(block);
  }

  return markdown;
}

function convertBlockToMarkdown(block: BlockObjectResponse): string {
  switch (block.type) {
    case 'paragraph':
      return convertParagraph(block.paragraph) + '\n\n';
    case 'heading_1':
      return `# ${convertRichText(block.heading_1.rich_text)}\n\n`;
    case 'heading_2':
      return `## ${convertRichText(block.heading_2.rich_text)}\n\n`;
    case 'heading_3':
      return `### ${convertRichText(block.heading_3.rich_text)}\n\n`;
    case 'bulleted_list_item':
      return `- ${convertRichText(block.bulleted_list_item.rich_text)}\n`;
    case 'numbered_list_item':
      return `1. ${convertRichText(block.numbered_list_item.rich_text)}\n`;
    case 'code':
      return `\`\`\`${block.code.language}\n${convertRichText(block.code.rich_text)}\n\`\`\`\n\n`;
    case 'quote':
      return `> ${convertRichText(block.quote.rich_text)}\n\n`;
    default:
      return '';
  }
}

function convertParagraph(paragraph: { rich_text: RichTextItemResponse[] }): string {
  return convertRichText(paragraph.rich_text);
}

function convertRichText(richText: RichTextItemResponse[]): string {
  return richText.map(text => {
    let content = text.plain_text;

    if (text.annotations.bold) {
      content = `**${content}**`;
    }
    if (text.annotations.italic) {
      content = `*${content}*`;
    }
    if (text.annotations.code) {
      content = `\`${content}\``;
    }
    if (text.annotations.strikethrough) {
      content = `~~${content}~~`;
    }

    if (text.href) {
      content = `[${content}](${text.href})`;
    }

    return content;
  }).join('');
}
