import { Client } from '@notionhq/client';
import { convertNotionToAstro } from '../converter';

// Mock Notion client
jest.mock('@notionhq/client', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      blocks: {
        children: {
          list: jest.fn(),
        },
      },
    })),
  };
});

describe('convertNotionToAstro', () => {
  let mockNotion: jest.MockedObject<Client>;

  beforeEach(() => {
    mockNotion = new Client({ auth: 'mock-token' }) as jest.MockedObject<Client>;
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should convert a simple page with title and content', async () => {
    const mockPage = {
      id: 'page-id',
      properties: {
        title: {
          type: 'title',
          title: [
            {
              type: 'text',
              text: { content: 'Test Page' },
              plain_text: 'Test Page',
              annotations: {
                bold: false,
                italic: false,
                code: false,
                strikethrough: false,
              },
            },
          ],
        },
      },
    };

    // Mock empty blocks response
    (mockNotion.blocks.children.list as jest.Mock).mockResolvedValue({
      results: [],
      has_more: false,
    });

    const markdown = await convertNotionToAstro(mockNotion, mockPage as any);

    // Verify frontmatter
    expect(markdown).toContain('---');
    expect(markdown).toContain('title: "Test Page"');
    expect(markdown).toContain('draft: false');
    expect(markdown).toMatch(/date: "\d{4}-\d{2}-\d{2}"/);
  });

  it('should handle various block types', async () => {
    const mockPage = {
      id: 'page-id',
      properties: {
        title: {
          type: 'title',
          title: [{ plain_text: 'Test Page', type: 'text', text: { content: 'Test Page' }, annotations: {} }],
        },
      },
    };

    // Mock blocks response
    (mockNotion.blocks.children.list as jest.Mock).mockResolvedValue({
      results: [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Normal text' },
                plain_text: 'Normal text',
                annotations: {
                  bold: false,
                  italic: false,
                  code: false,
                  strikethrough: false,
                },
              },
            ],
          },
        },
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Heading 1' },
                plain_text: 'Heading 1',
                annotations: {},
              },
            ],
          },
        },
      ],
      has_more: false,
    } as any);

    const markdown = await convertNotionToAstro(mockNotion, mockPage as any);

    // Verify content conversion
    expect(markdown).toContain('Normal text');
    expect(markdown).toContain('# Heading 1');
  });

  it('should handle rich text formatting', async () => {
    const mockPage = {
      id: 'page-id',
      properties: {
        title: {
          type: 'title',
          title: [{ plain_text: 'Test Page', type: 'text', text: { content: 'Test Page' }, annotations: {} }],
        },
      },
    };

    (mockNotion.blocks.children.list as jest.Mock).mockResolvedValue({
      results: [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: 'Bold text' },
                plain_text: 'Bold text',
                annotations: {
                  bold: true,
                  italic: false,
                  code: false,
                  strikethrough: false,
                },
              },
              {
                type: 'text',
                text: { content: ' and ' },
                plain_text: ' and ',
                annotations: {
                  bold: false,
                  italic: false,
                  code: false,
                  strikethrough: false,
                },
              },
              {
                type: 'text',
                text: { content: 'italic text' },
                plain_text: 'italic text',
                annotations: {
                  bold: false,
                  italic: true,
                  code: false,
                  strikethrough: false,
                },
              },
            ],
          },
        },
      ],
      has_more: false,
    } as any);

    const markdown = await convertNotionToAstro(mockNotion, mockPage as any);

    // Verify formatting
    expect(markdown).toContain('**Bold text** and *italic text*');
  });
});
