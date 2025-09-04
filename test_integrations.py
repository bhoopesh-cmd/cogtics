#!/usr/bin/env python3
"""
Test script for RLDA Integrations module
This script tests the basic functionality of the integrations module
"""

import sys
import os

def test_imports():
    """Test that all required modules can be imported"""
    print("🔍 Testing imports...")
    
    try:
        import streamlit as st
        print("✅ streamlit imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import streamlit: {e}")
        return False
    
    try:
        import requests
        print("✅ requests imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import requests: {e}")
        return False
    
    try:
        import pandas as pd
        print("✅ pandas imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import pandas: {e}")
        return False
    
    try:
        from integrations import (
            get_oauth_url, 
            is_integration_connected, 
            show_integrations_tab
        )
        print("✅ integrations module imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import integrations module: {e}")
        return False
    
    try:
        from firestore_service import (
            store_integration_token,
            get_integration_token,
            delete_integration_token
        )
        print("✅ firestore_service integration functions imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import firestore_service integration functions: {e}")
        return False
    
    return True

def test_oauth_config():
    """Test OAuth configuration loading"""
    print("\n🔍 Testing OAuth configuration...")
    
    try:
        import streamlit as st
        from integrations import OAUTH_CONFIGS
        
        # Test that OAuth configs are defined
        if not OAUTH_CONFIGS:
            print("❌ OAuth_CONFIGS is empty")
            return False
        
        required_platforms = ["hubspot", "quickbooks", "google_drive", "salesforce", "stripe", "pandadoc"]
        for platform in required_platforms:
            if platform not in OAUTH_CONFIGS:
                print(f"❌ Missing OAuth config for {platform}")
                return False
            
            config = OAUTH_CONFIGS[platform]
            required_keys = ["client_id", "client_secret", "redirect_uri", "auth_url", "token_url", "scope"]
            
            for key in required_keys:
                if key not in config:
                    print(f"❌ Missing {key} in {platform} config")
                    return False
        
        print("✅ OAuth configuration loaded successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error testing OAuth configuration: {e}")
        return False

def test_firestore_functions():
    """Test Firestore integration functions"""
    print("\n🔍 Testing Firestore integration functions...")
    
    try:
        from firestore_service import (
            store_integration_token,
            get_integration_token,
            delete_integration_token,
            get_user_integrations
        )
        
        # Test function signatures
        import inspect
        
        # Check store_integration_token
        sig = inspect.signature(store_integration_token)
        params = list(sig.parameters.keys())
        expected_params = ["user_id", "platform", "token_info"]
        
        if params != expected_params:
            print(f"❌ store_integration_token has wrong parameters: {params}")
            return False
        
        # Check get_integration_token
        sig = inspect.signature(get_integration_token)
        params = list(sig.parameters.keys())
        expected_params = ["user_id", "platform"]
        
        if params != expected_params:
            print(f"❌ get_integration_token has wrong parameters: {params}")
            return False
        
        # Check delete_integration_token
        sig = inspect.signature(delete_integration_token)
        params = list(sig.parameters.keys())
        expected_params = ["user_id", "platform"]
        
        if params != expected_params:
            print(f"❌ delete_integration_token has wrong parameters: {params}")
            return False
        
        print("✅ Firestore integration functions have correct signatures")
        return True
        
    except Exception as e:
        print(f"❌ Error testing Firestore functions: {e}")
        return False

def test_integration_functions():
    """Test integration module functions"""
    print("\n🔍 Testing integration module functions...")
    
    try:
        from integrations import (
            get_oauth_url,
            is_integration_connected,
            is_token_expired,
            refresh_token_if_needed
        )
        
        import inspect
        
        # Test function signatures
        functions_to_test = [
            (get_oauth_url, ["platform"]),
            (is_integration_connected, ["platform"]),
            (is_token_expired, ["token"]),
            (refresh_token_if_needed, ["platform"])
        ]
        
        for func, expected_params in functions_to_test:
            sig = inspect.signature(func)
            params = list(sig.parameters.keys())
            
            if params != expected_params:
                print(f"❌ {func.__name__} has wrong parameters: {params}")
                return False
        
        print("✅ Integration module functions have correct signatures")
        return True
        
    except Exception as e:
        print(f"❌ Error testing integration functions: {e}")
        return False

def test_data_fetching_functions():
    """Test data fetching functions"""
    print("\n🔍 Testing data fetching functions...")
    
    try:
        from integrations import (
            fetch_hubspot_deals,
            fetch_quickbooks_invoices,
            fetch_google_drive_contracts,
            fetch_salesforce_opportunities,
            fetch_salesforce_contracts,
            fetch_stripe_invoices,
            fetch_stripe_subscriptions,
            fetch_pandadoc_documents,
            fetch_pandadoc_templates,
            download_google_drive_file
        )
        
        import inspect
        
        # Test function signatures
        functions_to_test = [
            (fetch_hubspot_deals, []),
            (fetch_quickbooks_invoices, []),
            (fetch_google_drive_contracts, []),
            (fetch_salesforce_opportunities, []),
            (fetch_salesforce_contracts, []),
            (fetch_stripe_invoices, []),
            (fetch_stripe_subscriptions, []),
            (fetch_pandadoc_documents, []),
            (fetch_pandadoc_templates, []),
            (download_google_drive_file, ["file_id"])
        ]
        
        for func, expected_params in functions_to_test:
            sig = inspect.signature(func)
            params = list(sig.parameters.keys())
            
            if params != expected_params:
                print(f"❌ {func.__name__} has wrong parameters: {params}")
                return False
        
        print("✅ Data fetching functions have correct signatures")
        return True
        
    except Exception as e:
        print(f"❌ Error testing data fetching functions: {e}")
        return False

def test_platform_specific_functions():
    """Test platform-specific functionality"""
    print("\n🔍 Testing platform-specific functions...")
    
    try:
        from integrations import OAUTH_CONFIGS
        
        # Test that all platforms have proper OAuth URLs
        platforms = ["hubspot", "quickbooks", "google_drive", "salesforce", "stripe", "pandadoc"]
        
        for platform in platforms:
            if platform not in OAUTH_CONFIGS:
                print(f"❌ Missing OAuth config for {platform}")
                return False
            
            config = OAUTH_CONFIGS[platform]
            
            # Test that auth_url and token_url are valid URLs
            if not config["auth_url"].startswith("https://"):
                print(f"❌ Invalid auth_url for {platform}: {config['auth_url']}")
                return False
            
            if not config["token_url"].startswith("https://"):
                print(f"❌ Invalid token_url for {platform}: {config['token_url']}")
                return False
        
        print("✅ Platform-specific configurations are valid")
        return True
        
    except Exception as e:
        print(f"❌ Error testing platform-specific functions: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("RLDA Integrations Test Suite")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_oauth_config,
        test_firestore_functions,
        test_integration_functions,
        test_data_fetching_functions,
        test_platform_specific_functions
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print(f"❌ Test {test.__name__} failed")
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Integrations module is ready to use.")
        print("\n📊 Supported Platforms:")
        print("  ✅ HubSpot CRM")
        print("  ✅ QuickBooks")
        print("  ✅ Google Drive")
        print("  ✅ Salesforce")
        print("  ✅ Stripe")
        print("  ✅ PandaDoc")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)