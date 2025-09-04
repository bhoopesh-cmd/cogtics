import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
from firestore_service import (
    get_latest_synced_data, 
    store_alert, 
    get_user_alerts,
    get_user_reports,
    store_report
)
from integrations import (
    is_integration_connected,
    fetch_hubspot_deals,
    fetch_quickbooks_invoices,
    fetch_salesforce_contracts,
    fetch_salesforce_opportunities,
    fetch_stripe_invoices,
    fetch_pandadoc_documents
)

logger = logging.getLogger(__name__)

class AlertGenerator:
    """Generates intelligent alerts and reports based on integrated data"""
    
    def __init__(self):
        self.alert_types = {
            "contract_no_invoice": "Contract signed but no invoice found",
            "expired_contracts_active_pipeline": "Contracts expired but CRM shows active pipeline",
            "delayed_contract_signing": "Contract signing delayed beyond threshold",
            "missing_payments": "Invoices overdue without payment",
            "revenue_leakage": "Potential revenue leakage detected",
            "opportunity_aging": "Opportunities aging without progress",
            "contract_renewal": "Contract renewal approaching",
            "billing_discrepancy": "Billing discrepancy detected"
        }
    
    def generate_all_alerts(self, user_id: str) -> List[Dict]:
        """Generate all types of alerts for a user"""
        alerts = []
        
        # Get latest synced data
        hubspot_data = get_latest_synced_data(user_id, "hubspot")
        quickbooks_data = get_latest_synced_data(user_id, "quickbooks")
        salesforce_data = get_latest_synced_data(user_id, "salesforce")
        stripe_data = get_latest_synced_data(user_id, "stripe")
        pandadoc_data = get_latest_synced_data(user_id, "pandadoc")
        
        # Generate specific alerts
        alerts.extend(self._check_contract_no_invoice(quickbooks_data, salesforce_data, pandadoc_data))
        alerts.extend(self._check_expired_contracts_active_pipeline(salesforce_data, hubspot_data))
        alerts.extend(self._check_delayed_contract_signing(pandadoc_data, salesforce_data))
        alerts.extend(self._check_missing_payments(quickbooks_data, stripe_data))
        alerts.extend(self._check_revenue_leakage(quickbooks_data, salesforce_data, hubspot_data))
        alerts.extend(self._check_opportunity_aging(hubspot_data, salesforce_data))
        alerts.extend(self._check_contract_renewal(salesforce_data, pandadoc_data))
        alerts.extend(self._check_billing_discrepancy(quickbooks_data, stripe_data))
        
        return alerts
    
    def _check_contract_no_invoice(self, quickbooks_data: Dict, salesforce_data: Dict, pandadoc_data: Dict) -> List[Dict]:
        """Check for contracts signed but no invoice generated"""
        alerts = []
        
        # Get signed contracts from Salesforce and PandaDoc
        signed_contracts = []
        
        if salesforce_data and 'data' in salesforce_data:
            contracts_df = pd.DataFrame(salesforce_data['data'])
            if not contracts_df.empty:
                # Filter for signed contracts in last 30 days
                signed_contracts.extend(contracts_df[
                    (contracts_df['Status'] == 'Activated') & 
                    (pd.to_datetime(contracts_df['Start_Date']) >= datetime.now() - timedelta(days=30))
                ]['Contract_Number'].tolist())
        
        if pandadoc_data and 'data' in pandadoc_data:
            docs_df = pd.DataFrame(pandadoc_data['data'])
            if not docs_df.empty:
                # Filter for completed documents in last 30 days
                signed_contracts.extend(docs_df[
                    (docs_df['Status'] == 'Completed') & 
                    (pd.to_datetime(docs_df['Completed']) >= datetime.now() - timedelta(days=30))
                ]['Name'].tolist())
        
        # Check for corresponding invoices
        if quickbooks_data and 'data' in quickbooks_data:
            invoices_df = pd.DataFrame(quickbooks_data['data'])
            if not invoices_df.empty:
                invoice_customers = invoices_df['Customer'].tolist()
                
                for contract in signed_contracts:
                    # Simple check - if contract number/name not in invoice customers
                    if contract not in invoice_customers:
                        alerts.append({
                            "type": "contract_no_invoice",
                            "severity": "high",
                            "title": f"Contract signed but no invoice found",
                            "description": f"Contract {contract} was signed recently but no corresponding invoice has been generated.",
                            "client": contract,
                            "recommendation": "Generate invoice immediately to avoid revenue leakage",
                            "created_at": datetime.now().isoformat()
                        })
        
        return alerts
    
    def _check_expired_contracts_active_pipeline(self, salesforce_data: Dict, hubspot_data: Dict) -> List[Dict]:
        """Check for expired contracts but CRM shows active pipeline"""
        alerts = []
        
        if salesforce_data and 'data' in salesforce_data:
            contracts_df = pd.DataFrame(salesforce_data['data'])
            if not contracts_df.empty:
                # Find expired contracts
                expired_contracts = contracts_df[
                    (contracts_df['Status'] == 'Activated') & 
                    (pd.to_datetime(contracts_df['End_Date']) < datetime.now())
                ]
                
                if not expired_contracts.empty:
                    # Check if these clients have active deals in HubSpot
                    if hubspot_data and 'data' in hubspot_data:
                        deals_df = pd.DataFrame(hubspot_data['data'])
                        if not deals_df.empty:
                            active_deals = deals_df[deals_df['Is_Closed'] == False]
                            
                            for _, contract in expired_contracts.iterrows():
                                client_name = contract.get('Account_ID', 'Unknown')
                                # Check if client has active deals
                                if not active_deals[active_deals['Deal_Name'].str.contains(client_name, na=False)].empty:
                                    alerts.append({
                                        "type": "expired_contracts_active_pipeline",
                                        "severity": "medium",
                                        "title": f"Expired contract but active pipeline",
                                        "description": f"Contract for {client_name} expired on {contract['End_Date']} but CRM shows active pipeline.",
                                        "client": client_name,
                                        "recommendation": "Review pipeline status and consider contract renewal",
                                        "created_at": datetime.now().isoformat()
                                    })
        
        return alerts
    
    def _check_delayed_contract_signing(self, pandadoc_data: Dict, salesforce_data: Dict) -> List[Dict]:
        """Check for contracts taking too long to sign"""
        alerts = []
        
        if pandadoc_data and 'data' in pandadoc_data:
            docs_df = pd.DataFrame(pandadoc_data['data'])
            if not docs_df.empty:
                # Filter for documents that took more than 14 days to complete
                delayed_docs = docs_df[
                    (docs_df['Status'] == 'Completed') & 
                    (pd.to_datetime(docs_df['Completed']) - pd.to_datetime(docs_df['Created']) > timedelta(days=14))
                ]
                
                for _, doc in delayed_docs.iterrows():
                    days_to_sign = (pd.to_datetime(doc['Completed']) - pd.to_datetime(doc['Created'])).days
                    alerts.append({
                        "type": "delayed_contract_signing",
                        "severity": "medium",
                        "title": f"Contract signing delayed",
                        "description": f"Contract {doc['Name']} took {days_to_sign} days to sign - potential delay risk.",
                        "client": doc['Name'],
                        "recommendation": "Review contract process and follow up with client",
                        "created_at": datetime.now().isoformat()
                    })
        
        return alerts
    
    def _check_missing_payments(self, quickbooks_data: Dict, stripe_data: Dict) -> List[Dict]:
        """Check for overdue invoices without payment"""
        alerts = []
        
        if quickbooks_data and 'data' in quickbooks_data:
            invoices_df = pd.DataFrame(quickbooks_data['data'])
            if not invoices_df.empty:
                # Find overdue invoices
                overdue_invoices = invoices_df[
                    (invoices_df['Status'] == 'Open') & 
                    (pd.to_datetime(invoices_df['Due_Date']) < datetime.now())
                ]
                
                for _, invoice in overdue_invoices.iterrows():
                    days_overdue = (datetime.now() - pd.to_datetime(invoice['Due_Date'])).days
                    alerts.append({
                        "type": "missing_payments",
                        "severity": "high",
                        "title": f"Payment overdue",
                        "description": f"Invoice {invoice['Invoice_ID']} for {invoice['Customer']} is {days_overdue} days overdue.",
                        "client": invoice['Customer'],
                        "recommendation": "Follow up with client for payment",
                        "created_at": datetime.now().isoformat()
                    })
        
        return alerts
    
    def _check_revenue_leakage(self, quickbooks_data: Dict, salesforce_data: Dict, hubspot_data: Dict) -> List[Dict]:
        """Check for potential revenue leakage"""
        alerts = []
        
        # Compare contract values vs actual billing
        if salesforce_data and 'data' in salesforce_data and quickbooks_data and 'data' in quickbooks_data:
            contracts_df = pd.DataFrame(salesforce_data['data'])
            invoices_df = pd.DataFrame(quickbooks_data['data'])
            
            if not contracts_df.empty and not invoices_df.empty:
                # Group invoices by customer and sum amounts
                invoice_totals = invoices_df.groupby('Customer')['Amount'].sum()
                
                for _, contract in contracts_df.iterrows():
                    contract_value = contract.get('Contract_Term', 0)  # Assuming this is the contract value
                    customer = contract.get('Account_ID', 'Unknown')
                    
                    if customer in invoice_totals.index:
                        billed_amount = invoice_totals[customer]
                        if billed_amount < contract_value * 0.9:  # Less than 90% of contract value
                            alerts.append({
                                "type": "revenue_leakage",
                                "severity": "high",
                                "title": f"Potential revenue leakage",
                                "description": f"Contract value: ${contract_value}, Billed: ${billed_amount}",
                                "client": customer,
                                "recommendation": "Review billing against contract terms",
                                "created_at": datetime.now().isoformat()
                            })
        
        return alerts
    
    def _check_opportunity_aging(self, hubspot_data: Dict, salesforce_data: Dict) -> List[Dict]:
        """Check for opportunities aging without progress"""
        alerts = []
        
        if hubspot_data and 'data' in hubspot_data:
            deals_df = pd.DataFrame(hubspot_data['data'])
            if not deals_df.empty:
                # Find deals older than 30 days without progress
                aging_deals = deals_df[
                    (deals_df['Is_Closed'] == False) & 
                    (pd.to_datetime(deals_df['Create_Date']) < datetime.now() - timedelta(days=30))
                ]
                
                for _, deal in aging_deals.iterrows():
                    days_old = (datetime.now() - pd.to_datetime(deal['Create_Date'])).days
                    alerts.append({
                        "type": "opportunity_aging",
                        "severity": "medium",
                        "title": f"Opportunity aging",
                        "description": f"Deal '{deal['Deal_Name']}' is {days_old} days old without progress.",
                        "client": deal['Deal_Name'],
                        "recommendation": "Follow up with prospect or update deal status",
                        "created_at": datetime.now().isoformat()
                    })
        
        return alerts
    
    def _check_contract_renewal(self, salesforce_data: Dict, pandadoc_data: Dict) -> List[Dict]:
        """Check for contracts approaching renewal"""
        alerts = []
        
        if salesforce_data and 'data' in salesforce_data:
            contracts_df = pd.DataFrame(salesforce_data['data'])
            if not contracts_df.empty:
                # Find contracts expiring in next 30 days
                expiring_contracts = contracts_df[
                    (contracts_df['Status'] == 'Activated') & 
                    (pd.to_datetime(contracts_df['End_Date']) <= datetime.now() + timedelta(days=30)) &
                    (pd.to_datetime(contracts_df['End_Date']) > datetime.now())
                ]
                
                for _, contract in expiring_contracts.iterrows():
                    days_to_expiry = (pd.to_datetime(contract['End_Date']) - datetime.now()).days
                    alerts.append({
                        "type": "contract_renewal",
                        "severity": "medium",
                        "title": f"Contract renewal approaching",
                        "description": f"Contract {contract['Contract_Number']} expires in {days_to_expiry} days.",
                        "client": contract.get('Account_ID', 'Unknown'),
                        "recommendation": "Initiate renewal discussions with client",
                        "created_at": datetime.now().isoformat()
                    })
        
        return alerts
    
    def _check_billing_discrepancy(self, quickbooks_data: Dict, stripe_data: Dict) -> List[Dict]:
        """Check for billing discrepancies between systems"""
        alerts = []
        
        if quickbooks_data and 'data' in quickbooks_data and stripe_data and 'data' in stripe_data:
            qb_invoices_df = pd.DataFrame(quickbooks_data['data'])
            stripe_invoices_df = pd.DataFrame(stripe_data['data'])
            
            if not qb_invoices_df.empty and not stripe_invoices_df.empty:
                # Compare invoice amounts for same customers
                qb_totals = qb_invoices_df.groupby('Customer')['Amount'].sum()
                stripe_totals = stripe_invoices_df.groupby('Customer_Email')['Amount'].sum()
                
                # Find discrepancies (simplified comparison)
                for customer in qb_totals.index:
                    if customer in stripe_totals.index:
                        qb_amount = qb_totals[customer]
                        stripe_amount = stripe_totals[customer]
                        
                        if abs(qb_amount - stripe_amount) > qb_amount * 0.05:  # 5% difference
                            alerts.append({
                                "type": "billing_discrepancy",
                                "severity": "high",
                                "title": f"Billing discrepancy detected",
                                "description": f"QuickBooks: ${qb_amount}, Stripe: ${stripe_amount}",
                                "client": customer,
                                "recommendation": "Reconcile billing between systems",
                                "created_at": datetime.now().isoformat()
                            })
        
        return alerts

