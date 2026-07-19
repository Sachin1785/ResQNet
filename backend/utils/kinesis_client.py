import json
import boto3
from config import Config

def get_kinesis_client():
    return boto3.client('kinesis', region_name=Config.AWS_REGION)

def put_telemetry_record(system_id, data):
    client = get_kinesis_client()
    try:
        response = client.put_record(
            StreamName=Config.KINESIS_STREAM_NAME,
            Data=json.dumps(data),
            PartitionKey=str(system_id)
        )
        return response
    except Exception as e:
        print(f"Error pushing to Kinesis: {e}")
        return None
