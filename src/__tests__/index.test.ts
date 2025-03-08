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
    Client: jest.fn().mockImplementation((options) => createMockClient()) as unknown as typeof Client
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
    // Spy on console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  test('should use original page title for filename', async () => {

    // Mock Notion client response
    const mockPage: PageObjectResponse = {
      id: 'test-page-id',
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

    (Client as jest.Mock).mockImplementation(() => ({
        databases: {
          query: jest.fn().mockResolvedValue({
            type: 'page_or_database',
            page_or_database: {},
            object: 'list',
            results: [mockPage],
            next_cursor: null,
            has_more: false
          })
        },
        blocks: { retrieve: jest.fn() },
        pages: { retrieve: jest.fn() },
        users: { retrieve: jest.fn() },
        search: jest.fn(),
        request: jest.fn()
      } as unknown as Client));

    await main();

    // Verify that writeFileSync was called with the correct filename
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('Test Page Title.md'),
      expect.any(String),
      'utf8'
    );

    // Verify console output
    expect(console.log).toHaveBeenCalledWith('\n=== Generated Content ===');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('File:'));
    expect(console.log).toHaveBeenCalledWith('Content:');
    expect(console.log).toHaveBeenCalledWith(expect.any(String)); // markdown content
    expect(console.log).toHaveBeenCalledWith('======================\n');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Converted page "Test Page Title"'));
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
        published: {
          id: 'published-id',
          type: 'checkbox',
          checkbox: true
        },
        done: {
          id: 'done-id',
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
      and: [
        {
          property: 'published',
          checkbox: {
            equals: true
          }
        },
        {
          property: 'done',
          checkbox: {
            equals: true
          }
        }
      ]
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
        published: {
          id: 'published-id',
          type: 'checkbox',
          checkbox: false
        },
        done: {
          id: 'done-id',
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

  test('should skip pages with published=true but done=false', async () => {
    const mockPublishedButNotDonePage: PageObjectResponse = {
      id: 'published-not-done-page-id',
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
          title: [{ plain_text: 'Published But Not Done Page', type: 'text', text: { content: 'Published But Not Done Page', link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, href: null }]
        },
        published: {
          id: 'published-id',
          type: 'checkbox',
          checkbox: true
        },
        done: {
          id: 'done-id',
          type: 'checkbox',
          checkbox: false
        }
      }
    };

    const mockClient = createMockClient();
    (mockClient.databases.query as jest.Mock<Promise<QueryDatabaseResponse>>).mockResolvedValue({
      type: 'page_or_database',
      page_or_database: {},
      object: 'list',
      results: [mockPublishedButNotDonePage],
      next_cursor: null,
      has_more: false
    });
    (mockClient.blocks.children.list as jest.Mock<Promise<ListBlockChildrenResponse>>).mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    });

    await main();

    // Verify that no files were written since the page is not done
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test('should skip pages with done=true but published=false', async () => {
    const mockDoneButNotPublishedPage: PageObjectResponse = {
      id: 'done-not-published-page-id',
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
          title: [{ plain_text: 'Done But Not Published Page', type: 'text', text: { content: 'Done But Not Published Page', link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: 'default' }, href: null }]
        },
        published: {
          id: 'published-id',
          type: 'checkbox',
          checkbox: false
        },
        done: {
          id: 'done-id',
          type: 'checkbox',
          checkbox: true
        }
      }
    };

    const mockClient = createMockClient();
    (mockClient.databases.query as jest.Mock<Promise<QueryDatabaseResponse>>).mockResolvedValue({
      type: 'page_or_database',
      page_or_database: {},
      object: 'list',
      results: [mockDoneButNotPublishedPage],
      next_cursor: null,
      has_more: false
    });
    (mockClient.blocks.children.list as jest.Mock<Promise<ListBlockChildrenResponse>>).mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    });

    await main();

    // Verify that no files were written since the page is not published
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test('should handle pages without required properties', async () => {
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
    (mockClient.databases.query as jest.Mock<Promise<QueryDatabaseResponse>>).mockResolvedValue({
      type: 'page_or_database',
      page_or_database: {},
      object: 'list',
      results: [mockPageWithoutPublish],
      next_cursor: null,
      has_more: false
    });
    (mockClient.blocks.children.list as jest.Mock<Promise<ListBlockChildrenResponse>>).mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    });

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
        published: {
          id: 'published-id',
          type: 'checkbox',
          checkbox: true
        },
        done: {
          id: 'done-id',
          type: 'checkbox',
          checkbox: true
        }
      }
    };

    const mockClient = createMockClient();
    (mockClient.databases.query as jest.Mock<Promise<QueryDatabaseResponse>>).mockResolvedValue({
      type: 'page_or_database',
      page_or_database: {},
      object: 'list',
      results: [mockPage],
      next_cursor: null,
      has_more: false
    });
    (mockClient.blocks.children.list as jest.Mock<Promise<ListBlockChildrenResponse>>).mockResolvedValue({
      type: 'block',
      block: {},
      object: 'list',
      results: [],
      next_cursor: null,
      has_more: false
    });

    await main();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('untitled.md'),
      expect.any(String),
      'utf8'
    );
  });
});
