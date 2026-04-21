# 1. Use a lightweight Python 3.11 image
FROM python:3.11-slim

# 2. Set environment variables to see logs in real-time
ENV PYTHONUNBUFFERED=1

# 3. Install system dependencies required for OpenCV and PyTorch
# libgl1 and libglib2.0-0 are essential for image processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. Create a non-root user for Hugging Face (UID 1000 is required)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# 5. Set the working directory to the user's home app folder
WORKDIR $HOME/app

# 6. Copy requirements first to leverage Docker caching
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 7. Copy the rest of your backend code (main.py, models, etc.)
COPY --chown=user . .

# 8. Expose port 7860 (Hugging Face's default port)
EXPOSE 7860

# 9. Start the FastAPI server
# Note: We use 'main:app' assuming your file is named main.py
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]