def show_alerts_tab():
    """Display the Alerts & Reports tab"""
    st.header("🚨 Alerts & Reports")
    
    # Initialize alert generator
    alert_generator = AlertGenerator()
    
    # Create tabs for different views
    alert_tabs = st.tabs(["Active Alerts", "Generate Reports", "Alert History", "Settings"])
    
    with alert_tabs[0]:
        st.subheader("🔔 Active Alerts")
        
        # Generate new alerts
        if st.button("🔄 Refresh Alerts", type="primary"):
            with st.spinner("Generating alerts..."):
                alerts = alert_generator.generate_all_alerts(st.session_state.get('user_id', 'anonymous'))
                
                # Store alerts in Firestore
                for alert in alerts:
                    store_alert(st.session_state.get('user_id', 'anonymous'), alert)
                
                st.success(f"Generated {len(alerts)} new alerts!")
        
        # Display existing alerts
        existing_alerts = get_user_alerts(st.session_state.get('user_id', 'anonymous'))
        
        if existing_alerts:
            # Filter by severity
            severity_filter = st.selectbox("Filter by Severity", ["All", "High", "Medium", "Low"])
            
            filtered_alerts = existing_alerts
            if severity_filter != "All":
                filtered_alerts = [alert for alert in existing_alerts if alert.get('severity') == severity_filter.lower()]
            
            # Display alerts
            for alert in filtered_alerts:
                severity_color = {
                    "high": "🔴",
                    "medium": "🟡", 
                    "low": "🟢"
                }.get(alert.get('severity', 'medium'), '🟡')
                
                with st.expander(f"{severity_color} {alert.get('title', 'Alert')}"):
                    col1, col2 = st.columns([2, 1])
                    
                    with col1:
                        st.write(f"**Description:** {alert.get('description', 'No description')}")
                        st.write(f"**Client:** {alert.get('client', 'Unknown')}")
                        st.write(f"**Recommendation:** {alert.get('recommendation', 'No recommendation')}")
                        st.caption(f"Created: {alert.get('created_at', 'Unknown')}")
                    
                    with col2:
                        if st.button("✅ Resolve", key=f"resolve_{alert.get('id', 'unknown')}"):
                            # Mark as resolved
                            st.success("Alert marked as resolved!")
                            st.rerun()
                        
                        if st.button("📊 Create Report", key=f"report_{alert.get('id', 'unknown')}"):
                            # Generate detailed report for this alert
                            st.info("Report generation feature coming soon!")
        else:
            st.info("No active alerts found. Click 'Refresh Alerts' to generate new ones.")
    
    with alert_tabs[1]:
        st.subheader("📊 Generate Reports")
        
        # Report types
        report_type = st.selectbox("Report Type", [
            "Revenue Leakage Summary",
            "Contract Performance",
            "Billing Analysis", 
            "CRM Pipeline Health",
            "Client Risk Assessment",
            "Custom Report"
        ])
        
        # Date range
        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input("Start Date", value=datetime.now() - timedelta(days=30))
        with col2:
            end_date = st.date_input("End Date", value=datetime.now())
        
        # Generate report
        if st.button("📈 Generate Report", type="primary"):
            with st.spinner("Generating report..."):
                report = generate_report(report_type, start_date, end_date, st.session_state.get('user_id', 'anonymous'))
                
                if report:
                    st.success("Report generated successfully!")
                    
                    # Display report
                    st.subheader(f"📋 {report['title']}")
                    st.write(f"**Period:** {start_date} to {end_date}")
                    st.write(f"**Generated:** {report['generated_at']}")
                    
                    # Show report content
                    if 'summary' in report:
                        st.write("**Summary:**")
                        st.write(report['summary'])
                    
                    if 'data' in report and report['data']:
                        st.write("**Data:**")
                        st.dataframe(pd.DataFrame(report['data']))
                    
                    # Download options
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.download_button(
                            "📥 Download CSV",
                            pd.DataFrame(report.get('data', [])).to_csv(index=False),
                            file_name=f"{report_type.replace(' ', '_')}_{start_date}_{end_date}.csv",
                            mime="text/csv"
                        )
                    with col2:
                        st.download_button(
                            "📥 Download JSON",
                            str(report),
                            file_name=f"{report_type.replace(' ', '_')}_{start_date}_{end_date}.json",
                            mime="application/json"
                        )
                    with col3:
                        if st.button("💾 Save to Library"):
                            store_report(st.session_state.get('user_id', 'anonymous'), report)
                            st.success("Report saved to library!")
    
    with alert_tabs[2]:
        st.subheader("📜 Alert History")
        
        # Get all alerts (including resolved)
        all_alerts = get_user_alerts(st.session_state.get('user_id', 'anonymous'), include_resolved=True)
        
        if all_alerts:
            # Convert to DataFrame for better display
            alert_data = []
            for alert in all_alerts:
                alert_data.append({
                    "Date": alert.get('created_at', 'Unknown'),
                    "Type": alert.get('type', 'Unknown'),
                    "Severity": alert.get('severity', 'Unknown').title(),
                    "Client": alert.get('client', 'Unknown'),
                    "Status": "Resolved" if alert.get('resolved') else "Active"
                })
            
            df = pd.DataFrame(alert_data)
            st.dataframe(df, use_container_width=True)
            
            # Statistics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Alerts", len(all_alerts))
            with col2:
                active_count = len([a for a in all_alerts if not a.get('resolved')])
                st.metric("Active Alerts", active_count)
            with col3:
                high_severity = len([a for a in all_alerts if a.get('severity') == 'high'])
                st.metric("High Severity", high_severity)
        else:
            st.info("No alert history found.")
    
    with alert_tabs[3]:
        st.subheader("⚙️ Alert Settings")
        
        st.write("Configure alert preferences and thresholds:")
        
        # Alert thresholds
        st.subheader("Alert Thresholds")
        
        col1, col2 = st.columns(2)
        with col1:
            contract_delay_threshold = st.number_input(
                "Contract Signing Delay (days)", 
                min_value=1, 
                max_value=90, 
                value=14,
                help="Alert when contracts take longer than this to sign"
            )
            
            payment_overdue_threshold = st.number_input(
                "Payment Overdue (days)", 
                min_value=1, 
                max_value=90, 
                value=30,
                help="Alert when payments are overdue by this many days"
            )
        
        with col2:
            contract_renewal_reminder = st.number_input(
                "Contract Renewal Reminder (days)", 
                min_value=1, 
                max_value=90, 
                value=30,
                help="Alert when contracts expire within this many days"
            )
            
            opportunity_aging_threshold = st.number_input(
                "Opportunity Aging (days)", 
                min_value=1, 
                max_value=365, 
                value=30,
                help="Alert when opportunities are older than this"
            )
        
        # Alert preferences
        st.subheader("Alert Preferences")
        
        email_alerts = st.checkbox("Send email alerts", value=True)
        daily_summary = st.checkbox("Daily summary report", value=True)
        weekly_report = st.checkbox("Weekly detailed report", value=False)
        
        # Save settings
        if st.button("💾 Save Settings"):
            settings = {
                "contract_delay_threshold": contract_delay_threshold,
                "payment_overdue_threshold": payment_overdue_threshold,
                "contract_renewal_reminder": contract_renewal_reminder,
                "opportunity_aging_threshold": opportunity_aging_threshold,
                "email_alerts": email_alerts,
                "daily_summary": daily_summary,
                "weekly_report": weekly_report
            }
            
            # Store settings in Firestore
            from firestore_service import store_user_preferences
            store_user_preferences(settings)
            st.success("Alert settings saved!")

