import os
from werkzeug.utils import secure_filename
from config import Config

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def save_file(file, incident_id):
    """
    Save uploaded file and return file info
    """
    if not file or file.filename == '':
        return None
    
    if not allowed_file(file.filename):
        return None
    
    # Create incident-specific folder
    incident_folder = os.path.join(Config.UPLOAD_FOLDER, f'incident_{incident_id}')
    os.makedirs(incident_folder, exist_ok=True)
    
    # Secure filename and add timestamp to avoid conflicts
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    original_filename = secure_filename(file.filename)
    filename = f"{timestamp}_{original_filename}"
    
    filepath = os.path.join(incident_folder, filename)
    file.save(filepath)
    
    # Get file size
    file_size = os.path.getsize(filepath)
    
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
    
    relative_path = f'uploads/incident_{incident_id}/{filename}'
    
    return {
        'filename': original_filename,
        'filepath': relative_path,
        'file_type': file_type,
        'file_size': file_size
    }

def delete_file(filepath):
    """Delete a file from the filesystem"""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
    except Exception as e:
        print(f"Error deleting file: {e}")
    return False
