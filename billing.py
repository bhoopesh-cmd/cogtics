import streamlit as st
import pandas as pd
from utils import analyze_billing_data, get_user_data_dir
from firestore_service import store_analysis_results, get_latest_analysis_result, get_user_preferences, store_user_file
import os

def show_billing_tab():
    st.header("💰 Billing Analysis")
    
    # Check for enabled integrations
    from integrations import is_integration_connected
    from firestore_service import get_latest_synced_data
    
    enabled_integrations = []
    for platform in ["quickbooks", "stripe"]:
        if is_integration_connected(platform):
            enabled_integrations.append(platform)
    
    # Load previous analysis results if available
    if not st.session_state.get("billing_analyzed") and st.session_state.get("user"):
        try:
            latest_result = get_latest_analysis_result(analysis_type="billing")
            if latest_result:
                st.session_state["billing_findings"] = latest_result.get("results", [])
                st.session_state["billing_analyzed"] = latest_result.get("metadata", {}).get("analyzed", False)
                st.info("Loaded previous analysis results from cloud.")
        except Exception as e:
            pass  # Silently fail if Firestore is not available
    
    # Get user preferences for mode
    user_prefs = get_user_preferences()
    default_mode = user_prefs.get("billing_mode", "Rule-Based")
    
    # Mode selection (use a different key to avoid conflicts)
    mode = st.selectbox(
        "Analysis Mode",
        ["Rule-Based", "AI-Powered"],
        index=0 if default_mode == "Rule-Based" else 1,
        key="billing_analysis_mode"
    )
    
    # Show integration-specific options if integrations are enabled
    if enabled_integrations:
        st.subheader("🔗 Connected Billing Sources")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if "quickbooks" in enabled_integrations:
                if st.button("📊 Analyze QuickBooks Invoices", type="secondary"):
                    with st.spinner("Analyzing QuickBooks invoices..."):
                        quickbooks_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "quickbooks")
                        if quickbooks_data and 'data' in quickbooks_data:
                            # Process QuickBooks invoice data
                            st.success(f"Analyzed {len(quickbooks_data['data'])} QuickBooks invoices!")
                            st.session_state["billing_analyzed"] = True
                        else:
                            st.warning("No QuickBooks invoice data available. Please sync data first.")
        
        with col2:
            if "stripe" in enabled_integrations:
                if st.button("💳 Analyze Stripe Invoices", type="secondary"):
                    with st.spinner("Analyzing Stripe invoices..."):
                        stripe_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "stripe")
                        if stripe_data and 'data' in stripe_data:
                            # Process Stripe invoice data
                            st.success(f"Analyzed {len(stripe_data['data'])} Stripe invoices!")
                            st.session_state["billing_analyzed"] = True
                        else:
                            st.warning("No Stripe invoice data available. Please sync data first.")
    
    # File upload (only show if no integrations are enabled)
    if not enabled_integrations:
        st.subheader("📁 Manual File Upload")
        uploaded_file = st.file_uploader(
            "Upload Billing Data (CSV)",
            type=['csv'],
            key="billing_file"
        )
    else:
        uploaded_file = None
        st.info("💡 Connected integrations detected. Use the buttons above to analyze your integrated data, or upload files manually below.")
        
        # Still allow manual upload as fallback
        with st.expander("📁 Manual File Upload (Optional)"):
            uploaded_file = st.file_uploader(
                "Upload Billing Data (CSV)",
                type=['csv'],
                key="billing_file_manual"
            )
    
    if uploaded_file is not None:
        # Save file to user directory
        user_dir = get_user_data_dir()
        file_path = os.path.join(user_dir, f"billing_{uploaded_file.name}")
        
        with st.spinner("Saving uploaded file..."):
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            
            # Store file information in Firestore
            file_info = {
                "filename": uploaded_file.name,
                "file_type": uploaded_file.type,
                "analysis_type": "billing",
                "file_size": len(uploaded_file.getbuffer()),
                "file_path": file_path
            }
            store_user_file(file_info)
        
        # Process file
        df = pd.read_csv(uploaded_file)
        st.write("### Billing Data Preview")
        st.dataframe(df.head())
        
        # Analysis button
        if st.button("🔍 Analyze Billing", key="analyze_billing"):
            with st.spinner("Analyzing billing data..."):
                findings = analyze_billing_data(df)
                
                # Store findings in session state
                st.session_state["billing_findings"] = findings
                st.session_state["billing_analyzed"] = True
                
                # Store in Firestore for persistence
                try:
                    result_id = store_analysis_results(
                        "billing",
                        findings,
                        {"analyzed": True, "mode": mode, "filename": uploaded_file.name}
                    )
                    if result_id:
                        st.success(f"Analysis complete! Found {len(findings)} issues. Results saved to cloud.")
                    else:
                        st.success(f"Analysis complete! Found {len(findings)} issues.")
                except Exception as e:
                    st.success(f"Analysis complete! Found {len(findings)} issues.")
                    st.warning(f"Could not save to cloud: {e}")
        
        # Display findings
        if st.session_state.get("billing_analyzed") and st.session_state.get("billing_findings"):
            st.write("### Analysis Results")
            findings = st.session_state["billing_findings"]
            
            if not findings:
                st.info("No issues found in the billing data.")
            else:
                for i, finding in enumerate(findings):
                    severity_color = {
                        "High": "🔴",
                        "Medium": "🟡", 
                        "Low": "🟢"
                    }.get(finding.get("severity", "Medium"), "🟡")
                    
                    st.write(f"{severity_color} **Row {finding.get('row', '?')} - {finding.get('issue', 'Unknown Issue')}**")
                    st.write(f"   {finding.get('details', 'No details available')}")
                    st.write(f"   *Severity: {finding.get('severity', 'Unknown')} | Source: {finding.get('engine', 'Unknown')}*")
                    st.write("---")
    
    else:
        st.info("Please upload a billing CSV file to begin analysis.") 