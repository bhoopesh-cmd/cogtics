import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Search, CheckCircle, Filter, ChevronRight } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  description: string;
  impact: number;
  confidence: number;
  status: 'Active' | 'Investigating' | 'False Positive';
  detectedAt: string;
  sourceSystem: string;
  category: string;
}

const issues: Issue[] = [
  {
    id: 'IS-2024-892',
    title: 'Enterprise Agreement vs Billing Mismatch',
    description: 'Contract terms specify 5% annual uplift, but invoice #9921 lacks adjustment.',
    impact: 125000,
    confidence: 98,
    status: 'Active',
    detectedAt: '2h ago',
    sourceSystem: 'Salesforce CPQ vs Netsuite',
    category: 'Underbilling',
  },
  {
    id: 'IS-2024-884',
    title: 'Unbilled Usage - Acme Corp',
    description: 'Usage API logs show 4TB overage not reflected in current billing cycle.',
    impact: 42000,
    confidence: 85,
    status: 'Investigating',
    detectedAt: '5h ago',
    sourceSystem: 'Snowflake vs Zuora',
    category: 'Missing Invoice',
  },
  {
    id: 'IS-2024-871',
    title: 'Renewal Gap Detection',
    description: 'Service provided for 14 days post-contract expiry without renewal MSA.',
    impact: 18500,
    confidence: 92,
    status: 'Active',
    detectedAt: '1d ago',
    sourceSystem: 'Ironclad vs Salesforce',
    category: 'Renewal Gap',
  },
  {
    id: 'IS-2024-811',
    title: 'Tier 2 Discount Validity',
    description: 'Discount code applied to ineligible SKU based on FY24 rate card.',
    impact: 4200,
    confidence: 45,
    status: 'False Positive',
    detectedAt: '3d ago',
    sourceSystem: 'Stripe',
    category: 'Term Mismatch',
  },
];

export function IssuesPage() {
  const openCount = issues.filter((i) => i.status !== 'False Positive').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-light text-white tracking-tight">Issues & Risk</h1>
            <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400 font-mono">
              {openCount} Open
            </span>
          </div>
          <p className="text-zinc-500 mt-2">
            Investigate discrepancies across Contracts, Billing, and Usage.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors">
            <Filter size={16} /> Filter
          </button>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              placeholder="Search IDs, Customers..."
              className="pl-9 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#ff6500] w-64 placeholder-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex flex-col gap-3">
        {issues.map((issue, idx) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`group border rounded-lg p-5 transition-all duration-300 cursor-pointer relative overflow-hidden ${
              issue.status === 'False Positive'
                ? 'bg-zinc-950/30 border-zinc-900 opacity-60'
                : 'bg-zinc-900/20 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/40'
            }`}
          >
            {/* Left Accent Bar for Impact */}
            {issue.status !== 'False Positive' && (
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  issue.impact > 50000 ? 'bg-[#ff6500]' : 'bg-zinc-600'
                }`}
              />
            )}

            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {issue.status === 'Active' ? (
                    <div className="p-2 bg-[#ff6500]/10 rounded text-[#ff6500]">
                      <AlertTriangle size={18} />
                    </div>
                  ) : issue.status === 'Investigating' ? (
                    <div className="p-2 bg-blue-500/10 rounded text-blue-500">
                      <Search size={18} />
                    </div>
                  ) : (
                    <div className="p-2 bg-zinc-800 rounded text-zinc-500">
                      <CheckCircle size={18} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-zinc-500">{issue.id}</span>
                    <h3 className="text-lg font-medium text-zinc-200 group-hover:text-white">
                      {issue.title}
                    </h3>
                    {issue.status === 'False Positive' && (
                      <span className="text-[10px] uppercase border border-zinc-700 text-zinc-500 px-1.5 rounded">
                        Dismissed
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm max-w-2xl">{issue.description}</p>

                  <div className="flex items-center gap-6 mt-4 text-xs font-mono text-zinc-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      {issue.sourceSystem}
                    </span>
                    <span>Detected: {issue.detectedAt}</span>
                    <span className={issue.confidence > 90 ? 'text-[#ff6500]' : 'text-zinc-500'}>
                      Confidence: {issue.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-light text-white tracking-tight">
                  ${issue.impact.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                  Est. Impact
                </div>
                <button className="mt-4 flex items-center gap-1 text-[#ff6500] text-sm hover:underline opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                  Review Evidence <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
