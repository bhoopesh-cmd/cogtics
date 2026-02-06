"""
Comprehensive Validation Script for AI-Augmented Detection Engine

This script validates:
1. Rule-based detection (Tier 1) - Precision, Recall, F1
2. AI Enrichment quality (Tier 2) - Explanation quality scores
3. AI Anomaly Detection (Tier 3) - Novel discovery rate, precision
4. AI Recommendations (Tier 4) - Relevance scores

Usage:
    python validate_comprehensive.py --data-dir ./output/data --output-file validation_report.json
"""

import json
import argparse
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

class ValidationTier(Enum):
    RULE_DETECTION = "tier1_rules"
    AI_ENRICHMENT = "tier2_enrichment"
    AI_ANOMALY = "tier3_anomaly"
    AI_RECOMMENDATION = "tier4_recommendation"

@dataclass
class ValidationMetrics:
    """Metrics for a validation tier"""
    tier: ValidationTier
    precision: float
    recall: float
    f1_score: float
    total_expected: int
    total_detected: int
    true_positives: int
    false_positives: int
    false_negatives: int
    additional_metrics: Dict[str, Any]

@dataclass
class ValidationReport:
    """Complete validation report"""
    timestamp: str
    data_source: str
    tier_metrics: Dict[str, ValidationMetrics]
    overall_score: float
    passed: bool
    warnings: List[str]
    errors: List[str]

class DetectionValidator:
    """Validates detection results against ground truth"""
    
    def __init__(self, ground_truth_path: str, detection_results_path: str = None):
        self.ground_truth = self._load_json(ground_truth_path)
        self.detection_results = self._load_json(detection_results_path) if detection_results_path else None
        self.warnings = []
        self.errors = []
    
    def _load_json(self, path: str) -> Dict:
        """Load JSON file"""
        with open(path, 'r') as f:
            return json.load(f)
    
    def validate_tier1_rules(
        self, 
        detected_issues: List[Dict], 
        expected_discrepancies: List[Dict]
    ) -> ValidationMetrics:
        """
        Validate rule-based detection.
        
        Args:
            detected_issues: Issues detected by the rule engine
            expected_discrepancies: Ground truth discrepancies
        
        Returns:
            ValidationMetrics for Tier 1
        """
        # Map detected issues by key attributes
        detected_by_key = {}
        for issue in detected_issues:
            key = self._create_issue_key(issue)
            detected_by_key[key] = issue
        
        # Calculate metrics
        true_positives = 0
        false_negatives = 0
        matched_detected = set()
        
        for expected in expected_discrepancies:
            # Find matching detection
            expected_key = self._create_discrepancy_key(expected)
            
            matched = False
            for detected_key, detected in detected_by_key.items():
                if self._issues_match(expected, detected):
                    true_positives += 1
                    matched_detected.add(detected_key)
                    matched = True
                    break
            
            if not matched:
                false_negatives += 1
                self.warnings.append(f"Missing detection: {expected.get('type', 'unknown')} for {expected_key}")
        
        # False positives = detected but not in ground truth
        false_positives = len(detected_by_key) - len(matched_detected)
        
        # Calculate precision, recall, F1
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return ValidationMetrics(
            tier=ValidationTier.RULE_DETECTION,
            precision=precision,
            recall=recall,
            f1_score=f1,
            total_expected=len(expected_discrepancies),
            total_detected=len(detected_issues),
            true_positives=true_positives,
            false_positives=false_positives,
            false_negatives=false_negatives,
            additional_metrics={
                "by_category": self._group_by_category(detected_issues),
                "by_severity": self._group_by_severity(detected_issues),
            }
        )
    
    def validate_tier2_enrichment(
        self,
        enriched_issues: List[Dict],
        expected_count: int = 0
    ) -> ValidationMetrics:
        """
        Validate AI enrichment quality.
        
        Args:
            enriched_issues: Issues with AI analysis
            expected_count: Expected number of enriched issues
        
        Returns:
            ValidationMetrics for Tier 2
        """
        if not enriched_issues:
            return self._empty_metrics(ValidationTier.AI_ENRICHMENT)
        
        # Quality scores for each enriched issue
        quality_scores = []
        
        for issue in enriched_issues:
            ai_analysis = issue.get('aiAnalysis') or issue.get('ai_analysis_json')
            if not ai_analysis:
                continue
            
            # Score each component
            score = 0
            max_score = 5
            
            # Root cause provided and meaningful
            if ai_analysis.get('rootCause') and len(ai_analysis['rootCause']) > 20:
                score += 1
            
            # Business impact provided
            if ai_analysis.get('businessImpact') and len(ai_analysis['businessImpact']) > 10:
                score += 1
            
            # Suggested fix is actionable
            if ai_analysis.get('suggestedFix') and len(ai_analysis['suggestedFix']) > 10:
                score += 1
            
            # Explanation is clear
            if ai_analysis.get('explanation') and len(ai_analysis['explanation']) > 20:
                score += 1
            
            # Confidence is reasonable
            conf = ai_analysis.get('confidence', 0)
            if 0.3 <= conf <= 1.0:
                score += 1
            
            quality_scores.append(score / max_score)
        
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        enriched_count = len(quality_scores)
        
        # Use enrichment rate as "precision" proxy
        enrichment_rate = enriched_count / expected_count if expected_count > 0 else 1.0
        
        return ValidationMetrics(
            tier=ValidationTier.AI_ENRICHMENT,
            precision=avg_quality,  # Quality score as precision proxy
            recall=enrichment_rate,
            f1_score=2 * (avg_quality * enrichment_rate) / (avg_quality + enrichment_rate) if (avg_quality + enrichment_rate) > 0 else 0,
            total_expected=expected_count,
            total_detected=enriched_count,
            true_positives=enriched_count,
            false_positives=0,
            false_negatives=max(0, expected_count - enriched_count),
            additional_metrics={
                "avg_quality_score": avg_quality,
                "quality_scores": quality_scores[:10],  # First 10 for debugging
                "enrichment_rate": enrichment_rate,
            }
        )
    
    def validate_tier3_anomaly(
        self,
        ai_discoveries: List[Dict],
        expected_ai_cases: List[Dict]
    ) -> ValidationMetrics:
        """
        Validate AI anomaly detection.
        
        Args:
            ai_discoveries: AI-discovered issues
            expected_ai_cases: Ground truth AI test cases
        
        Returns:
            ValidationMetrics for Tier 3
        """
        if not ai_discoveries:
            return self._empty_metrics(ValidationTier.AI_ANOMALY, len(expected_ai_cases))
        
        # Match discoveries to expected cases
        matched = 0
        for expected in expected_ai_cases:
            expected_contracts = set(expected.get('contracts_affected', []))
            expected_type = expected.get('detection_method', '')
            
            for discovery in ai_discoveries:
                discovery_contracts = set(
                    discovery.get('evidence', {}).get('contractIds', [])
                )
                discovery_type = discovery.get('category', '')
                
                # Match if overlapping contracts and same detection type
                if expected_contracts & discovery_contracts and expected_type == discovery_type:
                    matched += 1
                    break
        
        # Novel discovery rate = discoveries not in ground truth
        novel_count = len(ai_discoveries) - matched
        novel_rate = novel_count / len(ai_discoveries) if ai_discoveries else 0
        
        precision = matched / len(ai_discoveries) if ai_discoveries else 0
        recall = matched / len(expected_ai_cases) if expected_ai_cases else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return ValidationMetrics(
            tier=ValidationTier.AI_ANOMALY,
            precision=precision,
            recall=recall,
            f1_score=f1,
            total_expected=len(expected_ai_cases),
            total_detected=len(ai_discoveries),
            true_positives=matched,
            false_positives=novel_count,  # Could be true novel discoveries
            false_negatives=len(expected_ai_cases) - matched,
            additional_metrics={
                "novel_discovery_rate": novel_rate,
                "by_category": self._group_by_field(ai_discoveries, 'category'),
                "avg_confidence": self._avg_field(ai_discoveries, 'confidence'),
            }
        )
    
    def validate_tier4_recommendations(
        self,
        recommendations: List[Dict],
        issues: List[Dict]
    ) -> ValidationMetrics:
        """
        Validate AI recommendations.
        
        Args:
            recommendations: AI-generated recommendations
            issues: Issues that recommendations address
        
        Returns:
            ValidationMetrics for Tier 4
        """
        if not recommendations:
            return self._empty_metrics(ValidationTier.AI_RECOMMENDATION, len(issues))
        
        # Score recommendation quality
        relevance_scores = []
        
        for rec in recommendations:
            score = 0
            max_score = 5
            
            # Has meaningful title
            if rec.get('title') and len(rec['title']) > 10:
                score += 1
            
            # Has description
            if rec.get('description') and len(rec['description']) > 20:
                score += 1
            
            # Has simulation config
            sim = rec.get('suggestedSimulation') or rec.get('suggested_simulation_json')
            if sim and sim.get('overrides'):
                score += 1
            
            # Has impact estimate
            impact = rec.get('estimatedImpact') or rec.get('estimated_impact_json')
            if impact and impact.get('revenueChange', 0) != 0:
                score += 1
            
            # Has reasoning
            if rec.get('reasoning') and len(rec['reasoning']) > 20:
                score += 1
            
            relevance_scores.append(score / max_score)
        
        avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0
        
        # Coverage = issues addressed / total issues
        addressed_issues = set()
        for rec in recommendations:
            issue_ids = rec.get('issueIds') or rec.get('issue_ids') or []
            addressed_issues.update(issue_ids)
        
        coverage = len(addressed_issues) / len(issues) if issues else 0
        
        return ValidationMetrics(
            tier=ValidationTier.AI_RECOMMENDATION,
            precision=avg_relevance,
            recall=coverage,
            f1_score=2 * (avg_relevance * coverage) / (avg_relevance + coverage) if (avg_relevance + coverage) > 0 else 0,
            total_expected=len(issues),
            total_detected=len(recommendations),
            true_positives=len(addressed_issues),
            false_positives=0,
            false_negatives=len(issues) - len(addressed_issues),
            additional_metrics={
                "avg_relevance": avg_relevance,
                "coverage": coverage,
                "by_priority": self._group_by_field(recommendations, 'priority'),
                "by_effort": self._group_by_field(recommendations, 'effort'),
            }
        )
    
    def _create_issue_key(self, issue: Dict) -> str:
        """Create unique key for an issue"""
        return f"{issue.get('ruleId', issue.get('rule_id', ''))}_{issue.get('contractId', issue.get('contract_id', ''))}_{issue.get('invoiceId', issue.get('invoice_id', ''))}"
    
    def _create_discrepancy_key(self, discrepancy: Dict) -> str:
        """Create unique key for a discrepancy"""
        return f"{discrepancy.get('type', '')}_{discrepancy.get('contract_id', '')}_{discrepancy.get('invoice_id', '')}"
    
    def _issues_match(self, expected: Dict, detected: Dict) -> bool:
        """Check if expected discrepancy matches detected issue"""
        # Match by contract ID
        expected_contract = expected.get('contract_id', '')
        detected_contract = detected.get('contractId', detected.get('contract_id', ''))
        
        if expected_contract and detected_contract and expected_contract == detected_contract:
            return True
        
        # Match by invoice ID
        expected_invoice = expected.get('invoice_id', '')
        detected_invoice = detected.get('invoiceId', detected.get('invoice_id', ''))
        
        if expected_invoice and detected_invoice and expected_invoice == detected_invoice:
            return True
        
        return False
    
    def _empty_metrics(self, tier: ValidationTier, expected: int = 0) -> ValidationMetrics:
        """Return empty metrics"""
        return ValidationMetrics(
            tier=tier,
            precision=0,
            recall=0,
            f1_score=0,
            total_expected=expected,
            total_detected=0,
            true_positives=0,
            false_positives=0,
            false_negatives=expected,
            additional_metrics={}
        )
    
    def _group_by_category(self, issues: List[Dict]) -> Dict[str, int]:
        """Group issues by category"""
        return self._group_by_field(issues, 'category')
    
    def _group_by_severity(self, issues: List[Dict]) -> Dict[str, int]:
        """Group issues by severity"""
        return self._group_by_field(issues, 'severity')
    
    def _group_by_field(self, items: List[Dict], field: str) -> Dict[str, int]:
        """Group items by a field"""
        groups = {}
        for item in items:
            key = item.get(field, 'unknown')
            groups[key] = groups.get(key, 0) + 1
        return groups
    
    def _avg_field(self, items: List[Dict], field: str) -> float:
        """Calculate average of a numeric field"""
        values = [item.get(field, 0) for item in items if field in item]
        return sum(values) / len(values) if values else 0


