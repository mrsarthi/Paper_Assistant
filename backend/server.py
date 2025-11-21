import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import io
from dotenv import load_dotenv
import os

load_dotenv()

# --- CONFIGURATION ---
# 1. PASTE YOUR GEMINI API KEY HERE
GOOGLE_API_KEY = os.getenv("api_key") 

# 2. Configure AI
genai.configure(api_key=GOOGLE_API_KEY)
# Using "flash" model for speed and free tier usage
model = genai.GenerativeModel('gemini-2.0-flash-live')

app = FastAPI()

# 3. CORS Setup (Allows your frontend to talk to this backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process-image")
async def process_image(file: UploadFile = File(...), section: str = Form(...)):
    print(f"📥 Received image for section: {section}")
    
    try:
        # Read the image file
        image_bytes = await file.read()
        
        # The "Perfect" Prompt for Exam Digitization
        prompt = f"""
        You are an expert data entry professional digitizing an exam paper.
        
        Task: Extract the text from this image for the section: '{section}'.
        
        Strict Rules:
        1. Return ONLY the extracted text. No markdown code blocks (```), no intro, no outro.
        2. Fix obvious OCR errors (e.g., '1l' -> 'll', 'rn' -> 'm').
        3. Maintain structure: Ensure sub-questions (a, b, i, ii) start on new lines.
        4. If marks are present like [5] or (10), keep them at the very end of the line.
        5. Ignore header noise like "Page 1" or scanned artifacts.
        """

        # Call Google AI
        response = model.generate_content([
            {"mime_type": file.content_type, "data": image_bytes},
            prompt
        ])
        
        clean_text = response.text.strip()
        print("✅ AI Processing Complete")
        return {"text": clean_text}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"text": "Error processing image. Please check server logs."}

if __name__ == "__main__":
    # Run the server on localhost port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)