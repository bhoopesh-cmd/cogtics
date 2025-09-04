# --- Shared Parsers and Utilities ---
import streamlit as st
import pandas as pd
from datetime import datetime
import ast
import requests
import re
import csv
import os

def init_session_state():
    defaults = {
        'contract_mode': 'Rule-Based',
        'billing_mode': 'Rule-Based',
        'crm_mode': 'Rule-Based',
        'contract_file': None,
        'billing_file': None,
        'crm_file': None,
        'contract_findings': [],
        'billing_findings': [],
        'crm_findings': [],
        'contract_analyzed': False,
        'billing_analyzed': False,
        'crm_analyzed': False,
        'report_generated': False,
        'firestore_initialized': False,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v
    
    # Load data from Firestore if user is logged in
    if st.session_state.get("user") and not st.session_state.get("firestore_initialized"):
        try:
            from firestore_service import load_firestore_data_to_session
            load_firestore_data_to_session()
            st.session_state["firestore_initialized"] = True
        except Exception as e:
            st.warning(f"Could not load data from Firestore: {e}")

def parse_contract_text(text):
    lines = text.strip().split('\n')
    parsed = {}
    for line in lines:
        if ':' in line:
            key, value = line.split(':', 1)
            parsed[key.strip()] = value.strip()
    return parsed

def analyze_contract_with_gpt(contract_dict):
    findings = []
    monthly_fee = contract_dict.get("Monthly Fee", "").replace("$", "").replace(",", "")
    try:
        fee = int(monthly_fee)
        if fee < 3000:
            findings.append({
                "issue": "Suspiciously low fee",
                "details": f"Monthly fee is only ${fee}, which may be too low for profitability.",
                "severity": "High",
                "engine": "Rule-Based"
            })
        elif fee < 5000:
            findings.append({
                "issue": "Underpriced contract",
                "details": f"Monthly fee is ${fee}, possibly below market rate.",
                "severity": "Medium",
                "engine": "Rule-Based"
            })
    except ValueError:
        findings.append({
            "issue": "Unreadable fee",
            "details": "Unable to parse Monthly Fee value.",
            "severity": "Medium",
            "engine": "Rule-Based"
        })
    if "Overages" not in contract_dict.get("Notes", ""):
        findings.append({
            "issue": "Missing overage clause",
            "details": "Contract does not mention billing for extra usage.",
            "severity": "High",
            "engine": "Rule-Based"
        })
    if "Net 30" in contract_dict.get("Payment Terms", ""):
        findings.append({
            "issue": "Delayed payment risk",
            "details": "Net 30 terms may delay cash flow.",
            "severity": "Low",
            "engine": "Rule-Based"
        })
    if "maintenance" in contract_dict.get("Notes", "").lower():
        findings.append({
            "issue": "Free services",
            "details": "Includes free maintenance visits which may incur hidden costs.",
            "severity": "Medium",
            "engine": "Rule-Based"
        })
    if "renew" not in contract_dict.get("Notes", "").lower():
        findings.append({
            "issue": "No renewal clause",
            "details": "Contract may end without a reminder or continuation.",
            "severity": "Medium",
            "engine": "Rule-Based"
        })
    try:
        start = datetime.strptime(contract_dict.get("Start Date", ""), "%b %d, %Y")
        end = datetime.strptime(contract_dict.get("End Date", ""), "%b %d, %Y")
        delta = (end - start).days
        if delta < 180:
            findings.append({
                "issue": "Short contract term",
                "details": "Duration is less than 6 months. May not justify setup effort.",
                "severity": "Medium",
                "engine": "Rule-Based"
            })
    except:
        pass
    if not any(freq in contract_dict.get("Payment Terms", "").lower() for freq in ["monthly", "quarterly", "annually"]):
        findings.append({
            "issue": "Missing payment frequency",
            "details": "No clear billing cycle in payment terms.",
            "severity": "Medium",
            "engine": "Rule-Based"
        })
    if len(contract_dict.get("Notes", "").split()) < 10:
        findings.append({
            "issue": "Vague terms",
            "details": "Notes section is very short; may lack important details.",
            "severity": "Low",
            "engine": "Rule-Based"
        })
    if not contract_dict.get("Payment Terms"):
        findings.append({
            "issue": "No payment terms",
            "details": "Contract does not mention how or when payment is due.",
            "severity": "High",
            "engine": "Rule-Based"
        })
    return findings

def gpt_contract_analysis(contract_text):
    api_key = "AIzaSyBwnA1ma4s-TlEaxg3KLXpsBkmyr7uqn7c"
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    prompt = f"""
You are an expert contract risk analyst.\n\nAnalyze the following contract text and identify clauses or language that may lead to:\n- revenue leakage,\n- billing inefficiencies,\n- unfavorable payment terms, or\n- risk of underpayment.\n\nFor each issue, return:\n- \"issue\": A short title,\n- \"details\": A short explanation,\n- \"severity\": High, Medium, or Low\n\nRespond in this exact JSON format:\n[\n  {{\n    \"issue\": \"...\",\n    \"details\": \"...\",\n    \"severity\": \"High\"\n  }},\n  ...\n]\n\nContract:\n{contract_text}\n"""
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}
    data = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }
    try:
        response = requests.post(url, headers=headers, params=params, json=data)
        response.raise_for_status()
        content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        match = re.search(r'(\[.*\]|\{.*\})', content, re.DOTALL)
        if match:
            data_str = match.group(1)
            findings = ast.literal_eval(data_str)
            for f in findings:
                f["engine"] = "AI-Powered"
            return findings
        else:
            st.error("Could not find a valid list/dict in Gemini output.")
            return []
    except Exception as e:
        st.error(f"Error from Gemini: {e}")
        return []