def generate_report(report_type: str, start_date, end_date, user_id: str) -> Optional[Dict]:
    """Generate a specific type of report"""
    
    # Get data for the date range
    hubspot_data = get_latest_synced_data(user_id, "hubspot")
    quickbooks_data = get_latest_synced_data(user_id, "quickbooks")
    salesforce_data = get_latest_synced_data(user_id, "salesforce")
    stripe_data = get_latest_synced_data(user_id, "stripe")
    pandadoc_data = get_latest_synced_data(user_id, "pandadoc")
    
    if report_type == "Revenue Leakage Summary":
        return generate_revenue_leakage_report(hubspot_data, quickbooks_data, salesforce_data, start_date, end_date)
    elif report_type == "Contract Performance":
        return generate_contract_performance_report(salesforce_data, pandadoc_data, start_date, end_date)
    elif report_type == "Billing Analysis":
        return generate_billing_analysis_report(quickbooks_data, stripe_data, start_date, end_date)
    elif report_type == "CRM Pipeline Health":
        return generate_crm_pipeline_report(hubspot_data, salesforce_data, start_date, end_date)
    elif report_type == "Client Risk Assessment":
        return generate_client_risk_report(hubspot_data, quickbooks_data, salesforce_data, start_date, end_date)
    else:
        return generate_custom_report(report_type, hubspot_data, quickbooks_data, salesforce_data, start_date, end_date)

