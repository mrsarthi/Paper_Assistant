import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
# import sys
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("api_key")

if not GOOGLE_API_KEY:
    print("No API key found!")

elif GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process-image")
async def process_image(file: UploadFile = File(...), section: str = Form(...)):
    print(f"Received image for section: {section}")
    
    try:
        image_bytes = await file.read()
        
        prompt = f"""
        You are an expert data entry professional digitizing an exam paper.
        Task: Extract ALL the text from this image exactly as it appears. DO NOT filter or skip any parts of the image content.
        
        Strict Rules:
        1. Return ONLY the extracted text. No markdown code blocks (```), no intro, no outro.
        2. Fix obvious OCR errors (e.g., '1l' -> 'll', 'rn' -> 'm').
        3. Maintain structure: Ensure sub-questions (a, b, i, ii) start on new lines.
        4. If marks are present like [5] or (10), keep them at the very end of the line.
        5. Ignore header noise like "Page 1" or scanned artifacts.
        """

        response = model.generate_content([
            {"mime_type": file.content_type, "data": image_bytes},
            prompt
        ])
        
        clean_text = response.text.strip()
        print("AI Processing Complete")
        return {"text": clean_text}

    except Exception as e:
        print(f"Error: {e}")
        return {"text": f"Error processing image: {str(e)}"}

log_config = uvicorn.config.LOGGING_CONFIG
log_config["formatters"]["access"]["fmt"] = "%(asctime)s - %(levelname)s - %(message)s"
log_config["formatters"]["default"]["fmt"] = "%(asctime)s - %(levelname)s - %(message)s"

if "use_colors" in log_config["formatters"]["default"]:
    del log_config["formatters"]["default"]["use_colors"]
if "use_colors" in log_config["formatters"]["access"]:
    del log_config["formatters"]["access"]["use_colors"]

if __name__ == "__main__":
    print("Server starting...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=log_config)