def analyze_billing_data(df):
    issues = []
    for index, row in df.iterrows():
        expected = row["Expected Amount"]
        billed = row["Amount Billed"]
        status = row["Status"]
        if billed == 0 and str(status).lower() == "unbilled":
            issues.append({
                "row": index + 2,
                "issue": "Unbilled invoice",
                "details": f"Expected ${expected} but nothing was billed.",
                "severity": "High",
                "engine": "Rule-Based"
            })
        elif billed < expected:
            issues.append({
                "row": index + 2,
                "issue": "Underbilling",
                "details": f"Billed ${billed}, expected ${expected}.",
                "severity": "Medium",
                "engine": "Rule-Based"
            })
        elif billed > expected:
            issues.append({
                "row": index + 2,
                "issue": "Overbilling",
                "details": f"Billed ${billed}, expected ${expected}.",
                "severity": "Low",
                "engine": "Rule-Based"
            })
    return issues

def analyze_crm_data(df):
    from datetime import datetime
    from dateutil.parser import parse as parse_date
    issues = []
    today = datetime.today()
    for index, row in df.iterrows():
        last_touch = row["Last Activity"]
        stage = row["Stage"]
        try:
            last_date = parse_date(last_touch, dayfirst=True, fuzzy=True)
            days_since = (today - last_date).days
            if days_since > 90:
                issues.append({
                    "row": index + 2,
                    "issue": "Stalled deal",
                    "details": f"{days_since} days since last activity in stage '{stage}'.",
                    "severity": "High",
                    "engine": "Rule-Based"
                })
            elif days_since > 60:
                issues.append({
                    "row": index + 2,
                    "issue": "At-risk deal",
                    "details": f"{days_since} days without follow-up.",
                    "severity": "Medium",
                    "engine": "Rule-Based"
                })
        except Exception as e:
            issues.append({
                "row": index + 2,
                "issue": "Invalid date format",
                "details": f"Could not parse date: {last_touch}",
                "severity": "Low",
                "engine": "Rule-Based"
            })
    return issues

def get_openai_api_key(user_key=None):
    key = None
    if "OPENAI_API_KEY" in st.secrets:
        key = st.secrets["OPENAI_API_KEY"]
    elif user_key:
        key = user_key
    return key 

def generate_executive_summary(contract_findings, billing_findings, crm_findings):
    total = len(contract_findings) + len(billing_findings) + len(crm_findings)
    high = sum(1 for f in contract_findings + billing_findings + crm_findings if str(f.get('severity','')).lower() == 'high')
    dist = []
    if contract_findings: dist.append('contract')
    if billing_findings: dist.append('billing')
    if crm_findings: dist.append('CRM')
    try:
        api_key = "AIzaSyBwnA1ma4s-TlEaxg3KLXpsBkmyr7uqn7c"
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        prompt = f"""
Summarize the following RLDA findings for an executive:
- Total issues: {total}
- High-severity: {high}
- Distribution: Contract: {len(contract_findings)}, Billing: {len(billing_findings)}, CRM: {len(crm_findings)}
- Major risks: List the most critical high-severity issues (short summary)

Contract: {contract_findings}\nBilling: {billing_findings}\nCRM: {crm_findings}

Respond with a concise executive summary paragraph.
"""
        headers = {"Content-Type": "application/json"}
        params = {"key": api_key}
        data = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(url, headers=headers, params=params, json=data, timeout=10)
        response.raise_for_status()
        content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return content.strip()
    except Exception:
        return f"There are {total} issues detected, with {high} high-severity risks spanning contract, billing, and CRM data." 

def get_user_data_dir():
    email = st.session_state.get("user", {}).get("email", "anonymous")
    user_dir = os.path.join("user_data", email)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir 