# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Set work directory
WORKDIR /app

# Install system dependencies
# build-essential is often needed for gevent and other C-extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies using pyproject.toml
COPY pyproject.toml .
# We can use pip to install dependencies from pyproject.toml
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# Copy the rest of the application code
COPY . .

# Create the uploads directory and ensure correct permissions
RUN mkdir -p uploads && chmod 777 uploads

# Expose the port the app runs on
EXPOSE 5000

# Start the application using python app.py
# (app.py uses socketio.run which is suitable for the gevent worker)
CMD ["python", "app.py"]
