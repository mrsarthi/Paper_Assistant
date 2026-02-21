import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import base64
from groq import Groq
import os
# import sys
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("No GROQ_API_KEY found! Please add it to your .env file.")
else:
    client = Groq(api_key=GROQ_API_KEY)

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
        3. Maintain structure: distinct questions and sub-questions (a, b, i, ii) must start on new lines.
        4. Join lines that belong to the same paragraph or sentence. DO NOT include line breaks just because the text wraps in the original image. ONLY use line breaks for new distinct questions, sub-questions, or actual new paragraphs.
        5. If marks are present like [5] or (10), keep them at the very end of the line.
        6. Ignore header noise like "Page 1" or scanned artifacts.
        """

        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        response = client.chat.completions.create(
            model="meta-llama/llama-4-maverick-17b-128e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{file.content_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.1
        )
        
        clean_text = response.choices[0].message.content.strip()
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