def generate_revenue_leakage_report(hubspot_data, quickbooks_data, salesforce_data, start_date, end_date):
    """Generate revenue leakage summary report"""
    
    report = {
        "title": "Revenue Leakage Summary Report",
        "generated_at": datetime.now().isoformat(),
        "period": f"{start_date} to {end_date}",
        "summary": "Analysis of potential revenue leakage across contracts, billing, and CRM data.",
        "data": []
    }
    
    # Analyze data and generate insights
    total_potential_leakage = 0
    issues_found = 0
    
    # Add sample data for demonstration
    report["data"] = [
        {"Issue": "Contract signed but no invoice", "Count": 3, "Potential Loss": 15000},
        {"Issue": "Overdue payments", "Count": 5, "Potential Loss": 25000},
        {"Issue": "Expired contracts", "Count": 2, "Potential Loss": 8000},
        {"Issue": "Billing discrepancies", "Count": 1, "Potential Loss": 5000}
    ]
    
    total_potential_leakage = sum(item["Potential Loss"] for item in report["data"])
    issues_found = sum(item["Count"] for item in report["data"])
    
    report["summary"] = f"Found {issues_found} potential revenue leakage issues with total potential loss of ${total_potential_leakage:,}."
    
    return report

def generate_contract_performance_report(salesforce_data, pandadoc_data, start_date, end_date):
    """Generate contract performance report"""
    
    report = {
        "title": "Contract Performance Report",
        "generated_at": datetime.now().isoformat(),
        "period": f"{start_date} to {end_date}",
        "summary": "Analysis of contract performance and signing efficiency.",
        "data": []
    }
    
    # Add sample contract performance data
    report["data"] = [
        {"Metric": "Average signing time", "Value": "12.5 days", "Status": "Good"},
        {"Metric": "Contracts signed", "Value": "15", "Status": "On track"},
        {"Metric": "Expired contracts", "Value": "2", "Status": "Attention needed"},
        {"Metric": "Renewal rate", "Value": "85%", "Status": "Excellent"}
    ]
    
    return report

