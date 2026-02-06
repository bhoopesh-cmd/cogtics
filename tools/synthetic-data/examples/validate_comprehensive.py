#!/usr/bin/env python3
"""
Validation Script for Comprehensive Test Data

This script validates detection results against ground truth expected issues.

Metrics calculated:
- Precision: TP / (TP + FP)
- Recall: TP / (TP + FN)
- F1 Score: 2 * (P * R) / (P + R)

Also calculates:
- Per-rule metrics
- Per-category metrics
- Per-severity metrics
- AI novel discovery rate
- Cross-snapshot detection rate

Usage:
    python validate_comprehensive.py --expected PATH --actual PATH [options]

Options:
    --expected PATH    Path to expected_issues.json (ground truth)
    --actual PATH      Path to actual detection results JSON
    --output PATH      Output path for validation report
    --threshold FLOAT  Matching threshold for variance comparisons (default: 0.05)
    --verbose          Show detailed matching information
"""

import argparse
import json
import logging
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Validation targets from the plan
VALIDATION_TARGETS = {
    "rule_recall": {"target": 0.98, "minimum": 0.95},
    "rule_precision": {"target": 0.95, "minimum": 0.90},
    "combined_f1": {"target": 0.93, "minimum": 0.87},
    "ai_novel_discovery": {"target": 0.10, "minimum": 0.05},
    "ai_false_positive_rate": {"target": 0.30, "minimum": 0.40},  # Lower is better
    "cross_snapshot_detection": {"target": 0.95, "minimum": 0.90},
}


class ValidationResult:
    """Container for validation results."""
    
    def __init__(self):
        self.true_positives: List[Dict] = []
        self.false_positives: List[Dict] = []
        self.false_negatives: List[Dict] = []
        
        # Per-category tracking
        self.by_rule: Dict[str, Dict] = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
        self.by_category: Dict[str, Dict] = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
        self.by_severity: Dict[str, Dict] = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
        
        # AI-specific
        self.ai_discoveries: List[Dict] = []
        self.ai_false_positives: List[Dict] = []
    
    @property
    def tp_count(self) -> int:
        return len(self.true_positives)
    
    @property
    def fp_count(self) -> int:
        return len(self.false_positives)
    
    @property
    def fn_count(self) -> int:
        return len(self.false_negatives)
    
    def precision(self) -> float:
        """Calculate precision: TP / (TP + FP)"""
        denominator = self.tp_count + self.fp_count
        return self.tp_count / denominator if denominator > 0 else 0.0
    
    def recall(self) -> float:
        """Calculate recall: TP / (TP + FN)"""
        denominator = self.tp_count + self.fn_count
        return self.tp_count / denominator if denominator > 0 else 0.0
    
    def f1_score(self) -> float:
        """Calculate F1 score: 2 * (P * R) / (P + R)"""
        p, r = self.precision(), self.recall()
        return 2 * (p * r) / (p + r) if (p + r) > 0 else 0.0
    
    def ai_novel_rate(self) -> float:
        """Calculate AI novel discovery rate."""
        total_ai = len(self.ai_discoveries) + len(self.ai_false_positives)
        return len(self.ai_discoveries) / total_ai if total_ai > 0 else 0.0
    
    def ai_fp_rate(self) -> float:
        """Calculate AI false positive rate."""
        total_ai = len(self.ai_discoveries) + len(self.ai_false_positives)
        return len(self.ai_false_positives) / total_ai if total_ai > 0 else 0.0


class IssueValidator:
    """Validates detection results against expected issues."""
    
    def __init__(
        self,
        variance_threshold: float = 0.05,
        verbose: bool = False,
    ):
        self.variance_threshold = variance_threshold
        self.verbose = verbose
    
    def validate(
        self,
        expected_issues: List[Dict],
        actual_issues: List[Dict],
    ) -> ValidationResult:
        """
        Validate actual detection results against expected issues.
        
        Args:
            expected_issues: Ground truth expected issues
            actual_issues: Actually detected issues
            
        Returns:
            ValidationResult with metrics
        """
        result = ValidationResult()
        
        # Index expected issues by key
        expected_index = self._index_issues(expected_issues)
        matched_expected: Set[str] = set()
        
        # Process actual issues
        for actual in actual_issues:
            match_key = self._get_match_key(actual)
            
            if match_key in expected_index and match_key not in matched_expected:
                # True positive
                expected = expected_index[match_key]
                
                if self._issues_match(expected, actual):
                    result.true_positives.append({
                        "expected": expected,
                        "actual": actual,
                        "match_key": match_key,
                    })
                    matched_expected.add(match_key)
                    
                    # Track by dimensions
                    rule_id = expected.get("rule_id", "UNKNOWN")
                    category = expected.get("category", "unknown")
                    severity = expected.get("severity", "unknown")
                    
                    result.by_rule[rule_id]["tp"] += 1
                    result.by_category[category]["tp"] += 1
                    result.by_severity[severity]["tp"] += 1
                else:
                    # Close match but not exact - still FP
                    result.false_positives.append(actual)
                    
                    rule_id = actual.get("rule_id", "UNKNOWN")
                    category = actual.get("category", "unknown")
                    severity = actual.get("severity", "unknown")
                    
                    result.by_rule[rule_id]["fp"] += 1
                    result.by_category[category]["fp"] += 1
                    result.by_severity[severity]["fp"] += 1
            else:
                # False positive
                result.false_positives.append(actual)
                
                rule_id = actual.get("rule_id", "UNKNOWN")
                category = actual.get("category", "unknown")
                severity = actual.get("severity", "unknown")
                
                result.by_rule[rule_id]["fp"] += 1
                result.by_category[category]["fp"] += 1
                result.by_severity[severity]["fp"] += 1
                
                # Track AI discoveries
                if actual.get("detection_tier") == "ai":
                    result.ai_false_positives.append(actual)
        
        # Find false negatives (expected but not detected)
        for key, expected in expected_index.items():
            if key not in matched_expected:
                result.false_negatives.append(expected)
                
                rule_id = expected.get("rule_id", "UNKNOWN")
                category = expected.get("category", "unknown")
                severity = expected.get("severity", "unknown")
                
                result.by_rule[rule_id]["fn"] += 1
                result.by_category[category]["fn"] += 1
                result.by_severity[severity]["fn"] += 1
        
        return result
    
    def _index_issues(self, issues: List[Dict]) -> Dict[str, Dict]:
        """Index issues by match key."""
        index = {}
        for issue in issues:
            key = self._get_match_key(issue)
            index[key] = issue
        return index
    
    def _get_match_key(self, issue: Dict) -> str:
        """Get a key for matching issues."""
        # Match on: rule_id + contract_id + invoice_id (if present)
        parts = [
            issue.get("rule_id", ""),
            issue.get("contract_id", ""),
            issue.get("invoice_id", "") or "",
        ]
        return "|".join(parts)
    
    def _issues_match(self, expected: Dict, actual: Dict) -> bool:
        """Check if expected and actual issues match."""
        # Must match on rule_id
        if expected.get("rule_id") != actual.get("rule_id"):
            return False
        
        # Must match on contract_id
        if expected.get("contract_id") != actual.get("contract_id"):
            return False
        
        # If invoice_id is specified, must match
        if expected.get("invoice_id") and actual.get("invoice_id"):
            if expected.get("invoice_id") != actual.get("invoice_id"):
                return False
        
        # Check amounts if present (with tolerance)
        expected_amount = expected.get("expected_amount")
        actual_amount = actual.get("actual_amount")
        
        if expected_amount is not None and actual_amount is not None:
            try:
                exp = float(expected_amount)
                act = float(actual_amount)
                if exp > 0:
                    variance = abs(exp - act) / exp
                    if variance > self.variance_threshold:
                        return False
            except (ValueError, TypeError):
                pass
        
        return True


def calculate_metrics_for_dimension(stats: Dict) -> Dict[str, float]:
    """Calculate P/R/F1 for a dimension."""
    tp = stats.get("tp", 0)
    fp = stats.get("fp", 0)
    fn = stats.get("fn", 0)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
    }


def generate_report(
    result: ValidationResult,
    expected_count: int,
    actual_count: int,
) -> Dict[str, Any]:
    """Generate comprehensive validation report."""
    
    # Overall metrics
    overall = {
        "expected_issues": expected_count,
        "actual_issues": actual_count,
        "true_positives": result.tp_count,
        "false_positives": result.fp_count,
        "false_negatives": result.fn_count,
        "precision": round(result.precision(), 4),
        "recall": round(result.recall(), 4),
        "f1_score": round(result.f1_score(), 4),
    }
    
    # Check against targets
    target_checks = {}
    for metric, targets in VALIDATION_TARGETS.items():
        if metric == "rule_recall":
            value = result.recall()
        elif metric == "rule_precision":
            value = result.precision()
        elif metric == "combined_f1":
            value = result.f1_score()
        elif metric == "ai_novel_discovery":
            value = result.ai_novel_rate()
        elif metric == "ai_false_positive_rate":
            value = result.ai_fp_rate()
        else:
            value = 0
        
        meets_target = value >= targets["target"] if metric != "ai_false_positive_rate" else value <= targets["target"]
        meets_minimum = value >= targets["minimum"] if metric != "ai_false_positive_rate" else value <= targets["minimum"]
        
        target_checks[metric] = {
            "value": round(value, 4),
            "target": targets["target"],
            "minimum": targets["minimum"],
            "meets_target": meets_target,
            "meets_minimum": meets_minimum,
        }
    
    # Per-rule metrics
    by_rule = {}
    for rule_id, stats in result.by_rule.items():
        by_rule[rule_id] = calculate_metrics_for_dimension(stats)
    
    # Per-category metrics
    by_category = {}
    for category, stats in result.by_category.items():
        by_category[category] = calculate_metrics_for_dimension(stats)
    
    # Per-severity metrics
    by_severity = {}
    for severity, stats in result.by_severity.items():
        by_severity[severity] = calculate_metrics_for_dimension(stats)
    
    # Identify problem areas (low recall)
    problem_rules = [
        {"rule": rule, "metrics": metrics}
        for rule, metrics in by_rule.items()
        if metrics["recall"] < 0.80 and metrics["fn"] > 0
    ]
    problem_rules.sort(key=lambda x: x["metrics"]["recall"])
    
    return {
        "generated_at": datetime.now().isoformat(),
        "overall": overall,
        "target_checks": target_checks,
        "by_rule": by_rule,
        "by_category": by_category,
        "by_severity": by_severity,
        "problem_areas": problem_rules[:10],  # Top 10 problem areas
        "all_targets_met": all(t["meets_minimum"] for t in target_checks.values()),
    }


def print_report(report: Dict[str, Any]):
    """Print validation report to console."""
    print("\n" + "="*70)
    print("VALIDATION REPORT")
    print("="*70)
    
    # Overall metrics
    overall = report["overall"]
    print(f"\nOverall Metrics:")
    print(f"  Expected Issues: {overall['expected_issues']}")
    print(f"  Actual Issues:   {overall['actual_issues']}")
    print(f"  True Positives:  {overall['true_positives']}")
    print(f"  False Positives: {overall['false_positives']}")
    print(f"  False Negatives: {overall['false_negatives']}")
    print(f"\n  Precision: {overall['precision']:.2%}")
    print(f"  Recall:    {overall['recall']:.2%}")
    print(f"  F1 Score:  {overall['f1_score']:.2%}")
    
    # Target checks
    print(f"\nTarget Validation:")
    for metric, check in report["target_checks"].items():
        status = "[PASS]" if check["meets_minimum"] else "[FAIL]"
        target_status = " (target met)" if check["meets_target"] else ""
        print(f"  {status} {metric}: {check['value']:.2%} (min: {check['minimum']:.0%}){target_status}")
    
    # By category
    print(f"\nBy Category:")
    for category, metrics in sorted(report["by_category"].items()):
        print(f"  {category}: P={metrics['precision']:.2%}, R={metrics['recall']:.2%}, F1={metrics['f1']:.2%}")
    
    # Problem areas
    if report["problem_areas"]:
        print(f"\nProblem Areas (Low Recall Rules):")
        for item in report["problem_areas"][:5]:
            metrics = item["metrics"]
            print(f"  {item['rule']}: R={metrics['recall']:.2%}, FN={metrics['fn']}")
    
    # Final status
    print("\n" + "="*70)
    if report["all_targets_met"]:
        print("[PASS] All validation targets met!")
    else:
        print("[FAIL] Some validation targets not met")
    print("="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Validate detection results")
    parser.add_argument("--expected", required=True, help="Path to expected_issues.json")
    parser.add_argument("--actual", required=True, help="Path to actual detection results")
    parser.add_argument("--output", help="Output path for report JSON")
    parser.add_argument("--threshold", type=float, default=0.05, help="Variance threshold")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load expected issues
    logger.info(f"Loading expected issues from {args.expected}")
    with open(args.expected, "r") as f:
        expected_issues = json.load(f)
    
    # Load actual issues
    logger.info(f"Loading actual issues from {args.actual}")
    with open(args.actual, "r") as f:
        actual_issues = json.load(f)
    
    # Validate
    validator = IssueValidator(
        variance_threshold=args.threshold,
        verbose=args.verbose,
    )
    result = validator.validate(expected_issues, actual_issues)
    
    # Generate report
    report = generate_report(
        result=result,
        expected_count=len(expected_issues),
        actual_count=len(actual_issues),
    )
    
    # Print report
    print_report(report)
    
    # Save report
    output_path = args.output or Path(args.expected).parent / "validation_report.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    
    logger.info(f"Report saved to {output_path}")
    
    # Exit with status
    sys.exit(0 if report["all_targets_met"] else 1)


if __name__ == "__main__":
    import sys
    main()
