# Installation Guide

If you encounter an error when using the shadcn CLI installation command, follow these alternative installation steps:

## Option 1: Direct Download

1. Download the project ZIP file from v0
2. Extract the ZIP file
3. Navigate to the project directory
4. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
5. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Option 2: Manual Component Installation

If you need to add or update shadcn components manually:

1. Make sure your `components.json` is configured correctly
2. Install components individually:
   \`\`\`bash
   npx shadcn@latest add button
   npx shadcn@latest add card
   # etc.
   \`\`\`

## Dependencies

The project uses the following main dependencies:
- Next.js 14+
- React 18+
- Tailwind CSS v4
- shadcn/ui components
- docx (for DOCX generation)
- mammoth (for DOCX parsing)

All UI components are already included in the project, so you don't need to fetch them from the registry.

## Troubleshooting

If you encounter registry errors:
1. All required components are already in the `components/ui` directory
2. You can safely ignore registry fetch errors during installation
3. Simply run `npm install` to install the required packages
