import React from "react";
import { Filter, RotateCcw, DollarSign, Layers } from "lucide-react";

interface FiltersProps {
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedPricing: string;
  setSelectedPricing: (price: string) => void;
  categories: string[];
}

export const Filters: React.FC<FiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedPricing,
  setSelectedPricing,
  categories,
}) => {
  const pricingOptions = ["All", "free", "freemium", "paid", "open-source"];

  const handleReset = () => {
    setSelectedCategory("All");
    setSelectedPricing("All");
  };

  const pill = (active: boolean) =>
    active
      ? "bg-accent/12 border-accent/40 text-accent-soft"
      : "bg-white/[0.02] border-white/[0.05] text-white/55 hover:text-white/75 hover:border-white/[0.08]";

  return (
    <div className="w-full glass-panel rounded-2xl p-5 shadow-xl font-display">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-accent-soft" />
          <span className="font-bold text-white/85 text-[13px]">Filters</span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-[11px] text-white/40 hover:text-accent-soft transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="space-y-5">
        {/* Pricing */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2.5">
            <DollarSign className="w-3 h-3 text-accent-soft" />
            Pricing
          </label>
          <div className="flex flex-wrap gap-1.5">
            {pricingOptions.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPricing(p)}
                className={`py-1.5 px-3 rounded-full text-[11px] font-medium border transition-all capitalize ${pill(selectedPricing === p)}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2.5">
            <Layers className="w-3 h-3 text-accent-soft" />
            Category
          </label>
          <div className="space-y-1">
            {["All", ...categories].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left py-2 px-3 rounded-lg text-[11px] font-medium border transition-all flex items-center justify-between ${pill(active)}`}
                >
                  <span className="truncate">{cat}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-accent-soft" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
