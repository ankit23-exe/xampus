"""
Test Azure Blob Storage Upload
"""
import os
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient, ContentSettings
import uuid

load_dotenv()

def test_azure_upload():
    """Test uploading a dummy file to Azure"""
    connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
    container_name = os.getenv('AZURE_CONTAINER_NAME', 'campusq')
    
    if not connection_string:
        print("❌ AZURE_STORAGE_CONNECTION_STRING not found in .env")
        return False
    
    try:
        # Initialize client
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        print("✅ Azure Blob Service Client initialized")
        
        # Check container exists
        container_client = blob_service_client.get_container_client(container_name)
        if container_client.exists():
            print(f"✅ Container '{container_name}' exists")
        else:
            print(f"⚠️  Container '{container_name}' does not exist, creating...")
            container_client.create_container()
            print(f"✅ Container '{container_name}' created")
        
        # Create test file
        test_data = b"Test image upload from Python"
        blob_name = f"test_{uuid.uuid4()}.txt"
        
        # Get blob client
        blob_client = blob_service_client.get_blob_client(
            container=container_name,
            blob=blob_name
        )
        
        # Upload test data
        content_settings = ContentSettings(content_type='text/plain')
        blob_client.upload_blob(
            test_data,
            overwrite=True,
            content_settings=content_settings
        )
        
        # Get URL
        image_url = blob_client.url
        print(f"✅ Test file uploaded successfully!")
        print(f"📎 URL: {image_url}")
        
        # Verify upload
        blob_properties = blob_client.get_blob_properties()
        print(f"✅ File verified - Size: {blob_properties.size} bytes")
        
        # Clean up test file
        blob_client.delete_blob()
        print(f"✅ Test file deleted")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Testing Azure Blob Storage Upload...")
    print("=" * 50)
    success = test_azure_upload()
    print("=" * 50)
    if success:
        print("✅ All tests passed! Azure Blob Storage is working properly.")
    else:
        print("❌ Tests failed! Check configuration.")