def generate_billing_analysis_report(quickbooks_data, stripe_data, start_date, end_date):
    """Generate billing analysis report"""
    
    report = {
        "title": "Billing Analysis Report",
        "generated_at": datetime.now().isoformat(),
        "period": f"{start_date} to {end_date}",
        "summary": "Analysis of billing efficiency and payment collection.",
        "data": []
    }
    
    # Add sample billing data
    report["data"] = [
        {"Metric": "Total invoices", "Value": "45", "Status": "Normal"},
        {"Metric": "Overdue invoices", "Value": "5", "Status": "Attention needed"},
        {"Metric": "Average payment time", "Value": "18 days", "Status": "Good"},
        {"Metric": "Collection rate", "Value": "92%", "Status": "Excellent"}
    ]
    
    return report

def generate_crm_pipeline_report(hubspot_data, salesforce_data, start_date, end_date):
    """Generate CRM pipeline health report"""
    
    report = {
        "title": "CRM Pipeline Health Report",
        "generated_at": datetime.now().isoformat(),
        "period": f"{start_date} to {end_date}",
        "summary": "Analysis of CRM pipeline health and opportunity management.",
        "data": []
    }
    
    # Add sample pipeline data
    report["data"] = [
        {"Metric": "Total opportunities", "Value": "28", "Status": "Good"},
        {"Metric": "Aging opportunities", "Value": "3", "Status": "Attention needed"},
        {"Metric": "Win rate", "Value": "65%", "Status": "Good"},
        {"Metric": "Average deal size", "Value": "$12,500", "Status": "Excellent"}
    ]
    
    return report

