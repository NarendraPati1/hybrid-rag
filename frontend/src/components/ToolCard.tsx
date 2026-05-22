import React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import type { ToolRecommendation } from "./MockData";

interface ToolCardProps {
  tool: ToolRecommendation;
  onViewReasoning: (tool: ToolRecommendation) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onViewReasoning }) => {
  const [logoError, setLogoError] = React.useState(false);

  return (
    <div className="glass-card rounded-2xl p-5 relative flex flex-col justify-between group overflow-hidden">
      {/* Top: Logo + name + AI Reasoning button */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {tool.logo_url && tool.logo_url !== "-" && !logoError ? (
            <div className="w-11 h-11 rounded-xl bg-surface-overlay p-2 flex items-center justify-center border border-white/[0.04] shrink-0">
              <img
                src={tool.logo_url}
                alt={tool.tool_name}
                className={`max-w-full max-h-full object-contain rounded ${
                  tool.logo_url.includes("ffffff") || tool.logo_url.includes("jsdelivr") ? "brightness-0 invert" : ""
                }`}
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-surface-overlay flex items-center justify-center border border-white/[0.04] font-bold text-accent-soft font-display shrink-0">
              {tool.tool_name.charAt(0)}
            </div>
          )}
          <div>
            <h4 className="text-[15px] font-bold text-white/90 group-hover:text-accent-soft transition-colors font-display">
              {tool.tool_name}
            </h4>
            {tool.website && (
              <span className="text-[10px] text-white/35 font-body">
                {(() => { try { return new URL(tool.website).hostname; } catch { return tool.website; } })()}
              </span>
            )}
          </div>
        </div>

        {/* AI Reasoning sparkle button — top-right */}
        <button
          onClick={() => onViewReasoning(tool)}
          title="View AI reasoning"
          className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-accent/10 hover:border-accent/30 flex items-center justify-center transition-all group/spark"
        >
          <Sparkles className="w-3.5 h-3.5 text-white/30 group-hover/spark:text-accent-soft transition-colors" />
        </button>
      </div>

      {/* Description */}
      <p className="text-[13px] text-white/60 leading-relaxed mb-5 font-body flex-1">
        {tool.reasoning}
      </p>

      {/* Footer actions */}
      <div className="mt-auto pt-4 border-t border-white/[0.03]">
        {tool.website && (
          <a
            href={tool.website}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-4 rounded-lg bg-accent hover:bg-violet-600 text-white text-[12px] font-semibold shadow-lg shadow-accent/15 hover:shadow-accent/25 active:scale-[0.97] flex items-center justify-center gap-1.5 transition-all font-display"
          >
            <span>Visit Website</span>
            <ExternalLink className="w-3 h-3 text-white/70" />
          </a>
        )}
      </div>
    </div>
  );
};
