import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, AlertCircle, X } from 'lucide-react';

interface Term {
  term: string;
  extractedValue: string;
  sourceClause: string;
  confidence: number;
}

interface Contract {
  id: string;
  customerName: string;
  arr: number;
  startDate: string;
  status: string;
  ambiguities: number;
  terms: Term[];
}

const contracts: Contract[] = [
  {
    id: 'CTR-2024-001',
    customerName: 'Acme Corp',
    arr: 250000,
    startDate: '2023-01-01',
    status: 'Active',
    ambiguities: 0,
    terms: [
      {
        term: 'Annual Uplift',
        extractedValue: '5.0%',
        sourceClause: 'Fees shall increase by 5% on each anniversary...',
        confidence: 99,
      },
      {
        term: 'Payment Terms',
        extractedValue: 'Net 30',
        sourceClause: 'Invoices due within thirty (30) days of receipt.',
        confidence: 99,
      },
    ],
  },
  {
    id: 'CTR-2024-042',
    customerName: 'Globex Inc',
    arr: 120000,
    startDate: '2023-06-15',
    status: 'Renewal Risk',
    ambiguities: 2,
    terms: [
      {
        term: 'Auto-Renewal',
        extractedValue: 'Yes',
        sourceClause:
          'This agreement automatically renews for successive one-year terms...',
        confidence: 95,
      },
      {
        term: 'Termination',
        extractedValue: '60 Days Notice',
        sourceClause: '...provided written notice is given at least 60 days prior...',
        confidence: 45,
      },
    ],
  },
];

export function ContractsPage() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      {/* List Pane */}
      <div
        className={`flex-1 flex flex-col ${
          selectedContract ? 'hidden lg:flex lg:w-1/2' : 'w-full'
        }`}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-light text-white tracking-tight mb-2">
            Contract Intelligence
          </h1>
          <p className="text-zinc-500">Executable financial logic extracted from PDFs.</p>
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search Contracts..."
            className="w-full pl-9 pr-4 py-3 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-[#ff6500] placeholder-zinc-700"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {contracts.map((contract) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedContract(contract)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedContract?.id === contract.id
                  ? 'bg-zinc-900 border-[#ff6500] shadow-lg shadow-[#ff6500]/10'
                  : 'bg-zinc-900/20 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-medium">{contract.customerName}</h3>
                  <span className="text-xs font-mono text-zinc-500">{contract.id}</span>
                </div>
                <span className="font-mono text-zinc-300">
                  ${(contract.arr / 1000).toFixed(0)}k ARR
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide ${
                    contract.status === 'Active'
                      ? 'border-green-900 text-green-500 bg-green-900/10'
                      : 'border-[#ff6500]/50 text-[#ff6500] bg-[#ff6500]/10'
                  }`}
                >
                  {contract.status}
                </span>
                {contract.ambiguities > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-[#ff6500]">
                    <AlertCircle size={10} /> {contract.ambiguities} Ambiguities
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail Pane */}
      <AnimatePresence mode="wait">
        {selectedContract && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 lg:w-1/2 bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-zinc-900 bg-zinc-900/50 flex justify-between items-start">
              <div>
                <h2 className="text-xl text-white font-light">
                  {selectedContract.customerName}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-mono">
                  <FileText size={12} />
                  <span>Source: Ironclad</span>
                  <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                  <span>Signed: {selectedContract.startDate}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="text-zinc-500 hover:text-white lg:hidden"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-xs font-mono uppercase text-[#ff6500] mb-4 tracking-widest">
                Extracted Terms
              </h3>
              <div className="space-y-6">
                {selectedContract.terms.map((term, idx) => (
                  <div key={idx} className="relative pl-6 border-l border-zinc-800">
                    <div
                      className={`absolute -left-[1px] top-0 bottom-0 w-[2px] ${
                        term.confidence < 90 ? 'bg-[#ff6500]' : 'bg-zinc-600'
                      }`}
                    />
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm font-medium text-zinc-300">{term.term}</span>
                      <span
                        className={`text-sm font-mono ${
                          term.confidence < 90 ? 'text-[#ff6500]' : 'text-white'
                        }`}
                      >
                        {term.extractedValue}
                      </span>
                    </div>
                    <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800/50 text-xs text-zinc-500 italic leading-relaxed">
                      "{term.sourceClause}"
                    </div>
                    {term.confidence < 90 && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-[#ff6500] uppercase tracking-wide">
                        <AlertCircle size={10} /> Low Confidence Extraction
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-900 bg-zinc-900/30">
              <button className="w-full py-2 bg-zinc-100 text-black text-sm font-medium rounded hover:bg-white transition-colors">
                View Original PDF
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
