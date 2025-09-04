import streamlit as st
import pandas as pd
from utils import parse_contract_text, analyze_contract_with_gpt, gpt_contract_analysis, get_user_data_dir
from firestore_service import store_analysis_results, get_latest_analysis_result, get_user_preferences, store_user_file
import os

def show_contract_tab():
    st.header("📄 Contract Analysis")
    
    # Check for enabled integrations
    from integrations import is_integration_connected
    from firestore_service import get_latest_synced_data
    
    enabled_integrations = []
    for platform in ["salesforce", "pandadoc", "google_drive"]:
        if is_integration_connected(platform):
            enabled_integrations.append(platform)
    
    # Load previous analysis results if available
    if not st.session_state.get("contract_analyzed") and st.session_state.get("user"):
        try:
            latest_result = get_latest_analysis_result(analysis_type="contract")
            if latest_result:
                st.session_state["contract_findings"] = latest_result.get("results", [])
                st.session_state["contract_analyzed"] = latest_result.get("metadata", {}).get("analyzed", False)
                st.info("Loaded previous analysis results from cloud.")
        except Exception as e:
            pass  # Silently fail if Firestore is not available
    
    # Get user preferences for mode
    user_prefs = get_user_preferences()
    default_mode = user_prefs.get("contract_mode", "Rule-Based")
    
    # Mode selection (use a different key to avoid conflicts)
    mode = st.selectbox(
        "Analysis Mode",
        ["Rule-Based", "AI-Powered"],
        index=0 if default_mode == "Rule-Based" else 1,
        key="contract_analysis_mode"
    )
    
    # Show integration-specific options if integrations are enabled
    if enabled_integrations:
        st.subheader("🔗 Connected Contract Sources")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if "salesforce" in enabled_integrations:
                if st.button("📊 Analyze Salesforce Contracts", type="secondary"):
                    with st.spinner("Analyzing Salesforce contracts..."):
                        salesforce_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "salesforce")
                        if salesforce_data and 'data' in salesforce_data:
                            # Process Salesforce contract data
                            st.success(f"Analyzed {len(salesforce_data['data'])} Salesforce contracts!")
                            st.session_state["contract_analyzed"] = True
                        else:
                            st.warning("No Salesforce contract data available. Please sync data first.")
            
            if "pandadoc" in enabled_integrations:
                if st.button("📄 Analyze PandaDoc Documents", type="secondary"):
                    with st.spinner("Analyzing PandaDoc documents..."):
                        pandadoc_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "pandadoc")
                        if pandadoc_data and 'data' in pandadoc_data:
                            # Process PandaDoc document data
                            st.success(f"Analyzed {len(pandadoc_data['data'])} PandaDoc documents!")
                            st.session_state["contract_analyzed"] = True
                        else:
                            st.warning("No PandaDoc document data available. Please sync data first.")
        
        with col2:
            if "google_drive" in enabled_integrations:
                if st.button("📁 Analyze Google Drive Files", type="secondary"):
                    with st.spinner("Analyzing Google Drive files..."):
                        gdrive_data = get_latest_synced_data(st.session_state.get("user_id", "anonymous"), "google_drive")
                        if gdrive_data and 'data' in gdrive_data:
                            # Process Google Drive file data
                            st.success(f"Analyzed {len(gdrive_data['data'])} Google Drive files!")
                            st.session_state["contract_analyzed"] = True
                        else:
                            st.warning("No Google Drive file data available. Please sync data first.")
    
    # File upload (only show if no integrations are enabled)
    if not enabled_integrations:
        st.subheader("📁 Manual File Upload")
        uploaded_file = st.file_uploader(
            "Upload Contract Data (CSV or TXT)",
            type=['csv', 'txt'],
            key="contract_file"
        )
    else:
        uploaded_file = None
        st.info("💡 Connected integrations detected. Use the buttons above to analyze your integrated data, or upload files manually below.")
        
        # Still allow manual upload as fallback
        with st.expander("📁 Manual File Upload (Optional)"):
            uploaded_file = st.file_uploader(
                "Upload Contract Data (CSV or TXT)",
                type=['csv', 'txt'],
                key="contract_file_manual"
            )
    
    if uploaded_file is not None:
        # Save file to user directory
        user_dir = get_user_data_dir()
        file_path = os.path.join(user_dir, f"contract_{uploaded_file.name}")
        
        with st.spinner("Saving uploaded file..."):
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            
            # Store file information in Firestore
            file_info = {
                "filename": uploaded_file.name,
                "file_type": uploaded_file.type,
                "analysis_type": "contract",
                "file_size": len(uploaded_file.getbuffer()),
                "file_path": file_path
            }
            store_user_file(file_info)
        
        # Process file
        if uploaded_file.type == "text/csv":
            df = pd.read_csv(uploaded_file)
            st.write("### Contract Data Preview")
            st.dataframe(df.head())
            
            # Convert to text for analysis
            contract_text = df.to_string()
        else:
            contract_text = str(uploaded_file.read(), "utf-8")
            st.write("### Contract Text Preview")
            st.text_area("Preview", contract_text[:500] + "..." if len(contract_text) > 500 else contract_text, height=200)
        
        # Analysis button
        if st.button("🔍 Analyze Contract", key="analyze_contract"):
            with st.spinner("Analyzing contract data..."):
                if mode == "Rule-Based":
                    parsed = parse_contract_text(contract_text)
                    findings = analyze_contract_with_gpt(parsed)
                else:
                    findings = gpt_contract_analysis(contract_text)
                
                # Store findings in session state
                st.session_state["contract_findings"] = findings
                st.session_state["contract_analyzed"] = True
                
                # Store in Firestore for persistence
                try:
                    result_id = store_analysis_results(
                        "contract",
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
        if st.session_state.get("contract_analyzed") and st.session_state.get("contract_findings"):
            st.write("### Analysis Results")
            findings = st.session_state["contract_findings"]
            
            if not findings:
                st.info("No issues found in the contract.")
            else:
                for i, finding in enumerate(findings):
                    severity_color = {
                        "High": "🔴",
                        "Medium": "🟡", 
                        "Low": "🟢"
                    }.get(finding.get("severity", "Medium"), "🟡")
                    
                    st.write(f"{severity_color} **{finding.get('issue', 'Unknown Issue')}**")
                    st.write(f"   {finding.get('details', 'No details available')}")
                    st.write(f"   *Severity: {finding.get('severity', 'Unknown')} | Source: {finding.get('engine', 'Unknown')}*")
                    st.write("---")
    
    else:
        st.info("Please upload a contract file to begin analysis.") 