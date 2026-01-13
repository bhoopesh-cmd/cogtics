import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Play } from 'lucide-react';

interface Simulation {
  id: string;
  name: string;
  description: string;
  potentialRecovery: number;
  tags: string[];
}

const simulations: Simulation[] = [
  {
    id: '1',
    name: 'Retroactive CPI Adjustment',
    description: 'Apply 5% uplift to all contracts >2 years old lacking explicit cap.',
    potentialRecovery: 45000,
    tags: ['Pricing', 'Recovery'],
  },
  {
    id: '2',
    name: 'Late Fee Enforcement',
    description: 'Simulate impact of enforcing Net 30 late fees on bottom 10% payers.',
    potentialRecovery: 12000,
    tags: ['Collections'],
  },
];

export function SimulationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">Simulations</h1>
          <p className="text-zinc-500 mt-2">
            Test revenue strategies on snapshots without mutating source data.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#ff6500] text-black font-medium rounded hover:bg-[#ff8533] transition-colors">
          <Plus size={16} /> New Scenario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {simulations.map((sim, idx) => (
          <motion.div
            key={sim.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-zinc-900/20 border border-zinc-800 p-6 rounded-xl hover:border-zinc-600 transition-colors group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Play size={16} className="text-[#ff6500]" />
            </div>

            <div className="flex gap-2 mb-4">
              {sim.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase font-mono bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h3 className="text-lg font-medium text-white mb-2">{sim.name}</h3>
            <p className="text-sm text-zinc-500 mb-6 min-h-[40px]">{sim.description}</p>

            <div className="flex items-end justify-between border-t border-zinc-800/50 pt-4">
              <div>
                <div className="text-xs text-zinc-600 uppercase tracking-wider mb-1">
                  Potential Impact
                </div>
                <div className="text-xl font-light text-[#ff6500]">
                  +${sim.potentialRecovery.toLocaleString()}
                </div>
              </div>
              <button className="text-xs text-zinc-400 hover:text-white underline">
                Load Template
              </button>
            </div>
          </motion.div>
        ))}

        {/* Create New Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: simulations.length * 0.1 }}
          className="border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-6 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer min-h-[240px]"
        >
          <Plus size={32} className="mb-4 opacity-50" />
          <span className="text-sm font-medium">Build Custom Logic</span>
        </motion.div>
      </div>
    </div>
  );
}
