FROM python:3.12-slim

WORKDIR /app

COPY ml-service/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ml-service/ .

CMD ["python", "main_loop.py"]