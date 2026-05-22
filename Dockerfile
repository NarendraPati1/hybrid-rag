FROM public.ecr.aws/lambda/python:3.12

# Lambda working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Install C build tools (needed by some fastembed/numpy deps)
RUN dnf install -y gcc gcc-c++ && dnf clean all

# Copy requirements first — leverage Docker layer cache
COPY requirements.txt .

# Install dependencies
# fastembed uses ONNX Runtime (no torch needed) — image stays lean
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

# Copy application source
COPY app ./app

# Pre-warm fastembed ONNX model at build time so Lambda cold start is fast.
# Bakes the model into /var/task/.fastembed_cache (persists inside the container).
RUN python -c "import os; os.environ['FASTEMBED_CACHE_PATH'] = '/var/task/.fastembed_cache'; from fastembed import TextEmbedding; m = TextEmbedding('BAAI/bge-small-en-v1.5'); list(m.embed(['warmup'])); print('ONNX model pre-warmed OK')"

# Lambda handler entrypoint
CMD ["app.main.handler"]