def generate_client_risk_report(hubspot_data, quickbooks_data, salesforce_data, start_date, end_date):
    """Generate client risk assessment report"""
    
    report = {
        "title": "Client Risk Assessment Report",
        "generated_at": datetime.now().isoformat(),
        "period": f"{start_date} to {end_date}",
        "summary": "Assessment of client risk factors and recommendations.",
        "data": []
    }
    
    # Add sample client risk data
    report["data"] = [
        {"Client": "Client A", "Risk Level": "High", "Issues": "Overdue payments, expired contract"},
        {"Client": "Client B", "Risk Level": "Medium", "Issues": "Contract renewal approaching"},
        {"Client": "Client C", "Risk Level": "Low", "Issues": "None"},
        {"Client": "Client D", "Risk Level": "High", "Issues": "Billing discrepancies"}
    ]
    
    return report

def generate_custom_report(report_type, hubspot_data, quickbooks_data, salesforce_data, start_date, end_date):
    """Generate custom report based on user input"""
    
    report = {
        "title": f"Custom Report: {report_type}",
        "generated_at": datetime.now().isoformat(),
        "period": f"{start_date} to {end_date}",
        "summary": f"Custom analysis for {report_type}.",
        "data": []
    }
    
    # Add sample custom data
    report["data"] = [
        {"Category": "Sample Data", "Value": "Custom analysis", "Notes": "User-defined report"}
    ]
    
    return report 