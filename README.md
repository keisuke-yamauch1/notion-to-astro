# Notion to Astro Markdown Converter

A tool to convert Notion pages to Astro-compatible markdown files. This tool fetches content from your Notion database and converts it into markdown files that can be used with Astro's content collections.

## Features

- Converts Notion pages to Astro-compatible markdown
- Preserves formatting (bold, italic, code, etc.)
- Generates proper frontmatter
- Supports multiple block types:
  - Paragraphs
  - Headings (H1, H2, H3)
  - Bulleted lists
  - Numbered lists
  - Code blocks
  - Quotes
  - Links

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/notion-to-astro.git
cd notion-to-astro
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file and configure it:
```bash
cp .env.example .env
```

## Configuration

Edit the `.env` file and set the following variables:

- `NOTION_TOKEN`: Your Notion integration token
- `NOTION_DATABASE_ID`: The ID of your Notion database
- `OUTPUT_DIR`: Directory where markdown files will be saved (default: src/content/blog)

### Getting Notion Credentials

1. Create a Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name and submit
   - Copy the "Internal Integration Token"

2. Share your database with the integration:
   - Open your Notion database
   - Click "Share" and invite your integration
   - Copy the database ID from the URL (the part after the workspace name and before the "?")

## Usage

1. Build the project:
```bash
npm run build
```

2. Run the converter:
```bash
npm start
```

The tool will:
1. Fetch all pages from your Notion database
2. Convert them to markdown format
3. Save them in the specified output directory
4. Generate filenames based on page titles

## Output Format

Each markdown file will include:

```markdown
---
title: "Your Page Title"
date: "2024-03-08"
draft: false
---

Your content here...
```

## Error Handling

- The tool will continue processing other pages if one page fails
- Errors are logged to the console
- Each page conversion is handled independently

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License