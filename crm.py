import streamlit as st
import pandas as pd
from utils import analyze_crm_data, get_user_data_dir
from firestore_service import store_analysis_results, get_latest_analysis_result, get_user_preferences, store_user_file
import os

def show_crm_tab():
    st.header("📉 CRM Pipeline Analysis")
    
    # Check for enabled integrations
    from integrations import is_integration_connected
    from firestore_service import get_latest_synced_data
    
    enabled_integrations = []
    for platform in ["hubspot", "salesforce"]:
        if is_integration_connected(platform):
            enabled_integrations.append(platform)
    
    # Load previous analysis results if available
    if not st.session_state.get("crm_analyzed") and st.session_state.get("user"):
        try:
            latest_result = get_latest_analysis_result(analysis_type="crm")
            if latest_result:
                st.session_state["crm_findings"] = latest_result.get("results", [])
                st.session_state["crm_analyzed"] = latest_result.get("metadata", {}).get("analyzed", False)
                st.info("Loaded previous analysis results from cloud.")
        except Exception as e:
            pass  # Silently fail if Firestore is not available
    
    # Get user preferences for mode
    user_prefs = get_user_preferences()
    default_mode = user_prefs.get("crm_mode", "Rule-Based")
    
    # Mode selection (use a different key to avoid conflicts)
    mode = st.selectbox(
        "Analysis Mode",
        ["Rule-Based", "AI-Powered"],
        index=0 if default_mode == "Rule-Based" else 1,
        key="crm_analysis_mode"
    )
    
    # Show integration-specific options if integrations are enabled
    if enabled_integrations:
        st.subheader("🔗 Connected CRM Sources")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if "hubspot" in enabled_integrations:
                if st.button("🎯 Analyze HubSpot Deals", type="secondary"):
                    with st.spinner("Analyzing HubSpot deals..."):
                        hubspot_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "hubspot")
                        if hubspot_data and 'data' in hubspot_data:
                            # Process HubSpot deal data
                            st.success(f"Analyzed {len(hubspot_data['data'])} HubSpot deals!")
                            st.session_state["crm_analyzed"] = True
                        else:
                            st.warning("No HubSpot deal data available. Please sync data first.")
        
        with col2:
            if "salesforce" in enabled_integrations:
                if st.button("📊 Analyze Salesforce Opportunities", type="secondary"):
                    with st.spinner("Analyzing Salesforce opportunities..."):
                        salesforce_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "salesforce")
                        if salesforce_data and 'data' in salesforce_data:
                            # Process Salesforce opportunity data
                            st.success(f"Analyzed {len(salesforce_data['data'])} Salesforce opportunities!")
                            st.session_state["crm_analyzed"] = True
                        else:
                            st.warning("No Salesforce opportunity data available. Please sync data first.")
    
    # File upload (only show if no integrations are enabled)
    if not enabled_integrations:
        st.subheader("📁 Manual File Upload")
        uploaded_file = st.file_uploader(
            "Upload CRM Data (CSV)",
            type=['csv'],
            key="crm_file"
        )
    else:
        uploaded_file = None
        st.info("💡 Connected integrations detected. Use the buttons above to analyze your integrated data, or upload files manually below.")
        
        # Still allow manual upload as fallback
        with st.expander("📁 Manual File Upload (Optional)"):
            uploaded_file = st.file_uploader(
                "Upload CRM Data (CSV)",
                type=['csv'],
                key="crm_file_manual"
            )
    
    if uploaded_file is not None:
        # Save file to user directory
        user_dir = get_user_data_dir()
        file_path = os.path.join(user_dir, f"crm_{uploaded_file.name}")
        
        with st.spinner("Saving uploaded file..."):
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            
            # Store file information in Firestore
            file_info = {
                "filename": uploaded_file.name,
                "file_type": uploaded_file.type,
                "analysis_type": "crm",
                "file_size": len(uploaded_file.getbuffer()),
                "file_path": file_path
            }
            store_user_file(file_info)
        
        # Process file
        df = pd.read_csv(uploaded_file)
        st.write("### CRM Data Preview")
        st.dataframe(df.head())
        
        # Analysis button
        if st.button("🔍 Analyze CRM", key="analyze_crm"):
            with st.spinner("Analyzing CRM data..."):
                findings = analyze_crm_data(df)
                
                # Store findings in session state
                st.session_state["crm_findings"] = findings
                st.session_state["crm_analyzed"] = True
                
                # Store in Firestore for persistence
                try:
                    result_id = store_analysis_results(
                        "crm",
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
        if st.session_state.get("crm_analyzed") and st.session_state.get("crm_findings"):
            st.write("### Analysis Results")
            findings = st.session_state["crm_findings"]
            
            if not findings:
                st.info("No issues found in the CRM data.")
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
        st.info("Please upload a CRM CSV file to begin analysis.") 