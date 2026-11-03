-- migrate:up

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_type_check CHECK (
  type IN (
    'sync',
    'detect',
    'simulate',
    'export',
    'ingest.load',
    'ingest.normalize',
    'ingest.upsert',
    'ingest.finalize',
    'ingest.full',
    'identity.resolve',
    'identity.apply',
    'upload.csv.parse',
    'upload.csv.finalize',
    'upload.pdf.parse',
    'upload.reprocess',
    'contracts.pdf.extract',
    'contracts.clause.segment',
    'contracts.terms.extract',
    'contracts.readiness.compute',
    'revrec.compute',
    'revrec.reconcile',
    'detect.run',
    'detect.replay',
    'evidence',
    'evidence.generate',
    'evidence.regenerate',
    'simulation.run',
    'simulation.replay',
    'export.csv.generate',
    'export.pdf.render',
    'digest',
    'digest.send'
  )
);

-- migrate:down

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_type_check CHECK (
  type IN ('sync', 'detect', 'simulate', 'export')
);
