from fastapi import FastAPI
from AI_database_generator import generate_task_plan
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 允许跨域（前端开发必需）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/generate_tasks")
async def generate_tasks(
    identity: str = "小明 CS本科生",
    coreNum: int = 5,
    subNum: int = 7
):
    result = generate_task_plan(identity, coreNum, subNum)
    if result is None:
        return {"error": "Task generation failed"}
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)