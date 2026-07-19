import os
from datetime import timedelta

class Config:
    """Application configuration"""
    
    # Base directory
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Database Configuration (PostgreSQL/Aurora)
    DATABASE_URI = os.environ.get('DATABASE_URI', 'postgresql://resqnet_admin:SecurePasswordChangeMe123!@localhost:5432/resqnet')
    
    # AWS configuration
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
    S3_BUCKET = os.environ.get('S3_BUCKET', 'resqnet-uploads-bucket')
    KINESIS_STREAM_NAME = os.environ.get('KINESIS_STREAM_NAME', 'resqnet-telemetry-stream')
    
    # Redis configuration for SocketIO scale-out
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    # File uploads
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'pdf'}
    
    # WebSocket
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # CORS - Allow all origins for development
    CORS_ORIGINS = '*'
    
    # Geofencing
    DANGER_ZONE_RADIUS_METERS = 500  # Default radius for danger zones
    NEARBY_ALERT_RADIUS_METERS = 5000  # 5km radius for nearby alerts
    
    # Analytics
    RESPONSE_TIME_THRESHOLD_MINUTES = 15  # Target response time
    
    # Notifications
    CRITICAL_SEVERITY_LEVELS = ['critical', 'high']
    
    @staticmethod
    def init_app(app):
        """Initialize application with config"""
        # Create upload folder if it doesn't exist
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
