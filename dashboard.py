import streamlit as st
import pandas as pd
import plotly.express as px
import io
import base64
from jinja2 import Template
from datetime import datetime
import os
try:
    import weasyprint
    weasyprint_available = True
except ImportError:
    weasyprint_available = False
from utils import generate_executive_summary, get_user_data_dir
from firestore_service import get_latest_analysis_result, store_generated_report
from auth import get_user_profile

def show_dashboard_tab():
    st.header("\U0001F4CA RLDA Dashboard")
    
    # Check for enabled integrations
    from integrations import is_integration_connected
    from firestore_service import get_latest_synced_data
    
    enabled_integrations = []
    for platform in ["hubspot", "quickbooks", "salesforce", "stripe", "pandadoc", "google_drive"]:
        if is_integration_connected(platform):
            enabled_integrations.append(platform)
    
    # Auto-refresh functionality
    if st.button("🔄 Refresh Dashboard", type="primary"):
        st.rerun()
    
    # Show integration-specific analysis options
    if enabled_integrations:
        st.subheader("🔗 Connected Integrations")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if "salesforce" in enabled_integrations:
                if st.button("📊 Analyze Latest Salesforce Data", type="secondary"):
                    with st.spinner("Analyzing Salesforce data..."):
                        # Fetch and analyze Salesforce data
                        salesforce_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "salesforce")
                        if salesforce_data:
                            st.success("Salesforce analysis completed!")
                            st.session_state["salesforce_analyzed"] = True
                        else:
                            st.warning("No Salesforce data available. Please sync data first.")
            
            if "stripe" in enabled_integrations:
                if st.button("💳 Sync Stripe Invoices", type="secondary"):
                    with st.spinner("Syncing Stripe invoices..."):
                        # Trigger Stripe sync
                        from integrations import fetch_stripe_invoices
                        stripe_data = fetch_stripe_invoices()
                        if stripe_data is not None and not stripe_data.empty:
                            st.success(f"Synced {len(stripe_data)} Stripe invoices!")
                        else:
                            st.warning("No Stripe invoices found or sync failed.")
            
            if "hubspot" in enabled_integrations:
                if st.button("🎯 Analyze HubSpot Deals", type="secondary"):
                    with st.spinner("Analyzing HubSpot deals..."):
                        # Fetch and analyze HubSpot data
                        hubspot_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "hubspot")
                        if hubspot_data:
                            st.success("HubSpot analysis completed!")
                            st.session_state["hubspot_analyzed"] = True
                        else:
                            st.warning("No HubSpot data available. Please sync data first.")
        
        with col2:
            if "quickbooks" in enabled_integrations:
                if st.button("📋 Analyze QuickBooks Data", type="secondary"):
                    with st.spinner("Analyzing QuickBooks data..."):
                        # Fetch and analyze QuickBooks data
                        quickbooks_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "quickbooks")
                        if quickbooks_data:
                            st.success("QuickBooks analysis completed!")
                            st.session_state["quickbooks_analyzed"] = True
                        else:
                            st.warning("No QuickBooks data available. Please sync data first.")
            
            if "pandadoc" in enabled_integrations:
                if st.button("📄 Analyze PandaDoc Documents", type="secondary"):
                    with st.spinner("Analyzing PandaDoc documents..."):
                        # Fetch and analyze PandaDoc data
                        pandadoc_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "pandadoc")
                        if pandadoc_data:
                            st.success("PandaDoc analysis completed!")
                            st.session_state["pandadoc_analyzed"] = True
                        else:
                            st.warning("No PandaDoc data available. Please sync data first.")
            
            if "google_drive" in enabled_integrations:
                if st.button("📁 Analyze Google Drive Files", type="secondary"):
                    with st.spinner("Analyzing Google Drive files..."):
                        # Fetch and analyze Google Drive data
                        gdrive_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "google_drive")
                        if gdrive_data:
                            st.success("Google Drive analysis completed!")
                            st.session_state["gdrive_analyzed"] = True
                        else:
                            st.warning("No Google Drive data available. Please sync data first.")
        
        # Generate comprehensive report
        if st.button("📈 Generate Integration Report", type="primary"):
            with st.spinner("Generating comprehensive report..."):
                generate_integration_report(enabled_integrations)
                st.success("Integration report generated successfully!")
    
    # Load previous analysis results from Firestore if not in session state
    if st.session_state.get("user") and not st.session_state.get("contract_analyzed"):
        try:
            latest_contract = get_latest_analysis_result(analysis_type="contract")
            if latest_contract:
                st.session_state["contract_findings"] = latest_contract.get("results", [])
                st.session_state["contract_analyzed"] = True
        except Exception as e:
            pass
    
    if st.session_state.get("user") and not st.session_state.get("billing_analyzed"):
        try:
            latest_billing = get_latest_analysis_result(analysis_type="billing")
            if latest_billing:
                st.session_state["billing_findings"] = latest_billing.get("results", [])
                st.session_state["billing_analyzed"] = True
        except Exception as e:
            pass
    
    if st.session_state.get("user") and not st.session_state.get("crm_analyzed"):
        try:
            latest_crm = get_latest_analysis_result(analysis_type="crm")
            if latest_crm:
                st.session_state["crm_findings"] = latest_crm.get("results", [])
                st.session_state["crm_analyzed"] = True
        except Exception as e:
            pass
    
    contract_findings = st.session_state.get("contract_findings", []) if st.session_state.get("contract_analyzed") else []
    billing_findings = st.session_state.get("billing_findings", []) if st.session_state.get("billing_analyzed") else []
    crm_findings = st.session_state.get("crm_findings", []) if st.session_state.get("crm_analyzed") else []
    def add_section(findings, section):
        for f in findings:
            f = f.copy()
            f["section"] = section
            yield f
    all_findings = list(add_section(contract_findings, "Contract")) + \
                   list(add_section(billing_findings, "Billing")) + \
                   list(add_section(crm_findings, "CRM"))
    st.sidebar.header("\U0001F50D Dashboard Filters")
    all_severities = ["High", "Medium", "Low"]
    all_sections = ["Contract", "Billing", "CRM"]
    all_sources = set()
    for f in all_findings:
        if "engine" in f:
            all_sources.add(f["engine"])
        elif "source" in f:
            all_sources.add(f["source"])
    all_sources = sorted(list(all_sources))
    if not all_sources:
        all_sources = ["Rule-Based", "AI-Powered"]
    severity_filter = st.sidebar.multiselect(
        "Severity", all_severities, default=all_severities, key="dashboard_severity_filter"
    )
    source_filter = st.sidebar.multiselect(
        "Source", all_sources, default=all_sources, key="dashboard_source_filter"
    )
    section_filter = st.sidebar.multiselect(
        "Section", all_sections, default=all_sections, key="dashboard_section_filter"
    )
    df = pd.DataFrame(all_findings)
    if not df.empty:
        df["src"] = df.get("engine", df.get("source", ""))
        filtered_df = df[
            df["severity"].isin(severity_filter)
            & df["src"].isin(source_filter)
            & df["section"].isin(section_filter)
        ]
    else:
        filtered_df = df
    if filtered_df.empty:
        st.info("No findings to display for the selected filters. Please analyze data in other tabs first or adjust your filters.")
    else:
        total_issues = len(filtered_df)
        high_severity = sum(1 for f in filtered_df.itertuples() if str(getattr(f, "severity", "")).lower() == "high")
        ai_powered = sum(1 for f in filtered_df.itertuples() if (getattr(f, "engine", None) == "AI-Powered" or getattr(f, "source", None) == "AI-Powered"))
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Issues", total_issues)
        col2.metric("High Severity Issues", high_severity)
        col3.metric("AI-Powered Issues", ai_powered)
        if "severity" in filtered_df.columns:
            fig1 = px.pie(filtered_df, names="severity", title="Issues by Severity", hole=0.4)
            st.plotly_chart(fig1, use_container_width=True)
            if st.button("\U0001F4E5 Download Chart as PNG", key="download_pie_png"):
                try:
                    buf = io.BytesIO()
                    fig1.write_image(buf, format="png", engine="kaleido")
                    st.download_button(
                        label="Download Pie Chart (PNG)",
                        data=buf.getvalue(),
                        file_name="issues_by_severity.png",
                        mime="image/png"
                    )
                except Exception as e:
                    st.error("Please install kaleido using `pip install kaleido` to enable image export.")
        if "src" in filtered_df.columns:
            fig2 = px.bar(filtered_df, x="src", title="Findings by Source", labels={"src": "Source"})
            st.plotly_chart(fig2, use_container_width=True)
            if st.button("\U0001F4E5 Download Chart as PNG", key="download_bar_png"):
                try:
                    buf = io.BytesIO()
                    fig2.write_image(buf, format="png", engine="kaleido")
                    st.download_button(
                        label="Download Bar Chart (PNG)",
                        data=buf.getvalue(),
                        file_name="findings_by_source.png",
                        mime="image/png"
                    )
                except Exception as e:
                    st.error("Please install kaleido using `pip install kaleido` to enable image export.")
        if "section" in filtered_df.columns and "severity" in filtered_df.columns:
            fig3 = px.histogram(filtered_df, x="section", color="severity", barmode="group", title="Section vs Severity")
            st.plotly_chart(fig3, use_container_width=True)
            if st.button("\U0001F4E5 Download Chart as PNG", key="download_hist_png"):
                try:
                    buf = io.BytesIO()
                    fig3.write_image(buf, format="png", engine="kaleido")
                    st.download_button(
                        label="Download Histogram (PNG)",
                        data=buf.getvalue(),
                        file_name="section_vs_severity.png",
                        mime="image/png"
                    )
                except Exception as e:
                    st.error("Please install kaleido using `pip install kaleido` to enable image export.") 
    
    # Report Generation Section
    st.header("📄 Generate RLDA Report")
    
    # Get user profile information
    user_profile = get_user_profile()
    
    if not user_profile:
        st.error("User profile not available. Please ensure you are logged in.")
        return
    
    with st.form("report_form"):
        st.subheader("Report Configuration")
        
        col1, col2 = st.columns(2)
        with col1:
            include_executive_summary = st.checkbox("Include AI-Generated Executive Summary", value=True)
        
        with col2:
            export_format = st.selectbox("Export Format", ["HTML", "PDF", "Markdown"], key="report_format")
        
        generate_report = st.form_submit_button("📊 Generate Report", use_container_width=True)
        
        if generate_report:
            if not all_findings:
                st.error("No analysis data available. Please analyze data in other tabs first.")
            else:
                with st.spinner("Generating report..."):
                    try:
                        # Generate executive summary if requested
                        executive_summary = ""
                        if include_executive_summary:
                            executive_summary = generate_executive_summary(all_findings)
                        
                        # Create report data with automatic user profile information
                        report_data = {
                            "client_name": user_profile.get("company_name", "Client"),
                            "contact_name": user_profile.get("full_name", "Contact"),
                            "contact_phone": user_profile.get("phone_number", "N/A"),
                            "contact_email": user_profile.get("email", ""),
                            "report_date": datetime.now().strftime("%B %d, %Y"),
                            "total_issues": len(all_findings),
                            "high_severity": sum(1 for f in all_findings if f.get("severity", "").lower() == "high"),
                            "medium_severity": sum(1 for f in all_findings if f.get("severity", "").lower() == "medium"),
                            "low_severity": sum(1 for f in all_findings if f.get("severity", "").lower() == "low"),
                            "executive_summary": executive_summary,
                            "findings": all_findings
                        }
                        
                        # Generate report based on format
                        if export_format == "HTML":
                            with st.spinner("Generating HTML report..."):
                                report_content = generate_rlda_report(report_data)
                                
                                # Store report in Firestore
                                report_info = {
                                    "report_name": f"RLDA Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                                    "report_format": "HTML",
                                    "report_content": report_content,
                                    "client_name": user_profile.get("company_name", "Client"),
                                    "total_issues": len(all_findings),
                                    "file_name": f"RLDA_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
                                }
                                store_generated_report(report_info)
                                
                                st.success("Report generated successfully!")
                                
                                # Download button
                                st.download_button(
                                    label="📥 Download HTML Report",
                                    data=report_content,
                                    file_name=f"RLDA_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html",
                                    mime="text/html"
                                )
                                
                                # Preview
                                st.subheader("Report Preview")
                                st.components.v1.html(report_content, height=600, scrolling=True)
                                
                        elif export_format == "PDF":
                            if weasyprint_available:
                                with st.spinner("Generating PDF report..."):
                                    html_content = generate_rlda_report(report_data)
                                    pdf_content = weasyprint.HTML(string=html_content).write_pdf()
                                    
                                    # Store report in Firestore
                                    report_info = {
                                        "report_name": f"RLDA Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                                        "report_format": "PDF",
                                        "report_content": html_content,  # Store HTML content for re-download
                                        "client_name": user_profile.get("company_name", "Client"),
                                        "total_issues": len(all_findings),
                                        "file_name": f"RLDA_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                                    }
                                    store_generated_report(report_info)
                                    
                                    st.success("PDF report generated successfully!")
                                    st.download_button(
                                        label="📥 Download PDF Report",
                                        data=pdf_content,
                                        file_name=f"RLDA_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                                        mime="application/pdf"
                                    )
                            else:
                                st.error("PDF generation requires weasyprint. Please install it using `pip install weasyprint`")
                                
                        elif export_format == "Markdown":
                            with st.spinner("Generating Markdown report..."):
                                markdown_content = generate_rlda_markdown(report_data)
                                
                                # Store report in Firestore
                                report_info = {
                                    "report_name": f"RLDA Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                                    "report_format": "Markdown",
                                    "report_content": markdown_content,
                                    "client_name": user_profile.get("company_name", "Client"),
                                    "total_issues": len(all_findings),
                                    "file_name": f"RLDA_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
                                }
                                store_generated_report(report_info)
                                
                                st.success("Markdown report generated successfully!")
                                
                                st.download_button(
                                    label="📥 Download Markdown Report",
                                    data=markdown_content,
                                    file_name=f"RLDA_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md",
                                    mime="text/markdown"
                                )
                                
                                # Preview
                                st.subheader("Report Preview")
                                st.markdown(markdown_content)
                            
                    except Exception as e:
                        st.error(f"Error generating report: {str(e)}")

def generate_rlda_report(data):
    """Generate HTML report with enhanced user profile information"""
    html_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>RLDA Analysis Report</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background-color: #f8f9fa; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
            .contact-info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metrics { display: flex; justify-content: space-between; margin: 20px 0; }
            .metric { background: white; padding: 15px; border-radius: 8px; text-align: center; flex: 1; margin: 0 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric h3 { margin: 0; color: #667eea; }
            .finding { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .high { border-left: 5px solid #dc3545; }
            .medium { border-left: 5px solid #ffc107; }
            .low { border-left: 5px solid #28a745; }
            .severity { font-weight: bold; padding: 5px 10px; border-radius: 15px; color: white; }
            .high-sev { background-color: #dc3545; }
            .medium-sev { background-color: #ffc107; color: black; }
            .low-sev { background-color: #28a745; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔍 RLDA Analysis Report</h1>
            <p>Generated on {{ report_date }}</p>
        </div>
        
        <div class="contact-info">
            <h2>📋 Client Information</h2>
            <p><strong>Client/Company:</strong> {{ client_name }}</p>
            <p><strong>Contact Name:</strong> {{ contact_name }}</p>
            <p><strong>Contact Phone:</strong> {{ contact_phone }}</p>
            <p><strong>Contact Email:</strong> {{ contact_email }}</p>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <h3>{{ total_issues }}</h3>
                <p>Total Issues</p>
            </div>
            <div class="metric">
                <h3>{{ high_severity }}</h3>
                <p>High Severity</p>
            </div>
            <div class="metric">
                <h3>{{ medium_severity }}</h3>
                <p>Medium Severity</p>
            </div>
            <div class="metric">
                <h3>{{ low_severity }}</h3>
                <p>Low Severity</p>
            </div>
        </div>
        
        {% if executive_summary %}
        <div class="summary">
            <h2>📊 Executive Summary</h2>
            <p>{{ executive_summary }}</p>
        </div>
        {% endif %}
        
        <h2>🔍 Detailed Findings</h2>
        {% for finding in findings %}
        <div class="finding {{ finding.severity.lower() }}">
            <h3>{{ finding.issue }}</h3>
            <p><strong>Section:</strong> {{ finding.section }}</p>
            <p><strong>Severity:</strong> <span class="severity {{ finding.severity.lower() }}-sev">{{ finding.severity }}</span></p>
            <p><strong>Source:</strong> {{ finding.engine or finding.source or 'Unknown' }}</p>
            {% if finding.details %}
            <p><strong>Details:</strong> {{ finding.details }}</p>
            {% endif %}
        </div>
        {% endfor %}
    </body>
    </html>
    """
    
    template = Template(html_template)
    return template.render(**data)

def generate_rlda_markdown(data):
    """Generate Markdown report with enhanced user profile information"""
    markdown = f"""# 🔍 RLDA Analysis Report

**Generated on:** {data['report_date']}

## 📋 Client Information

- **Client/Company:** {data['client_name']}
- **Contact Name:** {data['contact_name']}
- **Contact Phone:** {data['contact_phone']}
- **Contact Email:** {data['contact_email']}

## 📊 Summary Metrics

- **Total Issues:** {data['total_issues']}
- **High Severity:** {data['high_severity']}
- **Medium Severity:** {data['medium_severity']}
- **Low Severity:** {data['low_severity']}

"""

    if data['executive_summary']:
        markdown += f"""## 📊 Executive Summary

{data['executive_summary']}

"""

    markdown += """## 🔍 Detailed Findings

"""
    
    for finding in data['findings']:
        severity_emoji = {"High": "🔴", "Medium": "🟡", "Low": "🟢"}.get(finding.get("severity", "Medium"), "🟡")
        markdown += f"""### {severity_emoji} {finding.get('issue', 'Unknown Issue')}

- **Section:** {finding.get('section', 'Unknown')}
- **Severity:** {finding.get('severity', 'Unknown')}
- **Source:** {finding.get('engine', finding.get('source', 'Unknown'))}
"""
        if finding.get('details'):
            markdown += f"- **Details:** {finding['details']}\n"
        markdown += "\n---\n\n"
    
    return markdown

def generate_integration_report(enabled_integrations):
    """Generate comprehensive report for enabled integrations"""
    from firestore_service import get_latest_synced_data, store_report
    from datetime import datetime
    
    report_data = {
        "title": "Integration Analysis Report",
        "type": "integration_summary",
        "generated_at": datetime.now().isoformat(),
        "enabled_integrations": enabled_integrations,
        "summary": f"Analysis of {len(enabled_integrations)} connected integrations",
        "data": []
    }
    
    user_id = st.session_state.get("user_id", "anonymous")
    
    # Collect data from each integration
    for platform in enabled_integrations:
        platform_data = get_latest_synced_data(user_id, platform)
        if platform_data and 'data' in platform_data:
            records = platform_data['data']
            report_data["data"].append({
                "platform": platform,
                "record_count": len(records),
                "last_sync": platform_data.get('sync_timestamp', 'Unknown'),
                "status": "Connected"
            })
        else:
            report_data["data"].append({
                "platform": platform,
                "record_count": 0,
                "last_sync": "Never",
                "status": "No Data"
            })
    
    # Store the report
    store_report(user_id, report_data)
    
    # Display summary
    st.subheader("📊 Integration Summary")
    
    summary_df = pd.DataFrame(report_data["data"])
    if not summary_df.empty:
        st.dataframe(summary_df, use_container_width=True)
        
        # Download options
        col1, col2 = st.columns(2)
        with col1:
            st.download_button(
                "📥 Download CSV",
                summary_df.to_csv(index=False),
                file_name=f"integration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
        with col2:
            st.download_button(
                "📥 Download JSON",
                str(report_data),
                file_name=f"integration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )
    
    return report_data 