import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ToolCard } from "./components/ToolCard";
import { getMockResponse } from "./components/MockData";
import type { ToolRecommendation } from "./components/MockData";
import { AlertCircle, Sparkles, X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { searchTools, getTools } from "./api/api";

const FEATURED_INDEX_TOOLS: ToolRecommendation[] = [
  { tool_name: "OpenAI", reasoning: "AI models and developer platform.", confidence: 0.9, citations: [], logo_url: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg", website: "https://openai.com" },
  { tool_name: "Anthropic", reasoning: "AI assistant and model platform.", confidence: 0.9, citations: [], logo_url: "https://cdn.simpleicons.org/anthropic/ffffff", website: "https://www.anthropic.com" },
  { tool_name: "Hugging Face", reasoning: "Model hub and AI development platform.", confidence: 0.9, citations: [], logo_url: "https://cdn.simpleicons.org/huggingface/FFD21E", website: "https://huggingface.co" },
  { tool_name: "Google Gemini", reasoning: "Google AI model platform.", confidence: 0.88, citations: [], logo_url: "https://cdn.simpleicons.org/googlegemini/8E75B2", website: "https://gemini.google.com" },
  { tool_name: "GitHub", reasoning: "Developer collaboration platform.", confidence: 0.88, citations: [], logo_url: "https://cdn.simpleicons.org/github/ffffff", website: "https://github.com" },
  { tool_name: "Vercel", reasoning: "Frontend cloud platform.", confidence: 0.86, citations: [], logo_url: "https://cdn.simpleicons.org/vercel/ffffff", website: "https://vercel.com" },
  { tool_name: "Supabase", reasoning: "Open-source backend platform.", confidence: 0.86, citations: [], logo_url: "https://cdn.simpleicons.org/supabase/3FCF8E", website: "https://supabase.com" },
  { tool_name: "Cloudflare", reasoning: "Developer and edge cloud platform.", confidence: 0.86, citations: [], logo_url: "https://cdn.simpleicons.org/cloudflare/F38020", website: "https://cloudflare.com" },
  { tool_name: "Docker", reasoning: "Container platform.", confidence: 0.84, citations: [], logo_url: "https://cdn.simpleicons.org/docker/2496ED", website: "https://docker.com" },
  { tool_name: "Kubernetes", reasoning: "Container orchestration platform.", confidence: 0.84, citations: [], logo_url: "https://cdn.simpleicons.org/kubernetes/326CE5", website: "https://kubernetes.io" },
  { tool_name: "PostgreSQL", reasoning: "Open-source relational database.", confidence: 0.84, citations: [], logo_url: "https://cdn.simpleicons.org/postgresql/4169E1", website: "https://postgresql.org" },
  { tool_name: "MongoDB", reasoning: "Document database platform.", confidence: 0.84, citations: [], logo_url: "https://cdn.simpleicons.org/mongodb/47A248", website: "https://mongodb.com" },
  { tool_name: "Redis", reasoning: "In-memory data store.", confidence: 0.82, citations: [], logo_url: "https://cdn.simpleicons.org/redis/FF4438", website: "https://redis.io" },
  { tool_name: "Elasticsearch", reasoning: "Search and analytics engine.", confidence: 0.82, citations: [], logo_url: "https://cdn.simpleicons.org/elasticsearch/005571", website: "https://elastic.co/elasticsearch" },
  { tool_name: "TensorFlow", reasoning: "Machine learning framework.", confidence: 0.82, citations: [], logo_url: "https://cdn.simpleicons.org/tensorflow/FF6F00", website: "https://tensorflow.org" },
  { tool_name: "PyTorch", reasoning: "Machine learning framework.", confidence: 0.82, citations: [], logo_url: "https://cdn.simpleicons.org/pytorch/EE4C2C", website: "https://pytorch.org" },
  { tool_name: "Python", reasoning: "Programming language for AI and data.", confidence: 0.8, citations: [], logo_url: "https://cdn.simpleicons.org/python/3776AB", website: "https://python.org" },
  { tool_name: "TypeScript", reasoning: "Typed JavaScript language.", confidence: 0.8, citations: [], logo_url: "https://cdn.simpleicons.org/typescript/3178C6", website: "https://typescriptlang.org" },
  { tool_name: "React", reasoning: "UI library for web apps.", confidence: 0.8, citations: [], logo_url: "https://cdn.simpleicons.org/react/61DAFB", website: "https://react.dev" },
  { tool_name: "Next.js", reasoning: "React framework for production apps.", confidence: 0.8, citations: [], logo_url: "https://cdn.simpleicons.org/nextdotjs/ffffff", website: "https://nextjs.org" },
  { tool_name: "Node.js", reasoning: "JavaScript runtime.", confidence: 0.78, citations: [], logo_url: "https://cdn.simpleicons.org/nodedotjs/5FA04E", website: "https://nodejs.org" },
  { tool_name: "Jupyter", reasoning: "Notebook environment for data work.", confidence: 0.78, citations: [], logo_url: "https://cdn.simpleicons.org/jupyter/F37626", website: "https://jupyter.org" },
  { tool_name: "Visual Studio Code", reasoning: "Code editor.", confidence: 0.78, citations: [], logo_url: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/visualstudiocode.svg", website: "https://code.visualstudio.com" },
  { tool_name: "Weights & Biases", reasoning: "AI experiment tracking and model operations.", confidence: 0.78, citations: [], logo_url: "https://cdn.simpleicons.org/weightsandbiases/FFBE00", website: "https://wandb.ai" },
  { tool_name: "Slack", reasoning: "Team communication platform.", confidence: 0.78, citations: [], logo_url: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/slack.svg", website: "https://slack.com" },
  { tool_name: "Notion", reasoning: "Workspace and knowledge base.", confidence: 0.78, citations: [], logo_url: "https://cdn.simpleicons.org/notion/ffffff", website: "https://notion.so" },
  { tool_name: "Airtable", reasoning: "Collaborative database platform.", confidence: 0.78, citations: [], logo_url: "https://cdn.simpleicons.org/airtable/18BFFF", website: "https://airtable.com" },
  { tool_name: "Asana", reasoning: "Work management platform.", confidence: 0.76, citations: [], logo_url: "https://cdn.simpleicons.org/asana/F06A6A", website: "https://asana.com" },
  { tool_name: "Discord", reasoning: "Community communication platform.", confidence: 0.76, citations: [], logo_url: "https://cdn.simpleicons.org/discord/5865F2", website: "https://discord.com" },
  { tool_name: "Jira", reasoning: "Issue and project tracking.", confidence: 0.76, citations: [], logo_url: "https://cdn.simpleicons.org/jira/0052CC", website: "https://www.atlassian.com/software/jira" },
  { tool_name: "Linear", reasoning: "Issue tracking for product teams.", confidence: 0.76, citations: [], logo_url: "https://cdn.simpleicons.org/linear/5E6AD2", website: "https://linear.app" },
  { tool_name: "Figma", reasoning: "Collaborative design platform.", confidence: 0.76, citations: [], logo_url: "https://cdn.simpleicons.org/figma/F24E1E", website: "https://figma.com" },
  { tool_name: "Zapier", reasoning: "Workflow automation platform.", confidence: 0.74, citations: [], logo_url: "https://cdn.simpleicons.org/zapier/FF4A00", website: "https://zapier.com" },
  { tool_name: "Make", reasoning: "Visual automation platform.", confidence: 0.74, citations: [], logo_url: "https://cdn.simpleicons.org/make/6D00CC", website: "https://make.com" },
  { tool_name: "Google Cloud", reasoning: "Cloud infrastructure platform.", confidence: 0.74, citations: [], logo_url: "https://cdn.simpleicons.org/googlecloud/4285F4", website: "https://cloud.google.com" },
  { tool_name: "AWS", reasoning: "Cloud infrastructure platform.", confidence: 0.74, citations: [], logo_url: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/amazonwebservices.svg", website: "https://aws.amazon.com" },
  { tool_name: "Microsoft Azure", reasoning: "Cloud infrastructure platform.", confidence: 0.74, citations: [], logo_url: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/microsoftazure.svg", website: "https://azure.microsoft.com" },
  { tool_name: "Snowflake", reasoning: "Data cloud platform.", confidence: 0.72, citations: [], logo_url: "https://cdn.simpleicons.org/snowflake/29B5E8", website: "https://snowflake.com" },
  { tool_name: "Databricks", reasoning: "Data and AI platform.", confidence: 0.72, citations: [], logo_url: "https://cdn.simpleicons.org/databricks/FF3621", website: "https://databricks.com" },
  { tool_name: "Stripe", reasoning: "Payments infrastructure.", confidence: 0.72, citations: [], logo_url: "https://cdn.simpleicons.org/stripe/635BFF", website: "https://stripe.com" },
  { tool_name: "Shopify", reasoning: "Commerce platform.", confidence: 0.72, citations: [], logo_url: "https://cdn.simpleicons.org/shopify/7AB55C", website: "https://shopify.com" },
  { tool_name: "WordPress", reasoning: "Publishing and website platform.", confidence: 0.72, citations: [], logo_url: "https://cdn.simpleicons.org/wordpress/21759B", website: "https://wordpress.org" },
  { tool_name: "Salesforce", reasoning: "CRM platform.", confidence: 0.72, citations: [], logo_url: "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/salesforce.svg", website: "https://salesforce.com" },
  { tool_name: "Google Analytics", reasoning: "Web analytics platform.", confidence: 0.72, citations: [], logo_url: "https://cdn.simpleicons.org/googleanalytics/E37400", website: "https://analytics.google.com" },
];
// API calls are handled by src/api/api.ts (uses VITE_API_BASE env var)

function IndexToolLogo({ tool }: { tool: ToolRecommendation }) {
  const [imgErr, setImgErr] = useState(false);
  const isWhiteIcon = tool.logo_url?.includes("ffffff") || tool.logo_url?.includes("jsdelivr");
  return (
    <div
      className="flex items-center justify-center group cursor-pointer select-none min-w-0"
      title={tool.tool_name}
      aria-label={tool.tool_name}
    >
      <div className="w-16 h-16 md:w-[76px] md:h-[76px] rounded-xl bg-white/[0.045] border border-white/[0.075] flex items-center justify-center p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] group-hover:border-accent/35 group-hover:bg-white/[0.075] transition-colors duration-300">
        {tool.logo_url && tool.logo_url !== "-" && !imgErr ? (
          <img
            src={tool.logo_url}
            alt={tool.tool_name}
            className={`max-w-full max-h-full object-contain ${isWhiteIcon ? "brightness-0 invert" : ""}`}
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-[28px] font-extrabold text-accent-soft font-display">
            {tool.tool_name.charAt(0)}
          </span>
        )}
      </div>
    </div>
  );
}

interface ReasoningModalProps {
  activeReasoningTool: ToolRecommendation | null;
  setActiveReasoningTool: (tool: ToolRecommendation | null) => void;
  strategy: string;
}

const ReasoningModal: React.FC<ReasoningModalProps> = ({
  activeReasoningTool,
  setActiveReasoningTool,
  strategy,
}) => {
  if (!activeReasoningTool) return null;
  const tool = activeReasoningTool;

  const strategyExplanation =
    strategy === "hybrid"
      ? "Hybrid retrieval fused semantic vector similarity with BM25 keyword scoring to surface this tool. The query contained both conceptual intent and specific terminology."
      : strategy === "dense"
        ? "Semantic (dense) retrieval was selected because the query implied capability-focused matching — embedding similarity surfaces conceptually relevant tools even when keywords differ."
        : strategy === "bm25"
          ? "BM25 keyword retrieval was selected because the query contained precise technical terms, making exact-match scoring the strongest signal."
          : "The LLM router analysed your query and selected the optimal retrieval strategy to surface the most relevant tools from the index.";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => setActiveReasoningTool(null)}
      />

      {/* Drawer panel — slides in from right */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-[#100e1f] border-l border-white/[0.06] shadow-2xl animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent-soft" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest font-display">AI Reasoning</p>
              <h3 className="text-[15px] font-bold text-white font-display leading-tight">{tool.tool_name}</h3>
            </div>
          </div>
          <button
            onClick={() => setActiveReasoningTool(null)}
            className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Why this tool was recommended */}
          <div>
            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3 font-display">
              Why this tool was recommended
            </h4>
            {tool.citations && tool.citations.length > 0 ? (
              <ul className="space-y-2.5">
                {tool.citations.map((cite, i) => (
                  <li key={i} className="flex items-start gap-2.5 font-body">
                    <span className="text-accent-soft shrink-0 mt-0.5 select-none text-sm">•</span>
                    <span className="text-[13px] text-white/75 leading-relaxed">{cite}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-white/55 font-body leading-relaxed">{tool.reasoning}</p>
            )}
          </div>

          {/* Backend reasoning */}
          {strategy && (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-4">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 font-display">
                Backend reasoning
              </h4>
              <p className="text-[12px] text-white/55 font-body leading-relaxed">
                {strategyExplanation}
              </p>
            </div>
          )}

          {/* Visit link */}
          {tool.website && (
            <a
              href={tool.website}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-violet-600 text-white text-[13px] font-semibold shadow-lg shadow-accent/15 hover:shadow-accent/25 active:scale-[0.98] flex items-center justify-center gap-2 transition-all font-display"
            >
              <span>Visit {tool.tool_name}</span>
              <ExternalLink className="w-3.5 h-3.5 text-white/70" />
            </a>
          )}
        </div>
      </div>
    </>
  );
};

export default function App() {
  const [query, setQuery] = useState("");
  const [strategy, setStrategy] = useState("");
  const [_filters, setFilters] = useState<Record<string, any>>({});
  const [tools, setTools] = useState<ToolRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeReasoningTool, setActiveReasoningTool] = useState<ToolRecommendation | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPricing, setSelectedPricing] = useState("All");

  const [allTools, setAllTools] = useState<ToolRecommendation[]>([]);
  const [isBrowsingAll, setIsBrowsingAll] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const indexTools = FEATURED_INDEX_TOOLS;
  const logoRows = [
    indexTools.slice(0, 11),
    indexTools.slice(11, 22),
    indexTools.slice(22, 33),
    indexTools.slice(33, 44),
  ];

  const categories = [
    "LLM Framework",
    "Vector Database",
    "AI Coding Tool",
    "AI Agent",
    "AI Search / Research",
    "AI Infrastructure",
  ];

  // Load all tools on mount to support the Directory/Browse View
  useEffect(() => {
    getTools()
      .then((data) => {
        if (data.tools && data.tools.length > 0) {
          setAllTools(data.tools as ToolRecommendation[]);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch directory from backend, falling back to FEATURED_INDEX_TOOLS:", err);
        setAllTools(FEATURED_INDEX_TOOLS);
      });
  }, []);

  // Reset pagination to page 1 whenever search filters or browsing context changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedPricing, query, isBrowsingAll]);

  const handleSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setQuery("");
      setStrategy("");
      setFilters({});
      setTools([]);
      setIsSearching(false);
      setIsBrowsingAll(false);
      return;
    }

    setIsBrowsingAll(false);
    setIsSearching(true);
    setQuery(trimmed);

    try {
      const data = await searchTools(trimmed);

      setStrategy(data.strategy || "hybrid");
      setFilters(data.filters || {});
      setTools((data.tools || []) as ToolRecommendation[]);
    } catch (error) {
      console.warn("Failed to fetch search results from backend, falling back to mock data:", error);
      const mockResponse = getMockResponse(trimmed);
      setStrategy(mockResponse.strategy);
      setFilters(mockResponse.filters);
      setTools(mockResponse.tools);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBrowseAll = () => {
    setIsBrowsingAll(true);
    setQuery("");
    setStrategy("");
    setFilters({});
    setTools([]);
  };

  // Determine tools list to display based on state
  const currentToolsSource = isBrowsingAll ? allTools : tools;

  const filteredTools = currentToolsSource.filter((tool) => {
    const categoryLower = (tool as any).category?.toLowerCase() || "";
    let uiCategory = "LLM Framework";

    if (categoryLower.includes("framework") || categoryLower.includes("orchestrator") || categoryLower.includes("rag")) {
      uiCategory = "LLM Framework";
    } else if (categoryLower.includes("database") || categoryLower.includes("vector") || categoryLower.includes("index")) {
      uiCategory = "Vector Database";
    } else if (categoryLower.includes("coding") || categoryLower.includes("code") || categoryLower.includes("editor") || categoryLower.includes("ide") || categoryLower.includes("develop")) {
      uiCategory = "AI Coding Tool";
    } else if (categoryLower.includes("agent") || categoryLower.includes("autonomous") || categoryLower.includes("crew") || categoryLower.includes("mult-agent")) {
      uiCategory = "AI Agent";
    } else if (categoryLower.includes("search") || categoryLower.includes("research") || categoryLower.includes("discovery") || categoryLower.includes("eval")) {
      uiCategory = "AI Search / Research";
    } else if (categoryLower.includes("infrastructure") || categoryLower.includes("inference") || categoryLower.includes("host") || categoryLower.includes("ops") || categoryLower.includes("deploy")) {
      uiCategory = "AI Infrastructure";
    } else if (tool.tool_name === "Qdrant") {
      uiCategory = "Vector Database";
    }

    const matchesCategory = selectedCategory === "All" || uiCategory === selectedCategory;

    // Pricing: direct raw match against the dataset pricing field (case-insensitive)
    const pricingRaw = ((tool as any).pricing || "").toLowerCase().trim();
    let matchesPricing = true;
    if (selectedPricing !== "All") {
      matchesPricing = pricingRaw.includes(selectedPricing.toLowerCase());
    }

    return matchesCategory && matchesPricing;
  });

  // Sort tools alphabetically by name
  const sortedFilteredTools = [...filteredTools].sort((a, b) =>
    a.tool_name.localeCompare(b.tool_name)
  );

  // Calculate paginated tools
  const totalItems = sortedFilteredTools.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const activePage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTools = sortedFilteredTools.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate sliding page window (only show 5 pages max at a time)
  let startPage = Math.max(1, activePage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  /* ── Loading state for initial home page search ── */
  if (isSearching && !query) {
    return (
      <div className="min-h-screen relative">
        <Header onSearch={handleSearch} isSearching={true} />
      </div>
    );
  }

  /* ── Idle state: hero + integration cloud logo grid ── */
  if (!query && !isBrowsingAll) {
    return (
      <div className="relative pb-24">
        <ReasoningModal
          activeReasoningTool={activeReasoningTool}
          setActiveReasoningTool={setActiveReasoningTool}
          strategy={strategy}
        />
        {/* Hero */}
        <Header onSearch={handleSearch} isSearching={false} />

        {/* Integration-style logo cloud */}
        <section className="relative w-full px-5 py-20 md:py-24 overflow-hidden">
          <div className="absolute inset-x-0 top-4 h-[620px] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.16),rgba(14,12,28,0.08)_45%,transparent_72%)]" />

          {/* Section heading */}
          <div className="relative z-10 text-center mb-16">
            <h2 className="mx-auto max-w-4xl text-[clamp(1.8rem,4.2vw,3.5rem)] leading-[1.1] font-light text-white/70 font-display tracking-tight">
              Discover AI tools for your data,
              <br />
              <span className="text-white/70">stack, and workflow</span>
            </h2>
            <p className="mt-5 text-[14px] md:text-[15px] text-white/35 font-body max-w-xl mx-auto leading-relaxed">
              Search across frameworks, agents, vector databases, automation platforms, and AI infrastructure.
            </p>
          </div>

          {indexTools.length > 0 ? (
            <div className="integration-cloud relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-4 md:gap-5">
              {logoRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className={`flex min-w-max items-center justify-center gap-4 md:gap-5 ${rowIndex % 2 === 1 ? "translate-x-8 md:translate-x-12" : "-translate-x-8 md:-translate-x-12"}`}
                >
                  {row.map((tool) => (
                    <IndexToolLogo key={tool.tool_name} tool={tool} />
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          <div className="relative z-10 mt-16 flex justify-center">
            <button
              type="button"
              onClick={handleBrowseAll}
              className="group relative inline-flex items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.04] px-7 py-3.5 text-[13px] font-semibold text-white/80 backdrop-blur-sm hover:border-accent/40 hover:bg-accent/10 hover:text-white active:scale-[0.97] transition-all duration-200 font-display shadow-lg shadow-black/20"
            >
              <span className="w-2 h-2 rounded-full bg-accent/70 group-hover:bg-accent animate-pulse shrink-0" />
              Browse the full index
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* ── Results/Browse state ── */
  return (
    <div className="min-h-screen relative pb-24">
      {/* Reasoning Modal */}
      <ReasoningModal
        activeReasoningTool={activeReasoningTool}
        setActiveReasoningTool={setActiveReasoningTool}
        strategy={strategy}
      />

      {/* Compact top bar for results view */}
      <div className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-white/[0.04] px-6 md:px-10 py-4 flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => {
            setQuery("");
            setStrategy("");
            setTools([]);
            setIsBrowsingAll(false);
          }}
        >
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L20 6.5V17.5L12 22L4 17.5V6.5L12 2Z" />
              <path d="M12 6L18 9.5V14.5L12 18L6 14.5V9.5L12 6Z" fill="rgba(255, 255, 255, 0.2)" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="20" y1="6.5" x2="18" y2="9.5" />
              <line x1="4" y1="6.5" x2="6" y2="9.5" />
              <line x1="20" y1="17.5" x2="18" y2="14.5" />
              <line x1="4" y1="17.5" x2="6" y2="14.5" />
            </svg>
          </div>
          <span className="text-base font-bold text-white tracking-tight font-display">doomstack</span>
        </div>

        {/* Inline search (compact) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = (fd.get("q") as string)?.trim() || "";
            handleSearch(q);
          }}
          className="hidden sm:block flex-1 max-w-md mx-8"
        >
          <div className="search-bar rounded-full flex items-center px-4 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              key={query}
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Search tools…"
              className="flex-1 bg-transparent border-none outline-none text-xs text-white/80 placeholder-white/25 px-3 py-1 font-body"
            />
          </div>
        </form>
      </div>

      {/* Results grid */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-24 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Filters
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedPricing={selectedPricing}
            setSelectedPricing={setSelectedPricing}
            categories={categories}
          />
        </div>

        <div className="lg:col-span-3">
          {isSearching ? (
            /* Smooth loading spinner for results page search */
            <div className="w-full py-32 flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-white/40 uppercase tracking-widest font-display">
                Updating index recommendations...
              </span>
            </div>
          ) : sortedFilteredTools.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up">
                {currentTools.map((tool) => (
                  <ToolCard
                    key={tool.tool_name}
                    tool={tool}
                    onViewReasoning={setActiveReasoningTool}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2 pt-6 border-t border-white/[0.04] animate-fade-up">
                  {/* Previous Page Button */}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={activePage === 1}
                    className="w-10 h-10 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.95] disabled:opacity-30 disabled:pointer-events-none border border-white/[0.05] flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>

                  {/* Page Numbers Tabs */}
                  {pageNumbers.map((pageNum) => {
                    const isActive = pageNum === activePage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center border active:scale-[0.95] ${
                          isActive
                            ? "bg-accent border-accent text-white shadow-lg shadow-accent/20"
                            : "bg-white/[0.03] hover:bg-white/[0.08] text-white/70 border-white/[0.05]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Page Button */}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={activePage === totalPages}
                    className="w-10 h-10 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.95] disabled:opacity-30 disabled:pointer-events-none border border-white/[0.05] flex items-center justify-center transition-all cursor-pointer"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full py-24 glass-card rounded-2xl flex flex-col items-center justify-center gap-3 text-center p-6">
              <AlertCircle className="w-10 h-10 text-amber-500/70" />
              <h4 className="font-bold text-white/80 font-display">No matching tools</h4>
              <p className="text-sm text-white/30 max-w-sm font-body">
                Try adjusting your filters or modifying your search query.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
