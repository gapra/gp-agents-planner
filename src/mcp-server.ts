import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { GenerateApiSpecSchema, AnalyzeFeasibilitySchema } from "./tools/schemas.js";
import { loadMarkdown } from "./utils/markdown-loader.js";

export class McpAgentServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "sdlc-feature-planning-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupPromptHandlers();
    this.setupToolHandlers();
  }

  // --- REGISTRASI AGENTS (PROMPTS) ---
  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "feature_architect",
            description: "Principal Architect persona for designing systems.",
          },
          {
            name: "tech_researcher",
            description: "Senior Researcher for evaluating dependencies and feasibility.",
          }
        ]
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const name = request.params.name;
      let content = "";

      if (name === "feature_architect") {
        content = await loadMarkdown("agents/FeatureArchitect.md");
      } else if (name === "tech_researcher") {
        content = await loadMarkdown("agents/TechResearcher.md");
      } else {
        throw new Error("Prompt not found");
      }

      return {
        description: `System prompt for ${name}`,
        messages: [
          {
            role: "user",
            content: { type: "text", text: content }
          }
        ]
      };
    });
  }

  // --- REGISTRASI SKILLS (TOOLS) ---
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "generate_enterprise_api_spec",
            description: "Generates an OpenAPI 3.1.0 specification.",
            inputSchema: zodToJsonSchema(GenerateApiSpecSchema),
          },
          {
            name: "analyze_technical_feasibility",
            description: "Evaluates implementation risks and dependencies.",
            inputSchema: zodToJsonSchema(AnalyzeFeasibilitySchema),
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "generate_enterprise_api_spec") {
          const parsedArgs = GenerateApiSpecSchema.parse(args);
          // TODO: Implementasi riil YAML generator
          const yamlOutput = `openapi: 3.1.0\ninfo:\n  title: ${parsedArgs.title}\n  version: ${parsedArgs.version}\n# Generated paths...`;
          return { content: [{ type: "text", text: yamlOutput }] };
        }

        if (name === "analyze_technical_feasibility") {
          const parsedArgs = AnalyzeFeasibilitySchema.parse(args);
          // TODO: Implementasi riil dependency checker
          const report = `### Feasibility Report\n- **Stack Checked:** ${parsedArgs.proposed_stack.join(', ')}\n- **Risk Score:** 3/10`;
          return { content: [{ type: "text", text: report }] };
        }

        throw new Error(`Tool not found: ${name}`);
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
          isError: true,
        };
      }
    });
  }

  // --- START SERVER TRANSPORT ---
  public async start() {
    // Menggunakan stdio agar bisa dibaca oleh Claude Desktop / Cursor
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 SDLC MCP Server running on stdio transport");
  }
}