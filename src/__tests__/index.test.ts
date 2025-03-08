import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';
import type { PageObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import { main } from '../index.js';

// Mock fs and Client
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));
jest.mock('@notionhq/client', () => {
  return {
    Client: jest.fn().mockImplementation((options) => createMockClient())
  };
});

// Import necessary types
import type {
  QueryDatabaseResponse,
  ListBlockChildrenResponse
} from '@notionhq/client/build/src/api-endpoints.js';

// Create proper mock types
type MockedClient = {
  databases: {
    query: jest.Mock;
  };
  blocks: {
    children: {
      list: jest.Mock;
    };
    retrieve: jest.Mock;
  };
  pages: {
    retrieve: jest.Mock;
  };
  users: {
    retrieve: jest.Mock;
  };
  search: jest.Mock;
  request: jest.Mock;
};

const createMockClient = (): MockedClient => ({
  databases: {
    query: jest.fn()
  },
  blocks: {
    children: {
      list: jest.fn()
    },
    retrieve: jest.fn()
  },
  pages: {
    retrieve: jest.fn()
  },
  users: {
    retrieve: jest.fn()
  },
  search: jest.fn(),
  request: jest.fn()
});

// Mock environment variables
process.env.NOTION_TOKEN = 'test-token';
process.env.NOTION_DATABASE_ID = 'test-database-id';
process.env.OUTPUT_DIR = 'test-output';

describe('Notion to Astro converter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fs mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  test('should use original page title for filename', async () => {

    // Mock Notion client response
    const mockPage: Partial<PageObjectResponse> = {
      id: 'test-page-id',
      object: 'page',
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              plain_text: 'Test Page Title',
              type: 'text',
              text: { 
                content: 'Test Page Title',
                link: null
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
              },
              href: null
            }
          ]
        }
      }
    };

    MockClient.mockImplementation(() => {
      return {
        databases: {
          query: jest.fn().mockResolvedValue({
            results: [mockPage]
          })
        },
        blocks: { retrieve: jest.fn() },
        pages: { retrieve: jest.fn() },
        users: { retrieve: jest.fn() },
        search: jest.fn(),
        request: jest.fn()
      } as unknown as Client;
    });

    await main();

    // Verify that writeFileSync was called with the correct filename
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('Test Page Title.md'),
      expect.any(String),
      'utf8'
    );
  });

  test('should handle special characters in title', async () => {
    const mockPage: Partial<PageObjectResponse> = {
      id: 'test-page-id',
      object: 'page',
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [
            {
              plain_text: 'Test: Page * With ? Special / Characters',
              type: 'text',
              text: { 
                content: 'Test: Page * With ? Special / Characters',
                link: null
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default'
              },
              href: null
            }
          ]
        }
      }
    };

    MockClient.mockImplementation(() => {
      return {
        databases: {
          query: jest.fn().mockResolvedValue({
            results: [mockPage]
          })
        },
        blocks: { retrieve: jest.fn() },
        pages: { retrieve: jest.fn() },
        users: { retrieve: jest.fn() },
        search: jest.fn(),
        request: jest.fn()
      } as unknown as Client;
    });

    await main();

    // Verify that invalid characters are replaced with hyphens
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('Test- Page - With - Special - Characters.md'),
      expect.any(String),
      'utf8'
    );
  });

  test('should only process published pages', async () => {
    const mockPublishedPage: PageObjectResponse = {
      id: 'published-page-id',
      object: 'page',
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      parent: { type: 'database_id', database_id: 'database-id' },
      archived: false,
      url: 'https://notion.so/page-id',
      in_trash: false,
      public_url: null,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [{ plain_text: 'Published Page', type: 'text', text: { content: 'Published Page', link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, href: null }]
        },
        publish: {
          id: 'publish-id',
          type: 'checkbox',
          checkbox: true
        }
      }
    };

    let queryFilter: any;
    const mockClient = createMockClient();
    mockClient.databases.query.mockImplementation((params: any) => {
      queryFilter = params.filter;
      const response: QueryDatabaseResponse = {
        type: 'page',
        page: {},
        object: 'list',
        results: [mockPublishedPage],
        next_cursor: null,
        has_more: false
      };
      return Promise.resolve(response);
    });
    mockClient.blocks.children.list.mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    } as ListBlockChildrenResponse);

    await main();

    // Verify that the correct filter was used
    expect(queryFilter).toEqual({
      property: 'publish',
      checkbox: {
        equals: true
      }
    });

    // Verify that the published page was processed
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('Published Page.md'),
      expect.any(String),
      'utf8'
    );
  });

  test('should skip unpublished pages', async () => {
    const mockUnpublishedPage: PageObjectResponse = {
      id: 'unpublished-page-id',
      object: 'page',
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      parent: { type: 'database_id', database_id: 'database-id' },
      archived: false,
      url: 'https://notion.so/page-id',
      in_trash: false,
      public_url: null,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [{ plain_text: 'Unpublished Page', type: 'text', text: { content: 'Unpublished Page', link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, href: null }]
        },
        publish: {
          id: 'publish-id',
          type: 'checkbox',
          checkbox: false
        }
      }
    };

    const mockClient = createMockClient();
    mockClient.databases.query.mockResolvedValue({
      type: 'page',
      page: {},
      object: 'list',
      results: [mockUnpublishedPage],
      next_cursor: null,
      has_more: false
    } as QueryDatabaseResponse);
    mockClient.blocks.children.list.mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    } as ListBlockChildrenResponse);

    await main();

    // Verify that no files were written since the page is not published
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test('should handle pages without publish property', async () => {
    const mockPageWithoutPublish: PageObjectResponse = {
      id: 'no-publish-page-id',
      object: 'page',
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      parent: { type: 'database_id', database_id: 'database-id' },
      archived: false,
      url: 'https://notion.so/page-id',
      in_trash: false,
      public_url: null,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: [{ plain_text: 'No Publish Page', type: 'text', text: { content: 'No Publish Page', link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, href: null }]
        }
      }
    };

    const mockClient = createMockClient();
    mockClient.databases.query.mockResolvedValue({
      type: 'page',
      page: {},
      object: 'list',
      results: [mockPageWithoutPublish],
      next_cursor: null,
      has_more: false
    } as QueryDatabaseResponse);
    mockClient.blocks.children.list.mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    } as ListBlockChildrenResponse);

    await main();

    // Verify that no files were written since the page doesn't have publish=true
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test('should use "untitled" for pages without title', async () => {
    const mockPage: PageObjectResponse = {
      id: 'test-page-id',
      object: 'page',
      created_time: '2024-01-01T00:00:00.000Z',
      last_edited_time: '2024-01-01T00:00:00.000Z',
      created_by: { object: 'user', id: 'user-id' },
      last_edited_by: { object: 'user', id: 'user-id' },
      cover: null,
      icon: null,
      parent: { type: 'database_id', database_id: 'database-id' },
      archived: false,
      url: 'https://notion.so/page-id',
      in_trash: false,
      public_url: null,
      properties: {
        title: {
          id: 'title-id',
          type: 'title',
          title: []
        },
        publish: {
          id: 'publish-id',
          type: 'checkbox',
          checkbox: true
        }
      }
    };

    const mockClient = createMockClient();
    mockClient.databases.query.mockResolvedValue({
      type: 'page',
      page: {},
      object: 'list',
      results: [mockPage],
      next_cursor: null,
      has_more: false
    } as QueryDatabaseResponse);
    mockClient.blocks.children.list.mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    } as ListBlockChildrenResponse);

    await main();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('untitled.md'),
      expect.any(String),
      'utf8'
    );
  });
});
