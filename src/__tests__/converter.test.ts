import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Client } from '@notionhq/client';
import type { 
  PageObjectResponse,
  BlockObjectResponse,
  ListBlockChildrenResponse
} from '@notionhq/client/build/src/api-endpoints.js';
import { convertNotionToAstro } from '../converter.js';

// Mock Notion client
jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    blocks: {
      children: {
        list: jest.fn(),
      },
    },
  })),
}));

describe('convertNotionToAstro', () => {
  let mockNotion: jest.Mocked<Client>;

  beforeEach(() => {
    mockNotion = {
      blocks: {
        children: {
          list: jest.fn().mockImplementation(() => Promise.resolve({} as ListBlockChildrenResponse))
        }
      }
    } as unknown as jest.Mocked<Client>;
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('should convert a simple page with title and content', async () => {
    const mockPage: PageObjectResponse = {
      id: 'page-id',
      object: 'page',
      parent: { type: 'database_id', database_id: 'test-db' },
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      archived: false,
      url: 'https://notion.so/test-page',
      in_trash: false,
      public_url: null,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: 'Test Page', link: null },
              plain_text: 'Test Page',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
                color: 'default',
                underline: false
              },
              href: null
            },
          ],
        },
        description: {
          id: 'description-id',
          type: 'rich_text',
          rich_text: [
            {
              type: 'text',
              text: { content: 'Test Description', link: null },
              plain_text: 'Test Description',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
                color: 'default',
                underline: false
              },
              href: null
            },
          ],
        },
      },
    };

    // Mock empty blocks response
    const mockResponse = {
      type: 'block',
      block: {},
      object: 'list',
      next_cursor: null,
      has_more: false,
      results: [] as BlockObjectResponse[]
    } as ListBlockChildrenResponse;
    mockNotion.blocks.children.list.mockResolvedValueOnce(mockResponse);

    const markdown = await convertNotionToAstro(mockNotion, mockPage);

    // Verify frontmatter
    expect(markdown).toContain('---');
    expect(markdown).toContain('title: "Test Page"');
    expect(markdown).toContain('description: "Test Description"');
    expect(markdown).toContain('draft: false');
    expect(markdown).toMatch(/date: \d{4}-\d{2}-\d{2}/);
  });

  test('should use first paragraph as description', async () => {
    const mockPage: PageObjectResponse = {
      id: 'page-id',
      object: 'page',
      parent: { type: 'database_id', database_id: 'test-db' },
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      archived: false,
      url: 'https://notion.so/test-page',
      public_url: null,
      in_trash: false,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: 'Test Page', link: null },
              plain_text: 'Test Page',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
                color: 'default',
                underline: false
              },
              href: null
            },
          ],
        },
      },
    };

    const mockBlocks = [
      {
        type: 'heading_1',
        heading_1: {
          rich_text: [{
            type: 'text',
            text: { content: 'Main Heading', link: null },
            plain_text: 'Main Heading',
            annotations: {
              bold: false,
              italic: false,
              code: false,
              strikethrough: false,
              color: 'default',
              underline: false
            },
            href: null
          }]
        },
        object: 'block',
        id: 'block-id-1'
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'This is the first line\nof content that will\nbe used for description.\nThis part should be truncated.', link: null },
            plain_text: 'This is the first line\nof content that will\nbe used for description.\nThis part should be truncated.',
            annotations: {
              bold: false,
              italic: false,
              code: false,
              strikethrough: false,
              color: 'default',
              underline: false
            },
            href: null
          }]
        },
        object: 'block',
        id: 'block-id-2'
      }
    ];

    mockNotion.blocks.children.list.mockResolvedValueOnce({
      type: 'block',
      block: {},
      object: 'list',
      next_cursor: null,
      has_more: false,
      results: mockBlocks
    } as ListBlockChildrenResponse);

    const markdown = await convertNotionToAstro(mockNotion, mockPage);

    expect(markdown).toContain('description: "This is the first line of content that will be used for"');
  });

  test('should handle various block types', async () => {
    const mockPage: PageObjectResponse = {
      id: 'page-id',
      object: 'page',
      parent: { type: 'database_id', database_id: 'test-db' },
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      archived: false,
      url: 'https://notion.so/test-page',
      public_url: null,
      in_trash: false,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: 'Test Page', link: null },
              plain_text: 'Test Page',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
                color: 'default',
                underline: false
              },
              href: null
            }
          ],
        },
      },
    } as PageObjectResponse;

    // Mock blocks response
    const mockResponse: ListBlockChildrenResponse = {
      type: 'block',
      block: {},
      object: 'list',
      next_cursor: null,
      has_more: false,
      results: [
        {
          id: 'block-1',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Normal text', link: null },
                plain_text: 'Normal text',
                annotations: {
                  bold: false,
                  italic: false,
                  code: false,
                  strikethrough: false,
                  color: 'default',
                  underline: false
                },
                href: null
              },
            ],
            color: 'default'
          },
          object: 'block',
          created_time: '2024-01-01T00:00:00.000Z',
          last_edited_time: '2024-01-01T00:00:00.000Z',
          has_children: false,
          parent: { type: 'page_id', page_id: 'page-id' },
          archived: false
        },
        {
          id: 'block-2',
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Heading 1', link: null },
                plain_text: 'Heading 1',
                annotations: {
                  bold: false,
                  italic: false,
                  code: false,
                  strikethrough: false,
                  color: 'default',
                  underline: false
                },
                href: null
              },
            ],
            color: 'default',
            is_toggleable: false
          },
          object: 'block',
          created_time: '2024-01-01T00:00:00.000Z',
          last_edited_time: '2024-01-01T00:00:00.000Z',
          has_children: false,
          parent: { type: 'page_id', page_id: 'page-id' },
          archived: false
        },
      ] as BlockObjectResponse[]
    };
    mockNotion.blocks.children.list.mockResolvedValue(mockResponse);

    const markdown = await convertNotionToAstro(mockNotion, mockPage);

    // Verify content conversion
    expect(markdown).toContain('Normal text  \n# Heading 1  \n');
  });

  test('should handle tags from multi_select property', async () => {
    const mockPage: PageObjectResponse = {
      id: 'page-id',
      object: 'page',
      parent: { type: 'database_id', database_id: 'test-db' },
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      archived: false,
      url: 'https://notion.so/test-page',
      public_url: null,
      in_trash: false,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: 'Test Page', link: null },
              plain_text: 'Test Page',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
                color: 'default',
                underline: false
              },
              href: null
            }
          ],
        },
        Tags: {
          id: 'tags-id',
          type: 'multi_select',
          multi_select: [
            { id: 'tag1-id', name: 'tag1', color: 'blue' },
            { id: 'tag2-id', name: 'tag2', color: 'red' }
          ]
        }
      },
    } as PageObjectResponse;

    const mockResponse = {
      type: 'block',
      block: {},
      object: 'list',
      next_cursor: null,
      has_more: false,
      results: [] as BlockObjectResponse[]
    } as ListBlockChildrenResponse;
    mockNotion.blocks.children.list.mockResolvedValueOnce(mockResponse);

    const markdown = await convertNotionToAstro(mockNotion, mockPage);

    // Verify frontmatter includes tags in correct format
    expect(markdown).toContain('tags: ["tag1", "tag2"]');
    expect(markdown).toMatch(/---\ntitle: "Test Page"\ndate: \d{4}-\d{2}-\d{2}\ndraft: false\ntags: \["tag1", "tag2"\]\n---/);
    // Verify no extra empty lines
    expect(markdown).not.toContain('\n\n\n');
  });

  test('should handle rich text formatting', async () => {
    const mockPage = {
      id: 'page-id',
      object: 'page',
      parent: { type: 'database_id', database_id: 'test-db' },
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      archived: false,
      url: 'https://notion.so/test-page',
      in_trash: false,
      public_url: null,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: 'Test Page', link: null },
              plain_text: 'Test Page',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
                color: 'default',
                underline: false
              },
              href: null
            }
          ],
        },
      },
    } as PageObjectResponse;

    const mockResponse: ListBlockChildrenResponse = {
      type: 'block',
      block: {},
      object: 'list',
      next_cursor: null,
      has_more: false,
      results: [
        {
          id: 'block-1',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Bold text', link: null },
                plain_text: 'Bold text',
                annotations: {
                  bold: true,
                  italic: false,
                  code: false,
                  strikethrough: false,
                  color: 'default',
                  underline: false
                },
                href: null
              },
              {
                type: 'text',
                text: { content: ' and ', link: null },
                plain_text: ' and ',
                annotations: {
                  bold: false,
                  italic: false,
                  code: false,
                  strikethrough: false,
                  color: 'default',
                  underline: false
                },
                href: null
              },
              {
                type: 'text',
                text: { content: 'italic text', link: null },
                plain_text: 'italic text',
                annotations: {
                  bold: false,
                  italic: true,
                  code: false,
                  strikethrough: false,
                  color: 'default',
                  underline: false
                },
                href: null
              },
            ],
            color: 'default'
          },
          object: 'block',
          created_time: '2024-01-01',
          last_edited_time: '2024-01-01',
          has_children: false,
          archived: false
        }
      ]
    };
    mockNotion.blocks.children.list.mockResolvedValueOnce(mockResponse);

    const markdown = await convertNotionToAstro(mockNotion, mockPage);

    // Verify formatting
    expect(markdown).toContain('**Bold text** and *italic text*  \n');
    // Verify no extra empty lines
    expect(markdown).not.toContain('\n\n\n');
  });
});