def generate_validation_report(
    ground_truth_path: str,
    detection_results_path: str = None,
    ai_discoveries_path: str = None,
    recommendations_path: str = None,
    output_path: str = None
) -> ValidationReport:
    """
    Generate comprehensive validation report.
    
    Args:
        ground_truth_path: Path to ground truth file (discrepancy_log.json)
        detection_results_path: Path to detection results
        ai_discoveries_path: Path to AI discoveries
        recommendations_path: Path to recommendations
        output_path: Path to save report
    
    Returns:
        ValidationReport
    """
    validator = DetectionValidator(ground_truth_path)
    tier_metrics = {}
    warnings = []
    errors = []
    
    # Load ground truth
    with open(ground_truth_path, 'r') as f:
        ground_truth = json.load(f)
    
    discrepancies = ground_truth if isinstance(ground_truth, list) else ground_truth.get('discrepancies', [])
    ai_test_cases = ground_truth.get('ai_test_cases', []) if isinstance(ground_truth, dict) else []
    
    # Tier 1: Rule Detection
    if detection_results_path:
        with open(detection_results_path, 'r') as f:
            detection_results = json.load(f)
        
        issues = detection_results if isinstance(detection_results, list) else detection_results.get('issues', [])
        tier1 = validator.validate_tier1_rules(issues, discrepancies)
        tier_metrics[ValidationTier.RULE_DETECTION.value] = tier1
        
        # Check for enriched issues (Tier 2)
        enriched = [i for i in issues if i.get('aiAnalysis') or i.get('ai_analysis_json')]
        tier2 = validator.validate_tier2_enrichment(enriched, len(issues))
        tier_metrics[ValidationTier.AI_ENRICHMENT.value] = tier2
    else:
        warnings.append("No detection results provided - skipping Tier 1 & 2 validation")
    
    # Tier 3: AI Anomaly Detection
    if ai_discoveries_path:
        with open(ai_discoveries_path, 'r') as f:
            ai_discoveries = json.load(f)
        
        discoveries = ai_discoveries if isinstance(ai_discoveries, list) else ai_discoveries.get('discoveries', [])
        tier3 = validator.validate_tier3_anomaly(discoveries, ai_test_cases)
        tier_metrics[ValidationTier.AI_ANOMALY.value] = tier3
    else:
        warnings.append("No AI discoveries provided - skipping Tier 3 validation")
    
    # Tier 4: Recommendations
    if recommendations_path and detection_results_path:
        with open(recommendations_path, 'r') as f:
            recommendations = json.load(f)
        
        recs = recommendations if isinstance(recommendations, list) else recommendations.get('recommendations', [])
        tier4 = validator.validate_tier4_recommendations(recs, issues)
        tier_metrics[ValidationTier.AI_RECOMMENDATION.value] = tier4
    else:
        warnings.append("No recommendations provided - skipping Tier 4 validation")
    
    # Calculate overall score
    scores = []
    for metrics in tier_metrics.values():
        if isinstance(metrics, ValidationMetrics):
            scores.append(metrics.f1_score)
    
    overall_score = sum(scores) / len(scores) if scores else 0
    
    # Determine pass/fail
    passed = overall_score >= 0.7  # 70% threshold
    
    # Add validator warnings
    warnings.extend(validator.warnings)
    errors.extend(validator.errors)
    
    report = ValidationReport(
        timestamp=datetime.now().isoformat(),
        data_source=ground_truth_path,
        tier_metrics={k: _metrics_to_dict(v) for k, v in tier_metrics.items()},
        overall_score=overall_score,
        passed=passed,
        warnings=warnings,
        errors=errors
    )
    
    # Save report
    if output_path:
        with open(output_path, 'w') as f:
            json.dump(_report_to_dict(report), f, indent=2)
    
    return report


