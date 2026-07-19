import boto3
from werkzeug.utils import secure_filename
from config import Config
from datetime import datetime

s3_client = None

def get_s3_client():
    global s3_client
    if s3_client is None:
        # Will pick up standard AWS credential env vars or ECS IAM role automatically
        s3_client = boto3.client('s3', region_name=Config.AWS_REGION)
    return s3_client

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def save_file(file, incident_id):
    """
    Save uploaded file to S3 and return file info
    """
    if not file or file.filename == '':
        return None
    
    if not allowed_file(file.filename):
        return None
    
    # Secure filename and add timestamp to avoid conflicts
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    original_filename = secure_filename(file.filename)
    filename = f"{timestamp}_{original_filename}"
    
    # S3 Object Key
    s3_key = f"incident_{incident_id}/{filename}"
    
    s3 = get_s3_client()
    
    # Read size (seek to end then back to beginning)
    file.seek(0, 2)
    file_size = file.tell()
    file.seek(0)
    
    # Upload to S3
    s3.upload_fileobj(
        file,
        Config.S3_BUCKET,
        s3_key
    )
    
    # Determine file type
    file_ext = filename.rsplit('.', 1)[1].lower()
    if file_ext in ['png', 'jpg', 'jpeg', 'gif']:
        file_type = 'image'
    elif file_ext in ['mp4', 'mov']:
        file_type = 'video'
    elif file_ext == 'pdf':
        file_type = 'document'
    else:
        file_type = 'other'
    
    # Return path relative to /uploads proxy in app.py
    relative_path = f"uploads/{s3_key}"
    
    return {
        'filename': original_filename,
        'filepath': relative_path,
        'file_type': file_type,
        'file_size': file_size
    }

def delete_file(filepath):
    """Delete a file from S3"""
    try:
        # filepath format is "uploads/incident_ID/filename"
        # We need to extract the S3 Key: "incident_ID/filename"
        if filepath.startswith("uploads/"):
            s3_key = filepath[len("uploads/"):]
            s3 = get_s3_client()
            s3.delete_object(Bucket=Config.S3_BUCKET, Key=s3_key)
            return True
    except Exception as e:
        print(f"Error deleting file from S3: {e}")
    return False
