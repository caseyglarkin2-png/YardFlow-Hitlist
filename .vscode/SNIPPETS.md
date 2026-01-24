# YardFlow Hitlist - Code Snippets

## TypeScript React Component
```json
{
  "Next.js Server Component": {
    "prefix": "nsc",
    "body": [
      "import { auth } from '@/auth';",
      "import { prisma } from '@/lib/db';",
      "",
      "export default async function ${1:ComponentName}() {",
      "  const session = await auth();",
      "  if (!session?.user?.id) redirect('/login');",
      "",
      "  return (",
      "    <div>",
      "      <h1>${1:ComponentName}</h1>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ],
    "description": "Next.js Server Component with auth"
  },
  
  "API Route": {
    "prefix": "api",
    "body": [
      "import { NextResponse } from 'next/server';",
      "import { auth } from '@/auth';",
      "import { prisma } from '@/lib/db';",
      "import { logger } from '@/lib/logger';",
      "",
      "export async function ${1|GET,POST,PUT,DELETE|}(request: Request) {",
      "  const session = await auth();",
      "  if (!session?.user?.id) {",
      "    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });",
      "  }",
      "",
      "  try {",
      "    $0",
      "    return NextResponse.json({ success: true, data });",
      "  } catch (error) {",
      "    logger.error('${2:Operation failed}', { error });",
      "    return NextResponse.json({ error: '${2:Operation failed}' }, { status: 500 });",
      "  }",
      "}"
    ],
    "description": "Protected API route with error handling"
  },
  
  "Lazy Initialization": {
    "prefix": "lazy",
    "body": [
      "let ${1:client}: ${2:ClientType} | null = null;",
      "",
      "export function get${1/(.*)/${1:/capitalize}/}(): ${2:ClientType} {",
      "  if (!${1:client}) {",
      "    ${1:client} = new ${2:ClientType}(${3:config});",
      "  }",
      "  return ${1:client};",
      "}"
    ],
    "description": "Lazy initialization pattern for external services"
  },
  
  "Logger Usage": {
    "prefix": "log",
    "body": [
      "logger.${1|info,warn,error,debug|}('${2:Message}', { ${3:context} });"
    ],
    "description": "Structured JSON logging"
  },
  
  "Prisma Query with Pagination": {
    "prefix": "prisma-page",
    "body": [
      "import { parsePaginationParams, buildPaginatedResponse } from '@/lib/pagination';",
      "",
      "const { cursor, limit } = parsePaginationParams(searchParams);",
      "const items = await prisma.${1:model}.findMany({",
      "  where: { $2 },",
      "  ...cursor,",
      "  take: limit,",
      "});",
      "",
      "return NextResponse.json(buildPaginatedResponse(items, limit));"
    ],
    "description": "Prisma query with cursor pagination"
  },
  
  "Vitest Test": {
    "prefix": "test",
    "body": [
      "import { describe, it, expect, beforeEach, jest } from 'vitest';",
      "import { ${1:FunctionName} } from '../${2:file-name}';",
      "import { prisma } from '@/lib/db';",
      "",
      "jest.mock('@/lib/db', () => ({",
      "  prisma: {",
      "    ${3:model}: {",
      "      findMany: jest.fn(),",
      "    },",
      "  },",
      "}));",
      "",
      "describe('${1:FunctionName}', () => {",
      "  beforeEach(() => {",
      "    jest.clearAllMocks();",
      "  });",
      "",
      "  it('should ${4:description}', async () => {",
      "    (prisma.${3:model}.findMany as jest.Mock).mockResolvedValue([]);",
      "    ",
      "    const result = await ${1:FunctionName}();",
      "    ",
      "    expect(result).toBeDefined();",
      "    $0",
      "  });",
      "});"
    ],
    "description": "Vitest test with Prisma mock"
  },
  
  "Agent Implementation": {
    "prefix": "agent",
    "body": [
      "import { logger } from '@/lib/logger';",
      "import { prisma } from '@/lib/db';",
      "",
      "export interface ${1:AgentName}Input {",
      "  $2",
      "}",
      "",
      "export interface ${1:AgentName}Output {",
      "  $3",
      "}",
      "",
      "export class ${1:AgentName} {",
      "  async execute(input: ${1:AgentName}Input): Promise<${1:AgentName}Output> {",
      "    logger.info('${1:AgentName} started', { input });",
      "",
      "    try {",
      "      $0",
      "      ",
      "      logger.info('${1:AgentName} completed');",
      "      return output;",
      "    } catch (error) {",
      "      logger.error('${1:AgentName} failed', { error });",
      "      throw error;",
      "    }",
      "  }",
      "}"
    ],
    "description": "Agent implementation template"
  },
  
  "Cron Job Route": {
    "prefix": "cron",
    "body": [
      "import { NextResponse } from 'next/server';",
      "import { logger } from '@/lib/logger';",
      "",
      "export async function GET(request: Request) {",
      "  const authHeader = request.headers.get('authorization');",
      "  if (authHeader !== `Bearer \\${process.env.CRON_SECRET}`) {",
      "    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });",
      "  }",
      "",
      "  logger.info('${1:CronJob} started');",
      "",
      "  try {",
      "    $0",
      "    ",
      "    return NextResponse.json({ ",
      "      success: true,",
      "      timestamp: new Date().toISOString()",
      "    });",
      "  } catch (error) {",
      "    logger.error('${1:CronJob} failed', { error });",
      "    return NextResponse.json({ error: 'Failed' }, { status: 500 });",
      "  }",
      "}"
    ],
    "description": "Cron job API route with CRON_SECRET auth"
  }
}
```

Save this as `.vscode/snippets.code-snippets` for project-specific snippets.