def _metrics_to_dict(metrics: ValidationMetrics) -> Dict:
    """Convert ValidationMetrics to dict"""
    return {
        "tier": metrics.tier.value,
        "precision": metrics.precision,
        "recall": metrics.recall,
        "f1_score": metrics.f1_score,
        "total_expected": metrics.total_expected,
        "total_detected": metrics.total_detected,
        "true_positives": metrics.true_positives,
        "false_positives": metrics.false_positives,
        "false_negatives": metrics.false_negatives,
        "additional_metrics": metrics.additional_metrics,
    }


def _report_to_dict(report: ValidationReport) -> Dict:
    """Convert ValidationReport to dict"""
    return {
        "timestamp": report.timestamp,
        "data_source": report.data_source,
        "tier_metrics": report.tier_metrics,
        "overall_score": report.overall_score,
        "passed": report.passed,
        "warnings": report.warnings,
        "errors": report.errors,
    }


def main():
    parser = argparse.ArgumentParser(description='Validate AI-Augmented Detection Engine')
    parser.add_argument('--ground-truth', required=True, help='Path to ground truth file')
    parser.add_argument('--detection-results', help='Path to detection results')
    parser.add_argument('--ai-discoveries', help='Path to AI discoveries')
    parser.add_argument('--recommendations', help='Path to recommendations')
    parser.add_argument('--output', default='validation_report.json', help='Output path for report')
    
    args = parser.parse_args()
    
    report = generate_validation_report(
        ground_truth_path=args.ground_truth,
        detection_results_path=args.detection_results,
        ai_discoveries_path=args.ai_discoveries,
        recommendations_path=args.recommendations,
        output_path=args.output
    )
    
    # Print summary
    print("\n" + "="*60)
    print("VALIDATION REPORT SUMMARY")
    print("="*60)
    
    for tier_name, metrics in report.tier_metrics.items():
        print(f"\n{tier_name.upper()}:")
        print(f"  Precision: {metrics['precision']:.2%}")
        print(f"  Recall:    {metrics['recall']:.2%}")
        print(f"  F1 Score:  {metrics['f1_score']:.2%}")
    
    print(f"\nOverall Score: {report.overall_score:.2%}")
    print(f"Status: {'PASSED' if report.passed else 'FAILED'}")
    
    if report.warnings:
        print(f"\nWarnings ({len(report.warnings)}):")
        for w in report.warnings[:5]:
            print(f"  - {w}")
    
    if report.errors:
        print(f"\nErrors ({len(report.errors)}):")
        for e in report.errors[:5]:
            print(f"  - {e}")
    
    print(f"\nFull report saved to: {args.output}")


if __name__ == "__main__":
    main()
